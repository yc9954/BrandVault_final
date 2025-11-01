import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './ProductLibrary.module.css';
import { fetchAllProducts, Product } from '../../api/productApi';
import SplatUploader from '../../components/SplatUploader/SplatUploader';
import SplatViewer from '../../components/SplatViewer/SplatViewer';
import './ProductLibrary.css';

function ProductLibrary() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'splat'>('products');

  useEffect(() => {
    fetchAllProducts()
      .then(data => { setProducts(data); })
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setIsLoading(false); });
  }, []);

  if (isLoading) { return <div>데이터를 불러오는 중입니다... ⏳</div>; }
  if (error) { return <div>에러가 발생했습니다: {error} ❌</div>; }
  
  return (
    <div>
      {/* 헤더 섹션 */}
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Product Library</h2>
          <p className={styles.subtitle}>Browse and favorite products for your next video project</p>
        </div>
        <button className={styles.createButton}>
          <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
            <path d="M22.5 38V25.5H10v-3h12.5V10h3v12.5H38v3H25.5V38Z"/>
          </svg>
          Create New Project
        </button>
      </header>

      {/* 필터/검색 섹션 */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="#777">
            <path d="M39.8 41.95 26.6 28.75q-1.5 1.3-3.5 2.025-2 .725-4.25 .725-5.4 0-9.15-3.75T6 18.6q0-5.3 3.75-9.05T18.85 5.8q5.3 0 9.05 3.75t3.75 9.05q0 2.25-.725 4.25-.725 2-2.025 3.5l13.2 13.2ZM19 30q4.6 0 7.8-3.2t3.2-7.8q0-4.6-3.2-7.8T19 8q-4.6 0-7.8 3.2T8 19q0 4.6 3.2 7.8T19 30Z"/>
          </svg>
          <input type="text" placeholder="Search products..." />
        </div>
        <select className={styles.dropdown}>
          <option>All Categories</option>
        </select>
        <select className={styles.dropdown}>
          <option>Newest</option>
        </select>
      </div>

      {/* 제품 그리드 */}
      {products.length === 0 ? (
        <p>등록된 제품이 없습니다.</p>
      ) : (
        <ul className={styles.productGrid}>
          {products.map((product) => (
            <li key={product.product_id} className={styles.productCard}>
              {/* <Link 
                to={`/product/${product.product_id}`} 
                className={styles.cardLink}
              > */}
             
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
                  <button className={styles.bookmarkButton}>
                    <svg xmlns="http://www.w3.org/2000/svg" height={18} width={18} viewBox="0 0 48 48" fill="currentColor">
                      <path d="m11.65 44 3.25-14.05L4 20.5l14.4-1.25L24 6l5.6 13.25L44 20.5l-10.9 9.45L36.35 44 24 36.55Zm-3.1-4.4 2.25-9.8-7.55-6.55 10.1-.9L24 13.1l4 9.25 10.1.9-7.55 6.55 2.25 9.8L24 35.15Z"/>
                    </svg>
                  </button>
                </div>

                <div className={styles.cardContent}>
                  <h3>{product.product_name}</h3>
                  <p className={styles.cardSponsor}>Sponsored by {product.brand.brand_name}</p>
                  <div className={styles.cardTags}>
                    <span className={styles.tag}>{product.category}</span>
                    <span className={styles.tag}>$30-50/1K views</span>
                  </div>
                </div>
              {/* </Link> */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProductLibrary;