import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchProjectById } from '../../api/productApi';
import styles from './ProjectDetail.module.css';

function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadProject = async () => {
      try {
        setIsLoading(true);
        const response = await fetchProjectById(parseInt(id));
        setProject(response.data);
      } catch (err) {
        setError((err as Error).message || '프로젝트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [id]);

  const formattedDate = project
    ? new Date(project.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error || '프로젝트를 찾을 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{project.project_name}</h1>
        <div className={styles.date}>{formattedDate}</div>
      </div>

      <div className={styles.content}>
        {/* 비디오 프리뷰 섹션 */}
        <section className={styles.videoSection}>
          <div className={styles.videoContainer}>
            {project.videoUrl ? (
              <video
                src={project.videoUrl}
                controls
                controlsList="nodownload nofullscreen"
                className={styles.videoPlayer}
                autoPlay
                muted
              />
            ) : (
              <div className={styles.videoPlaceholder}>
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <p>비디오를 불러올 수 없습니다</p>
              </div>
            )}
          </div>
        </section>

        {/* 사용된 에셋 섹션 */}
        <section className={styles.assetsSection}>
          <h2 className={styles.sectionTitle}>사용된 에셋</h2>
          {project.products_used && project.products_used.length > 0 ? (
            <div className={styles.assetsGrid}>
              {project.products_used.map((product: any) => (
                <Link
                  key={product.product_id}
                  to={`/creator/product/${product.product_id}`}
                  className={styles.assetCard}
                >
                  {product.signedImageUrl ? (
                    <img
                      src={product.signedImageUrl}
                      alt={product.product_name}
                      className={styles.assetImage}
                    />
                  ) : (
                    <div className={styles.assetPlaceholder}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                  <div className={styles.assetInfo}>
                    <h3 className={styles.assetName}>{product.product_name}</h3>
                    {product.brand && (
                      <p className={styles.assetBrand}>{product.brand.brand_name}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyMessage}>
              <p>사용된 에셋이 없습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ProjectDetail;

