// A UI deadline cannot cancel a Firestore getDocs call. Keep that read alive
// and reuse it on retry, then deliver a late response to the same query cache.
const pendingReads = new WeakMap();

export function readRecoverableContentQuery({ queryClient, queryKey, read, timeoutMs = 10000 }) {
  const cache = queryClient.getQueryCache();
  const query = cache.find({ queryKey, exact: true });
  let pending = pendingReads.get(query);
  if (!pending) {
    pending = { timedOut: false, dataUpdateCount: query.state.dataUpdateCount };
    pending.promise = Promise.resolve().then(read);
    pendingReads.set(query, pending);
    pending.promise.then((data) => {
      pendingReads.delete(query);
      // Never recreate a removed cache or overwrite a newer manual/cache update.
      if (pending.timedOut && cache.find({ queryKey, exact: true }) === query &&
          query.state.dataUpdateCount === pending.dataUpdateCount) {
        queryClient.setQueryData(queryKey, data);
      }
    }, () => pendingReads.delete(query));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.timedOut = true;
      const error = new Error('Course catalog read timed out; waiting for the existing request.');
      error.code = 'content/deadline-exceeded';
      reject(error);
    }, timeoutMs);
    pending.promise.then((data) => {
      clearTimeout(timer);
      resolve(data);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
