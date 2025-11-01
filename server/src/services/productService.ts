import { prisma } from '../db.js';
// 1. GCS 서비스에서 getSignedUrl 함수를 import 합니다.
// (경로는 실제 파일 위치에 맞게 수정하세요.)
import { getSignedUrl } from './fileService.js'; 

export const getAllProducts = async () => {
  // 2. DB에서 기본 데이터를 가져옵니다.
  const products = await prisma.product.findMany({
    include: {
      brand: {
        select: {
          brand_id: true,
          brand_name: true,
        },
      },
    },
    orderBy: {
      product_id: 'desc',
    },
  });

  // 3. (핵심) GCS Signed URL을 생성하여 각 product 객체에 추가합니다.
  const productsWithUrls = await Promise.all(
    products.map(async (product) => {
      let signedImageUrl = null;
      if (product.image_url) { // 이미지 URL이 DB에 있는 경우에만
        try {
          signedImageUrl = await getSignedUrl(product.image_url);
        } catch (error) {
          console.error(`Signed URL 생성 실패 (Product ID: ${product.product_id}):`, error);
        }
      }
      
      // 4. 원본 product 객체에 signedImageUrl 속성을 추가하여 반환
      return {
        ...product,
        signedImageUrl: signedImageUrl,
      };
    })
  );

  return productsWithUrls;
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