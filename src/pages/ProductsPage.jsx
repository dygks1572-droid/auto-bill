import { useEffect, useState } from 'react'
import { createProduct, listenProducts } from '../lib/products'

export default function ProductsPage() {
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = listenProducts(setRows)
    return () => unsub?.()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      await createProduct({
        name: name.trim(),
        aliases: aliases
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        category: 'bakery',
      })

      setName('')
      setAliases('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h2>베이커리 사전</h2>

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
                <span>{(row.aliases || []).join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
