// 1. (필수) 데이터 타입을 정의합니다.
// 이 타입은 컴포넌트에서도 재사용할 수 있도록 export 합니다.

export interface Product {
  product_id: number;
  product_name: string;
  category: string;
  brand_id: number;
  color: string | null;
  size: string;

  brand: {
    brand_id: number;
    brand_name: string;
  };

}

/**
 * 모든 제품 목록을 서버에서 가져옵니다.
 * @returns Product 배열 Promise
 */
export const fetchAllProducts = async (): Promise<Product[]> => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  
  try {
    console.log('API 호출:', `${API_URL}/api/products`);
    const response = await fetch(`${API_URL}/api/products`, {
      credentials: 'include', // 쿠키 전송
      mode: 'cors', // CORS 모드 명시
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      throw new Error(`서버 오류 (${response.status}): ${errorText || '서버에서 제품 목록을 불러오는 데 실패했습니다.'}`);
    }
    
    const data: Product[] = await response.json();
    console.log('Products loaded:', data.length);
    return data;
  } catch (error: any) {
    console.error('Fetch error:', error);
    // 네트워크 오류나 CORS 오류의 경우 더 명확한 메시지
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요. (http://localhost:3000)');
    }
    throw error;
  }
};

