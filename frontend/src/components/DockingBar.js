import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './DockingBar.css';
import vtLogo from '../assets/vt-logo.jpeg'; // Correct the path

const DockingBar = () => {
  const location = useLocation();
  const path = location.pathname;
  
  const tabs = [
    { name: 'Import Data', path: '/' },
    { name: 'Normalize', path: '/normalize' },
    { name: 'Label', path: '/label' },
    { name: 'Review', path: '/review' }
  ];
  
  return (
    <div className="docking-bar">
      <div className="docking-bar-top">
        <img src={vtLogo} alt="Virginia Tech Logo" className="app-logo" />
        <h1 className="app-title">VT Helmet Lab Data Processing Software</h1>
      </div>
      
      <div className="navigation-tabs">
        {tabs.map((tab) => (
          <Link 
            key={tab.path} 
            to={tab.path} 
            className={`nav-tab ${path === tab.path ? 'active' : ''}`}
          >
            {tab.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DockingBar;