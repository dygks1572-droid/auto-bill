import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

const RECEIPTS = 'receipts'

export async function createReceipt(payload) {
  return addDoc(collection(db, RECEIPTS), {
    source: payload.source || 'manual',
    imageName: payload.imageName || '',
    orderedDate: payload.orderedDate,
    orderTotal: Number(payload.orderTotal || 0),
    bakeryTotal: Number(payload.bakeryTotal || 0),
    note: payload.note || '',
    bakeryItems: payload.bakeryItems || [],
    createdAt: serverTimestamp(),
  })
}

export function listenReceiptsByDate(orderedDate, callback) {
  const q = query(collection(db, RECEIPTS), where('orderedDate', '==', orderedDate))

  return onSnapshot(q, (snapshot) => {
    const rows = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    rows.sort((a, b) => {
      const at = a.createdAt?.seconds || 0
      const bt = b.createdAt?.seconds || 0
      return bt - at
    })

    callback(rows)
  })
}
