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

function getReceiptAnalysis(row) {
  if (row.analysis) return row.analysis

  return {
    source: row.source || null,
    documentType: null,
    orderedDate: row.orderedDate || null,
    totalLabel: null,
    orderTotal: row.orderTotal ?? null,
    confidence: null,
    notes: row.note ? [row.note] : [],
    items: row.items || [],
  }
}

export default function SummaryPage() {
  const [orderedDate, setOrderedDate] = useState(todayString())
  const [rows, setRows] = useState([])

  useEffect(() => {
    const unsub = listenReceiptsByDate(orderedDate, setRows)
    return () => unsub?.()
  }, [orderedDate])

  const summary = useMemo(() => {
    const bakeryMap = new Map()

    const base = rows.reduce(
      (acc, row) => {
        acc.orderTotal += Number(row.orderTotal || 0)
        acc.bakeryTotal += Number(row.bakeryTotal || 0)

        for (const item of row.bakeryBreakdown || []) {
          if (!bakeryMap.has(item.name)) {
            bakeryMap.set(item.name, {
              name: item.name,
              qty: 0,
              amount: 0,
            })
          }
          const target = bakeryMap.get(item.name)
          target.qty += Number(item.qty || 0)
          target.amount += Number(item.amount || 0)
        }

        return acc
      },
      { orderTotal: 0, bakeryTotal: 0 },
    )

    return {
      ...base,
      bakeryItems: Array.from(bakeryMap.values()).sort((a, b) => b.amount - a.amount),
    }
  }, [rows])

  return (
    <div className="page">
      <h2>요약</h2>

      <div className="card">
        <label>
          업로드 조회일
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
        <h3>베이커리 품목별 합계</h3>
        {summary.bakeryItems.length === 0 ? (
          <p>매칭된 베이커리 품목이 없습니다.</p>
        ) : (
          <ul className="receiptList">
            {summary.bakeryItems.map((item) => (
              <li key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                </div>
                <div>
                  수량 {item.qty} / 금액 {formatWon(item.amount)}원
                </div>
              </li>
            ))}
          </ul>
        )}
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
                <div>업로드일 {row.uploadedDate || '-'}</div>
                <details className="analysisDetails">
                  <summary>분석 내용 보기</summary>
                  {(() => {
                    const analysis = getReceiptAnalysis(row)
                    return (
                      <div className="analysisPanel">
                        <div className="analysisMeta">
                          <div>
                            <strong>분석 출처</strong>
                            <p>{analysis.source || row.source || '-'}</p>
                          </div>
                        </div>

                        <div>
                          <strong>분석 품목</strong>
                          {analysis.items?.length ? (
                            <ul className="miniList compactList">
                              {analysis.items.map((item, index) => (
                                <li key={`${row.id}-analysis-${item.name}-${index}`}>
                                  {item.name} / {Number(item.qty || 0)}개 /{' '}
                                  {formatWon(item.amount || 0)}원
                                  {item.isOption ? ' / 옵션' : ''}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>저장된 분석 품목이 없습니다.</p>
                          )}
                        </div>

                        <div>
                          <strong>분석 메모</strong>
                          {analysis.notes?.length ? (
                            <ul className="miniList compactList">
                              {analysis.notes.map((note, index) => (
                                <li key={`${row.id}-note-${index}`}>{note}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>저장된 메모가 없습니다.</p>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
