import { prisma } from '../db.js';
import { getSignedUrl } from './fileService.js'; 
import { SortBy } from '../utils/enums.js';
import type { Product } from '@prisma/client'; 

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