import React from 'react'; // useState 제거
import { Routes, Route } from 'react-router-dom'; // Routes와 Route를 임포트
import Layout from '../../components/Layout/Layout';
import CreatorHeader from '../../components/Header/CreatorHeader';

// 렌더링할 페이지 컴포넌트 임포트
import ProductLibrary from './ProductLibrary';
import MyProjects from './MyProjects';
import Dashboard from './Dashboard';
import Earnings from './Earnings';
import Settings from './Settings';
import Profile from './Profile'; // 💡 프로필 페이지 컴포넌트 임포트
import ProductDetail from './ProductDetail'; // 💡 상세 페이지 컴포넌트 임포트
import BrandPage from './BrandPage'; // 💡 브랜드 페이지 컴포넌트 임포트
import CreateProject from './CreateProject'; // 💡 프로젝트 생성 페이지 컴포넌트 임포트
import ProjectDetail from './ProjectDetail'; // 💡 프로젝트 상세 페이지 컴포넌트 임포트

function CreatorPage() {
    return (
        <Layout 
          header={ <CreatorHeader /> } 
        >
            <Routes>
                {/* index는 /creator 경로와 일치합니다. */}
                <Route index element={<ProductLibrary />} /> 
                
                {/* path="product"는 /creator/product 경로와 일치합니다. */}
                <Route path="product" element={<ProductLibrary />} />
                <Route path="projects" element={<MyProjects />} />   
                <Route path="dashboard" element={<Dashboard />} /> 
                <Route path="earnings" element={<Earnings />} />  
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
                
                {/* path="product/:id"는 /creator/product/:id 경로와 일치합니다. */}
                <Route path="product/:id" element={<ProductDetail />} />
                
                {/* path="brand/:id"는 /creator/brand/:id 경로와 일치합니다. */}
                <Route path="brand/:id" element={<BrandPage />} />
                
                {/* path="project/create"는 /creator/project/create 경로와 일치합니다. */}
                <Route path="project/create" element={<CreateProject />} />
                {/* path="project/:id"는 /creator/project/:id 경로와 일치합니다. */}
                <Route path="project/:id" element={<ProjectDetail />} />
            </Routes>
        </Layout>
    );
};

export default CreatorPage;