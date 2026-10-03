import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './StoreNext.jsx'
import Admin from './AdminBoutique.jsx'
import { OrderedStore, SectionOrderEditorPortal } from './SectionOrderManager.jsx'
import { LogoApplicator, LogoEditorPortal } from './LogoManager.jsx'
import './boutique.css'
import './store-next.css'

const isAdmin = /^\/admin\/?$/.test(window.location.pathname)
if (isAdmin) {
  document.body.classList.add('admin-route')
  document.title = 'مدیریت | AVENZA Collection'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <><Admin /><SectionOrderEditorPortal /><LogoEditorPortal /></> : <OrderedStore><><App /><LogoApplicator /></></OrderedStore>}
  </React.StrictMode>,
)
