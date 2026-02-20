import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Record a crystal transaction in the user's ledger.
 * 
 * @param {string} userId - The user's UID
 * @param {Object} tx - Transaction details
 * @param {number} tx.amount - Positive for earned, negative for spent
 * @param {string} tx.type - Transaction type: 'quiz_reward' | 'store_purchase' | 'answer_accepted' | 'question_resolved' | 'self_resolve' | 'teacher_verify' | 'streak_bonus' | 'admin_adjust'
 * @param {string} tx.description - Human-readable description (e.g. "소수와 십분의 몇 탐사 완료")
 * @param {Object} [tx.metadata] - Optional additional data (e.g. unitId, questionId)
 */
export async function recordCrystalTransaction(userId, { amount, type, description, metadata = {} }) {
  if (!userId || amount === 0) return

  try {
    await addDoc(collection(db, 'users', userId, 'crystal_transactions'), {
      amount,
      type,
      description,
      metadata,
      timestamp: serverTimestamp()
    })
  } catch (error) {
    // Don't let ledger recording failure break the main flow
    console.error('Failed to record crystal transaction:', error)
  }
}
