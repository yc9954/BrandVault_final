import CreatorHeader from '../../components/Header/CreatorHeader'
import Layout from '../../components/Layout/Layout'
import React, { useState } from 'react';
import ProductLibrary from './ProductLibrary'
import MyProjects from './MyProjects';
import Dashboard from './Dashboard';
import Earnings from './Earnings';
import Settings from './Settings';
import type { ContentName } from '../../types';

const contentMap: Record<ContentName, React.ReactNode> = {
    product: <ProductLibrary />,
    projects: <MyProjects />,   
    dashboard: <Dashboard />, 
    earnings: <Earnings />,  
    settings: <Settings />,
};

// const defaultContent = <ProductLibrary />; // 이 줄은 사용되지 않으므로 삭제해도 됩니다.

function CreatorPage() {
    const [currentContentName, setCurrentContent] = useState<ContentName>('product');
    const content = contentMap[currentContentName];
    
    return (
        <div>
            <Layout 
              header={
                <CreatorHeader 
                  onSelect={setCurrentContent} 
                  currentContent={currentContentName} 
                />
              } 
            >
                {content}
            </Layout>
        </div>
    );
}

export default CreatorPage;