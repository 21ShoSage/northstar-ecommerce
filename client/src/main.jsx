import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import { ToastProvider } from './toast.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><ToastProvider><StoreProvider><App /></StoreProvider></ToastProvider></BrowserRouter></React.StrictMode>
);
