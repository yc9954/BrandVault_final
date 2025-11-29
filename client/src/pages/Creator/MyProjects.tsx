// --- START OF FILE pages/MyProjects.tsx (프로젝트 목록 표시) ---

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserProjects, deleteProject } from '../../api/productApi';
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
    const [deleteModal, setDeleteModal] = useState<{ projectId: number; projectName: string } | null>(null);
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const connectedJobIdsRef = useRef<Set<string>>(new Set()); // 이미 연결된 jobId 추적
    const eventSourcesRef = useRef<Map<string, EventSource>>(new Map()); // jobId별 EventSource 추적

    useEffect(() => {
        const loadProjects = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await fetchUserProjects();
                setProjects(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('프로젝트 목록 로딩 실패:', err);
                setError('프로젝트 목록을 불러오는 데 실패했습니다.');
                setProjects([]); // 에러 발생 시 빈 배열로 설정
            } finally {
                setIsLoading(false);
            }
        };

        loadProjects();
    }, []);

    // 진행중인 프로젝트의 진행률 실시간 업데이트 (SSE 사용)
    useEffect(() => {
        // 진행중인 프로젝트 찾기
        const processingProjects = projects.filter(p => p.status === 'processing' && p.job_id);
        
        // 완료된 프로젝트의 SSE 연결 정리
        const currentJobIds = new Set(processingProjects.map(p => p.job_id).filter((id): id is string => !!id));
        eventSourcesRef.current.forEach((eventSource, jobId) => {
            if (!currentJobIds.has(jobId)) {
                console.log(`[SSE] 완료된 프로젝트 연결 정리: jobId=${jobId}`);
                try {
                    if (eventSource.readyState !== EventSource.CLOSED) {
                        eventSource.close();
                    }
                } catch (err) {
                    console.error(`[SSE] 연결 종료 실패: jobId=${jobId}`, err);
                }
                eventSourcesRef.current.delete(jobId);
                connectedJobIdsRef.current.delete(jobId);
            }
        });

        // 새로운 진행중인 프로젝트에 대해 SSE 연결 생성
        processingProjects.forEach(project => {
            if (!project.job_id || connectedJobIdsRef.current.has(project.job_id)) {
                // 이미 연결된 jobId는 스킵
                return;
            }
            
            const jobId = project.job_id;
            connectedJobIdsRef.current.add(jobId);
            const sseUrl = `${process.env.REACT_APP_API_URL}/api/video-insertion/status/${jobId}`;
            console.log(`[SSE] 연결 시도: 프로젝트 ${project.project_id}, jobId: ${jobId}, URL: ${sseUrl}`);
            
            try {
                const eventSource = new EventSource(sseUrl, { withCredentials: true });
                eventSourcesRef.current.set(jobId, eventSource);

                eventSource.onopen = () => {
                    console.log(`[SSE] 연결 성공: 프로젝트 ${project.project_id}, jobId: ${jobId}`);
                };

                eventSource.onmessage = (event) => {
                    try {
                        console.log(`[SSE] 메시지 수신: 프로젝트 ${project.project_id}`, event.data);
                        const data = JSON.parse(event.data);
                        setProjects(prevProjects => 
                            prevProjects.map(p => 
                                p.project_id === project.project_id
                                    ? { 
                                        ...p, 
                                        status: data.status, 
                                        progress: data.progress,
                                        ...(data.thumbnail_url && { thumbnail_url: data.thumbnail_url })
                                      }
                                    : p
                            )
                        );
                        
                        // 완료되면 SSE 연결 종료
                        if (data.status === 'completed' || data.status === 'failed') {
                            console.log(`[SSE] 작업 완료로 연결 종료: 프로젝트 ${project.project_id}, 상태: ${data.status}`);
                            eventSource.close();
                            eventSourcesRef.current.delete(jobId);
                            connectedJobIdsRef.current.delete(jobId);
                        }
                    } catch (err) {
                        console.error(`[SSE] 메시지 파싱 실패 (프로젝트 ${project.project_id}):`, err, '원본 데이터:', event.data);
                    }
                };

                eventSource.onerror = (err) => {
                    console.error(`[SSE] 연결 오류 (프로젝트 ${project.project_id}, jobId: ${jobId}):`, {
                        error: err,
                        readyState: eventSource.readyState, // 0: CONNECTING, 1: OPEN, 2: CLOSED
                        url: sseUrl,
                    });
                    
                    // readyState가 2(CLOSED)이면 연결이 완전히 종료된 상태
                    if (eventSource.readyState === EventSource.CLOSED) {
                        console.log(`[SSE] 연결이 종료되었습니다 (프로젝트 ${project.project_id})`);
                        eventSourcesRef.current.delete(jobId);
                        connectedJobIdsRef.current.delete(jobId);
                    }
                };
            } catch (err) {
                console.error(`[SSE] 연결 생성 실패 (프로젝트 ${project.project_id}, jobId: ${jobId}):`, err);
                connectedJobIdsRef.current.delete(jobId);
            }
        });

        // 컴포넌트 언마운트 시 모든 SSE 연결 정리
        return () => {
            console.log(`[SSE] useEffect 정리: ${eventSourcesRef.current.size}개 연결 종료`);
            eventSourcesRef.current.forEach((eventSource, jobId) => {
                try {
                    if (eventSource.readyState !== EventSource.CLOSED) {
                        eventSource.close();
                    }
                } catch (err) {
                    console.error(`[SSE] 연결 종료 실패: jobId=${jobId}`, err);
                }
            });
            eventSourcesRef.current.clear();
            connectedJobIdsRef.current.clear();
        };
    }, [projects.length]); // projects 배열 길이만 추적하여 불필요한 재실행 방지

    // 프로젝트 삭제 핸들러
    const handleDeleteClick = (e: React.MouseEvent, projectId: number, projectName: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteModal({ projectId, projectName });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal) return;

        try {
            await deleteProject(deleteModal.projectId);
            setProjects(prevProjects => prevProjects.filter(p => p.project_id !== deleteModal.projectId));
            setDeleteModal(null);
        } catch (err) {
            console.error('프로젝트 삭제 실패:', err);
            alert('프로젝트 삭제에 실패했습니다: ' + ((err as Error).message || '알 수 없는 오류'));
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModal(null);
    };

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

    // 프로젝트 이름으로 필터링
    const filteredProjects = projects.filter(project => 
        project.project_name.toLowerCase().includes(searchKeyword.toLowerCase())
    );

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
                
                {/* 검색 바 */}
                <div className={styles.searchBox}>
                    <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="#777">
                        <path d="M39.8 41.95 26.6 28.75q-1.5 1.3-3.5 2.025-2 .725-4.25 .725-5.4 0-9.15-3.75T6 18.6q0-5.3 3.75-9.05T18.85 5.8q5.3 0 9.05 3.75t3.75 9.05q0 2.25-.725 4.25-.725 2-2.025 3.5l13.2 13.2ZM19 30q4.6 0 7.8-3.2t3.2-7.8q0-4.6-3.2-7.8T19 8q-4.6 0-7.8 3.2T8 19q0 4.6 3.2 7.8T19 30Z"/>
                    </svg>
                    <input 
                        type="text" 
                        placeholder="프로젝트 이름으로 검색..." 
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                    />
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
            ) : filteredProjects.length === 0 ? (
                <div className={styles.emptyMessage}>
                    <p>검색 결과가 없습니다.</p>
                </div>
            ) : (
                <>
                    <section className={styles.section}>
                        <div className={styles.grid}>
                            {filteredProjects.map(project => (
                                <ProjectCard 
                                    key={project.project_id} 
                                    project={project} 
                                    onDelete={handleDeleteClick}
                                />
                            ))}
                        </div>
                    </section>
                    
                    {/* 삭제 확인 모달 */}
                    {deleteModal && (
                        <div className={styles.modalOverlay} onClick={handleDeleteCancel}>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                <p className={styles.modalMessage}>
                                    "{deleteModal.projectName}" 프로젝트를 지우시겠습니까?
                                </p>
                                <div className={styles.modalButtons}>
                                    <button 
                                        className={styles.modalButtonCancel} 
                                        onClick={handleDeleteCancel}
                                    >
                                        취소
                                    </button>
                                    <button 
                                        className={styles.modalButtonConfirm} 
                                        onClick={handleDeleteConfirm}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// 프로젝트 카드 컴포넌트
function ProjectCard({ project, onDelete }: { project: Project; onDelete: (e: React.MouseEvent, projectId: number, projectName: string) => void }) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const navigate = useNavigate();
    
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
            } else {
                // thumbnail_url이 없으면 썸네일 초기화
                setThumbnailUrl(null);
            }
        };
        loadThumbnail();
    }, [project.thumbnail_url, project.status]);

    const formattedDate = new Date(project.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // 진행중인 프로젝트는 진행 상황 페이지로, 완료된 프로젝트는 상세 페이지로
    const projectLink = project.status === 'processing' && project.job_id
        ? `/creator/project/${project.project_id}/progress?jobId=${project.job_id}`
        : `/creator/project/${project.project_id}`;

    const handleCardClick = (e: React.MouseEvent) => {
        // 삭제 버튼이나 툴팁 내부 링크 클릭 시에는 네비게이션하지 않음
        if ((e.target as HTMLElement).closest(`.${styles.deleteButton}`) || 
            (e.target as HTMLElement).closest(`.${styles.tooltip}`)) {
            return;
        }
        navigate(projectLink);
    };

    return (
        <div className={styles.projectCardWrapper}>
            <div 
                className={styles.projectCardLink}
                onClick={handleCardClick}
                style={{ cursor: 'pointer' }}
            >
            <div className={styles.projectCard}>
                <button
                    className={styles.deleteButton}
                    onClick={(e) => onDelete(e, project.project_id, project.project_name)}
                    aria-label="프로젝트 삭제"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
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
                                                onClick={(e) => e.stopPropagation()}
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
        </div>
        </div>
    );
}

export default MyProjects;