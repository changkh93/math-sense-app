import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Record a crystal transaction in the user's ledger.
 * 
 * @param {string} userId - The user's UID
 * @param {Object} tx - Transaction details
 * @param {number} tx.amount - Positive for earned, negative for spent
 * @param {string} tx.type - Transaction type
 * @param {string} tx.description - Human-readable description
 * @param {Object} [tx.metadata] - Optional additional data
 * @param {Object} [transaction] - Optional Firestore Transaction object for atomic writes
 * @param {string} [txId] - Optional unique ID for the transaction (for idempotency)
 */
export async function recordCrystalTransaction(userId, { amount, type, description, metadata = {} }, transaction = null, txId = null) {
  if (!userId || (amount === 0 && type !== 'streak_freeze')) return

  const txData = {
    amount,
    type,
    description,
    metadata,
    timestamp: serverTimestamp()
  }

  const txRef = txId
    ? doc(db, 'users', userId, 'crystal_transactions', txId)
    : doc(collection(db, 'users', userId, 'crystal_transactions'))

  if (transaction) {
    transaction.set(txRef, txData)
  } else {
    await setDoc(txRef, txData)
  }
}
