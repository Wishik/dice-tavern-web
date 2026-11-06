import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

// En el móvil, al abrir el teclado, llevamos el campo activo a la vista para ver qué escribes.
document.addEventListener('focusin', (e) => {
  const el = e.target as HTMLElement;
  if (!el.matches('input, textarea, select')) return;
  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350);
});
