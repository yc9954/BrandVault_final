import logo from '../logo.png'
import SocialLoginButton from '../components/Button/ImageButton'
import googlelogo from '../assets/images/google_logo.svg'
import { useCreatorNavigation } from '../hooks/useCreatorNavigation';
import styles from './Hompage.module.css';

function HomePage() {
  const {goToCreator} = useCreatorNavigation();

  
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
          <button 
            onClick={goToCreator} 
            className={`${styles.button} ${styles.primary}`}
          >
            Creator Login
          </button>
          <button 
            className={`${styles.button} ${styles.secondary}`}
          >
            Advertiser Login
          </button>
        </div>

        <p className={styles.dividerText}>
          Or continue with
        </p>

        {/* ⬇️ SocialLoginButton 컴포넌트를 바로 사용 (className 불필요) */}
        <div className={styles.socialGroup}>
          <SocialLoginButton 
            onClick={() => {}} 
            imageSrc={googlelogo} 
            altText='Google Login' 
          />
        </div>
      </main>
    </div>
  );
}

export default HomePage;