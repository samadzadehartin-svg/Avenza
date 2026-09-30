import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import './style.css'
import './overrides.css'
import './product-toggle.css'
import './product-toggle.js'

const isAdmin = /^\/admin\/?$/.test(window.location.pathname)
if (isAdmin) {
  document.body.classList.add('admin-route')
  document.title = 'مدیریت | AVENZA Collection'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <Admin /> : <App />}
  </React.StrictMode>,
)
