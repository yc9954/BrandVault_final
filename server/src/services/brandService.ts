import type { Brand } from '@prisma/client';
import { getSignedUrl } from './fileService.js';
import { prisma } from '../db.js'

const FEATURED_BRAND_LIMIT = 8;

// 💡 응답 타입 정의: Brand 타입에 signedLogoUrl 필드를 추가
type BrandWithUrl = Brand & { signedLogoUrl: string | null };

/**
 * Featured Brand 목록을 조회하고 Signed URL을 생성하여 반환합니다.
 */
export const fetchFeatureBrandList = async (): Promise<BrandWithUrl[]> => {
    try {
        // 1. DB에서 브랜드 목록을 가져옵니다.
        const brands = await prisma.brand.findMany({
            // 예시: 가장 많은 자산을 가진 브랜드 순으로 정렬
            orderBy: {
                asset_count: 'desc', 
            },
            take: FEATURED_BRAND_LIMIT, 
        });

        const brandsWithUrls = await Promise.all(
            brands.map(async (brand) => {
                let signedLogoUrl: string | null = null;
                
                // logo_url이 DB에 있는 경우에만 Signed URL 생성 시도
                if (brand.logo_url) {
                    try {
                        // 비동기 함수 호출
                        signedLogoUrl = await getSignedUrl(brand.logo_url);
                    } catch (error) {
                        console.error(`Signed URL 생성 실패 (Brand ID: ${brand.brand_id}):`, error);
                    }
                }
                
                // 원본 brand 객체에 signedLogoUrl 속성을 추가하여 반환
                return {
                    ...brand,
                    signedLogoUrl: signedLogoUrl,
                };
            })
        );

        return brandsWithUrls;

    } catch (error) {
        console.error('Error fetching feature brand list:', error);
        throw new Error('Failed to fetch feature brand list.');
    }
};

/**
 * 키워드로 브랜드를 검색하고 Signed URL을 생성하여 반환합니다.
 */
export const searchBrands = async (keyword: string, limit: number = 10): Promise<BrandWithUrl[]> => {
    if (!keyword || keyword.trim() === '') {
        return [];
    }

    try {
        const brands = await prisma.brand.findMany({
            where: {
                brand_name: {
                    contains: keyword,
                    mode: 'insensitive',
                },
            },
            take: limit,
            orderBy: {
                asset_count: 'desc',
            },
        });

        const brandsWithUrls = await Promise.all(
            brands.map(async (brand) => {
                let signedLogoUrl: string | null = null;
                
                if (brand.logo_url) {
                    try {
                        signedLogoUrl = await getSignedUrl(brand.logo_url);
                    } catch (error) {
                        console.error(`Signed URL 생성 실패 (Brand ID: ${brand.brand_id}):`, error);
                    }
                }
                
                return {
                    ...brand,
                    signedLogoUrl: signedLogoUrl,
                };
            })
        );

        return brandsWithUrls;
    } catch (error) {
        console.error('Error searching brands:', error);
        throw new Error('Failed to search brands.');
    }
};