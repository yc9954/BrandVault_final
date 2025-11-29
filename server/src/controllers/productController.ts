import type { Request, Response } from 'express';
import * as productService from '../services/productService.js'
import { SortBy } from '../utils/enums.js';

export const getProductList = async (req: Request, res: Response) => {
    try {
        // 1. 쿼리 파라미터 추출 및 유효성 검사
        const limit = parseInt(req.query.limit as string) || 20;
        const sortBy = (req.query.sortBy as SortBy) || SortBy.NEWEST;
        
        // product_id는 Int이므로 number로 변환
        const cursorId = req.query.cursorId ? parseInt(req.query.cursorId as string) : undefined;
        if (cursorId !== undefined && isNaN(cursorId)) throw new Error('Invalid cursorId.');

        let cursorValue: number | Date | undefined;
        if (req.query.cursorValue) {
            const rawValue = req.query.cursorValue as string;

            // 정렬 기준에 따라 cursorValue의 타입 변환
            if (sortBy === SortBy.POPULAR || sortBy === SortBy.VIEW_COUNT) {
                cursorValue = parseInt(rawValue); // 인기순, 조회수는 숫자
                if (isNaN(cursorValue)) throw new Error('Invalid number cursorValue for popular/view sort.');
            } else if (sortBy === SortBy.NEWEST) {
                cursorValue = new Date(rawValue); // 최신순은 날짜
                if (isNaN(cursorValue.getTime())) throw new Error('Invalid date cursorValue for newest sort.');
            }
        }

        // 2. Service 호출
        // Service 응답 타입이 ProductWithUrl 배열을 반환한다고 가정합니다.
        const result = await productService.getProductListByCursor(
            limit, 
            sortBy, 
            cursorId, 
            cursorValue
        )
        
        // 3. 응답 메타데이터 구성 (다음 커서 정보 포함)
        const lastProduct = result.products[result.products.length - 1];
        let nextCursorValue = null;

        if (result.hasMore && lastProduct) {
            if (sortBy === SortBy.POPULAR) {
                nextCursorValue = lastProduct.download_count;
            } else if (sortBy === SortBy.VIEW_COUNT) {
                nextCursorValue = lastProduct.view_count;
            } else { // NEWEST
                // Date 객체를 ISO 문자열로 변환하여 클라이언트에 전달
                nextCursorValue = lastProduct.created_at.toISOString();
            }
        }
        
        res.status(200).json({
            // 💡 Signed URL이 포함된 데이터를 클라이언트에 전달
            data: result.products, 
            meta: {
                hasMore: result.hasMore,
                nextCursorId: result.hasMore && lastProduct ? lastProduct.product_id : null,
                nextCursorValue: nextCursorValue,
            },
        });

    } catch (error) {
        console.error('Error fetching product list:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to fetch product list' });
    }
};

export const getProductDetails = async (req: Request, res: Response) => {
    try {
        // 1. URL 파라미터에서 ID 추출 및 검증
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }

        // 2. Service 호출
        const product = await productService.fetchProductById(id);
        
        // 3. 성공 응답
        res.status(200).json({ data: product });

    } catch (error) {
        // 4. 에러 처리
        const message = (error as Error).message;
        if (message.includes('Product not found')) {
            // Service에서 상품을 찾지 못한 경우
            return res.status(404).json({ message });
        }
        
        console.error('Error fetching product details:', error);
        res.status(500).json({ message: 'Failed to fetch product details.' });
    }
};

// export const handleGetUserProducts = async (req: Request, res: Response) => {
//     try {
//         const userId = req.user.userId;
//         if (!userId) {
//             return res.status(401).json({message: '비정상적인 접근입니다.'});
//         }
//         const products = await productService.getUserProducts(userId);
//         res.status(200).json(products);
//     } catch (error) {
//         res.status(500).json({ message: `Failed to fetch user's products.`, error});
//     }
// }

export const handleGetUserProducts = async (req: Request, res: Response) => {
    try {
        // 1. 미들웨어에서 검증된 userId를 사용합니다.
        const user = req.user as { userId?: number; brandId?: number } | undefined;
        const userId = user?.userId;
        if (!userId) {
            // 이 케이스는 보통 미들웨어에서 처리되지만, 방어 코드로 유지합니다.
            return res.status(401).json({ message: '인증 정보가 필요합니다.' });
        }

        // 2. 무한 스크롤을 위한 쿼리 파라미터 추출 및 타입 변환
        const limit = parseInt(req.query.limit as string) || 9; // 기본 9개
        const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;

        // 3. 수정된 서비스 함수 호출
        const result = await productService.getUserProducts(userId, limit, cursor);
        
        res.status(200).json(result);

    } catch (error) {
        console.error("User's products fetch failed:", error);
        res.status(500).json({ message: "구매한 상품 목록을 가져오는 데 실패했습니다." });
    }
}

