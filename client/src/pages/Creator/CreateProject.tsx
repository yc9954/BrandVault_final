import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateProject.module.css';
import { fetchUserProducts, createProject } from '../../api/productApi';

type PurchasedProduct = {
  purchaseId: number;
  productId: number;
  productName: string;
  brandName: string;
  signedImageUrl: string | null;
  viewCount: number;
  downloadCount: number;
};

function CreateProject() {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [products, setProducts] = useState<PurchasedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [uploadedVideoPath, setUploadedVideoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 구매한 에셋 목록 로드
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const data = await fetchUserProducts(100, null); // 최대 100개까지
        setProducts(data.products);
      } catch (err) {
        setErrorMessage('에셋 목록을 불러오는 데 실패했습니다.');
        setShowErrorModal(true);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // 동영상 파일 선택 핸들러
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        const previewUrl = URL.createObjectURL(file);
        setVideoPreview(previewUrl);
        setError(null);
      } else {
        setErrorMessage('동영상 파일만 업로드할 수 있습니다.');
        setShowErrorModal(true);
      }
    }
  };

  // 에셋 선택/해제 핸들러
  const handleProductToggle = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // 동영상 업로드
  const uploadVideo = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/file/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('동영상 업로드에 실패했습니다.');
    }

    const data = await response.json();
    return data.gcsPath;
  };

  // 프로젝트 생성 핸들러
  const handleCreate = async () => {
    if (!videoFile) {
      setErrorMessage('동영상 파일을 선택해주세요.');
      setShowErrorModal(true);
      return;
    }

    if (selectedProducts.length === 0) {
      setErrorMessage('최소 1개 이상의 에셋을 선택해주세요.');
      setShowErrorModal(true);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // 1. 동영상 업로드
      const videoPath = await uploadVideo(videoFile);
      setUploadedVideoPath(videoPath);

      // 2. 프로젝트 생성 (백엔드에 저장)
      const projectName = `프로젝트 ${new Date().toLocaleDateString()}`;
      await createProject({
        projectName: projectName,
        videoPath: videoPath,
        productIds: selectedProducts,
      });

      // 3. 완료 상태로 변경
      setIsComplete(true);
    } catch (err) {
      const errorMsg = (err as Error).message || '프로젝트 생성에 실패했습니다.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setIsCreating(false);
    }
  };

  // 동영상 다운로드
  const handleDownload = async () => {
    if (!uploadedVideoPath) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/file/url?filePath=${encodeURIComponent(uploadedVideoPath)}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('다운로드 URL을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      window.open(data.temporaryUrl, '_blank');
      } catch (err) {
        setErrorMessage((err as Error).message || '다운로드에 실패했습니다.');
        setShowErrorModal(true);
      }
    };

  if (isComplete) {
    return (
      <div className={styles.container}>
        <div className={styles.completeContainer}>
          <div className={styles.completeIcon}>✓</div>
          <h2 className={styles.completeTitle}>제작이 완료되었습니다!</h2>
          <p className={styles.completeMessage}>
            동영상과 에셋이 성공적으로 합성되었습니다.
          </p>
          <div className={styles.buttonGroup}>
            <button onClick={handleDownload} className={styles.downloadButton}>
              동영상 다운로드
            </button>
            <button onClick={() => navigate('/creator/projects')} className={styles.backButton}>
              내 프로젝트 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>새 프로젝트 생성</h1>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← 뒤로가기
        </button>
      </div>

      {/* 에러 모달 */}
      {showErrorModal && (
        <div className={styles.modalOverlay} onClick={() => setShowErrorModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>오류</h3>
              <button 
                className={styles.modalCloseButton}
                onClick={() => setShowErrorModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>{errorMessage}</p>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.modalButton}
                onClick={() => setShowErrorModal(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {/* 동영상 업로드 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>동영상 업로드</h2>
          <div className={styles.videoUploadArea}>
            {videoPreview ? (
              <div className={styles.videoPreview}>
                <video src={videoPreview} controls className={styles.videoPlayer} />
                <button 
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreview(null);
                  }}
                  className={styles.removeButton}
                >
                  × 제거
                </button>
              </div>
            ) : (
              <label className={styles.uploadLabel}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className={styles.fileInput}
                />
                <div className={styles.uploadPlaceholder}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  <p>동영상 파일을 선택하거나 드래그하세요</p>
                </div>
              </label>
            )}
          </div>
        </section>

        {/* 에셋 선택 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>에셋 선택</h2>
          {isLoadingProducts ? (
            <div className={styles.loading}>에셋 목록을 불러오는 중...</div>
          ) : products.length === 0 ? (
            <div className={styles.emptyMessage}>
              구매한 에셋이 없습니다. <a href="/creator">에셋을 구매</a>해주세요.
            </div>
          ) : (
            <div className={styles.productGrid}>
              {products.map(product => (
                <div
                  key={product.purchaseId}
                  className={`${styles.productCard} ${selectedProducts.includes(product.productId) ? styles.selected : ''}`}
                  onClick={() => handleProductToggle(product.productId)}
                >
                  {product.signedImageUrl && (
                    <img src={product.signedImageUrl} alt={product.productName} className={styles.productImage} />
                  )}
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.productName}</h3>
                    <p className={styles.productBrand}>{product.brandName}</p>
                  </div>
                  {selectedProducts.includes(product.productId) && (
                    <div className={styles.checkmark}>✓</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 제작 버튼 */}
        <div className={styles.actionBar}>
          <button
            onClick={handleCreate}
            disabled={!videoFile || selectedProducts.length === 0 || isCreating}
            className={styles.createButton}
          >
            {isCreating ? '제작 중...' : '제작 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateProject;

