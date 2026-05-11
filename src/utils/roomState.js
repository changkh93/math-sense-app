import { useState, useEffect } from 'react';

let activeRoomId = '';
const listeners = new Set();

export function setGlobalActiveRoomId(id) {
  activeRoomId = id;
  listeners.forEach(l => l(id));
}

export function useGlobalActiveRoomId() {
  const [id, setId] = useState(activeRoomId);
  useEffect(() => {
    listeners.add(setId);
    return () => listeners.delete(setId);
  }, []);
  return [id, setGlobalActiveRoomId];
}
