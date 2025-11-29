import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

interface LayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
}

function Layout({ header, children }: LayoutProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className={styles.layoutContainer}>
      <aside className={styles.sidebar}>
        {header}
      </aside>
      <main ref={mainRef} className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}

export default Layout;