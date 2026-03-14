import { useEffect, useState } from 'react'
import { createProduct, listenProducts } from '../lib/products'
import { seedDefaultProducts } from '../lib/seedProducts'

export default function ProductsPage() {
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsub = listenProducts(setRows)
    return () => unsub?.()
  }, [])

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

  return (
    <div className="page">
      <h2>베이커리 사전</h2>

      <div className="card">
        <button type="button" onClick={handleSeed} disabled={seeding}>
          {seeding ? '불러오는 중...' : '기본 품목 불러오기'}
        </button>
        {message && <p className="message">{message}</p>}
      </div>

      <form className="card form" onSubmit={handleSubmit}>
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

      <div className="card">
        <h3>등록된 품목</h3>
        {rows.length === 0 ? (
          <p>등록된 품목이 없습니다.</p>
        ) : (
          <ul className="productList">
            {rows.map((row) => (
              <li key={row.id}>
                <strong>{row.name}</strong>
                <span>
                  {(row.aliases || []).join(', ')} / {row.category} /{' '}
                  {row.countInBakeryTotal ? '합산 포함' : '합산 제외'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
