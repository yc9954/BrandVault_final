import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateProject.module.css';
import { fetchUserProducts, createProject } from '../../api/productApi';
import { processVideoInsertion } from '../../api/videoInsertApi';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

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
      // 확장자명 추출 및 로그 출력
      if (product.signedImageUrl) {
        const url = product.signedImageUrl.toLowerCase();
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
        const foundExtension = imageExtensions.find(ext => url.includes(ext));
        console.log('에셋 선택 - 확장자명:', foundExtension || '확장자 없음', 'URL:', product.signedImageUrl);
      } else {
        console.log('에셋 선택 - signedImageUrl 없음:', product.productName);
      }
      
      const isImageFormat = checkIfImageFormat(product);
      console.log('이미지 형식 여부:', isImageFormat, '에셋명:', product.productName);
      
      if (!isImageFormat) {
        setErrorMessage(`"${product.productName}"은(는) 이미지 형식이 아닙니다. 비디오에 삽입하려면 이미지 형식의 에셋을 선택해주세요.`);
        setShowErrorModal(true);
        return; // 선택하지 않음
      }
    }
    
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
    // 비디오 삽입용 에셋도 함께 선택/해제
    if (selectedAssetForInsertion === productId) {
      setSelectedAssetForInsertion(null);
      setInsertionPosition(null);
    }
  };

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

  // 비디오에 이미지 삽입 처리
  const handleVideoInsertion = async () => {
    if (!videoFile || !selectedAssetForInsertion || !insertionPosition) {
      setErrorMessage('동영상, 에셋, 삽입 위치를 모두 선택해주세요.');
      setShowErrorModal(true);
      return;
    }

    setIsProcessingInsertion(true);
    setError(null);

    try {
      // 선택된 에셋 찾기
      const selectedProduct = products.find(p => p.productId === selectedAssetForInsertion);
      if (!selectedProduct || !selectedProduct.signedImageUrl) {
        throw new Error('선택된 에셋의 이미지를 찾을 수 없습니다.');
      }

      // 비디오에 이미지 삽입 API 호출 (이미지 URL을 직접 전달)
      const result = await processVideoInsertion({
        video: videoFile,
        objectImageUrl: selectedProduct.signedImageUrl,
        targetX: insertionPosition.x,
        targetY: insertionPosition.y,
      });

      if (result.success && result.gcsPath) {
        // 처리된 비디오 URL 가져오기
        const urlResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/api/file/url?filePath=${encodeURIComponent(result.gcsPath)}`,
          { credentials: 'include' }
        );
        if (urlResponse.ok) {
          const urlData = await urlResponse.json();
          setProcessedVideoUrl(urlData.temporaryUrl);
          setUploadedVideoPath(result.gcsPath);
        }
      } else {
        throw new Error(result.error || '비디오 삽입에 실패했습니다.');
      }
    } catch (err) {
      const errorMsg = (err as Error).message || '비디오 삽입에 실패했습니다.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setIsProcessingInsertion(false);
    }
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
      let videoPath = uploadedVideoPath;

      // 첫 번째 선택된 에셋으로 비디오에 이미지 삽입 시도
      if (selectedProducts.length > 0) {
        // 비디오가 로드되지 않았으면 에러
        if (!isVideoLoaded || !videoRef.current || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
          setErrorMessage('비디오가 로드될 때까지 기다려주세요. 비디오 프리뷰가 완전히 로드된 후 다시 시도해주세요.');
          setShowErrorModal(true);
          setIsCreating(false);
          return;
        }

        try {
          const firstProductId = selectedProducts[0];
          const selectedProduct = products.find(p => p.productId === firstProductId);
          
          if (selectedProduct && selectedProduct.signedImageUrl) {
            // 비디오 중앙에 삽입 (또는 사용자가 지정한 위치)
            const video = videoRef.current;
            let targetX: number;
            let targetY: number;
            
            if (insertionPosition) {
              // 사용자가 지정한 위치 사용
              targetX = insertionPosition.x;
              targetY = insertionPosition.y;
            } else {
              // 비디오 중앙
              targetX = Math.round(video.videoWidth / 2);
              targetY = Math.round(video.videoHeight / 2);
            }

            console.log('비디오에 이미지 삽입 시작:', { targetX, targetY, productName: selectedProduct.productName });

            // 비디오에 이미지 삽입 API 호출 (이미지 URL을 직접 전달)
            const result = await processVideoInsertion({
              video: videoFile,
              objectImageUrl: selectedProduct.signedImageUrl,
              targetX: targetX,
              targetY: targetY,
            });

            if (result.success && result.gcsPath) {
              console.log('비디오에 이미지 삽입 성공:', result.gcsPath);
              videoPath = result.gcsPath;
              setUploadedVideoPath(videoPath);
              
              // 처리된 비디오 URL 가져오기
              const urlResponse = await fetch(
                `${process.env.REACT_APP_API_URL}/api/file/url?filePath=${encodeURIComponent(result.gcsPath)}`,
                { credentials: 'include' }
              );
              if (urlResponse.ok) {
                const urlData = await urlResponse.json();
                setProcessedVideoUrl(urlData.temporaryUrl);
              }
            } else {
              throw new Error(result.error || '비디오에 이미지 삽입에 실패했습니다.');
            }
          } else {
            console.warn('선택된 에셋의 이미지 URL을 찾을 수 없습니다.');
            // 원본 비디오로 진행
            if (!videoPath) {
              videoPath = await uploadVideo(videoFile);
              setUploadedVideoPath(videoPath);
            }
          }
        } catch (insertionError) {
          console.error('비디오에 이미지 삽입 실패:', insertionError);
          // 비디오에 이미지 삽입 실패 시 에러를 던져서 프로젝트 생성을 중단
          const errorMsg = insertionError instanceof Error ? insertionError.message : String(insertionError);
          const shortErrorMsg = errorMsg.length > 200 ? errorMsg.substring(0, 200) + '...' : errorMsg;
          throw new Error(`비디오에 이미지 삽입에 실패했습니다: ${shortErrorMsg}`);
        }
      } else {
        // 에셋이 선택되지 않았으면 원본 비디오 업로드
        if (!videoPath) {
          videoPath = await uploadVideo(videoFile);
          setUploadedVideoPath(videoPath);
        }
      }

      // videoPath가 여전히 null이면 업로드 (안전장치)
      if (!videoPath) {
        videoPath = await uploadVideo(videoFile);
        setUploadedVideoPath(videoPath);
      }

      // 프로젝트 생성 (백엔드에 저장)
      const projectName = `프로젝트 ${new Date().toLocaleDateString()}`;
      await createProject({
        projectName: projectName,
        videoPath: videoPath,
        productIds: selectedProducts,
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
              <div className={styles.videoPreview} ref={videoContainerRef}>
                <video 
                  ref={videoRef}
                  src={processedVideoUrl || videoPreview} 
                  controls 
                  className={styles.videoPlayer}
                  onClick={handleVideoClick}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                />
                {selectedProducts.length > 0 && !insertionPosition && (
                  <div className={styles.positionHint}>
                    비디오에서 이미지를 삽입할 위치를 클릭하세요 (선택사항)
                  </div>
                )}
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
                <button 
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreview(null);
                    setProcessedVideoUrl(null);
                    setSelectedAssetForInsertion(null);
                    setInsertionPosition(null);
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
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
            </div>
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

        {/* 비디오에 이미지 삽입 안내 섹션 */}
        {selectedProducts.length > 0 && videoFile && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>비디오에 이미지 삽입 안내</h2>
            <div className={styles.insertionInfo}>
              {!isVideoLoaded ? (
                <p className={styles.loadingMessage}>
                  비디오 로딩 중... 비디오가 완전히 로드된 후 제작을 시작할 수 있습니다.
                </p>
              ) : (
                <>
                  <p>
                    선택한 첫 번째 에셋 이미지가 비디오 중앙에 자동으로 삽입됩니다.
                    비디오 프리뷰를 클릭하여 삽입 위치를 변경할 수 있습니다.
                  </p>
                  {insertionPosition && (
                    <p className={styles.positionInfo}>
                      삽입 위치: ({insertionPosition.x}, {insertionPosition.y})
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        )}

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

