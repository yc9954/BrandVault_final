// --- START OF FILE HomePage.tsx ---

import { useState } from 'react'; // 1. useState 훅 추가
import { useCreatorNavigation } from '../hooks/useCreatorNavigation';
import { loginCreator } from '../api/authApi'; // 2. 로그인 API 함수 import

import logo from '../logo.png'
import SocialLoginButton from '../components/Button/ImageButton'
import googlelogo from '../assets/images/google_logo.svg'
import styles from './Hompage.module.css';

// API URL 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

function HomePage() {
  const { goToCreator } = useCreatorNavigation();
  
  // 3. 로딩 및 에러 상태를 관리하기 위한 state 추가
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 4. 'Creator Login' 버튼을 위한 새로운 핸들러 함수 생성
  const handleCreatorLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // API를 호출하여 로그인을 시도 (성공 시 쿠키 발급)
      await loginCreator();
      // 로그인이 성공하면 creator 페이지로 이동
      goToCreator();
    } catch (err) {
      console.error("Login failed:", err);
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth 로그인 핸들러
  const handleGoogleLogin = () => {
    // 백엔드의 Google OAuth 엔드포인트로 리다이렉트
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };
  
  return (
    <div className={styles.container}>
      
      <header className={styles.logoWrapper}>
        <img src={logo} className={styles.logo} alt="logo" />
        <span className={styles.logoText}>Binu AI</span>
      </header>

      <main className={styles.mainContent}>
        <h1 className={styles.title}>
          Quasar: Monetize <br />
          Your Space
        </h1>

        <p className={styles.subtitle}>
          The AdSense for Short-form Video
        </p>

        <div className={styles.buttonGroup}>
          {/* 5. 버튼 onClick에 새로 만든 핸들러를 연결하고 로딩 상태 반영 */}
          <button 
            onClick={handleCreatorLogin} 
            className={`${styles.button} ${styles.primary}`}
            disabled={isLoading} // 로딩 중에는 클릭 비활성화
          >
            {isLoading ? '로그인 중...' : 'Creator Login'}
          </button>
          <button 
            className={`${styles.button} ${styles.secondary}`}
          >
            Advertiser Login
          </button>
        </div>

        {/* 6. 에러 메시지 표시 (필요 시) */}
        {error && <p className={styles.errorMessage}>{error}</p>}

        <p className={styles.dividerText}>
          Or continue with
        </p>

        <div className={styles.socialGroup}>
          <SocialLoginButton 
            onClick={handleGoogleLogin} 
            imageSrc={googlelogo} 
            altText='Google Login' 
          />
        </div>
      </main>
    </div>
  );
}

export default HomePage;