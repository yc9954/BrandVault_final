import type { Request, Response } from 'express';
// 💡 Service 함수 임포트
import * as brandService from '../services/brandService.js'; 

/**
 * Featured Brand 목록을 반환하는 Controller 함수.
 * Service에서 이미 Signed URL이 포함된 데이터를 받아 처리합니다.
 */
export const getFeatureBrandList = async (req: Request, res: Response) => {
    try {
        // Service 호출
        const brands = await brandService.fetchFeatureBrandList(); 

        res.status(200).json({
            data: brands,
            meta: {
                count: brands.length,
            },
        });

    } catch (error) {
        console.error('Error in getFeatureBrandList:', error);
        // 클라이언트에게는 일반적인 500 에러 메시지를 전달
        res.status(500).json({ message: 'Failed to fetch featured brand list.' });
    }
};

/**
 * 키워드로 브랜드를 검색합니다.
 */
export const searchBrandsController = async (req: Request, res: Response) => {
    try {
        const keyword = req.query.keyword as string;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!keyword || keyword.trim() === '') {
            return res.status(200).json({ data: [] });
        }

        const brands = await brandService.searchBrands(keyword.trim(), limit);

        res.status(200).json({ data: brands });
    } catch (error) {
        console.error('Error searching brands:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to search brands.' });
    }
};

/**
 * 브랜드 ID로 브랜드 정보와 에셋 목록을 조회합니다.
 */
export const getBrandById = async (req: Request, res: Response) => {
    try {
        const brandId = parseInt(req.params.id as string);
        
        if (isNaN(brandId)) {
            return res.status(400).json({ message: 'Invalid brand ID.' });
        }

        const result = await brandService.fetchBrandById(brandId);

        res.status(200).json({ data: result });
    } catch (error) {
        const message = (error as Error).message;
        if (message.includes('Brand not found')) {
            return res.status(404).json({ message });
        }
        
        console.error('Error fetching brand by ID:', error);
        res.status(500).json({ message: 'Failed to fetch brand details.' });
    }
};

/**
 * 인증된 브랜드의 모든 에셋 목록을 조회합니다.
 */
export const getBrandAssets = async (req: Request, res: Response) => {
    try {
        const user = req.user as { brandId?: number } | undefined;
        const brandId = user?.brandId;
        
        if (!brandId) {
            return res.status(401).json({ message: '인증 정보가 필요합니다.' });
        }

        const assets = await brandService.getBrandAssets(brandId);
        
        res.status(200).json({ data: assets });
    } catch (error) {
        console.error('Error fetching brand assets:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to fetch brand assets.' });
    }
};