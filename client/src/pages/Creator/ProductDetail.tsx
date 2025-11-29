import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ProductDetail.module.css';
// 💡 [수정] 다운로드 API 함수 임포트
import { fetchProductById, fetchProductDownloadUrl, fetchBrandById, saveProduct, toggleLikeProduct } from '../../api/productApi';
import BrandHeader from '../../components/BrandHeader/BrandHeader';

// 💡 API 응답 타입 정의 (가정)
// 백엔드 API 응답과 일치해야 합니다.
type ProductDetailData = any; 

function ProductDetail() {
  // 1. URL에서 product ID 가져오기
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandAssetCount, setBrandAssetCount] = useState<number | null>(null);
  
  // 💡 [신규] 다운로드 버튼 로딩 상태
  const [isDownloading, setIsDownloading] = useState(false);
  
  // 저장 및 좋아요 상태
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      try {
        setIsLoading(true);
        // 💡 id가 string일 수 있으므로 parseInt로 변환
        const response = await fetchProductById(parseInt(id)); 
        setProduct(response.data);
        
        // 브랜드 정보 로드 (asset_count 포함)
        const brandId = response.data.brand_id || response.data.brand?.brand_id;
        if (brandId) {
          try {
            const brandResponse = await fetchBrandById(brandId);
            setBrandAssetCount(brandResponse.data.brand.asset_count || brandResponse.data.products.length);
          } catch (err) {
            console.error('브랜드 정보 로드 실패:', err);
          }
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]); // id가 변경될 때마다 데이터를 다시 불러옴

  // 💡 [신규] 다운로드 핸들러 함수
  const handleDownload = async (type: 'image' | 'model') => {
    if (!id || isDownloading) return;

    setIsDownloading(true);
    try {
      // 1. 백엔드에 다운로드 URL 요청
      const response = await fetchProductDownloadUrl(parseInt(id), type);
      const url = response.data.url;

      // 2. 새 창에서 Signed URL을 열어 다운로드 트리거
      window.open(url, '_blank');

      // 3. (Optimistic Update) 다운로드 횟수를 UI에 즉시 반영
      setProduct((prev: ProductDetailData) => ({
        ...prev,
        download_count: (prev.download_count || 0) + 1
      }));

    } catch (err) {
      alert(`다운로드에 실패했습니다: ${(err as Error).message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!id) return;

    try {
      const result = await saveProduct(parseInt(id));
      setIsSaved(result.saved);
      setSaveMessage(result.message);
      
      // 3초 후 메시지 숨기기
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } catch (err) {
      alert(`저장에 실패했습니다: ${(err as Error).message}`);
    }
  };

  // 좋아요 핸들러
  const handleLike = async () => {
    if (!id || isLiking) return;

    setIsLiking(true);
    try {
      const result = await toggleLikeProduct(parseInt(id));
      setProduct((prev: ProductDetailData) => ({
        ...prev,
        like_count: result.likeCount
      }));
    } catch (err) {
      alert(`좋아요에 실패했습니다: ${(err as Error).message}`);
    } finally {
      setIsLiking(false);
    }
  };


  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return <div className={styles.error}>오류가 발생했습니다: {error}</div>;
  }

  if (!product) {
    return <div className={styles.error}>상품을 찾을 수 없습니다.</div>;
  }

  // -------------------------
  // 💡 렌더링 로직 (라이트 모드 기준)
  // -------------------------
  return (
    <div className={styles.pageContainer}>
      {/* 브랜드 헤더 섹션 */}
      {product.brand && (product.brand_id || product.brand.brand_id) && (
        <BrandHeader
          brandId={product.brand_id || product.brand.brand_id}
          brandName={product.brand.brand_name}
          brandLogoUrl={product.brand.signedLogoUrl}
          assetCount={brandAssetCount}
        />
      )}
      
      <div className={styles.detailLayout}>
        
        {/* 1. 왼쪽: 이미지 및 파일 정보 */}
        <div className={styles.leftColumn}>
          <div className={styles.imagePreview}>
            {product.signedImageUrl ? (
              <img src={product.signedImageUrl} alt={product.product_name} />
            ) : (
              <div className={styles.imagePlaceholder}>이미지 없음</div>
            )}
          </div>
          <div className={styles.fileInfoBox}>
            <p>3D 파일</p> {/* 스크린샷의 정적 텍스트 */}
            <div className={styles.fileDetails}>
              <span>선택된 파일: 3D 모델</span>
              {/* 💡 API에서 받은 assetFormats 배열을 join으로 표시 */}
              <span>형식: {product.assetFormats.join(', ').toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* 2. 오른쪽: 상품 상세 정보 */}
        <div className={styles.rightColumn}>
          <h1 className={styles.productTitle}>{product.product_name}</h1>
          
          <div className={styles.brandInfo}>
            <img 
              src={product.brand.signedLogoUrl || ''} 
              alt={product.brand.brand_name} 
              className={styles.brandLogo} 
            />
            <span>{product.brand.brand_name}</span>
          </div>

          <div className={styles.statsBar}>
            {/* 💡 스키마에 '사용' 필드는 없으므로 download_count를 사용합니다. */}
            <span>사용 <b>{product.download_count.toLocaleString()}</b></span> 
            <span>조회수 <b>{product.view_count.toLocaleString()}</b></span>
            <span>좋아요 <b>{(product.like_count || 0).toLocaleString()}</b>개</span>
          </div>

          {/* 💡 [수정] 다운로드 버튼에 onClick 및 disabled 상태 추가 */}
          <button 
            className={styles.downloadButton}
            // 3D 모델 다운로드를 기본으로 가정
            onClick={() => handleDownload('model')}
            disabled={isDownloading}
          >
            {isDownloading ? '다운로드 준비 중...' : '에셋 다운로드/사용'}
          </button>
          
          <div className={styles.buttonGroup}>
            <button 
              className={styles.actionButton}
              onClick={handleSave}
            >
              {saveMessage || '저장'}
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleLike}
              disabled={isLiking}
            >
              {isLiking ? '처리 중...' : '좋아요'}
            </button>
          </div>
          {saveMessage && (
            <div className={styles.saveMessage}>
              {saveMessage}
            </div>
          )}

          <div className={styles.infoSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>카테고리</span>
              <span className={styles.infoValue}>{product.category}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>포맷</span>
              <span className={styles.infoValue}>{product.assetFormats.join(', ').toUpperCase()}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>태그</span>
              {/* 💡 '태그'는 스키마에 없으므로 스크린샷의 정적 값으로 대체합니다. */}
              <div className={styles.infoValue}>
                <span className={styles.tag}>음료</span>
                <span className={styles.tag}>캔</span>
                <span className={styles.tag}>패키징</span>
              </div>
            </div>
          </div>

          <div className={styles.usageTerms}>
            <span className={styles.termItem}>✓ 상업적 사용 가능</span>
            <span className={styles.termItem}>✓ API 연동 허용</span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ProductDetail;