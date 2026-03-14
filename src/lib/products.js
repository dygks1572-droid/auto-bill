import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const PRODUCTS = 'products'

export async function createProduct(payload) {
  return addDoc(collection(db, PRODUCTS), {
    name: payload.name,
    aliases: payload.aliases || [],
    category: payload.category || 'bakery',
    active: true,
    createdAt: serverTimestamp(),
  })
}

export function listenProducts(callback) {
  return onSnapshot(collection(db, PRODUCTS), (snapshot) => {
    const rows = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(rows)
  })
}