/**
 * 💡 [신규]
 * 에셋 다운로드(2D 또는 3D)를 위한 Signed URL을 생성합니다.
 */
export const getProductDownloadUrl = async (req: Request, res: Response) => {
    try {
        // 1. ID 및 타입 파싱
        const id = parseInt(req.params.id as string);
        const { type } = req.query; // 'image' 또는 'model'

        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }
        
        // 2. 타입 검증
        if (type !== 'image' && type !== 'model') {
            return res.status(400).json({ 
                message: 'Invalid asset type. Must be "image" or "model".' 
            });
        }

        // 3. Service 호출
        const downloadUrl = await productService.generateAssetDownloadUrl(id, type as 'image' | 'model');

        if (!downloadUrl) {
            return res.status(404).json({ message: 'Downloadable file not found for this product.' });
        }

        // 4. URL 응답
        res.status(200).json({ data: { url: downloadUrl } });

    } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to generate download URL.' });
    }
};

/**
 * 키워드로 상품을 검색합니다.
 */
export const searchProducts = async (req: Request, res: Response) => {
    try {
        const keyword = req.query.keyword as string;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!keyword || keyword.trim() === '') {
            return res.status(200).json({ data: [] });
        }

        const products = await productService.searchProducts(keyword.trim(), limit);

        res.status(200).json({ data: products });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to search products.' });
    }
};

/**
 * 에셋 저장
 */
export const saveProduct = async (req: Request, res: Response) => {
    try {
        const user = req.user as { userId?: number } | undefined;
        const userId = user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: '인증 정보가 필요합니다.' });
        }

        const productId = parseInt(req.params.id as string);
        if (isNaN(productId)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }

        const result = await productService.saveProduct(userId, productId);
        
        res.status(200).json({ 
            data: { 
                saved: result.saved,
                message: result.message 
            } 
        });
    } catch (error) {
        console.error('Error saving product:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to save product.' });
    }
};

/**
 * 좋아요 토글
 */
export const toggleLikeProduct = async (req: Request, res: Response) => {
    try {
        const user = req.user as { userId?: number } | undefined;
        const userId = user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: '인증 정보가 필요합니다.' });
        }

        const productId = parseInt(req.params.id as string);
        if (isNaN(productId)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }

        const result = await productService.toggleLikeProduct(userId, productId);
        
        res.status(200).json({ 
            data: { 
                liked: result.liked,
                likeCount: result.likeCount 
            } 
        });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to toggle like.' });
    }
};

/**
 * 에셋 삭제 (브랜드 전용)
 */
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const user = req.user as { brandId?: number } | undefined;
        const brandId = user?.brandId;
        
        if (!brandId) {
            return res.status(401).json({ message: '인증 정보가 필요합니다.' });
        }

        const productId = parseInt(req.params.id as string);
        if (isNaN(productId)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }

        await productService.deleteProduct(productId, brandId);
        
        res.status(200).json({ success: true, message: '에셋이 삭제되었습니다.' });
    } catch (error) {
        const message = (error as Error).message;
        if (message.includes('Product not found')) {
            return res.status(404).json({ message });
        }
        if (message.includes('Unauthorized')) {
            return res.status(403).json({ message });
        }
        console.error('Error deleting product:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to delete product.' });
    }
};

/**
 * 에셋 추가 (브랜드 전용, 이미지만)
 */
export const createProduct = async (req: Request, res: Response) => {
    try {
        const user = req.user as { brandId?: number } | undefined;
        const brandId = user?.brandId;
        
        if (!brandId) {
            return res.status(401).json({ message: '인증 정보가 필요합니다.' });
        }

        const { productName, category, size } = req.body;
        const imageFile = req.file;

        if (!productName || !category || !size) {
            return res.status(400).json({ message: '에셋 이름, 카테고리, 사이즈는 필수입니다.' });
        }

        if (!imageFile) {
            return res.status(400).json({ message: '이미지 파일이 필요합니다.' });
        }

        // 이미지 파일인지 확인
        if (!imageFile.mimetype.startsWith('image/')) {
            return res.status(400).json({ message: '이미지 파일만 업로드할 수 있습니다.' });
        }

        // GCS에 업로드
        const { uploadFile } = await import('../services/fileService.js');
        const imagePath = await uploadFile(imageFile, `brand-assets/${brandId}/${Date.now()}-${imageFile.originalname}`);

        // DB에 저장
        const product = await productService.createProduct(brandId, productName, category, size, imagePath);

        res.status(201).json({ 
            data: product,
            message: '에셋이 추가되었습니다.' 
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to create product.' });
    }
};