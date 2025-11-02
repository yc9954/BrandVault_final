// --- START OF FILE components/ProductCard.tsx (최종 수정본) ---

import React from 'react';
import { Link } from 'react-router-dom'; // 1. Link를 import 합니다.
// ProductCard에 맞는 CSS 모듈을 사용한다고 가정합니다.
import styles from './ProductCard.module.css'; 

interface ProductCardProps {
    product: {
        purchaseId: number; // key로 사용되므로 그대로 둡니다.
        productId: number;  // 2. 상세 페이지로 가기 위한 productId를 props 타입에 추가합니다.
        productName: string;
        brandName: string;
        signedImageUrl: string | null;
        viewCount: number;
        downloadCount: number;
    };
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    // 3. 컴포넌트의 최상위 요소를 Link로 감싸줍니다.
    return (
        <Link to={`/creator/product/${product.productId}`} className={styles.cardLink}>
            {/* 카드 UI는 그대로 유지됩니다. */}
            <div className={styles.cardImageWrapper}>
                <img 
                    src={product.signedImageUrl || ''} 
                    alt={product.productName} 
                    className={styles.cardImage}
                />
            </div>
            <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{product.productName}</h3>
                <p className={styles.cardBrand}>by {product.brandName}</p>
                <div className={styles.cardStats}>
                    <span>👁️ {product.viewCount.toLocaleString()}</span>
                    <span>❤️ {product.downloadCount.toLocaleString()}</span>
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;