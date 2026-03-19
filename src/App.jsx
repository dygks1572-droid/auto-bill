import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import SummaryPage from './pages/SummaryPage'
import ProductsPage from './pages/ProductsPage'
import './styles.css'

const TAB_META = {
  upload: {
    label: '업로드',
    eyebrow: 'Receipt Capture',
    title: '사진을 올리고 바로 저장',
    description: '영수증 업로드부터 자동 분석, 저장까지 한 화면에서 끝낼 수 있게 정리했습니다.',
  },
  summary: {
    label: '요약',
    eyebrow: 'Daily Overview',
    title: '날짜별 주문 기록을 빠르게 확인',
    description: '오늘 저장한 주문과 베이커리 합계를 모바일 화면에 맞게 깔끔하게 보여줍니다.',
  },
  products: {
    label: '품목 사전',
    eyebrow: 'Product Library',
    title: '자주 쓰는 베이커리 품목 관리',
    description: '품목명과 별칭을 손쉽게 등록해서 자동 분류 정확도를 높일 수 있습니다.',
  },
}

export default function App() {
  const [tab, setTab] = useState('upload')
  const activeTab = TAB_META[tab]

  return (
    <div className="appShell">
      <div className="ambientGlow ambientGlowLeft" />
      <div className="ambientGlow ambientGlowRight" />

      <div className="appFrame">
        <header className="topbar">
          <div className="topbarMeta">
            <img
              className="brandLogo"
              src="https://oraund.com/web/awesome_img/logo.png"
              alt="ORAUND"
            />
            <span className="eyebrow">Bakery Receipt</span>
            <h1>배달 주문 정리</h1>
            <p>모바일에서 빠르게 업로드하고, 저장한 주문을 다시 확인할 수 있게 구성했습니다.</p>
          </div>

          <nav className="tabs" aria-label="주요 메뉴">
            {Object.entries(TAB_META).map(([key, item]) => (
              <button
                key={key}
                type="button"
                className={tab === key ? 'active' : ''}
                onClick={() => setTab(key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="appMain">
          <section className="heroPanel card">
            <span className="sectionEyebrow">{activeTab.eyebrow}</span>
            <h2>{activeTab.title}</h2>
            <p>{activeTab.description}</p>
          </section>

          {tab === 'upload' && <UploadPage />}
          {tab === 'summary' && <SummaryPage />}
          {tab === 'products' && <ProductsPage />}
        </main>
      </div>
    </div>
  )
}
