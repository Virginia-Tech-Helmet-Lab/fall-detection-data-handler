import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './components/fonts.css';
import './components/vt-theme.css';
import './components/vt-global.css';
import './components/vt-utilities.css';

// Import DockingBar component
import DockingBar from './components/DockingBar';

// Import page components
import Home from './components/Home/Home';
import DataImport from './components/DataImport/DataImport';
import NormalizationPanel from './components/Normalization/NormalizationPanel';
import LabelingInterface from './components/LabelingInterface/LabelingInterface';
import ReviewDashboard from './components/ReviewDashboard/ReviewDashboard';
import DataExport from './components/DataExport/DataExport';

function App() {
  return (
    <Router>
      {/* Add DockingBar here, outside Routes but inside Router */}
      <DockingBar />
      
      {/* Wrap Routes in a main content container */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/normalize" element={<NormalizationPanel />} />
          <Route path="/labeling" element={<LabelingInterface />} />
          <Route path="/review" element={<ReviewDashboard />} />
          <Route path="/export" element={<DataExport />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
