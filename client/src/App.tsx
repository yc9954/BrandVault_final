import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CreatorPage from './pages/Creator/CreatorPage';

function App() {
  return (
    <BrowserRouter>
    <div className="App">
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/signin' element = {<LoginPage />} />
        <Route path='/creator' element= {<CreatorPage />} />
      </Routes>
    </div>
    </BrowserRouter>
  );
}

export default App;
