import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

// debug marker to ensure client bundle loaded
console.log('StockView client bundle loaded')

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
