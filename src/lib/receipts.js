import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const RECEIPTS = 'receipts'

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

export async function createReceipt(payload) {
  const uploadedDate = todayString()
  const orderedDate = payload.orderedDate || uploadedDate

  return addDoc(collection(db, RECEIPTS), {
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
  })
}

export function listenReceiptsByDate(targetDate, callback) {
  return onSnapshot(collection(db, RECEIPTS), (snapshot) => {
    const rows = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    const filtered = rows.filter((row) => resolveReceiptDay(row) === targetDate)

    filtered.sort((a, b) => {
      const at = a.createdAt?.seconds || 0
      const bt = b.createdAt?.seconds || 0
      return bt - at
    })

    callback(filtered)
  })
}
