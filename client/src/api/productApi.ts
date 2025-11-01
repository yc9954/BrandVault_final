type Product = any; // 실제 Prisma Product 타입 가정
type Brand = any;   // 실제 Prisma Brand 타입 가정

type ProductWithUrl = Product & { signedImageUrl: string | null };
type BrandWithUrl = Brand & { signedLogoUrl: string | null };

interface ProductApiResponse {
    data: ProductWithUrl[];
    meta: {
        hasMore: boolean;
        nextCursorId: number | null;
        nextCursorValue: string | number | null;
    };
}

interface BrandApiResponse {
    data: BrandWithUrl[];
    meta: {
        count: number;
    };
}

/**
// ----------------------------------------------------
// 1. fetchProductsByPage 구현 (커서 기반 무한 스크롤)
// ----------------------------------------------------
/**
 * 에셋 목록을 커서 기반으로 페이지네이션하여 가져옵니다.
 * @param limit 한 페이지당 개수
 * @param sortBy 정렬 기준 (NEWEST, POPULAR 등)
 * @param cursorId 마지막 아이템의 ID
 * @param cursorValue 마지막 아이템의 정렬 값
 * @returns ProductApiResponse
 */
export const fetchProductsByPage = async (
    limit: number, 
    sortBy: string, 
    cursorId: number | null, 
    cursorValue: string | number | null
): Promise<ProductApiResponse> => {
    
    // 쿼리 문자열 생성
    const params = new URLSearchParams({
        limit: String(limit),
        sortBy: sortBy,
    });

    if (cursorId !== null && cursorId !== undefined) {
        params.append('cursorId', String(cursorId));
    }
    if (cursorValue !== null && cursorValue !== undefined) {
        params.append('cursorValue', String(cursorValue));
    }
    
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/products?${params.toString()}`);
    
    if (!response.ok) {
        throw new Error('Failed to fetch product list from API.');
    }
    
    return response.json();
};


type ProductDetailData = ProductWithUrl & {
  brand: BrandWithUrl & { signedLogoUrl: string | null };
  assetFormats: string[];
  view_count: number;
  download_count: number;
};

export interface ProductDetailResponse {
  data: ProductDetailData;
}

/**
 * 💡 (신규) ID를 기반으로 단일 상품의 상세 정보를 조회합니다.
 * @param id 조회할 상품의 ID
 */
export const fetchProductById = async (id: number): Promise<ProductDetailResponse> => {
    
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/products/${id}`);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Product not found.');
        }
        throw new Error('Failed to fetch product details.');
    }
    
    // 백엔드 응답은 { data: {...} } 형태라고 가정
    return response.json(); 
};

// ----------------------------------------------------
// 2. fetchFeatureBrandList 구현 (상위 브랜드 목록)
// ----------------------------------------------------
/**
 * 추천 브랜드 목록을 가져옵니다.
 * @returns BrandApiResponse
 */
export const fetchFeatureBrandList = async (): Promise<BrandApiResponse> => {
    
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/brands/featured`);
    
    if (!response.ok) {
        throw new Error('Failed to fetch featured brand list from API.');
    }
    
    return response.json();
};