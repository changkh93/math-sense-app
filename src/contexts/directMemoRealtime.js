import { createContext, useContext } from 'react';

export const DirectMemoRealtimeContext = createContext({
  uid: '',
  unreadMemos: [],
  unreadCount: 0,
  loading: true,
});

export function useDirectMemoRealtime() {
  return useContext(DirectMemoRealtimeContext);
}
