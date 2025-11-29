import React, { useState, useEffect } from 'react';
import styles from './BrandAssets.module.css';
import { fetchBrandAssets, deleteAsset, createAsset } from '../../api/productApi';

type Asset = {
    product_id: number;
    product_name: string;
    category: string;
    size: string;
    signedImageUrl: string | null;
    created_at: string;
};

function BrandAssets() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ assetId: number; assetName: string } | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetCategory, setNewAssetCategory] = useState('');
    const [newAssetSize, setNewAssetSize] = useState('');
    const [newAssetImage, setNewAssetImage] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await fetchBrandAssets();
            setAssets(data);
        } catch (err) {
            console.error('에셋 목록 로딩 실패:', err);
            setError('에셋 목록을 불러오는 데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, assetId: number, assetName: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteModal({ assetId, assetName });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal) return;

        try {
            await deleteAsset(deleteModal.assetId);
            setAssets(prevAssets => prevAssets.filter(a => a.product_id !== deleteModal.assetId));
            setDeleteModal(null);
        } catch (err) {
            console.error('에셋 삭제 실패:', err);
            alert('에셋 삭제에 실패했습니다: ' + ((err as Error).message || '알 수 없는 오류'));
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModal(null);
    };

    const handleAddAsset = async () => {
        if (!newAssetName || !newAssetCategory || !newAssetSize || !newAssetImage) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        setIsCreating(true);
        try {
            await createAsset(newAssetName, newAssetCategory, newAssetSize, newAssetImage);
            setShowAddModal(false);
            setNewAssetName('');
            setNewAssetCategory('');
            setNewAssetSize('');
            setNewAssetImage(null);
            await loadAssets();
        } catch (err) {
            console.error('에셋 추가 실패:', err);
            alert('에셋 추가에 실패했습니다: ' + ((err as Error).message || '알 수 없는 오류'));
        } finally {
            setIsCreating(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loader}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>에셋 관리</h1>
                <button 
                    className={styles.addButton}
                    onClick={() => setShowAddModal(true)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
                        <path d="M22.5 38V25.5H10v-3h12.5V10h3v12.5H38v3H25.5V38Z"/>
                    </svg>
                    에셋 추가
                </button>
            </div>

            {assets.length === 0 ? (
                <div className={styles.emptyMessage}>
                    <p>등록된 에셋이 없습니다.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {assets.map(asset => (
                        <div key={asset.product_id} className={styles.assetCardWrapper}>
                            <div className={styles.assetCard}>
                                <button
                                    className={styles.deleteButton}
                                    onClick={(e) => handleDeleteClick(e, asset.product_id, asset.product_name)}
                                    aria-label="에셋 삭제"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                                <div className={styles.assetImage}>
                                    {asset.signedImageUrl ? (
                                        <img src={asset.signedImageUrl} alt={asset.product_name} />
                                    ) : (
                                        <div className={styles.imagePlaceholder}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M6 42V6h36v36Zm3-3h30V9H9Zm0 0V9v30Zm4.2-4.1h21.6l-6.6-8.8-5.7 7.6-3.9-5.2Z"/>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.assetInfo}>
                                    <h3 className={styles.assetName}>{asset.product_name}</h3>
                                    <p className={styles.assetMeta}>{asset.category} · {asset.size}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 삭제 확인 모달 */}
            {deleteModal && (
                <div className={styles.modalOverlay} onClick={handleDeleteCancel}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <p className={styles.modalMessage}>
                            "{deleteModal.assetName}" 에셋을 지우시겠습니까?
                        </p>
                        <div className={styles.modalButtons}>
                            <button 
                                className={styles.modalButtonCancel} 
                                onClick={handleDeleteCancel}
                            >
                                취소
                            </button>
                            <button 
                                className={styles.modalButtonConfirm} 
                                onClick={handleDeleteConfirm}
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 에셋 추가 모달 */}
            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>에셋 추가</h3>
                        <div className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label>에셋 이름</label>
                                <input
                                    type="text"
                                    value={newAssetName}
                                    onChange={(e) => setNewAssetName(e.target.value)}
                                    placeholder="에셋 이름을 입력하세요"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>카테고리</label>
                                <input
                                    type="text"
                                    value={newAssetCategory}
                                    onChange={(e) => setNewAssetCategory(e.target.value)}
                                    placeholder="카테고리를 입력하세요"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>사이즈</label>
                                <input
                                    type="text"
                                    value={newAssetSize}
                                    onChange={(e) => setNewAssetSize(e.target.value)}
                                    placeholder="사이즈를 입력하세요"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>이미지 파일</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            if (file.type.startsWith('image/')) {
                                                setNewAssetImage(file);
                                            } else {
                                                alert('이미지 파일만 업로드할 수 있습니다.');
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className={styles.modalButtons}>
                            <button 
                                className={styles.modalButtonCancel} 
                                onClick={() => setShowAddModal(false)}
                                disabled={isCreating}
                            >
                                취소
                            </button>
                            <button 
                                className={styles.modalButtonConfirm} 
                                onClick={handleAddAsset}
                                disabled={isCreating}
                            >
                                {isCreating ? '추가 중...' : '추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BrandAssets;

