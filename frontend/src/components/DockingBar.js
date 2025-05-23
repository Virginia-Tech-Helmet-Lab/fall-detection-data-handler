import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaUpload, FaCog, FaTags, FaCheckCircle, FaDownload, FaCheck } from 'react-icons/fa';
import './DockingBar.css';
import vtLogo from '../assets/vt-logo.jpeg'; // Correct the path
import axios from 'axios';

const DockingBar = () => {
  const location = useLocation();
  const path = location.pathname;
  const [stageCompletion, setStageCompletion] = useState({});
  
  const tabs = [
    { name: 'Home', path: '/', icon: <FaHome />, stage: 'home' },
    { name: '1. Import Data', path: '/import', icon: <FaUpload />, stage: 'import' },
    { name: '2. Normalize', path: '/normalize', icon: <FaCog />, stage: 'normalize' },
    { name: '3. Label', path: '/labeling', icon: <FaTags />, stage: 'label' },
    { name: '4. Review', path: '/review', icon: <FaCheckCircle />, stage: 'review' },
    { name: '5. Export', path: '/export', icon: <FaDownload />, stage: 'export' }
  ];
  
  useEffect(() => {
    checkStageCompletion();
  }, [location]);
  
  const checkStageCompletion = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/export/stats');
      const stats = response.data;
      
      const completion = {
        import: stats.totalVideos > 0,
        normalize: stats.totalVideos > 0, // Assume normalized if videos exist
        label: stats.totalAnnotations > 0,
        review: stats.confirmedVideos > 0,
        export: false // Never marked as complete
      };
      
      setStageCompletion(completion);
    } catch (error) {
      console.error('Error checking stage completion:', error);
    }
  };
  
  const getTabClassName = (tab) => {
    let className = 'nav-tab';
    
    // Check if this is the active tab
    if (path === tab.path) {
      className += ' active';
    }
    
    // Add completion status
    if (stageCompletion[tab.stage]) {
      className += ' completed';
    }
    
    // Check if this tab should be accessible
    const stageOrder = ['import', 'normalize', 'label', 'review', 'export'];
    const tabIndex = stageOrder.indexOf(tab.stage);
    
    // Find the last completed stage
    let lastCompletedIndex = -1;
    for (let i = 0; i < stageOrder.length; i++) {
      if (stageCompletion[stageOrder[i]]) {
        lastCompletedIndex = i;
      }
    }
    
    // Tab is accessible if it's home, completed, or the next stage
    const isAccessible = tab.stage === 'home' || 
                        stageCompletion[tab.stage] || 
                        tabIndex <= lastCompletedIndex + 1;
    
    if (!isAccessible) {
      className += ' disabled';
    }
    
    return className;
  };
  
  return (
    <div className="docking-bar">
      <div className="docking-bar-top">
        <img src={vtLogo} alt="Virginia Tech Logo" className="app-logo" />
        <h1 className="app-title">Fall Detection Data Handler</h1>
      </div>
      
      <div className="navigation-tabs">
        {tabs.map((tab, index) => {
          const tabClass = getTabClassName(tab);
          const isDisabled = tabClass.includes('disabled');
          
          return isDisabled ? (
            <div 
              key={tab.path} 
              className={tabClass}
              title="Complete previous steps to unlock"
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-text">{tab.name}</span>
            </div>
          ) : (
            <Link 
              key={tab.path} 
              to={tab.path} 
              className={tabClass}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-text">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DockingBar;