import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

const RECEIPTS = 'receipts'
const RECEIPTS_STORAGE_KEY = 'bill.receipts.v1'

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toNumber(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function resolveReceiptDay(row) {
  return row.uploadedDate || row.orderedDate || ''
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function cloneForStorage(value) {
  return JSON.parse(JSON.stringify(value))
}

function readCachedReceipts() {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(RECEIPTS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Failed to read cached receipts', error)
    return []
  }
}

function writeCachedReceipts(rows) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(rows))
  } catch (error) {
    console.warn('Failed to write cached receipts', error)
  }
}

function mergeReceipts(baseRows, incomingRows) {
  const map = new Map()

  for (const row of [...baseRows, ...incomingRows]) {
    if (!row?.id) continue
    map.set(row.id, row)
  }

  return Array.from(map.values())
}

function getCreatedAtMs(row) {
  if (typeof row?.createdAtMs === 'number') return row.createdAtMs
  if (typeof row?.createdAt === 'string') {
    const parsed = Date.parse(row.createdAt)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof row?.createdAt?.seconds === 'number') {
    return row.createdAt.seconds * 1000
  }
  return 0
}

function sortReceipts(rows) {
  return [...rows].sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a))
}

function filterReceiptsByDate(rows, targetDate) {
  return sortReceipts(rows.filter((row) => resolveReceiptDay(row) === targetDate))
}

export async function createReceipt(payload) {
  const [id] = await createReceiptsBatch([payload])
  return id
}

function normalizeReceiptPayload(payload, { uploadedDate, orderedDate }) {
  return {
    source: payload.source || 'manual',
    imageName: payload.imageName || '',
    orderedDate,
    uploadedDate,
    orderTotal: toNumber(payload.orderTotal),
    bakeryTotal: toNumber(payload.bakeryTotal),
    bakeryBreakdown: payload.bakeryBreakdown || [],
    items: payload.items || [],
    analysis: payload.analysis || null,
    note: payload.note || '',
    createdAt: serverTimestamp(),
  }
}

export async function createReceiptsBatch(payloads) {
  if (!Array.isArray(payloads) || !payloads.length) return []

  const uploadedDate = todayString()
  const createdAtMs = Date.now()
  const batch = writeBatch(db)
  const refs = []
  const cachedRows = []

  for (const payload of payloads) {
    const orderedDate = payload.orderedDate || uploadedDate
    const ref = doc(collection(db, RECEIPTS))
    const normalized = normalizeReceiptPayload(payload, { uploadedDate, orderedDate })

    batch.set(ref, normalized)
    refs.push(ref.id)
    cachedRows.push(
      cloneForStorage({
        id: ref.id,
        ...normalized,
        createdAtMs,
      }),
    )
  }

  const nextCachedRows = sortReceipts(mergeReceipts(readCachedReceipts(), cachedRows))
  writeCachedReceipts(nextCachedRows)

  try {
    await batch.commit()
  } catch (error) {
    console.warn('Failed to sync receipts to Firestore. Using local cache instead.', error)
  }

  return refs
}

export function listenReceiptsByDate(targetDate, callback) {
  callback(filterReceiptsByDate(readCachedReceipts(), targetDate))

  return onSnapshot(
    collection(db, RECEIPTS),
    (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      const mergedRows = sortReceipts(mergeReceipts(readCachedReceipts(), rows))

      writeCachedReceipts(mergedRows)
      callback(filterReceiptsByDate(mergedRows, targetDate))
    },
    (error) => {
      console.warn('Failed to listen receipts from Firestore. Falling back to local cache.', error)
      callback(filterReceiptsByDate(readCachedReceipts(), targetDate))
    },
  )
}
