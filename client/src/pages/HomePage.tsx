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
  
  // 상태 관리
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 첫 번째 클릭: 로그인 폼 표시
  const handleCreatorLoginClick = () => {
    if (!showLoginForm) {
      setShowLoginForm(true);
      setError(null);
      return;
    }
  };

  // 두 번째 클릭: 실제 로그인 실행
  const handleCreatorLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    
    // 입력값 검증
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      setIsLoading(false);
      return;
    }
    
    try {
      // API를 호출하여 로그인을 시도 (성공 시 쿠키 발급)
      await loginCreator(email, password);
      // 로그인이 성공하면 creator 페이지로 이동
      goToCreator();
    } catch (err: any) {
      console.error("Login failed:", err);
      console.error("Error response:", err.response?.data);
      
      // 서버에서 반환한 에러 메시지 사용
      const errorMessage = err.response?.data?.message || err.message || "로그인에 실패했습니다. 다시 시도해주세요.";
      setError(errorMessage);
      
      // 디버깅을 위한 추가 정보
      if (err.response?.status === 401) {
        console.log('401 에러 - 가능한 원인:');
        console.log('1. DB에 해당 이메일의 Creator가 없음');
        console.log('2. 비밀번호가 일치하지 않음');
        console.log('3. DB 연결 문제');
        console.log('입력한 이메일:', email);
      }
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

        <div className={styles.loginSection}>
          <form onSubmit={showLoginForm ? handleCreatorLoginSubmit : (e) => { e.preventDefault(); handleCreatorLoginClick(); }} className={styles.loginFormWrapper}>
            {/* 입력 폼 (조건부 렌더링) */}
            {showLoginForm && (
              <div className={`${styles.loginForm} ${showLoginForm ? styles.show : ''}`}>
                <div className={styles.inputGroup}>
                  <input
                    type="email"
                    placeholder="이메일"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    disabled={isLoading}
                    required
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}

            {/* 버튼 그룹 */}
            <div className={`${styles.buttonGroup} ${showLoginForm ? styles.expanded : ''}`}>
              <button 
                type="submit"
                className={`${styles.button} ${styles.primary} ${showLoginForm ? styles.centered : ''}`}
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : 'Creator Login'}
              </button>
              {!showLoginForm && (
                <button 
                  type="button"
                  className={`${styles.button} ${styles.secondary} ${styles.fadeOut}`}
                >
                  Advertiser Login
                </button>
              )}
            </div>
          </form>
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