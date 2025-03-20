import React from 'react';
import { Switch, Route } from 'react-router-dom';
import DataImport from './components/DataImport/DataImport';
import NormalizationPanel from './components/Normalization/NormalizationPanel';
import LabelingInterface from './components/LabelingInterface/LabelingInterface';
import ReviewDashboard from './components/ReviewDashboard/ReviewDashboard';

const Routes = () => (
  <Switch>
    <Route exact path="/" component={DataImport} />
    <Route path="/normalize" component={NormalizationPanel} />
    <Route path="/label" component={LabelingInterface} />
    <Route path="/review" component={ReviewDashboard} />
  </Switch>
);

export default Routes;
