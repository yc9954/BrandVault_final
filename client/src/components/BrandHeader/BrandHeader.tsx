import React from 'react';
import { Link } from 'react-router-dom';
import styles from './BrandHeader.module.css';

type BrandHeaderProps = {
  brandId: number;
  brandName: string;
  brandLogoUrl: string | null;
  assetCount?: number | null;
};

function BrandHeader({ brandId, brandName, brandLogoUrl, assetCount }: BrandHeaderProps) {
  return (
    <div className={styles.brandHeader}>
      <Link to={`/creator/brand/${brandId}`} className={styles.brandInfoLink}>
        <div className={styles.brandInfo}>
          {brandLogoUrl && (
            <img 
              src={brandLogoUrl} 
              alt={brandName} 
              className={styles.brandLogo}
            />
          )}
          <div className={styles.brandDetails}>
            <h1 className={styles.brandName}>{brandName}</h1>
            {assetCount !== null && assetCount !== undefined && (
              <p className={styles.brandStats}>
                등록된 에셋: {assetCount}개
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default BrandHeader;

