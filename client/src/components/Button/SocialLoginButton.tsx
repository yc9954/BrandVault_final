import styles from './SocialLoginButton.module.css'; // 이 컴포넌트 전용 CSS

interface SocialLoginButtonProps {
  onClick: () => void;
  imageSrc: string;
  altText: string;
}

function SocialLoginButton({ onClick, imageSrc, altText }: SocialLoginButtonProps) {
  return (
    <button className={styles.socialButton} onClick={onClick}>
      <img src={imageSrc} alt={altText} />
    </button>
  );
}

export default SocialLoginButton;