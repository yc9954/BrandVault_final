// --- START OF FILE pages/MyProjects.tsx (프로젝트 목록 표시) ---

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserProjects } from '../../api/productApi';
import { getVideoInsertionStatus } from '../../api/videoInsertApi';
import styles from './MyProjects.module.css';

type Project = {
    project_id: number;
    project_name: string;
    description?: string;
    created_at: string;
    thumbnail_url?: string;
    status?: string;
    progress?: number;
    job_id?: string;
    products_used: any[];
};

function MyProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                setIsLoading(true);
                const data = await fetchUserProjects();
                setProjects(data);
            } catch (err) {
                setError('프로젝트 목록을 불러오는 데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        loadProjects();
    }, []);

    // 진행중인 프로젝트의 job_id 목록 추출
    const processingJobIds = useMemo(() => {
        return projects
            .filter(p => p.status === 'processing' && p.job_id)
            .map(p => p.job_id)
            .filter((id): id is string => !!id)
            .sort()
            .join(',');
    }, [projects.map(p => `${p.project_id}-${p.job_id}`).join(',')]);

    // 진행중인 프로젝트의 진행률 실시간 업데이트
    useEffect(() => {
        if (!processingJobIds) return;

        const jobIdList = processingJobIds.split(',').filter(id => id);
        if (jobIdList.length === 0) return;

        const updateProgress = async () => {
            // 현재 projects 상태에서 진행중인 프로젝트 찾기
            setProjects(prevProjects => {
                const processingProjects = prevProjects.filter(
                    p => p.status === 'processing' && p.job_id && jobIdList.includes(p.job_id)
                );

                if (processingProjects.length === 0) return prevProjects;

                // 각 진행중인 프로젝트의 상태 조회 (비동기로 실행하되 결과는 별도로 처리)
                Promise.all(
                    processingProjects.map(async (project) => {
                        if (!project.job_id) return null;
                        try {
                            const status = await getVideoInsertionStatus(project.job_id);
                            return {
                                project_id: project.project_id,
                                progress: status.progress,
                                status: status.status,
                            };
                        } catch (err) {
                            console.error(`프로젝트 ${project.project_id} 진행률 조회 실패:`, err);
                            return null;
                        }
                    })
                ).then(updates => {
                    setProjects(prevProjects => 
                        prevProjects.map(project => {
                            const update = updates.find(u => u && u.project_id === project.project_id);
                            if (update) {
                                return {
                                    ...project,
                                    progress: update.progress,
                                    status: update.status,
                                };
                            }
                            return project;
                        })
                    );
                }).catch(err => {
                    console.error('진행률 업데이트 실패:', err);
                });

                return prevProjects;
            });
        };

        // 즉시 한 번 실행
        updateProgress();

        // 2초마다 업데이트
        const interval = setInterval(updateProgress, 2000);

        return () => clearInterval(interval);
    }, [processingJobIds]);

    // 썸네일 URL 생성 (GCS Signed URL)
    const getThumbnailUrl = async (thumbnailPath: string | null | undefined): Promise<string | null> => {
        if (!thumbnailPath) return null;
        
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/api/file/url?filePath=${encodeURIComponent(thumbnailPath)}`,
                { credentials: 'include' }
            );
            if (response.ok) {
                const data = await response.json();
                return data.temporaryUrl;
            }
        } catch (err) {
            console.error('썸네일 URL 생성 실패:', err);
        }
        return null;
    };

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.stickyHeader}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>내 프로젝트</h1>
                    </div>
                    <Link to="/creator/project/create" className={styles.createButton}>
                        <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
                            <path d="M22.5 38V25.5H10v-3h12.5V10h3v12.5H38v3H25.5V38Z"/>
                        </svg>
                        새 프로젝트
                    </Link>
                </div>
            </div>
            
            {isLoading ? (
                <div className={styles.loader}>
                    <div className={styles.spinner}></div>
                </div>
            ) : projects.length === 0 ? (
                <div className={styles.emptyMessage}>
                    <p>아직 생성된 프로젝트가 없습니다.</p>
                    <Link to="/creator/project/create" className={styles.createLink}>
                        새 프로젝트 만들기
                    </Link>
                </div>
            ) : (
                <section className={styles.section}>
                    <div className={styles.grid}>
                        {projects.map(project => (
                            <ProjectCard key={project.project_id} project={project} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// 프로젝트 카드 컴포넌트
function ProjectCard({ project }: { project: Project }) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);
    
    // 에셋 개수에 따른 그리드 컬럼 수 계산
    const getGridColumns = (count: number) => {
        if (count === 1) return 1;
        if (count === 2) return 2;
        return 3;
    };
    
    const gridColumns = project.products_used ? getGridColumns(project.products_used.length) : 3;

    useEffect(() => {
        const loadThumbnail = async () => {
            if (project.thumbnail_url) {
                try {
                    const response = await fetch(
                        `${process.env.REACT_APP_API_URL}/api/file/url?filePath=${encodeURIComponent(project.thumbnail_url)}`,
                        { credentials: 'include' }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        setThumbnailUrl(data.temporaryUrl);
                    }
                } catch (err) {
                    console.error('썸네일 로드 실패:', err);
                }
            }
        };
        loadThumbnail();
    }, [project.thumbnail_url]);

    const formattedDate = new Date(project.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // 진행중인 프로젝트는 진행 상황 페이지로, 완료된 프로젝트는 상세 페이지로
    const projectLink = project.status === 'processing' && project.job_id
        ? `/creator/project/${project.project_id}/progress?jobId=${project.job_id}`
        : `/creator/project/${project.project_id}`;

    return (
        <Link to={projectLink} className={styles.projectCardLink}>
        <div className={styles.projectCard}>
            <div className={styles.thumbnail}>
                {thumbnailUrl ? (
                    <video src={thumbnailUrl} className={styles.thumbnailVideo} muted />
                ) : (
                    <div className={styles.thumbnailPlaceholder}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                    </div>
                )}
                {project.status === 'processing' && project.progress !== undefined && (
                    <div className={styles.progressOverlay}>
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill} 
                                style={{ width: `${project.progress}%` }}
                            />
                        </div>
                        <span className={styles.progressText}>{project.progress}%</span>
                    </div>
                )}
            </div>
            <div className={styles.projectInfo}>
                <h3 className={styles.projectName}>{project.project_name}</h3>
                <p className={styles.projectDate}>{formattedDate}</p>
                {project.products_used && project.products_used.length > 0 && (
                    <div 
                        className={styles.projectAssetsContainer}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <p className={styles.projectAssets}>
                            사용된 에셋: {project.products_used.length}개
                        </p>
                        {showTooltip && (
                            <div 
                                className={styles.tooltip}
                                style={{ '--grid-columns': gridColumns } as React.CSSProperties}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                <div className={styles.tooltipContent}>
                                    <div className={styles.tooltipList}>
                                        {project.products_used.map((product: any) => (
                                            <Link
                                                key={product.product_id}
                                                to={`/creator/product/${product.product_id}`}
                                                className={styles.tooltipItem}
                                            >
                                                {product.signedImageUrl ? (
                                                    <img 
                                                        src={product.signedImageUrl} 
                                                        alt={product.product_name || `에셋 #${product.product_id}`}
                                                        className={styles.tooltipImage}
                                                    />
                                                ) : (
                                                    <div className={styles.tooltipImagePlaceholder}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M6 42V6h36v36Zm3-3h30V9H9Zm0 0V9v30Zm4.2-4.1h21.6l-6.6-8.8-5.7 7.6-3.9-5.2Z"/>
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className={styles.tooltipHoverInfo}>
                                                    <div className={styles.tooltipProductName}>
                                                        {product.product_name || `에셋 #${product.product_id}`}
                                                    </div>
                                                    {product.brand && (
                                                        <div className={styles.tooltipBrandName}>
                                                            {product.brand.brand_name}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        </Link>
    );
}

export default MyProjects;