import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './ProductDetail.module.css';
import { fetchProductById } from '../../api/productApi';

type ProductDetailData = any;

function ProductDetail() {
  // 1. URL에서 product ID 가져오기
  const { id } = useParams<{ id: string }>(); 
  
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      try {
        setIsLoading(true);
        const response = await fetchProductById(parseInt(id));
        setProduct(response.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]); // id가 변경될 때마다 데이터를 다시 불러옴

  if (isLoading) {
    return <div className={styles.loading}>데이터를 불러오는 중입니다...</div>;
  }

  if (error) {
    return <div className={styles.error}>오류가 발생했습니다: {error}</div>;
  }

  if (!product) {
    return <div className={styles.error}>상품을 찾을 수 없습니다.</div>;
  }


  return (
    <div className={styles.pageContainer}>
      <Link to="/" className={styles.backButton}>← 뒤로가기</Link>
      
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
            {/* 💡 스키마에 '좋아요' 필드는 없으므로 download_count를 임시 사용합니다. */}
            <span>좋아요 <b>{product.download_count.toLocaleString()}</b>개</span>
          </div>

          <button className={styles.downloadButton}>
            <svg /* ... (다운로드 아이콘 SVG) ... */ />
            에셋 다운로드/사용
          </button>
          
          <div className={styles.buttonGroup}>
            {/* 💡 '저장', '좋아요' 기능은 현재 API에 구현되지 않았습니다. */}
            <button className={styles.actionButton}>저장</button>
            <button className={styles.actionButton}>좋아요</button>
          </div>

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