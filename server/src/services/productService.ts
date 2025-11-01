import { prisma } from '../db.js';
import { getSignedUrl } from './fileService.js'; 
import { SortBy } from '../utils/enums.js';
import type { Product } from '@prisma/client'; 
import path from 'path';

// 응답 객체의 타입 정의
interface ProductCursorResponse {
    products: (Product & { signedImageUrl: string | null })[]; // 💡 signedImageUrl 필드 추가
    hasMore: boolean;
}

/**
 * 커서 기반으로 상품 목록을 조회하고 Signed URL을 생성하여 반환합니다.
 */
export const getProductListByCursor = async (
    limit: number,
    sortBy: SortBy,
    cursorId: number | undefined,
    cursorValue: number | Date | undefined
): Promise<ProductCursorResponse> => {
    
    const queryLimit = limit + 1;
    let cursorWhere = {};
    let orderBy = {};

    // ----------------------------------------------------
    // 1. ORDER BY 절: 정렬 기준 결정 (이전과 동일)
    // ----------------------------------------------------
    switch (sortBy) {
        case SortBy.POPULAR:
            orderBy = [{ download_count: 'desc' }, { product_id: 'asc' }];
            break;
        case SortBy.VIEW_COUNT:
            orderBy = [{ view_count: 'desc' }, { product_id: 'asc' }];
            break;
        case SortBy.NEWEST:
        default:
            orderBy = [{ created_at: 'desc' }, { product_id: 'asc' }];
            break;
    }

    if (cursorId !== undefined && cursorValue !== undefined) {
        
        let sortField: 'view_count' | 'download_count' | 'created_at';
        let actualCursorValue: number | Date;
        
        if (sortBy === SortBy.POPULAR) {
            sortField = 'download_count';
            actualCursorValue = Number(cursorValue);
        } else if (sortBy === SortBy.VIEW_COUNT) {
            sortField = 'view_count';
            actualCursorValue = Number(cursorValue);
        } else { // NEWEST
            sortField = 'created_at';
            actualCursorValue = cursorValue as Date; 
        }

        cursorWhere = {
            OR: [
                { [sortField]: { lt: actualCursorValue } }, 
                { [sortField]: actualCursorValue, product_id: { gt: cursorId } }, 
            ],
        };
    }
    
    // 3. Prisma 쿼리 실행
    const products = await prisma.product.findMany({
        where: cursorWhere,
        orderBy: orderBy as any, 
        take: queryLimit, 
        // 💡 Signed URL 생성을 위해 image_url과 brand 정보를 포함
        include: {
            brand: {
                select: {
                    brand_id: true,
                    brand_name: true,
                },
            },
        },
    });

    // 4. 결과 처리 및 hasMore 확인
    const hasMore = products.length > limit;
    const items = hasMore ? products.slice(0, limit) : products;

    const productsWithUrls = await Promise.all(
        items.map(async (product) => {
            let signedImageUrl = null;

            if (product.image_url) {
                try {
                    signedImageUrl = await getSignedUrl(product.image_url);
                } catch (error) {
                    console.error(`Signed URL 생성 실패 (ID: ${product.product_id}):`, error);
                }
            }
            return {
                ...product,
                signedImageUrl: signedImageUrl,
            };
        })
    );

    return {
        products: productsWithUrls,
        hasMore: hasMore,
    };
};

/**
 * (Helper) 조회수를 비동기적으로 1 증가시킵니다.
 * 메인 요청을 차단하지 않기 위해 fire-and-forget 방식으로 호출됩니다.
 */
const incrementViewCount = (id: number) => {
    prisma.product.update({
        where: { product_id: id },
        data: { 
            view_count: { increment: 1 } // 
        },
    }).catch(err => {
        // 프로덕션에서는 로깅 서비스(Sentry 등)를 사용하는 것이 좋습니다.
        console.error(`Failed to increment view count for product ${id}:`, err);
    });
};


/**
 * ID를 기반으로 단일 상품의 상세 정보를 조회합니다.
 * (브랜드, 에셋 형식 포함 및 Signed URL 생성)
 */
