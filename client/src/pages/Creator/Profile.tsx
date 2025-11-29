import React, { useState, useEffect } from 'react';
import styles from './Profile.module.css';

type ProfileData = {
  creator_id: number;
  user_name: string;
  email: string;
  subscription_type: string | null;
  created_at: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  features: string[];
};

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: '기본 기능을 무료로 사용하세요',
    features: ['기본 에셋 사용', '월 10개 프로젝트', '기본 지원']
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '더 많은 기능과 프로젝트를 사용하세요',
    features: ['무제한 에셋 사용', '무제한 프로젝트', '우선 지원', '고급 템플릿']
  },
  {
    id: 'plus',
    name: 'Plus',
    description: '모든 기능을 최대한 활용하세요',
    features: ['무제한 에셋 사용', '무제한 프로젝트', '24/7 우선 지원', '모든 템플릿', 'API 접근', '커스텀 브랜딩']
  }
];

function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
        const response = await fetch(`${API_BASE_URL}/api/profile/`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('프로필 정보를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setProfile(data);
        setEditedName(data.user_name);
        setEditedEmail(data.email);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
      const response = await fetch(`${API_BASE_URL}/api/profile/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_name: editedName,
          email: editedEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('프로필 수정에 실패했습니다.');
      }

      const updatedData = await response.json();
      setProfile(updatedData);
      setIsEditing(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditedName(profile.user_name);
      setEditedEmail(profile.email);
    }
    setIsEditing(false);
  };

  const handleSubscriptionChange = async (planId: string) => {
    if (!profile) return;

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
      const response = await fetch(`${API_BASE_URL}/api/profile/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subscription_type: planId === 'free' ? null : planId,
        }),
      });

      if (!response.ok) {
        throw new Error('요금제 변경에 실패했습니다.');
      }

      const updatedData = await response.json();
      setProfile(updatedData);
    } catch (err) {
      alert((err as Error).message);
    }
  };

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
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>프로필 정보를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const formattedDate = new Date(profile.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentSubscription = profile.subscription_type || 'free';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>프로필</h1>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            {(isEditing ? editedName : profile.user_name).charAt(0).toUpperCase()}
          </div>
          <h2 className={styles.userName}>{isEditing ? editedName : profile.user_name}</h2>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>이름</span>
            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className={styles.input}
              />
            ) : (
              <span className={styles.infoValue}>{profile.user_name}</span>
            )}
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>이메일</span>
            {isEditing ? (
              <input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className={styles.input}
              />
            ) : (
              <span className={styles.infoValue}>{profile.email}</span>
            )}
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>가입일</span>
            <span className={styles.infoValue}>{formattedDate}</span>
          </div>

          <div className={styles.buttonRow}>
            {isEditing ? (
              <>
                <button onClick={handleSave} className={styles.saveButton} disabled={isSaving}>
                  {isSaving ? '저장 중...' : '저장'}
                </button>
                <button onClick={handleCancel} className={styles.cancelButton} disabled={isSaving}>
                  취소
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className={styles.editButton}>
                수정
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.subscriptionSection}>
        <h2 className={styles.sectionTitle}>요금제</h2>
        <div className={styles.subscriptionGrid}>
          {subscriptionPlans.map((plan) => {
            const isActive = currentSubscription === plan.id;
            return (
              <div
                key={plan.id}
                className={`${styles.subscriptionCard} ${isActive ? styles.active : ''}`}
                onClick={() => handleSubscriptionChange(plan.id)}
              >
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDescription}>{plan.description}</p>
                <ul className={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
                {isActive && <div className={styles.activeBadge}>현재 요금제</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Profile;
