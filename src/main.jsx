import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initPwa } from './services/pwa';
import './styles/global.css';
import './styles/overrides.css';
import './styles/results.css';
import './styles/teacher.css';
import './styles/qachat.css';

// catch the browser's install offer early, and register the service worker (production only)
initPwa();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
