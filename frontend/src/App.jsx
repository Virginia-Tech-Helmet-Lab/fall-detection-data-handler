import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './components/fonts.css';
import './components/vt-theme.css';
import './components/vt-global.css';
import './components/vt-utilities.css';

import { ProjectProvider } from './contexts/ProjectContext';
import DockingBar from './components/DockingBar';

import Home from './components/Home/Home';
import ProjectDashboard from './components/Projects/ProjectDashboard';
import ProjectCreation from './components/Projects/ProjectCreation';
import ProjectSettings from './components/Projects/ProjectSettings';
import DataImport from './components/DataImport/DataImport';
import LabelingInterface from './components/LabelingInterface/LabelingInterface';
import DataExport from './components/DataExport/DataExport';

function App() {
  return (
    <ProjectProvider>
      <Router>
        <DockingBar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<ProjectDashboard />} />
            <Route path="/projects/new" element={<ProjectCreation />} />
            <Route path="/projects/:projectId/settings" element={<ProjectSettings />} />
            <Route path="/import" element={<DataImport />} />
            <Route path="/labeling" element={<LabelingInterface />} />
            <Route path="/export" element={<DataExport />} />
          </Routes>
        </div>
      </Router>
    </ProjectProvider>
  );
}

export default App;
