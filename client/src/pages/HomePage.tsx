// --- START OF FILE HomePage.tsx ---

import { useState } from 'react'; // 1. useState 훅 추가
import { useCreatorNavigation } from '../hooks/useCreatorNavigation';
import { useNavigate } from 'react-router-dom';
import { loginCreator, loginBrand } from '../api/authApi'; // 2. 로그인 API 함수 import

import logo from '../logo.png'
import SocialLoginButton from '../components/Button/ImageButton'
import googlelogo from '../assets/images/google_logo.svg'
import styles from './Hompage.module.css';

// API URL 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

function HomePage() {
  const { goToCreator } = useCreatorNavigation();
  const navigate = useNavigate();
  
  // 상태 관리
  const [activeLoginType, setActiveLoginType] = useState<'none' | 'creator' | 'brand'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [isBrandLoading, setIsBrandLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brandEmail, setBrandEmail] = useState('');
  const [brandPassword, setBrandPassword] = useState('');

  // 크리에이터 로그인 버튼 클릭
  const handleCreatorLoginClick = () => {
    if (activeLoginType === 'none') {
      setActiveLoginType('creator');
      setError(null);
    }
  };

  // 브랜드 로그인 버튼 클릭
  const handleBrandLoginClick = () => {
    if (activeLoginType === 'none') {
      setActiveLoginType('brand');
      setError(null);
    }
  };

  // 로그인 폼 닫기 (두 버튼 다시 표시)
  const handleCloseLogin = () => {
    setActiveLoginType('none');
    setEmail('');
    setPassword('');
    setBrandEmail('');
    setBrandPassword('');
    setError(null);
  };

  // 크리에이터 로그인 제출
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

  // 브랜드 로그인 제출
  const handleBrandLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsBrandLoading(true);
    setError(null);
    
    if (!brandEmail || !brandPassword) {
      setError('이메일과 비밀번호를 입력해주세요.');
      setIsBrandLoading(false);
      return;
    }
    
    try {
      await loginBrand(brandEmail, brandPassword);
      navigate('/brand');
    } catch (err: any) {
      console.error("Brand login failed:", err);
      const errorMessage = err.response?.data?.message || err.message || "로그인에 실패했습니다. 다시 시도해주세요.";
      setError(errorMessage);
    } finally {
      setIsBrandLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      
      <header className={styles.logoWrapper}>
        <img src={logo} className={styles.logo} alt="logo" />
        <span className={styles.logoText}>Binu AI</span>
      </header>

      <main className={styles.mainContent}>
        <h1 className={styles.title}>
          크리에이터 수익화를 위한 <br />
          Binu AI
        </h1>

        <p className={styles.subtitle}>
          쇼트폼 영상에 광고를 연결해 수익을 만들어보세요.
        </p>

        <div className={styles.loginSection}>
          <form 
            onSubmit={activeLoginType === 'creator' ? handleCreatorLoginSubmit : activeLoginType === 'brand' ? handleBrandLoginSubmit : (e) => { e.preventDefault(); }} 
            className={styles.loginFormWrapper}
          >
            {/* 입력 폼 (조건부 렌더링) */}
            {activeLoginType === 'creator' && (
              <div className={`${styles.loginForm} ${styles.show}`}>
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

            {activeLoginType === 'brand' && (
              <div className={`${styles.loginForm} ${styles.show}`}>
                <div className={styles.inputGroup}>
                  <input
                    type="email"
                    placeholder="이메일"
                    value={brandEmail}
                    onChange={(e) => setBrandEmail(e.target.value)}
                    className={styles.input}
                    disabled={isBrandLoading}
                    required
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="비밀번호"
                    value={brandPassword}
                    onChange={(e) => setBrandPassword(e.target.value)}
                    className={styles.input}
                    disabled={isBrandLoading}
                    required
                  />
                </div>
              </div>
            )}

            {/* 버튼 그룹 */}
            <div className={`${styles.buttonGroup} ${activeLoginType !== 'none' ? styles.expanded : ''}`}>
              <button 
                type={activeLoginType === 'creator' ? 'submit' : 'button'}
                className={`${styles.button} ${styles.primary} ${activeLoginType === 'creator' ? styles.active : ''} ${activeLoginType === 'brand' ? styles.slideOutLeft : ''}`}
                onClick={activeLoginType === 'none' ? handleCreatorLoginClick : undefined}
                disabled={isLoading && activeLoginType === 'creator'}
              >
                {isLoading && activeLoginType === 'creator' ? '로그인 중...' : '크리에이터 로그인'}
              </button>
              
              <button 
                type={activeLoginType === 'brand' ? 'submit' : 'button'}
                className={`${styles.button} ${styles.secondary} ${activeLoginType === 'brand' ? styles.active : ''} ${activeLoginType === 'creator' ? styles.slideOutRight : ''}`}
                onClick={activeLoginType === 'none' ? handleBrandLoginClick : undefined}
                disabled={isBrandLoading && activeLoginType === 'brand'}
              >
                {isBrandLoading && activeLoginType === 'brand' ? '로그인 중...' : '브랜드 로그인'}
              </button>

              {activeLoginType !== 'none' && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCloseLogin}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 6. 에러 메시지 표시 (필요 시) */}
        {error && <p className={styles.errorMessage}>{error}</p>}

        <p className={styles.dividerText}>
          또는 다음 계정으로 계속하기
        </p>

        <div className={styles.socialGroup}>
          <SocialLoginButton 
            onClick={handleGoogleLogin} 
            imageSrc={googlelogo} 
            altText='Google 로그인' 
          />
        </div>
      </main>
    </div>
  );
}

export default HomePage;