// Memory-only, viewer-scoped caches. Failed requests need an explicit retry;
// focus changes and reconnects must not fan out profile reads.
export function profileQueryOptions(viewerId, userId, section, load) {
  return {
    queryKey: ['public-profile', viewerId || '', userId || '', section],
    queryFn: () => withProfileTimeout(load()),
    staleTime: section === 'identity' ? 60_000 : 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: 'always',
  };
}

export function withProfileTimeout(promise, timeoutMs = 12_000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('연결이 지연되고 있습니다. 다시 시도해주세요.')), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}
