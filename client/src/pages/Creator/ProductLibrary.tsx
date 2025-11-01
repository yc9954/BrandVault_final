import { useState, useEffect } from 'react';
import { fetchAllProducts, Product } from '../../api/productApi';
import SplatUploader from '../../components/SplatUploader/SplatUploader';
import SplatViewer from '../../components/SplatViewer/SplatViewer';
import './ProductLibrary.css';

function ProductLibrary() {
  // 2. State 변수 선언: [데이터, 로딩상태, 에러]
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'splat'>('products');

  useEffect(() => {
    fetchAllProducts()
      .then(data => {
        setProducts(data);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleUploadComplete = (jobId: string) => {
    setCurrentJobId(jobId);
    setActiveTab('splat');
    // 변환이 완료되면 자동으로 뷰어 표시
    setTimeout(() => {
      setShowViewer(true);
    }, 2000); // 2초 후 확인
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setCurrentJobId(null);
  };

  return (
    <div className="product-library">
      <div className="library-tabs">
        <button
          className={activeTab === 'products' ? 'active' : ''}
          onClick={() => setActiveTab('products')}
        >
          제품 라이브러리
        </button>
        <button
          className={activeTab === 'splat' ? 'active' : ''}
          onClick={() => setActiveTab('splat')}
        >
          Gaussian Splatting
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="products-section">
          <h2>프로덕트 라이브러리</h2>
          {isLoading ? (
            <div>데이터를 불러오는 중입니다... ⏳</div>
          ) : error ? (
            <div>에러가 발생했습니다: {error} ❌</div>
          ) : products.length === 0 ? (
            <p>등록된 제품이 없습니다.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {products.map((product) => (
                <li key={product.product_id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                  <h3>{product.product_name}</h3>
                  <p>브랜드: {product.brand.brand_name}</p>
                  <p>카테고리: {product.category}</p>
                  {product.color && <p>색상: {product.color}</p>}
                  {product.size && <p>사이즈: {product.size}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'splat' && (
        <div className="splat-section">
          <div className="splat-upload-section">
            <SplatUploader onUploadComplete={handleUploadComplete} />
          </div>
          
          {currentJobId && showViewer && (
            <div className="splat-viewer-section">
              <SplatViewer jobId={currentJobId} onClose={handleCloseViewer} />
            </div>
          )}
          
          {currentJobId && !showViewer && (
            <div className="viewer-toggle">
              <button onClick={() => setShowViewer(true)} className="view-btn">
                뷰어 열기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductLibrary;