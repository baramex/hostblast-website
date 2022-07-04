import React from 'react';
import ReactDOM from 'react-dom/client';
import './main.css';
import App from './App';
import Header from './Component/Header';

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(
  <React.StrictMode>
    <Header />
    <App />
  </React.StrictMode>
);