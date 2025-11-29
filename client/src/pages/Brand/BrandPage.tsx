import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import BrandHeader from '../../components/Header/BrandHeader';
import BrandAssets from './BrandAssets';

function BrandPage() {
    return (
        <Layout 
          header={<BrandHeader />} 
        >
            <Routes>
                <Route index element={<BrandAssets />} />
            </Routes>
        </Layout>
    );
}

export default BrandPage;

