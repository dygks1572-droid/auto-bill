import { useEffect, useState } from 'react'
import { createProduct, listenProducts } from '../lib/products'
import { buildCatalogIndex, learnCatalogAlias } from '../lib/bakeryMatcher'
import { seedDefaultProducts } from '../lib/seedProducts'

export default function ProductsPage() {
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedProductName, setSelectedProductName] = useState('')
  const [newAlias, setNewAlias] = useState('')

  useEffect(() => {
    const unsub = listenProducts(setRows)
    return () => unsub?.()
  }, [])

  const catalogRows = buildCatalogIndex(rows)
    .filter(
      (row) => row.active !== false && row.category === 'bakery' && row.countInBakeryTotal !== false,
    )
    .map((row) => ({
      ...row,
      aliases: row.rawNames.filter((alias) => alias !== row.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  useEffect(() => {
    if (!catalogRows.length) return
    if (catalogRows.some((row) => row.name === selectedProductName)) return
    setSelectedProductName(catalogRows[0].name)
  }, [catalogRows, selectedProductName])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setMessage('')
    try {
      await createProduct({
        name: name.trim(),
        aliases: aliases
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        category: 'bakery',
        group: 'manual',
        countInBakeryTotal: true,
      })

      setName('')
      setAliases('')
      setMessage('품목 추가 완료')
    } finally {
      setSaving(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    setMessage('')
    try {
      const count = await seedDefaultProducts(rows)
      setMessage(`기본 품목 ${count}개 추가 완료`)
    } finally {
      setSeeding(false)
    }
  }

  function handleAddAlias(event) {
    event.preventDefault()
    if (!selectedProductName || !newAlias.trim()) return

    learnCatalogAlias(newAlias.trim(), selectedProductName)
    setNewAlias('')
    setMessage(`별칭 추가 완료: ${selectedProductName}`)
  }

  return (
    <div className="page">
      <h2>베이커리 사전</h2>

      <div className="card productActionCard">
        <button type="button" onClick={handleSeed} disabled={seeding}>
          {seeding ? '불러오는 중...' : '기본 품목 불러오기'}
        </button>
        {message && <p className="message">{message}</p>}
      </div>

      <form className="card form" onSubmit={handleSubmit}>
        <h3>새 품목 추가</h3>
        <label>
          품목명
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 에그타르트"
          />
        </label>

        <label>
          별칭(쉼표 구분)
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="예: 타르트, egg tart"
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? '저장 중...' : '품목 추가'}
        </button>
      </form>

      <form className="card form" onSubmit={handleAddAlias}>
        <h3>기존 품목에 별칭 추가</h3>
        <label>
          대상 품목
          <select
            value={selectedProductName}
            onChange={(e) => setSelectedProductName(e.target.value)}
          >
            <option value="">품목 선택</option>
            {catalogRows.map((row) => (
              <option key={row.name} value={row.name}>
                {row.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          새 별칭
          <input
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            placeholder="예: 에타, eggtart, 소금빵1개"
          />
        </label>

        <button type="submit" disabled={!selectedProductName || !newAlias.trim()}>
          별칭 추가
        </button>
      </form>

      <div className="card">
        <div className="productSectionHeader">
          <h3>등록된 품목</h3>
          <p className="subtleText">기본 품목과 현재까지 학습된 별칭까지 함께 표시합니다.</p>
        </div>

        {catalogRows.length === 0 ? (
          <p>등록된 품목이 없습니다.</p>
        ) : (
          <ul className="productList enhancedProductList">
            {catalogRows.map((row) => (
              <li key={row.name}>
                <div className="productRowHeader">
                  <strong>{row.name}</strong>
                  <span>
                    {row.category} / {row.countInBakeryTotal ? '합산 포함' : '합산 제외'}
                  </span>
                </div>

                <div className="productAliasBlock">
                  <p className="suggestionLabel">등록된 별칭</p>
                  {row.aliases.length ? (
                    <div className="suggestionChips">
                      {row.aliases.map((alias) => (
                        <span key={`${row.name}-${alias}`} className="productAliasChip">
                          {alias}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="subtleText">등록된 별칭이 없습니다.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
