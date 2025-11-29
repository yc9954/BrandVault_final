import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './ProductLibrary.module.css';

// 💡 필요한 API 함수들 (이미 구현되었다고 가정)
import { 
  fetchProductsByPage, 
  fetchFeatureBrandList,
  searchProducts,
  searchBrands,
} from '../../api/productApi'; 


// 💡 타입 정의 (API 응답 구조와 일치하도록 가정)
type Product = any; 
type Brand = any;   

type ProductWithUrl = Product & { signedImageUrl: string | null };
type BrandWithUrl = Brand & { signedLogoUrl: string | null };


// --- 상수 정의 ---
const WIDE_BANNER_COUNT = 5; 
const PAGE_SIZE = 20; 


function ProductLibrary() {
  // 5행 추천 에셋 목록 상태 (무한 스크롤)
  const [products, setProducts] = useState<ProductWithUrl[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  
  // 💡 커서 기반 상태 (페이지 번호 대신 사용)
  const [nextCursorId, setNextCursorId] = useState<number | null>(null);
  const [nextCursorValue, setNextCursorValue] = useState<string | number | null>(null);

  // 2행 및 4행 상태 (Brand 데이터 재활용)
  const [wideBanners, setWideBanners] = useState<BrandWithUrl[]>([]);
  const [featuredBrands, setFeaturedBrands] = useState<BrandWithUrl[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색 관련 상태
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{
    brands: BrandWithUrl[];
    products: ProductWithUrl[];
  }>({ brands: [], products: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  
  // 💡 무한 스크롤: 에셋을 페이지 단위로 불러오는 함수 (커서 상태에 의존)
  const loadMoreProducts = useCallback(async () => {
    // 💡 다음 로드할 커서 정보가 없는데도 hasMore가 true라면 문제이거나 첫 로드
    if (isFetching || (!hasMore && nextCursorId !== null)) return;
    
    setIsFetching(true);
    try {
      // 💡 현재 커서 상태를 사용하여 API 호출
      const data = await fetchProductsByPage(
        PAGE_SIZE, 
        'NEWEST', // 최신순 정렬 기준으로 가정
        nextCursorId,    
        nextCursorValue 
      ); 
      
      // 💡 데이터 추가
      setProducts(prevProducts => [...prevProducts, ...data.data]);
      
      // 💡 커서 상태 업데이트 (다음 API 호출을 위한 준비)
      setNextCursorId(data.meta.nextCursorId);
      setNextCursorValue(data.meta.nextCursorValue);

      if (!data.meta.hasMore) { 
        setHasMore(false);
      }
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsFetching(false);
    }
  }, [hasMore, isFetching, nextCursorId, nextCursorValue]); // 💡 의존성 배열에 커서 상태 포함

  
  // 1. 초기 데이터 로드 (최초 1페이지 + 브랜드 데이터)
  useEffect(() => {
    // 최초 1페이지 로드와 브랜드 데이터 로드를 병렬 처리
    
    // 💡 loadMoreProducts는 커서를 사용하므로, 초기 로드 시 nextCursor를 null로 시작함
    const initialLoad = async () => {
        try {
            // [상품 목록 API 호출]: 커서 없이 호출하여 1페이지 로드
            const productPromise = fetchProductsByPage(PAGE_SIZE, 'NEWEST', null, null);
            // [브랜드 목록 API 호출]
            const brandPromise = fetchFeatureBrandList();

            const [productsResult, brandsResult] = await Promise.all([productPromise, brandPromise]);

            // 상품 상태 초기화
            setProducts(productsResult.data);
            setNextCursorId(productsResult.meta.nextCursorId);
            setNextCursorValue(productsResult.meta.nextCursorValue);
            setHasMore(productsResult.meta.hasMore);

            // 브랜드 상태 초기화
            setFeaturedBrands(brandsResult.data); 
            setWideBanners(brandsResult.data.slice(0, WIDE_BANNER_COUNT)); 

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsInitialLoading(false); 
        }
    };
    
    initialLoad();

    // 💡 React Strict Mode 대응을 위해 클린업 함수를 추가하거나, 
    // 전역 플래그를 사용하지 않는 가장 간단한 방식으로 initialLoad를 구현했습니다.
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // 2. 스크롤 이벤트 감지 로직 (검색 결과가 아닐 때만)
  useEffect(() => {
    if (showSearchResults) return; // 검색 결과 표시 중일 때는 무한 스크롤 비활성화

    const handleScroll = () => {
      const scrollY = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // 페이지 최하단 200px 이내 접근 시 다음 페이지 로드
      if (scrollY >= documentHeight - 200 && !isFetching && hasMore) {
        loadMoreProducts(); // 💡 인자 없이 호출 (커서 상태에 의존)
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFetching, hasMore, loadMoreProducts, showSearchResults]);

  // 검색 함수
  const handleSearch = useCallback(async (keyword: string) => {
    if (!keyword || keyword.trim() === '') {
      setShowSearchResults(false);
      setSearchResults({ brands: [], products: [] });
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    setError(null);

    try {
      const [brandsResult, productsResult] = await Promise.all([
        searchBrands(keyword.trim(), 10),
        searchProducts(keyword.trim(), 20),
      ]);

      setSearchResults({
        brands: brandsResult.data,
        products: productsResult.data,
      });
    } catch (err) {
      setError((err as Error).message);
      setSearchResults({ brands: [], products: [] });
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 검색어 입력 핸들러 (디바운싱)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchKeyword !== '') {
        handleSearch(searchKeyword);
      } else {
        setShowSearchResults(false);
        setSearchResults({ brands: [], products: [] });
      }
    }, 500); // 500ms 디바운싱

    return () => clearTimeout(timeoutId);
  }, [searchKeyword, handleSearch]);
  

  if (error) { return <div className={styles.error}>에러가 발생했습니다: {error} ❌</div>; }
  
  return (
    <div className={styles.container}>
      
      {/* 헤더와 검색 창을 하나의 sticky 컨테이너로 묶기 */}
      <div className={styles.stickyHeader}>
        {/* 1행: 헤더 섹션 */}
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Product Library</h2>
            <p className={styles.subtitle}>Browse and favorite products for your next video project</p>
          </div>
        </header>

        {/* 필터/검색 섹션 - 헤더 바로 아래 */}
        <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="#777">
            <path d="M39.8 41.95 26.6 28.75q-1.5 1.3-3.5 2.025-2 .725-4.25 .725-5.4 0-9.15-3.75T6 18.6q0-5.3 3.75-9.05T18.85 5.8q5.3 0 9.05 3.75t3.75 9.05q0 2.25-.725 4.25-.725 2-2.025 3.5l13.2 13.2ZM19 30q4.6 0 7.8-3.2t3.2-7.8q0-4.6-3.2-7.8T19 8q-4.6 0-7.8 3.2T8 19q0 4.6 3.2 7.8T19 30Z"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search products or brands..." 
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <select className={styles.dropdown}><option>All Categories</option></select>
        <select className={styles.dropdown}><option>Newest</option></select>
        </div>
      </div>

      {/* 검색 결과 표시 */}
      {showSearchResults && (
        <>
          {/* 검색된 브랜드 */}
          {searchResults.brands.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Search Results: Brands</h3>
              {isSearching ? (
                <div className={styles.loading}>검색 중...</div>
              ) : (
                <div className={styles.horizontalScrollContainer}>
                  {searchResults.brands.map((brand) => (
                    <Link key={brand.brand_id} to={`/creator/brand/${brand.brand_id}`} className={styles.wideBannerItem} style={{ backgroundImage: `url(${brand.signedLogoUrl || ''})` }}>
                      <div className={styles.bannerContent}>
                        <h4 className={styles.bannerTitle}>{brand.brand_name}</h4>
                        <p className={styles.bannerSubtitle}>Assets Available: {brand.asset_count}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 검색된 에셋 */}
          {searchResults.products.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Search Results: Products</h3>
              {isSearching ? (
                <div className={styles.loading}>검색 중...</div>
              ) : (
                <ul className={styles.productGrid}>
                  {searchResults.products.map((product) => (
                    <li key={product.product_id} className={styles.productCard}>
                      <Link to={`/creator/product/${product.product_id}`} className={styles.cardLink}>
                        <div className={styles.cardImagePlaceholder}>
                          {product.signedImageUrl ? (
                            <img src={product.signedImageUrl} alt={product.product_name} className={styles.cardImage}/>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" height={40} width={40} viewBox="0 0 48 48" fill="currentColor"><path d="M6 42V6h36v36Zm3-3h30V9H9Zm0 0V9v30Zm4.2-4.1h21.6l-6.6-8.8-5.7 7.6-3.9-5.2Z"/></svg>
                          )}
                        </div>
                        <div className={styles.cardContent}>
                          <h3>{product.product_name}</h3>
                          <p className={styles.cardSponsor}>Sponsored by {product.brand?.brand_name || 'Unknown'}</p>
                          <div className={styles.cardTags}>
                            <span className={styles.tag}>{product.category}</span>
                            <span className={styles.tagPrice}>${product.pricePerKView || 'N/A'}/1K views</span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* 검색 결과가 없을 때 */}
          {!isSearching && searchResults.brands.length === 0 && searchResults.products.length === 0 && searchKeyword.trim() !== '' && (
            <section className={styles.section}>
              <p className={styles.noProducts}>검색 결과가 없습니다.</p>
            </section>
          )}
        </>
      )}

      {/* 기본 콘텐츠 (검색 결과가 없을 때만 표시) */}
      {!showSearchResults && (
        <>
          {/* 2행: 와이드 배너 (Brand 데이터 재활용, 가로 스크롤) */}
          <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Featured Brands</h3>
        {isInitialLoading ? <div className={styles.wideBannerLoading}>배너 로딩 중...</div> : wideBanners.length > 0 && (
          <div className={`${styles.horizontalScrollContainer} ${styles.wideBannerScroll}`}>
            {wideBanners.map((brand) => (
              <Link key={brand.brand_id} to={`/creator/brand/${brand.brand_id}`} className={styles.wideBannerItem} style={{ backgroundImage: `url(${brand.signedLogoUrl || ''})` }}>
                <div className={styles.bannerContent}>
                  <h4 className={styles.bannerTitle}>{brand.brand_name}</h4>
                  <p className={styles.bannerSubtitle}>Assets Available: {brand.asset_count} </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 4행: 추천 브랜드 목록 (가로 스크롤) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Popular Brands</h3>
        {isInitialLoading ? <div className={styles.loading}>브랜드 로딩 중...</div> : featuredBrands.length > 0 && (
          <div className={styles.horizontalScrollContainer}>
            {featuredBrands.map((brand) => (
              <Link key={brand.brand_id} to={`/creator/brand/${brand.brand_id}`} className={styles.brandCard} style={{ backgroundImage: `url(${brand.signedLogoUrl || ''})` }}> 
                <div className={styles.brandLogoPlaceholder}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{brand.brand_name}</div>
                </div>
                <p className={styles.brandAssetCount}>{brand.asset_count} Assets Available</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 5행: 추천 에셋 목록 (무한 스크롤 - 세로 그리드) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recommended Assets</h3>
        
        {products.length === 0 && !isFetching && !isInitialLoading ? (<p className={styles.noProducts}>등록된 제품이 없습니다.</p>) : (
          <ul className={styles.productGrid}>
            {products.map((product) => (
              <li key={product.product_id} className={styles.productCard}>
                <Link to={`/creator/product/${product.product_id}`} className={styles.cardLink}>
                  <div className={styles.cardImagePlaceholder}>
                    {product.signedImageUrl ? (
                      <img src={product.signedImageUrl} alt={product.product_name} className={styles.cardImage}/>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" height={40} width={40} viewBox="0 0 48 48" fill="currentColor"><path d="M6 42V6h36v36Zm3-3h30V9H9Zm0 0V9v30Zm4.2-4.1h21.6l-6.6-8.8-5.7 7.6-3.9-5.2Z"/></svg>
                    )}
                  </div>

                  <div className={styles.cardContent}>
                    <h3>{product.product_name}</h3>
                    <p className={styles.cardSponsor}>Sponsored by {product.brand.brand_name}</p>
                    <div className={styles.cardTags}>
                      <span className={styles.tag}>{product.category}</span>
                      <span className={styles.tagPrice}>${product.pricePerKView || 'N/A'}/1K views</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        
        {/* 무한 스크롤 로딩 인디케이터 */}
        {isFetching && <div className={styles.loadingMore}>에셋을 더 불러오는 중입니다...</div>}
        {!hasMore && products.length > 0 && <div className={styles.endOfList}>모든 에셋을 불러왔습니다.</div>}
      </section>
        </>
      )}
    </div>
  );
}

export default ProductLibrary;