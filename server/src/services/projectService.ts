import { prisma } from '../db.js'
import { getSignedUrl } from './fileService.js'

export const getUserProjects = async (userId: number) => {
    const projects = await prisma.project.findMany({
        where: {
            creator_id: userId,
        },
        include: {
            creator: {
                select: {
                    user_name: true,
                }
            },
            products_used: {
                select: {
                    product_id: true,
                    product_name: true,
                    image_url: true,
                    category: true,
                    brand: {
                        select: {
                            brand_id: true,
                            brand_name: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            created_at: 'desc'
        }
    })

    // 각 프로젝트의 products_used에 Signed URL 추가
    const projectsWithUrls = await Promise.all(
        projects.map(async (project) => {
            const productsWithUrls = await Promise.all(
                project.products_used.map(async (product) => {
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
                        signedImageUrl,
                    };
                })
            );
            return {
                ...project,
                products_used: productsWithUrls,
            };
        })
    );

    return projectsWithUrls;
}

export const createProject = async (
    userId: number,
    projectName: string,
    videoPath: string,
    productIds: number[]
) => {
    const project = await prisma.project.create({
        data: {
            project_name: projectName,
            creator_id: userId,
            thumbnail_url: videoPath, // 임시로 동영상 경로를 썸네일로 사용
            products_used: {
                connect: productIds.map(id => ({ product_id: id }))
            }
        },
        include: {
            products_used: true
        }
    });
    return project;
}