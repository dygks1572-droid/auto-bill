import { useMemo, useState } from 'react'
import { createReceipt } from '../lib/receipts'

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [source, setSource] = useState('coupang-eats')
  const [orderedDate, setOrderedDate] = useState(todayString())
  const [orderTotal, setOrderTotal] = useState('')
  const [bakeryTotal, setBakeryTotal] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const previewUrl = useMemo(() => {
    if (!file) return ''
    return URL.createObjectURL(file)
  }, [file])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      console.time('saveReceipt')

      await Promise.race([
        createReceipt({
          source,
          imageName: file?.name || '',
          orderedDate,
          orderTotal,
          bakeryTotal,
          note,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore write timeout (10s)')), 10000),
        ),
      ])

      console.timeEnd('saveReceipt')
      setFile(null)
      setOrderTotal('')
      setBakeryTotal('')
      setNote('')
      setMessage('저장 완료')
    } catch (err) {
      console.error('save error:', err)
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

        <label>
          베이커리 합계
          <input
            type="number"
            inputMode="numeric"
            value={bakeryTotal}
            onChange={(e) => setBakeryTotal(e.target.value)}
            placeholder="예: 3500"
          />
        </label>

        <label>
          메모
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 에그타르트만 베이커리 포함"
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
