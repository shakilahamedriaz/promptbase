import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element not found');
}

try {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  console.error('Failed to render app:', error);
  const message = error instanceof Error ? error.message : String(error);
  rootEl.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: white;
      color: black;
      font-family: monospace;
      padding: 20px;
    ">
      <div>
        <h1>Error</h1>
        <p style="color: red;">${message}</p>
        <button onclick="location.reload()" style="
          padding: 10px 20px;
          background: blue;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Reload Page</button>
      </div>
    </div>
  `;
}
