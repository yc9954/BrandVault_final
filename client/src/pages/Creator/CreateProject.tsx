import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateProject.module.css';
import { fetchUserProducts, createProject } from '../../api/productApi';
import { startVideoInsertion } from '../../api/videoInsertApi';

type PurchasedProduct = {
  purchaseId: number;
  productId: number;
  productName: string;
  brandName: string;
  signedImageUrl: string | null;
  viewCount: number;
  downloadCount: number;
  assetFormats?: string[]; // 에셋 형식 (예: ['png', 'jpg'] 또는 ['splat', 'glb'])
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
  const [selectedAssetForInsertion, setSelectedAssetForInsertion] = useState<number | null>(null);
  const [insertionPosition, setInsertionPosition] = useState<{ x: number; y: number } | null>(null);
  const [isProcessingInsertion, setIsProcessingInsertion] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<PurchasedProduct[]>([]);
  const [showInsertionInfoModal, setShowInsertionInfoModal] = useState(false);
  const [projectName, setProjectName] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // 구매한 에셋 목록 로드
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const data = await fetchUserProducts(100, null); // 최대 100개까지
        setProducts(data.products);
        setFilteredProducts(data.products);
      } catch (err) {
        setErrorMessage('에셋 목록을 불러오는 데 실패했습니다.');
        setShowErrorModal(true);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // 검색 필터링 (디바운싱)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchKeyword || searchKeyword.trim() === '') {
        setFilteredProducts(products);
      } else {
        const keyword = searchKeyword.trim().toLowerCase();
        const filtered = products.filter(product => 
          product.productName.toLowerCase().includes(keyword) ||
          product.brandName.toLowerCase().includes(keyword)
        );
        setFilteredProducts(filtered);
      }
    }, 500); // 500ms 디바운싱 (프로덕트 라이브러리와 동일)

    return () => clearTimeout(timeoutId);
  }, [searchKeyword, products]);

  // 동영상 파일 선택 핸들러
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        const previewUrl = URL.createObjectURL(file);
        setVideoPreview(previewUrl);
        setError(null);
        setIsVideoLoaded(false); // 새 비디오 로드 시 리셋
      } else {
        setErrorMessage('동영상 파일만 업로드할 수 있습니다.');
        setShowErrorModal(true);
      }
    }
  };

  // 비디오 메타데이터 로드 핸들러
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setIsVideoLoaded(true);
      console.log('비디오 로드 완료:', {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  // 에셋 선택/해제 핸들러
  const handleProductToggle = (productId: number) => {
    const product = products.find(p => p.productId === productId);
    
    // 선택하려는 경우 이미지 형식인지 체크
    if (product && !selectedProducts.includes(productId)) {
      const isImageFormat = checkIfImageFormat(product);
      if (!isImageFormat) {
        setErrorMessage(`"${product.productName}"은(는) 이미지 형식이 아닙니다. 비디오에 삽입하려면 이미지 형식의 에셋을 선택해주세요.`);
        setShowErrorModal(true);
        return; // 선택하지 않음
      }
    }
    
    const wasEmpty = selectedProducts.length === 0;
    const isDeselecting = selectedProducts.includes(productId);
    
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
    
    // 에셋 선택 해제 시 삽입 위치 초기화
    if (isDeselecting) {
      setSelectedAssetForInsertion(null);
      setInsertionPosition(null);
    }
    
    // 비디오 삽입용 에셋도 함께 선택/해제
    if (selectedAssetForInsertion === productId) {
      setSelectedAssetForInsertion(null);
      setInsertionPosition(null);
    }
  };

  // 에셋과 비디오가 모두 선택되었을 때 중앙에 삽입 위치 자동 설정 및 안내 모달 표시
  useEffect(() => {
    if (selectedProducts.length > 0 && videoFile && isVideoLoaded && !showInsertionInfoModal) {
      // 삽입 위치가 없으면 중앙에 설정
      if (!insertionPosition && videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
        const centerX = Math.round(videoRef.current.videoWidth / 2);
        const centerY = Math.round(videoRef.current.videoHeight / 2);
        setInsertionPosition({ x: centerX, y: centerY });
      }
      // 안내 모달 표시 (한 번만)
      setShowInsertionInfoModal(true);
    }
  }, [selectedProducts.length, videoFile, isVideoLoaded]);

  // 비디오에 이미지 삽입용 에셋 선택
  const handleAssetForInsertionSelect = (productId: number) => {
    if (selectedProducts.includes(productId)) {
      setSelectedAssetForInsertion(productId);
      setInsertionPosition(null);
    }
  };

  // 비디오 프리뷰 클릭 핸들러 (이미지 삽입 위치 지정)
  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!videoRef.current || selectedProducts.length === 0) return;

    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 비디오 컨트롤 바 영역(하단 약 50px)은 클릭 무시
    const controlBarHeight = 50;
    if (y > rect.height - controlBarHeight) {
      return;
    }

    // 비디오의 실제 크기에 맞춰 좌표 조정
    const scaleX = (video.videoWidth || rect.width) / rect.width;
    const scaleY = (video.videoHeight || rect.height) / rect.height;

    setInsertionPosition({
      x: Math.round(x * scaleX),
      y: Math.round(y * scaleY),
    });
  };

  // 에셋이 이미지 형식인지 확인 (URL 확장자로만 체크)
  const checkIfImageFormat = (product: PurchasedProduct): boolean => {
    if (!product.signedImageUrl) {
      return false;
    }

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
    const urlLower = product.signedImageUrl.toLowerCase();
    
    // URL에 이미지 확장자가 포함되어 있는지 확인
    return imageExtensions.some(ext => urlLower.includes(ext));
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
      // 비디오가 로드되지 않았으면 에러
      if (!isVideoLoaded || !videoRef.current || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        setErrorMessage('비디오가 로드될 때까지 기다려주세요. 비디오 프리뷰가 완전히 로드된 후 다시 시도해주세요.');
        setShowErrorModal(true);
        setIsCreating(false);
        return;
      }

      // 프로젝트 생성 (processing 상태로 생성)
      const finalProjectName = projectName.trim() || `프로젝트 ${new Date().toLocaleDateString()}`;
      const project = await createProject({
        projectName: finalProjectName,
        videoPath: null, // 비디오 삽입 완료 후 업데이트됨
        productIds: selectedProducts,
        status: 'processing',
      });

      // 비디오에 이미지 삽입 작업 시작 (비동기)
      if (selectedProducts.length > 0) {
        const firstProductId = selectedProducts[0];
        const selectedProduct = products.find(p => p.productId === firstProductId);
        
        if (selectedProduct && selectedProduct.signedImageUrl) {
          const video = videoRef.current!;
          let targetX: number;
          let targetY: number;
          
          if (insertionPosition) {
            targetX = insertionPosition.x;
            targetY = insertionPosition.y;
          } else {
            targetX = Math.round(video.videoWidth / 2);
            targetY = Math.round(video.videoHeight / 2);
          }

          // 비동기 작업 시작
          const jobResult = await startVideoInsertion({
            video: videoFile,
            projectId: project.data.project_id,
            objectImageUrl: selectedProduct.signedImageUrl,
            targetX: targetX,
            targetY: targetY,
          });

          // 진행 상황 페이지로 이동
          navigate(`/creator/project/${project.data.project_id}/progress?jobId=${jobResult.jobId}`);
          return;
        }
      }

      // 이미지 삽입이 필요 없는 경우 (에셋이 이미지가 아닌 경우 등)
      // 원본 비디오 업로드
      const videoPath = await uploadVideo(videoFile);

      // 프로젝트 업데이트 (완료 상태로)
      await createProject({
        projectName: finalProjectName,
        videoPath: videoPath,
        productIds: selectedProducts,
        status: 'completed',
      });

      // 완료 상태로 변경
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>새 프로젝트 생성</h1>
      </div>
      
      <div className={styles.projectNameSection}>
        <input
          type="text"
          className={styles.projectNameInput}
          placeholder="프로젝트 이름을 입력하세요"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
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
        <div className={styles.mainContent}>
          {/* 동영상 업로드 섹션 */}
          <section className={styles.section}>
            {videoPreview ? (
              <div className={styles.videoPreview} ref={videoContainerRef}>
                <video 
                  ref={videoRef}
                  src={processedVideoUrl || videoPreview} 
                  controls 
                  controlsList="nodownload nofullscreen"
                  className={styles.videoPlayer}
                  onClick={handleVideoClick}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                />
                {insertionPosition && (
                  <div 
                    className={styles.positionMarker}
                    style={{
                      left: `${(insertionPosition.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
                      top: `${(insertionPosition.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
                    }}
                  >
                    <div className={styles.markerDot}></div>
                  </div>
                )}
                {showInsertionInfoModal && (
                  <div 
                    className={styles.insertionInfoModal}
                    onClick={() => setShowInsertionInfoModal(false)}
                  >
                    <div className={styles.insertionInfoContent}>
                      <p>
                        선택한 첫 번째 에셋 이미지가 비디오 중앙에 자동으로 삽입됩니다.
                        비디오 프리뷰를 클릭하여 삽입 위치를 변경할 수 있습니다.
                      </p>
                    </div>
                  </div>
                )}
                {insertionPosition && (
                  <div className={styles.positionInfoFixed}>
                    삽입 위치: ({insertionPosition.x}, {insertionPosition.y})
                  </div>
                )}
                <button 
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreview(null);
                    setProcessedVideoUrl(null);
                    setSelectedAssetForInsertion(null);
                    setInsertionPosition(null);
                    setShowInsertionInfoModal(false);
                  }}
                  className={styles.removeButton}
                >
                  × 제거
                </button>
              </div>
            ) : (
              <div className={styles.videoUploadArea}>
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
              </div>
            )}
          </section>

          {/* 에셋 선택 섹션 */}
          <section className={styles.section}>
            {/* 검색 입력 */}
            <div className={styles.searchBox}>
              <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="#777">
                <path d="M39.8 41.95 26.6 28.75q-1.5 1.3-3.5 2.025-2 .725-4.25 .725-5.4 0-9.15-3.75T6 18.6q0-5.3 3.75-9.05T18.85 5.8q5.3 0 9.05 3.75t3.75 9.05q0 2.25-.725 4.25-.725 2-2.025 3.5l13.2 13.2ZM19 30q4.6 0 7.8-3.2t3.2-7.8q0-4.6-3.2-7.8T19 8q-4.6 0-7.8 3.2T8 19q0 4.6 3.2 7.8T19 30Z"/>
              </svg>
              <input 
                type="text" 
                placeholder="브랜드 또는 에셋을 검색하세요..." 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            {isLoadingProducts ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
              </div>
            ) : products.length === 0 ? (
              <div className={styles.emptyMessage}>
                구매한 에셋이 없습니다. <a href="/creator">에셋을 구매</a>해주세요.
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className={styles.emptyMessage}>
                검색 결과가 없습니다.
              </div>
            ) : (
              <div className={styles.productGrid}>
                {filteredProducts.map(product => (
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
        </div>

        {/* 제작 버튼 */}
        <div className={styles.actionBar}>
          <button
            onClick={handleCreate}
            disabled={!videoFile || selectedProducts.length === 0 || isCreating || !isVideoLoaded}
            className={styles.createButton}
          >
            {!isVideoLoaded ? '비디오 로딩 중...' : isCreating ? '제작 중... (이미지 삽입 처리 중)' : '제작 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateProject;

