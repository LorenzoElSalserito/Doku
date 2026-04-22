import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@doku/ui';
import './styles/app.css';
import { App } from './app/App.js';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root missing in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
