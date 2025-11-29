import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import logo from '../../logo.png'; 
import styles from './BrandHeader.module.css';

function BrandHeader() {
    return (
        <header className={styles.sidebarInner}>
            {/* Binu AI 로고 - 클릭 시 브랜드 대시보드로 이동 */}
            <Link to="/brand" className={styles.logoWrapper}>
                <img src={logo} alt="Binu AI Logo" />
                <span>Binu AI</span>
            </Link>

            {/* 네비게이션 */}
            <nav>
                <ol className={styles.headerNavList}>
                    <li>
                        <NavLink 
                            to="/brand" 
                            className={({ isActive }) => 
                                `${styles.navButton} ${isActive ? styles.active : ''}`
                            }
                            end
                        >
                            <span className={styles.navIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" height={20} width={20} viewBox="0 0 48 48" fill="currentColor">
                                    <path d="M10 38v-8h8v8Zm0-12v-8h8v8Zm0-12V6h8v8Zm12 24v-8h8v8Zm0-12v-8h8v8Zm0-12V6h8v8Zm12 24v-8h8v8Zm0-12v-8h8v8Zm0-12V6h8v8Z"/>
                                </svg>
                            </span>
                            에셋
                        </NavLink>
                    </li>
                </ol>
            </nav>
        </header>
    );
}

export default BrandHeader;

