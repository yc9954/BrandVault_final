import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom'; // 💡 NavLink와 Link를 임포트합니다.
import logo from '../../logo.png'; 
import styles from './CreatorHeader.module.css';
import type { ContentName } from '../../types';

// ❌ interface CreatorHeaderProps { ... }  -> 더 이상 필요 없음

// react-icons 임시 SVG (변경 없음)
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

// 💡 props (onSelect, currentContent) 제거
function CreatorHeader() {
    const location = useLocation();
    
    // 💡 NavLink를 렌더링하도록 함수 수정
    const renderNavButton = (name: ContentName, text: string, path: string, isEnd: boolean = false, matchPattern?: string) => {
        
        // NavLink가 {isActive}를 제공하므로, className을 함수로 전달
        const getButtonClass = ({ isActive }: { isActive: boolean }) => {
            // 프로젝트 상세 페이지도 활성화
            let isActiveState = isActive;
            if (matchPattern && location.pathname.startsWith(matchPattern)) {
                isActiveState = true;
            }
            return `${styles.navButton} ${isActiveState ? styles.active : ''}`;
        };

        return (
            <li key={name}>
                {/* 💡 button을 NavLink로 변경, onClick 제거, to/end prop 추가 */}
                <NavLink 
                    to={path} 
                    className={getButtonClass}
                    end={isEnd}
                >
                    <span className={styles.navIcon}>{iconMap[name]}</span>
                    {text}
                </NavLink>
            </li>
        );
    };
    
    return (
        <header className={styles.sidebarInner}>
            {/* Binu AI 로고 - 클릭 시 탐색 페이지로 이동 */}
            <Link to="/creator" className={styles.logoWrapper}>
                <img src={logo} alt="Binu AI Logo" />
                <span>Binu AI</span>
            </Link>

            {/* 네비게이션 (경로 추가) */}
            <nav>
                <ol className={styles.headerNavList}>
                    {/* 💡 App.tsx에서 /creator/* 로 설정했으므로, 
                         여기서는 /creator, /creator/projects 등 절대 경로를 사용합니다.
                         index route(탐색)에 end={true}를 추가합니다.
                    */}
                    {renderNavButton('product', '탐색', '/creator', true)}
                    {renderNavButton('projects', '내 프로젝트', '/creator/projects', false, '/creator/project')}
                    {renderNavButton('dashboard', '대시보드', '/creator/dashboard')}
                    {renderNavButton('earnings', '수익', '/creator/earnings')}
                    {renderNavButton('settings', '설정', '/creator/settings')}
                </ol>
            </nav>

            {/* 프로필 버튼 - 항상 하단에 고정 */}
            <div className={styles.profileSection}>
                <Link to="/creator/profile" className={styles.profileButton}>
                    <span className={styles.profileAvatar}>B</span>
                    <div className={styles.profileText}>
                        <span className={styles.profileName}>내 프로필</span>
                        <span className={styles.profileSubtext}>계정 관리</span>
                    </div>
                </Link>
            </div>
        </header>
    );
}

export default CreatorHeader;