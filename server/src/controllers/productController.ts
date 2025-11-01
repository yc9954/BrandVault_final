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

export const handleGetUserProducts = async (req: Request, res: Response) => {
    try {
        const brandId = req.user.brandId;
        if (!brandId) {
            return res.status(401).json({message: '비정상적인 접근입니다.'});
        }
        const products = await productService.getUserProducts(brandId);
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: `Failed to fetch user's products.`, error});
    }
}