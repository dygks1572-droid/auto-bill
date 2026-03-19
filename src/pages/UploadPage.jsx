import { useEffect, useMemo, useRef, useState } from 'react'
import { createReceiptsBatch, listenReceiptsByDate } from '../lib/receipts'
import { listenProducts } from '../lib/products'
import { buildBakeryComputation, learnCatalogAlias } from '../lib/bakeryMatcher'
import { buildAutofillStateFromParsed, parseReceiptImage } from '../lib/receiptAutofillClient'

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function emptyItem() {
  return { name: '', qty: 1, amount: '', isOption: false, optionCharge: 0 }
}

function createUploadEntry(file, index) {
  return {
    id: `${file.name}-${file.lastModified}-${index}`,
    file,
    previewUrl: URL.createObjectURL(file),
    orderTotal: '',
    note: '',
    items: [emptyItem()],
    parsedReceipt: null,
    autoFilled: {
      source: 'manual',
      orderedDate: todayString(),
      confidence: 0,
    },
    status: 'idle',
    error: '',
  }
}

export default function UploadPage() {
  const [uploads, setUploads] = useState([])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [autoReading, setAutoReading] = useState(false)
  const [message, setMessage] = useState('')
  const [savedRows, setSavedRows] = useState([])
  const uploadsRef = useRef([])

  useEffect(() => {
    const unsub = listenProducts(setProducts)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    const unsub = listenReceiptsByDate(todayString(), setSavedRows)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  useEffect(() => {
    return () => {
      for (const entry of uploadsRef.current) {
        URL.revokeObjectURL(entry.previewUrl)
      }
    }
  }, [])

  const totalSelected = uploads.length
  const totalParsed = uploads.filter((entry) => entry.parsedReceipt).length
  const totalErrors = uploads.filter((entry) => entry.status === 'error').length
  const needsAnalysis = uploads.some((entry) => entry.status === 'idle')
  const analysisAttempted =
    uploads.length > 0 && uploads.every((entry) => entry.status !== 'idle' && entry.status !== 'reading')

  const summary = useMemo(() => {
    return uploads.reduce(
      (acc, entry) => {
        const computed = buildBakeryComputation(entry.items, products)
        acc.orderTotal += Number(entry.orderTotal || 0)
        acc.bakeryTotal += computed.bakeryTotal
        return acc
      },
      { orderTotal: 0, bakeryTotal: 0 },
    )
  }, [products, uploads])

  function patchUpload(id, updater) {
    setUploads((prev) => prev.map((entry) => (entry.id === id ? updater(entry) : entry)))
  }

  async function processUploads(targetUploads) {
    if (!targetUploads.length) return

    setAutoReading(true)
    setMessage(`사진 ${targetUploads.length}장 분석 중...`)

    let successCount = 0

    for (const current of targetUploads) {
      patchUpload(current.id, (entry) => ({ ...entry, status: 'reading', error: '' }))

      try {
        const parsed = await parseReceiptImage(current.file)
        const filled = buildAutofillStateFromParsed(parsed, products)

        patchUpload(current.id, (entry) => ({
          ...entry,
          parsedReceipt: parsed,
          orderTotal: filled.orderTotal ? String(filled.orderTotal) : entry.orderTotal,
          note: filled.note || entry.note,
          items: filled.items?.length ? filled.items : entry.items,
          autoFilled: {
            source: filled.source || 'manual',
            orderedDate: filled.orderedDate || todayString(),
            confidence: filled.confidence || 0,
          },
          status: 'done',
          error: '',
        }))
        successCount += 1
      } catch (error) {
        patchUpload(current.id, (entry) => ({
          ...entry,
          parsedReceipt: null,
          status: 'error',
          error: error?.message || '자동 읽기 실패',
        }))
      }
    }

    setMessage(`자동 읽기 완료 ${successCount}/${targetUploads.length}`)
    setAutoReading(false)
  }

  function handleFileChange(event) {
    const nextFiles = Array.from(event.target.files || [])

    setUploads((prev) => {
      for (const entry of prev) {
        URL.revokeObjectURL(entry.previewUrl)
      }
      return nextFiles.map((file, index) => createUploadEntry(file, index))
    })

    if (!nextFiles.length) {
      setMessage('')
      return
    }

    setMessage(`${nextFiles.length}장 선택됨. 분석 버튼을 눌러 진행하세요.`)
  }

  function updateItem(uploadId, itemIndex, field, value) {
    patchUpload(uploadId, (entry) => ({
      ...entry,
      items: entry.items.map((item, index) =>
        index === itemIndex ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function applySuggestedItemName(uploadId, itemIndex, rawName, suggestionName) {
    learnCatalogAlias(rawName, suggestionName)
    updateItem(uploadId, itemIndex, 'name', suggestionName)
    setMessage(`학습 별칭 저장: ${rawName} -> ${suggestionName}`)
  }

  function addItemRow(uploadId) {
    patchUpload(uploadId, (entry) => ({
      ...entry,
      items: [...entry.items, emptyItem()],
    }))
  }

  function removeItemRow(uploadId, itemIndex) {
    patchUpload(uploadId, (entry) => ({
      ...entry,
      items:
        entry.items.length === 1
          ? [emptyItem()]
          : entry.items.filter((_, index) => index !== itemIndex),
    }))
  }

  function removeUpload(uploadId) {
    setUploads((prev) =>
      prev.filter((entry) => {
        if (entry.id === uploadId) {
          URL.revokeObjectURL(entry.previewUrl)
          return false
        }
        return true
      }),
    )
  }

  async function retryUploadAnalysis(uploadId) {
    const target = uploadsRef.current.find((entry) => entry.id === uploadId)
    if (!target || autoReading) return

    setMessage('재분석 중: ' + target.file.name)
    await processUploads([target])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!uploads.length) return

    setSaving(true)
    setMessage('저장 요청 전송 중...')

    try {
      const payloads = uploads.map((entry) => {
        const computed = buildBakeryComputation(entry.items, products)

        return {
          source: entry.autoFilled.source || 'manual',
          imageName: entry.file?.name || '',
          orderedDate: entry.autoFilled.orderedDate || todayString(),
          orderTotal: entry.orderTotal,
          bakeryTotal: computed.bakeryTotal,
          bakeryBreakdown: computed.bakeryBreakdown,
          items: computed.items,
          analysis: entry.parsedReceipt
            ? {
                source: entry.parsedReceipt.source || null,
                orderedDate: entry.parsedReceipt.orderedDate || null,
                orderTotal: entry.parsedReceipt.orderTotal ?? null,
                items: entry.parsedReceipt.items || [],
              }
            : null,
          note: entry.note,
        }
      })

      const saveResult = await createReceiptsBatch(payloads)

      for (const entry of uploads) {
        URL.revokeObjectURL(entry.previewUrl)
      }
      setUploads([])
      const completedMessage = saveResult.synced
        ? `${uploads.length}건 저장 완료`
        : `${uploads.length}건 저장 완료 (로컬 저장)`
      setMessage(completedMessage)
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(completedMessage)
      }
    } catch (error) {
      console.error(error)
      setMessage(error?.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h2>업로드</h2>

      <form className="card form" onSubmit={handleSubmit}>
        <div className="uploadControlShell">
          <label className="uploadDropzone">
            <span className="uploadDropzoneTitle">영수증 사진 업로드</span>
            <span className="uploadDropzoneText">
              여러 장을 한 번에 선택하고, 분석 후 바로 저장할 수 있습니다.
            </span>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </label>

          <div className="uploadOverviewGrid">
            <div className="uploadMetricCard">
              <span>선택 사진</span>
              <strong>{totalSelected}장</strong>
            </div>
            <div className="uploadMetricCard">
              <span>분석 완료</span>
              <strong>{totalParsed}장</strong>
            </div>
            <div className="uploadMetricCard">
              <span>분석 실패</span>
              <strong>{totalErrors}장</strong>
            </div>
            <div className="uploadMetricCard">
              <span>총 주문금액</span>
              <strong>{summary.orderTotal.toLocaleString()}원</strong>
            </div>
            <div className="uploadMetricCard">
              <span>베이커리 합계</span>
              <strong>{summary.bakeryTotal.toLocaleString()}원</strong>
            </div>
          </div>
        </div>

        <div className="batchActions">
          {!analysisAttempted ? (
            <button type="button" onClick={() => processUploads(uploads)} disabled={!uploads.length || autoReading}>
              {autoReading ? '분석 중...' : `${totalSelected || 0}건 분석`}
            </button>
          ) : (
            <button type="submit" disabled={!uploads.length || saving || autoReading}>
              {saving ? '저장 중...' : `${totalSelected || 0}건 저장`}
            </button>
          )}
        </div>

        {uploads.length > 0 ? (
          <div className="uploadList">
            {uploads.map((entry, uploadIndex) => {
              const computed = buildBakeryComputation(entry.items, products)
              const itemCount = entry.items.filter((item) => item.name).length
              const parsedItems = entry.parsedReceipt?.items || []
              const recognizedItemCount = parsedItems.filter((item) => item.name && !item.isOption).length
              const recognizedOptionCount = parsedItems.filter((item) => item.isOption).length
              const matchedBakeryCount = computed.bakeryBreakdown.length
              const amountGap = Number(entry.orderTotal || 0) - computed.bakeryTotal

              return (
                <div key={entry.id} className="card nestedCard uploadCard">
                  <div className="uploadCardHeader">
                    <div>
                      <h3>
                        {uploadIndex + 1}. {entry.file.name}
                      </h3>
                      <p className="subtleText">추정 채널 {entry.autoFilled.source || 'manual'}</p>
                    </div>
                    <div className="uploadCardActions">
                      <span className={`statusBadge status-${entry.status}`}>
                        {entry.status === 'done'
                          ? '분석 완료'
                          : entry.status === 'reading'
                            ? '분석 중'
                            : entry.status === 'error'
                              ? '분석 실패'
                              : '분석 대기'}
                      </span>
                      {entry.status !== 'idle' && entry.status !== 'reading' ? (
                        <button
                          type="button"
                          className="ghostButton"
                          onClick={() => retryUploadAnalysis(entry.id)}
                          disabled={autoReading}
                        >
                          다시 분석
                        </button>
                      ) : null}
                      <button type="button" className="ghostButton" onClick={() => removeUpload(entry.id)}>
                        제거
                      </button>
                    </div>
                  </div>

                  <div className="uploadCardLayout">
                    <div className="uploadCardVisual">
                      <div className="previewWrap multiPreviewWrap">
                        <img src={entry.previewUrl} alt={entry.file.name} className="preview" />
                      </div>

                      <div className="uploadQuickFacts">
                        <div className="uploadFact emphasis">
                          <span>주문금액</span>
                          <strong>{Number(entry.orderTotal || 0).toLocaleString()}원</strong>
                        </div>
                        <div className="uploadFact emphasis">
                          <span>베이커리 합계</span>
                          <strong>{computed.bakeryTotal.toLocaleString()}원</strong>
                        </div>
                        <div className="uploadFact">
                          <span>인식 품목</span>
                          <strong>{recognizedItemCount || itemCount}개</strong>
                        </div>
                        <div className="uploadFact">
                          <span>옵션 행</span>
                          <strong>{recognizedOptionCount}개</strong>
                        </div>
                      </div>
                    </div>

                    <div className="uploadCardContent">
                      <div className="analysisSpotlight card nestedCard">
                        <div className="analysisSpotlightHeader">
                          <div>
                            <p className="sectionEyebrow">Analysis</p>
                            <h3>한눈에 보는 분석 결과</h3>
                          </div>
                          <span className={`statusBadge status-${entry.status}`}>
                            {entry.status === 'done'
                              ? '확인 완료'
                              : entry.status === 'reading'
                                ? '읽는 중'
                                : entry.status === 'error'
                                  ? '확인 필요'
                                  : '대기'}
                          </span>
                        </div>

                        <div className="analysisSummaryGrid">
                          <div className="analysisSummaryCard">
                            <span>채널</span>
                            <strong>{entry.autoFilled.source || 'manual'}</strong>
                          </div>
                          <div className="analysisSummaryCard">
                            <span>매칭 베이커리</span>
                            <strong>{matchedBakeryCount}개</strong>
                          </div>
                          <div className="analysisSummaryCard">
                            <span>편집 품목</span>
                            <strong>{itemCount}개</strong>
                          </div>
                          <div className="analysisSummaryCard">
                            <span>차액</span>
                            <strong>{amountGap.toLocaleString()}원</strong>
                          </div>
                        </div>

                        {entry.parsedReceipt ? (
                          <div className="parseResult compactParseCard">
                            <div className="analysisListHeader">
                              <strong>자동 추출 품목</strong>
                              <span>{parsedItems.length}줄</span>
                            </div>
                            {parsedItems.length ? (
                              <ul className="analysisLineList">
                                {parsedItems.map((item, index) => (
                                  <li key={`${item.name}-${index}`} className={item.isOption ? 'isOptionRow' : ''}>
                                    <div>
                                      <strong>{item.name}</strong>
                                      <span>{item.isOption ? '옵션 행' : '일반 품목'}</span>
                                    </div>
                                    <div>
                                      <span>{item.qty}개</span>
                                      <strong>{item.amount.toLocaleString()}원</strong>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>추출된 품목이 없습니다.</p>
                            )}
                          </div>
                        ) : (
                          <p className="subtleText">분석 후 자동 추출 품목이 여기에 요약됩니다.</p>
                        )}
                      </div>

                      {entry.error && <p className="message errorMessage">{entry.error}</p>}

                      {needsAnalysis && (
                        <p className="subtleText">분석 전입니다. 상단 분석 버튼을 눌러주세요.</p>
                      )}

                      <label>
                        주문금액
                        <input
                          type="number"
                          inputMode="numeric"
                          value={entry.orderTotal}
                          onChange={(e) =>
                            patchUpload(entry.id, (current) => ({
                              ...current,
                              orderTotal: e.target.value,
                            }))
                          }
                          placeholder="예: 15300"
                        />
                      </label>

                      <div className="itemSection">
                        <div className="itemHeader">
                          <h3>품목 입력</h3>
                          <button type="button" onClick={() => addItemRow(entry.id)}>
                            + 품목 추가
                          </button>
                        </div>

                        {entry.items.map((item, index) => {
                          const matched = buildBakeryComputation([item], products).items[0]

                          return (
                            <div key={`${entry.id}-${index}`} className="itemRowCard">
                              <label>
                                품목명
                                <input
                                  value={item.name}
                                  onChange={(e) => updateItem(entry.id, index, 'name', e.target.value)}
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
                                    onChange={(e) => updateItem(entry.id, index, 'qty', e.target.value)}
                                  />
                                </label>

                                <label>
                                  금액
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={item.amount}
                                    onChange={(e) => updateItem(entry.id, index, 'amount', e.target.value)}
                                    placeholder="예: 3500"
                                  />
                                </label>
                              </div>

                              <div className="itemMatch">
                                {matched?.isOption || item.isOption ? (
                                  <span className="tag normal">옵션 행 인식</span>
                                ) : matched?.isBakery ? (
                                  <span className="tag bakery">베이커리 매칭: {matched.matchedBakeryName}</span>
                                ) : matched?.suggestions?.length ? (
                                  <span className="tag normal">자동 매칭 실패</span>
                                ) : (
                                  <span className="tag normal">베이커리 아님</span>
                                )}
                              </div>

                              {matched?.suggestions?.length && !matched?.isBakery && !matched?.isOption && !item.isOption ? (
                                <div className="suggestionGroup">
                                  <p className="suggestionLabel">추천 후보</p>
                                  <div className="suggestionChips">
                                    {matched.suggestions.map((suggestion) => (
                                      <button
                                        key={`${entry.id}-${index}-${suggestion.name}`}
                                        type="button"
                                        className="suggestionChip"
                                        onClick={() => applySuggestedItemName(entry.id, index, item.name, suggestion.name)}
                                      >
                                        {suggestion.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              <button type="button" onClick={() => removeItemRow(entry.id, index)}>
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
                              <li key={`${entry.id}-${item.name}`}>
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
                          value={entry.note}
                          onChange={(e) =>
                            patchUpload(entry.id, (current) => ({
                              ...current,
                              note: e.target.value,
                            }))
                          }
                          placeholder="예: 디카페인 옵션은 베이커리 제외"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {message && <p className="message">{message}</p>}

        <div className="card nestedCard">
          <h3>오늘 저장된 기록</h3>
          {savedRows.length === 0 ? (
            <p>아직 저장된 영수증이 없습니다.</p>
          ) : (
            <ul className="receiptList receiptOverviewList">
              {savedRows.map((row) => (
                <li key={row.id}>
                  <div className="receiptRowHeader">
                    <div>
                      <strong>{row.imageName || '사진 없음'}</strong>
                      <span>{row.source}</span>
                    </div>
                    <span className="tag bakery">저장 완료</span>
                  </div>
                  <div className="receiptRowMetrics">
                    <div>
                      <span>주문금액</span>
                      <strong>{Number(row.orderTotal || 0).toLocaleString()}원</strong>
                    </div>
                    <div>
                      <span>베이커리</span>
                      <strong>{Number(row.bakeryTotal || 0).toLocaleString()}원</strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </div>
  )
}
