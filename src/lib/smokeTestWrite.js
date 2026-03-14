import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function smokeTestWrite() {
  return addDoc(collection(db, 'ping'), {
    ok: true,
    createdAt: serverTimestamp(),
  })
}
