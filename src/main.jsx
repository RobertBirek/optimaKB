import React from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './shared/ErrorBoundary';
import App from './App';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
