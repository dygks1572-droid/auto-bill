import { useEffect, useMemo, useState } from 'react'
import { createReceipt } from '../lib/receipts'
import { listenProducts } from '../lib/products'
import { buildBakeryComputation } from '../lib/bakeryMatcher'
import { buildAutofillStateFromParsed, parseReceiptImage } from '../lib/receiptAutofillClient'

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function emptyItem() {
  return { name: '', qty: 1, amount: '' }
}

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [source, setSource] = useState('coupang-eats')
  const [orderedDate, setOrderedDate] = useState(todayString())
  const [orderTotal, setOrderTotal] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [autoReading, setAutoReading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsub = listenProducts(setProducts)
    return () => unsub?.()
  }, [])

  const previewUrl = useMemo(() => {
    if (!file) return ''
    return URL.createObjectURL(file)
  }, [file])

  const computed = useMemo(() => {
    return buildBakeryComputation(items, products)
  }, [items, products])

  function updateItem(index, field, value) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  function addItemRow() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItemRow(index) {
    setItems((prev) => {
      if (prev.length === 1) return [emptyItem()]
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleAutoRead() {
    if (!file) return
    setAutoReading(true)
    setMessage('')

    try {
      const parsed = await parseReceiptImage(file)
      const filled = buildAutofillStateFromParsed(parsed, products)

      if (filled.source) setSource(filled.source)
      if (filled.orderedDate) setOrderedDate(filled.orderedDate)
      if (filled.orderTotal) setOrderTotal(String(filled.orderTotal))
      if (filled.items?.length) setItems(filled.items)
      if (filled.note) setNote(filled.note)

      setMessage(`자동 읽기 완료 (신뢰도 ${Math.round((filled.confidence || 0) * 100)}%)`)
    } catch (err) {
      console.error(err)
      setMessage(err?.message || '자동 읽기 실패')
    } finally {
      setAutoReading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      await Promise.race([
        createReceipt({
          source,
          imageName: file?.name || '',
          orderedDate,
          orderTotal,
          bakeryTotal: computed.bakeryTotal,
          bakeryBreakdown: computed.bakeryBreakdown,
          items: computed.items,
          note,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('저장 시간 초과')), 10000)),
      ])

      setFile(null)
      setOrderTotal('')
      setNote('')
      setItems([emptyItem()])
      setMessage('저장 완료')
    } catch (err) {
      console.error(err)
      setMessage(err?.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h2>업로드</h2>

      <form className="card form" onSubmit={handleSubmit}>
        <label>
          사진 선택
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {previewUrl && (
          <div className="previewWrap">
            <img src={previewUrl} alt="preview" className="preview" />
          </div>
        )}

        <button type="button" onClick={handleAutoRead} disabled={!file || autoReading}>
          {autoReading ? '자동 읽는 중...' : '사진 자동 읽기'}
        </button>

        <label>
          채널
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="coupang-eats">쿠팡이츠</option>
            <option value="baemin">배민</option>
            <option value="naver-order">네이버주문</option>
            <option value="store-receipt">매장 영수증</option>
          </select>
        </label>

        <label>
          주문일
          <input type="date" value={orderedDate} onChange={(e) => setOrderedDate(e.target.value)} />
        </label>

        <label>
          주문금액
          <input
            type="number"
            inputMode="numeric"
            value={orderTotal}
            onChange={(e) => setOrderTotal(e.target.value)}
            placeholder="예: 15300"
          />
        </label>

        <div className="itemSection">
          <div className="itemHeader">
            <h3>품목 입력</h3>
            <button type="button" onClick={addItemRow}>
              + 품목 추가
            </button>
          </div>

          {items.map((item, index) => {
            const matched = buildBakeryComputation([item], products).items[0]

            return (
              <div key={index} className="itemRowCard">
                <label>
                  품목명
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    placeholder="예: 에그타르트"
                  />
                </label>

                <div className="itemRowGrid">
                  <label>
                    수량
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(index, 'qty', e.target.value)}
                    />
                  </label>

                  <label>
                    금액
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.amount}
                      onChange={(e) => updateItem(index, 'amount', e.target.value)}
                      placeholder="예: 3500"
                    />
                  </label>
                </div>

                <div className="itemMatch">
                  {matched?.isBakery ? (
                    <span className="tag bakery">베이커리 매칭: {matched.matchedBakeryName}</span>
                  ) : (
                    <span className="tag normal">베이커리 아님</span>
                  )}
                </div>

                <button type="button" onClick={() => removeItemRow(index)}>
                  삭제
                </button>
              </div>
            )
          })}
        </div>

        <div className="card nestedCard">
          <h3>자동 계산</h3>
          <p>
            베이커리 합계: <strong>{computed.bakeryTotal.toLocaleString()}원</strong>
          </p>
          {computed.bakeryBreakdown.length > 0 ? (
            <ul className="miniList">
              {computed.bakeryBreakdown.map((item) => (
                <li key={item.name}>
                  {item.name} / {item.qty}개 / {item.amount.toLocaleString()}원
                </li>
              ))}
            </ul>
          ) : (
            <p>매칭된 베이커리 품목이 없습니다.</p>
          )}
        </div>

        <label>
          메모
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 디카페인 옵션은 베이커리 제외"
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>

        {message && <p className="message">{message}</p>}
      </form>
    </div>
  )
}
