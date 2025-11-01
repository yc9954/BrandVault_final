// 1. (필수) 데이터 타입을 정의합니다.
// 이 타입은 컴포넌트에서도 재사용할 수 있도록 export 합니다.

export interface Product {
  product_id: number;
  product_name: string;
  category: string;
  brand_id: number;
  color: string | null;
  size: string;

  image_url: string | null; 
  signedImageUrl: string | null; 

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
  // 이 함수 자체는 수정할 필요가 없습니다.
  // API 서버(/api/products)가 위에서 정의한 Product 타입에 맞게
  // signedImageUrl을 잘 만들어서 보내주기만 하면 됩니다.

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/products`);
  
  if (!response.ok) {
    throw new Error('서버에서 제품 목록을 불러오는 데 실패했습니다.');
  }
  const data: Product[] = await response.json();
  return data;
};