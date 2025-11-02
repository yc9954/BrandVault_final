// --- START OF FILE pages/MyProjects.tsx (ProductLibrary 패턴 적용) ---

import React, { useState, useEffect, useCallback } from 'react';
import { fetchUserProducts } from '../../api/productApi';
import ProductCard from '../../components/ProductCard';
import styles from './MyProjects.module.css';

type Product = {
    purchaseId: number;
    productId: number;
    productName: string;
    brandName: string;
    signedImageUrl: string | null;
    viewCount: number;
    downloadCount: number;
};

const PAGE_SIZE = 9; // 한 번에 불러올 개수

function MyProjects() {
    const [products, setProducts] = useState<Product[]>([]);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // 1. ProductLibrary처럼 로딩 상태를 분리합니다.
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 2. "더 불러오기" 전용 함수입니다.
    const loadMoreProducts = useCallback(async () => {
        if (isFetchingMore || !hasMore) return;

        setIsFetchingMore(true);
        try {
            const data = await fetchUserProducts(PAGE_SIZE, nextCursor);
            setProducts(prev => [...prev, ...data.products]);
            setNextCursor(data.nextCursor);
            if (data.nextCursor === null) {
                setHasMore(false);
            }
        } catch (err) {
            setError('데이터를 불러오는 데 실패했습니다.');
        } finally {
            setIsFetchingMore(false);
        }
    }, [isFetchingMore, hasMore, nextCursor]);

    // 3. "초기 데이터 로딩"을 위한 useEffect입니다. (ProductLibrary 패턴)
    useEffect(() => {
        const initialLoad = async () => {
            setIsInitialLoading(true);
            try {
                // 커서 없이 첫 페이지를 요청합니다.
                const data = await fetchUserProducts(PAGE_SIZE, null);
                setProducts(data.products);
                setNextCursor(data.nextCursor);
                if (data.nextCursor === null) {
                    setHasMore(false);
                }
            } catch (err) {
                setError('초기 데이터를 불러오는 데 실패했습니다.');
            } finally {
                setIsInitialLoading(false);
            }
        };

        initialLoad();
    }, []); // 의존성 배열이 비어있어 최초 1회만 실행됩니다.

    // 4. "스크롤 이벤트"를 감지하는 useEffect입니다. (ProductLibrary 패턴)
    useEffect(() => {
        const handleScroll = () => {
            // 로딩 중이 아닐 때, 더 불러올 데이터가 있을 때, 스크롤이 하단에 근접했을 때
            if (!isFetchingMore && hasMore && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200) {
                loadMoreProducts();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isFetchingMore, hasMore, loadMoreProducts]);


    if (error) { return <div className={styles.container}><p>{error}</p></div>; }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>컬렉션</h1>
            <p className={styles.subtitle}>내가 구매한 에셋 목록입니다.</p>
            
            {isInitialLoading ? (
                <div className={styles.loader}>초기 데이터를 불러오는 중...</div>
            ) : (
                <div className={styles.grid}>
                    {products.map(product => (
                        
                        <ProductCard key={product.purchaseId} product={product} />
                    ))}
                </div>
            )}

            {/* 5. 로딩 인디케이터 UI도 분리합니다. */}
            <div className={styles.loader}>
                {isFetchingMore && <p>불러오는 중...</p>}
                {!hasMore && products.length > 0}
            </div>
        </div>
    );
}

export default MyProjects;