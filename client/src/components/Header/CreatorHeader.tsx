import React from 'react'; // React import 추가
import logo from '../../logo.png'; 
import styles from './CreatorHeader.module.css';
import type { ContentName } from '../../types';

interface CreatorHeaderProps {
    onSelect: (contentName: ContentName) => void;
    currentContent: ContentName;
}
// react-icons 사용시 에러 나서 임시로 링크를 직접 넣음
const iconMap: Record<ContentName, React.ReactNode> = {
    product: ( 
      <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
        <path d="M10 38v-8h8v8Zm0-12v-8h8v8Zm0-12V6h8v8Zm12 24v-8h8v8Zm0-12v-8h8v8Zm0-12V6h8v8Zm12 24v-8h8v8Zm0-12v-8h8v8Zm0-12V6h8v8Z"/>
      </svg>
    ),
    projects: (
      <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
        <path d="M6 42V18.75L24 9l18 9.75V42Zm3-3h30V20.4l-15-8.1-15 8.1Zm9 12.5h12v-3H18Zm-9-12.5V20.4V42Z"/>
      </svg>
    ),
    dashboard: (
      <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
        <path d="M6 42v-8h6v8Zm10 0V22h6v20Zm10 0V6h6v36Zm10 0V14h6v28Z"/>
      </svg>
    ),
    earnings: (
      <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
        <path d="M22.25 38v-3.7h-7.5V31h7.5v-6.5H12V21h10.25V6h3.5v15H36v3.5H25.75v6.5h8v3.5h-8v3.8Z"/>
      </svg>
    ),
    settings: (
      <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
        <path d="m19.6 42.15-2.2-11.6L6 26.6v-5.2l11.4-3.9 2.2-11.6h5.2l2.2 11.6 11.4 3.9v5.2L27 30.55l-2.2 11.6Zm4.4-9.3q1.95 0 3.3-1.375t1.35-3.325q0-1.95-1.35-3.325T24 23.45q-1.95 0-3.3 1.375t-1.35 3.325q0 1.95 1.35 3.325t3.3 1.375Z"/>
      </svg>
    ),
};

function CreatorHeader({ onSelect, currentContent }: CreatorHeaderProps) {
    
    const renderNavButton = (name: ContentName, text: string) => {
        const isActive = currentContent === name;
        const buttonClass = `${styles.navButton} ${isActive ? styles.active : ''}`;

        return (
            <li key={name}>
                <button className={buttonClass} onClick={() => onSelect(name)}>
                    <span className={styles.navIcon}>{iconMap[name]}</span>
                    {text}
                </button>
            </li>
        );
    };
    
    return (
        <header className={styles.sidebarInner}>
            {/* Binu AI 로고 */}
            <div className={styles.logoWrapper}>
                <img src={logo} alt="Binu AI Logo" />
                <span>Binu AI</span>
            </div>

            {/* 네비게이션 */}
            <nav>
                <ol className={styles.headerNavList}>
                    {renderNavButton('product', 'Product Library')}
                    {renderNavButton('projects', 'My Projects')}
                    {renderNavButton('dashboard', 'Dashboard')}
                    {renderNavButton('earnings', 'Earnings')}
                    {renderNavButton('settings', 'Settings')}
                </ol>
            </nav>
        </header>
    );
}

export default CreatorHeader;