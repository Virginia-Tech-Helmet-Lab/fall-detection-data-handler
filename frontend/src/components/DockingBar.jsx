import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaUpload, FaCog, FaTags, FaDownload, FaFolder, FaChartBar } from 'react-icons/fa';
import './DockingBar.css';
import vtLogo from '../assets/vt-logo.jpeg';
import apiClient from '../api/client';

const tabs = [
  { name: 'Home', path: '/', icon: <FaHome />, stage: 'home' },
  { name: 'Projects', path: '/projects', icon: <FaFolder />, stage: 'projects' },
  { name: '1. Import Data', path: '/import', icon: <FaUpload />, stage: 'import' },
  { name: '2. Normalize', path: '/normalize', icon: <FaCog />, stage: 'normalize' },
  { name: '3. Label', path: '/labeling', icon: <FaTags />, stage: 'label' },
  { name: '4. Export', path: '/export', icon: <FaDownload />, stage: 'export' },
  { name: 'Analytics', path: '/analytics', icon: <FaChartBar />, stage: 'analytics' },
];

const DockingBar = () => {
  const location = useLocation();
  const path = location.pathname;
  const [stageCompletion, setStageCompletion] = useState({});

  useEffect(() => {
    checkStageCompletion();
  }, [location]);

  const checkStageCompletion = async () => {
    try {
      const response = await apiClient.get('/api/export/stats');
      const stats = response.data;
      setStageCompletion({
        import: stats.totalVideos > 0,
        normalize: stats.totalVideos > 0,
        label: stats.totalAnnotations > 0,
        export: false,
      });
    } catch {
      setStageCompletion({ import: false, normalize: false, label: false, export: false });
    }
  };

  const getTabClassName = (tab) => {
    let className = 'nav-tab';
    if (path === tab.path) className += ' active';
    if (stageCompletion[tab.stage]) className += ' completed';
    return className;
  };

  return (
    <div className="docking-bar">
      <div className="docking-bar-top">
        <img src={vtLogo} alt="Virginia Tech Logo" className="app-logo" />
      </div>

      <div className="navigation-tabs">
        {tabs.map((tab) => (
          <Link key={tab.path} to={tab.path} className={getTabClassName(tab)}>
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-text">{tab.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DockingBar;
