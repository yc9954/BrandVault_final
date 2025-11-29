import { prisma } from '../db.js'
import { getSignedUrl, deleteFile } from './fileService.js'

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
    videoPath: string | null,
    productIds: number[],
    status: 'pending' | 'processing' | 'completed' | 'failed' = 'completed'
) => {
    const project = await prisma.project.create({
        data: {
            project_name: projectName,
            creator_id: userId,
            thumbnail_url: videoPath, // 임시로 동영상 경로를 썸네일로 사용
            status: status,
            progress: status === 'processing' ? 0 : 100,
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

export const getProjectById = async (projectId: number, userId: number) => {
    const project = await prisma.project.findFirst({
        where: {
            project_id: projectId,
            creator_id: userId, // 본인의 프로젝트만 조회 가능
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
        }
    });

    if (!project) {
        throw new Error('Project not found');
    }

    // 비디오 URL 생성
    let videoUrl = null;
    if (project.thumbnail_url) {
        try {
            videoUrl = await getSignedUrl(project.thumbnail_url);
        } catch (error) {
            console.error(`비디오 URL 생성 실패 (Project ID: ${project.project_id}):`, error);
        }
    }

    // 각 에셋의 Signed URL 생성
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
        videoUrl,
        products_used: productsWithUrls,
        status: project.status,
        progress: project.progress,
        job_id: project.job_id,
    };
}

/**
 * 프로젝트 삭제
 */
export const deleteProject = async (projectId: number, userId: number) => {
    // 프로젝트가 존재하고 사용자가 소유자인지 확인
    const project = await prisma.project.findUnique({
        where: { project_id: projectId },
        select: { 
            creator_id: true,
            thumbnail_url: true,
            job_id: true,
            status: true,
        },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    if (project.creator_id !== userId) {
        throw new Error('Unauthorized: You do not have permission to delete this project');
    }

    // 진행 중인 작업이 있으면 jobStatusMap에서 제거 (작업은 계속 실행되지만 상태 조회는 불가능)
    if (project.job_id && project.status === 'processing') {
        try {
            const { cancelJob } = await import('./videoInsertJobService.js');
            cancelJob(project.job_id);
            console.log(`[DeleteProject] 진행 중인 작업 ${project.job_id} 취소됨`);
        } catch (error) {
            console.error(`[DeleteProject] 작업 취소 실패: ${project.job_id}`, error);
            // 작업 취소 실패해도 프로젝트 삭제는 진행
        }
    }

    // GCS 파일 삭제 (thumbnail_url이 있으면)
    if (project.thumbnail_url) {
        try {
            await deleteFile(project.thumbnail_url);
            console.log(`[DeleteProject] GCS 파일 삭제 성공: ${project.thumbnail_url}`);
        } catch (error) {
            console.error(`[DeleteProject] GCS 파일 삭제 실패: ${project.thumbnail_url}`, error);
            // GCS 삭제 실패해도 DB 삭제는 진행 (에러 로그만 남김)
        }
    }

    // 프로젝트 삭제 (관계된 데이터는 CASCADE로 자동 삭제)
    await prisma.project.delete({
        where: { project_id: projectId },
    });

    return { success: true };
}