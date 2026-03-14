import { useEffect, useMemo, useState } from 'react'
import { listenReceiptsByDate } from '../lib/receipts'

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatWon(value) {
  return new Intl.NumberFormat('ko-KR').format(Number(value || 0))
}

export default function SummaryPage() {
  const [orderedDate, setOrderedDate] = useState(todayString())
  const [rows, setRows] = useState([])

  useEffect(() => {
    const unsub = listenReceiptsByDate(orderedDate, setRows)
    return () => unsub?.()
  }, [orderedDate])

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.orderTotal += Number(row.orderTotal || 0)
        acc.bakeryTotal += Number(row.bakeryTotal || 0)
        return acc
      },
      { orderTotal: 0, bakeryTotal: 0 },
    )
  }, [rows])

  return (
    <div className="page">
      <h2>요약</h2>

      <div className="card">
        <label>
          조회일
          <input type="date" value={orderedDate} onChange={(e) => setOrderedDate(e.target.value)} />
        </label>
      </div>

      <div className="summaryGrid">
        <div className="card bigNumber">
          <h3>총 주문금액</h3>
          <strong>{formatWon(summary.orderTotal)}원</strong>
        </div>

        <div className="card bigNumber">
          <h3>베이커리 합계</h3>
          <strong>{formatWon(summary.bakeryTotal)}원</strong>
        </div>
      </div>

      <div className="card">
        <h3>주문 목록</h3>
        {rows.length === 0 ? (
          <p>저장된 주문이 없습니다.</p>
        ) : (
          <ul className="receiptList">
            {rows.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.imageName || '사진 없음'}</strong>
                  <span>{row.source}</span>
                </div>
                <div>
                  주문금액 {formatWon(row.orderTotal)}원 / 베이커리 {formatWon(row.bakeryTotal)}원
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
