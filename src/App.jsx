import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import SummaryPage from './pages/SummaryPage'
import ProductsPage from './pages/ProductsPage'
import './styles.css'

export default function App() {
  const [tab, setTab] = useState('upload')

  return (
    <div className="app">
      <header className="topbar">
        <h1>배달 주문 정리</h1>
        <nav className="tabs">
          <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>
            업로드
          </button>
          <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>
            요약
          </button>
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
            품목 사전
          </button>
        </nav>
      </header>

      <main>
        {tab === 'upload' && <UploadPage />}
        {tab === 'summary' && <SummaryPage />}
        {tab === 'products' && <ProductsPage />}
      </main>
    </div>
  )
}
