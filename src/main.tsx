import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import {I18nProvider} from './i18n/I18nProvider.tsx';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from index.html.');
}

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
);
