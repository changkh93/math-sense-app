// A resumable session is a complete snapshot, not a recursive map patch.
// merge:true keeps omitted answers from older Dark Matter batches/retries.
// A top-level field mask replaces quizSession while preserving unrelated progress.
export const writeQuizProgressSnapshot = (transaction, progressRef, updates) => (
  transaction.set(progressRef, updates, { mergeFields: Object.keys(updates) })
)
