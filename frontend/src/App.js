import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './components/fonts.css';
import './components/vt-theme.css';
import './components/vt-global.css';
import './components/vt-utilities.css';

// Import authentication components
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './components/Auth/Login';

// Import DockingBar component
import DockingBar from './components/DockingBar';

// Import page components
import Home from './components/Home/Home';
import ProjectDashboard from './components/Projects/ProjectDashboard';
import ProjectCreation from './components/Projects/ProjectCreation';
import DataImport from './components/DataImport/DataImport';
import NormalizationPanel from './components/Normalization/NormalizationPanel';
import LabelingInterface from './components/LabelingInterface/LabelingInterface';
import ReviewDashboard from './components/ReviewDashboard/ReviewDashboard';
import DataExport from './components/DataExport/DataExport';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <Router>
          <Routes>
            {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="*" element={
            <ProtectedRoute>
              <DockingBar />
              <div className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/projects" element={<ProjectDashboard />} />
                  <Route path="/projects/new" element={
                    <ProtectedRoute requiredRole="admin">
                      <ProjectCreation />
                    </ProtectedRoute>
                  } />
                  <Route path="/import" element={<DataImport />} />
                  <Route path="/normalize" element={<NormalizationPanel />} />
                  <Route path="/labeling" element={<LabelingInterface />} />
                  <Route path="/review" element={
                    <ProtectedRoute requiredRole="reviewer">
                      <ReviewDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/export" element={<DataExport />} />
                </Routes>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;
