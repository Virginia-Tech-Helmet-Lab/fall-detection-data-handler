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
import ProtectedRoute from './components/Auth/ProtectedRoute.jsx';
import Login from './components/Auth/Login.jsx';

// Import DockingBar component
import DockingBar from './components/DockingBar.jsx';

// Import page components
import Home from './components/Home/Home.jsx';
import {
  ProjectDashboard,
  ProjectCreation,
  ProjectSettings,
  UserManagement,
  DataImport,
  NormalizationPanel,
  LabelingInterface,
  ReviewDashboard,
  DataExport,
  AnalyticsDashboard
} from './components/Placeholder';

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
                    <Route path="/projects/:projectId/settings" element={
                      <ProtectedRoute requiredRole="admin">
                        <ProjectSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                      <ProtectedRoute requiredRole="admin">
                        <UserManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/import" element={<DataImport />} />
                    <Route path="/normalize" element={<NormalizationPanel />} />
                    <Route path="/labeling" element={<LabelingInterface />} />
                    <Route path="/review" element={<ReviewDashboard />} />
                    <Route path="/export" element={<DataExport />} />
                    <Route path="/analytics" element={<AnalyticsDashboard />} />
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