import React from 'react';
import styles from './Layout.module.css';

interface LayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
}

function Layout({ header, children }: LayoutProps) {
  return (
    <div className={styles.layoutContainer}>
      <aside className={styles.sidebar}>
        {header}
      </aside>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}

export default Layout;