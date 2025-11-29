import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './BrandPage.module.css';
import { fetchBrandById } from '../../api/productApi';

type BrandWithUrl = any & { signedLogoUrl: string | null };
type ProductWithUrl = any & { signedImageUrl: string | null; brand: { brand_id: number; brand_name: string } };

function BrandPage() {
  const { id } = useParams<{ id: string }>();
  
  const [brand, setBrand] = useState<BrandWithUrl | null>(null);
  const [products, setProducts] = useState<ProductWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadBrand = async () => {
      try {
        setIsLoading(true);
        const response = await fetchBrandById(parseInt(id));
        setBrand(response.data.brand);
        setProducts(response.data.products);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadBrand();
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>에러가 발생했습니다: {error} ❌</div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>브랜드를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 브랜드 헤더 섹션 */}
      <div className={styles.brandHeader}>
        <div className={styles.brandInfo}>
          {brand.signedLogoUrl && (
            <img 
              src={brand.signedLogoUrl} 
              alt={brand.brand_name} 
              className={styles.brandLogo}
            />
          )}
          <div className={styles.brandDetails}>
            <h1 className={styles.brandName}>{brand.brand_name}</h1>
            <p className={styles.brandStats}>
              등록된 에셋: {brand.asset_count || products.length}개
            </p>
          </div>
        </div>
      </div>

      {/* 에셋 목록 섹션 */}
      <section className={styles.productsSection}>
        <h2 className={styles.sectionTitle}>에셋 목록</h2>
        {products.length === 0 ? (
          <p className={styles.noProducts}>이 브랜드의 에셋이 없습니다.</p>
        ) : (
          <ul className={styles.productGrid}>
            {products.map((product) => (
              <li key={product.product_id} className={styles.productCard}>
                <Link to={`/creator/product/${product.product_id}`} className={styles.cardLink}>
                  <div className={styles.cardImagePlaceholder}>
                    {product.signedImageUrl ? (
                      <img 
                        src={product.signedImageUrl} 
                        alt={product.product_name} 
                        className={styles.cardImage}
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" height={40} width={40} viewBox="0 0 48 48" fill="currentColor">
                        <path d="M6 42V6h36v36Zm3-3h30V9H9Zm0 0V9v30Zm4.2-4.1h21.6l-6.6-8.8-5.7 7.6-3.9-5.2Z"/>
                      </svg>
                    )}
                  </div>
                  <div className={styles.cardContent}>
                    <h3>{product.product_name}</h3>
                    <p className={styles.cardSponsor}>{product.brand?.brand_name || brand.brand_name} 제공</p>
                    <div className={styles.cardTags}>
                      <span className={styles.tag}>{product.category}</span>
                      <span className={styles.tagPrice}>1천 뷰당 ${product.pricePerKView || 'N/A'}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default BrandPage;