export const fetchProductById = async (id: number) => {
    
    // 1. Prisma를 사용하여 상품 상세 정보 및 관계 데이터 조회
    const product = await prisma.product.findUnique({
        where: { product_id: id },
        include: {
            // Brand 정보 포함 (브랜드명, 로고) [cite: 19]
            brand: { 
                select: {
                    brand_name: true,
                    logo_url: true // [cite: 6]
                }
            },
            // Product_Asset -> Master_Asset_version 포함 (파일 형식) [cite: 20]
            product_assets: { 
                include: {
                    master_asset_version: { // [cite: 20]
                        select: {
                            asset_type: true // 예: "GLTF", "FBX" [cite: 13]
                        }
                    }
                }
            }
        }
    });

    // 2. 상품이 없는 경우 404 에러 throw
    if (!product) {
        throw new Error('Product not found');
    }

    // 3. (비동기) 조회수 증가 
    incrementViewCount(id);

    // 4. Signed URL 생성 (상품 이미지, 브랜드 로고)
    const [signedImageUrl, signedLogoUrl] = await Promise.all([
        product.image_url ? getSignedUrl(product.image_url) : Promise.resolve(null), // [cite: 18]
        product.brand.logo_url ? getSignedUrl(product.brand.logo_url) : Promise.resolve(null) // [cite: 6]
    ]);

    // 5. 파일 형식(assetFormats) 데이터 포맷팅
    // 중첩된 배열에서 고유한 asset_type 값만 추출합니다.
    const assetFormats = [...new Set(
        product.product_assets.map(pa => pa.master_asset_version.asset_type) // [cite: 20, 13]
    )];

    // 6. 최종 데이터 조합하여 반환
    return {
        ...product, // Product 기본 정보 (이름, 카테고리, 다운로드 수 등)
        signedImageUrl, // 상품 이미지 Signed URL
        brand: {
            ...product.brand,
            signedLogoUrl // 브랜드 로고 Signed URL
        },
        assetFormats // 파일 형식 배열 [ "GLTF", "FBX", "OBJ" ]
    };
};

export const getUserProducts = async (brandId: number) => {
  // 2. DB에서 기본 데이터를 가져옵니다.
  const products = await prisma.product.findMany({
    where: {
      brand_id: brandId,
    },
    include: {
      projects: true,
    },
  });

  // 3. (핵심) 여기도 똑같이 GCS Signed URL을 생성합니다.
  const productsWithUrls = await Promise.all(
    products.map(async (product) => {
      let signedImageUrl = null;
      if (product.image_url) {
        try {
          signedImageUrl = await getSignedUrl(product.image_url);
        } catch (error) {
          console.error(`Signed URL 생성 실패 (Product ID: ${product.product_id}):`, error);
        }
      }
      
      return {
        ...product,
        signedImageUrl: signedImageUrl,
      };
    })
  );
  
  return productsWithUrls;
};

const incrementDownloadCount = (id: number) => {
    prisma.product.update({
        where: { product_id: id },
        data: { 
            download_count: { increment: 1 }
        },
    }).catch(err => {
        console.error(`Failed to increment download count for product ${id}:`, err);
    });
};

export const generateAssetDownloadUrl = async (id: number, type: 'image' | 'model'): Promise<string | null> => {
    
    const product = await prisma.product.findUnique({
        where: { product_id: id },
        select: {
            image_url: true,    
            model_3d_url: true, 
            product_name: true  
        }
    });

    if (!product) {
        throw new Error('Product not found');
    }

    let filePath: string | null = null;
    let downloadFilename: string | null = null;
    let fileExtension: string = '';

    if (type === 'image' && product.image_url) {
        filePath = product.image_url;
        fileExtension = path.extname(product.image_url); // 예: ".jpg"
        downloadFilename = `${product.product_name}${fileExtension}`; 
        
    } else if (type === 'model' && product.model_3d_url) {
        filePath = product.model_3d_url;
        fileExtension = path.extname(product.model_3d_url); // 예: ".stl"
        downloadFilename = `${product.product_name}${fileExtension}`; // 예: "상품명.stl"
        // console.error(`file name: ${product.model_3d_url}`)
    }

    if (!filePath || !downloadFilename) {
        return null;
    }

    incrementDownloadCount(id);

    try {
        // 💡 이제 올바른 파일명(예: "상품명.stl")으로 Signed URL을 생성합니다.
        const signedUrl = await getSignedUrl(filePath, downloadFilename);
        
        return signedUrl;

    } catch (error) {
        console.error(`Signed URL (download) 생성 실패 (ID: ${id}):`, error);
        throw new Error('Signed URL generation failed.');
    }
};