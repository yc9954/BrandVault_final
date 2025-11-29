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

interface DownloadApiResponse {
  data: {
    url: string;
  };
}

/**
 * 💡 (신규) 에셋 다운로드 URL을 백엔드에 요청합니다.
 * @param id 조회할 상품의 ID
 * @param type 'image' 또는 'model'
 */
export const fetchProductDownloadUrl = async (
  id: number,
  type: 'image' | 'model'
): Promise<DownloadApiResponse> => {
  
  // 쿼리 파라미터로 type을 전달
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/products/${id}/download?type=${type}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get download URL.');
  }
  
  return response.json(); 
};


// API 응답의 타입을 정의합니다.
interface MyProductsApiResponse {
    products: ProductWithUrl[]; // ProductWithUrl 타입은 이미 파일에 정의되어 있습니다.
    nextCursor: number | null;
}

/**
 * (신규) 현재 로그인된 사용자가 구매한 에셋 목록을 가져옵니다. (무한 스크롤용)
 * @param limit 한 번에 가져올 개수
 * @param cursor 다음 페이지를 시작할 위치 ID
 * @returns MyProductsApiResponse
 */
export const fetchUserProducts = async (
    limit: number,
    cursor: number | null
): Promise<MyProductsApiResponse> => {
    
    const params = new URLSearchParams({
        limit: String(limit),
    });

    if (cursor) {
        params.append('cursor', String(cursor));
    }

    // ⭐ 중요: 인증이 필요한 요청이므로 credentials: 'include' 옵션으로 쿠키를 함께 보냅니다.
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/products/user?${params.toString()}`, {
        credentials: 'include', 
    });

    if (!response.ok) {
        throw new Error('Failed to fetch my purchased products.');
    }

    // 백엔드에서 받은 { products, nextCursor } 객체를 그대로 반환합니다.
    return response.json();
};

/**
 * 키워드로 상품을 검색합니다.
 * @param keyword 검색 키워드
 * @param limit 최대 결과 개수
 */
export const searchProducts = async (keyword: string, limit: number = 20): Promise<{ data: ProductWithUrl[] }> => {
    const params = new URLSearchParams({
        keyword: keyword,
        limit: String(limit),
    });

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/products/search?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to search products.');
    }

    return response.json();
};

/**
 * 키워드로 브랜드를 검색합니다.
 * @param keyword 검색 키워드
 * @param limit 최대 결과 개수
 */
export const searchBrands = async (keyword: string, limit: number = 10): Promise<BrandApiResponse> => {
    const params = new URLSearchParams({
        keyword: keyword,
        limit: String(limit),
    });

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/brands/search?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to search brands.');
    }

    return response.json();
};

/**
 * 브랜드 ID로 브랜드 정보와 에셋 목록을 조회합니다.
 * @param brandId 브랜드 ID
 */
export interface BrandDetailResponse {
    data: {
        brand: BrandWithUrl;
        products: ProductWithUrl[];
    };
}

export const fetchBrandById = async (brandId: number): Promise<BrandDetailResponse> => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/brands/${brandId}`);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Brand not found.');
        }
        throw new Error('Failed to fetch brand details.');
    }

    return response.json();
};

/**
 * 프로젝트 생성
 */
export interface CreateProjectRequest {
    projectName: string;
    videoPath: string;
    productIds: number[];
}

export interface CreateProjectResponse {
    data: {
        project_id: number;
        project_name: string;
        video_path?: string;
        thumbnail_url?: string;
        created_at: string;
    };
}

export const createProject = async (data: CreateProjectRequest): Promise<CreateProjectResponse> => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/projects`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '프로젝트 생성에 실패했습니다.');
    }

    return response.json();
};

/**
 * 사용자 프로젝트 목록 조회
 */
export interface UserProject {
    project_id: number;
    project_name: string;
    description?: string;
    created_at: string;
    thumbnail_url?: string;
    products_used: any[];
}

export const fetchUserProjects = async (): Promise<UserProject[]> => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/projects`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
    }

    return response.json();
};

/**
 * 프로젝트 상세 정보 조회
 */
export interface ProjectDetail {
    project_id: number;
    project_name: string;
    description?: string;
    created_at: string;
    thumbnail_url?: string;
    videoUrl?: string | null;
    products_used: Array<{
        product_id: number;
        product_name: string;
        image_url: string;
        category: string;
        signedImageUrl: string | null;
        brand: {
            brand_id: number;
            brand_name: string;
        };
    }>;
}

export interface ProjectDetailResponse {
    data: ProjectDetail;
}

export const fetchProjectById = async (projectId: number): Promise<ProjectDetailResponse> => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/projects/${projectId}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '프로젝트를 불러오는데 실패했습니다.' }));
        throw new Error(errorData.message || '프로젝트를 불러오는데 실패했습니다.');
    }

    return response.json();
};