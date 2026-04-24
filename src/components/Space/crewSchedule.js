export const CREW_SCHEDULE_DAYS = [
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
  { key: 'sun', label: '일' },
];

export function getDefaultScheduleTimes() {
  return CREW_SCHEDULE_DAYS.reduce((acc, day) => {
    acc[day.key] = '20:00';
    return acc;
  }, {});
}

export function normalizeScheduleDays(days) {
  const valid = new Set(CREW_SCHEDULE_DAYS.map((day) => day.key));
  return Array.isArray(days) ? days.filter((day) => valid.has(day)) : [];
}

export function formatCrewSchedule(days = [], times = {}) {
  const normalizedDays = normalizeScheduleDays(days);
  if (!normalizedDays.length) return '정기 일정 미정';
  return normalizedDays
    .map((dayKey) => {
      const day = CREW_SCHEDULE_DAYS.find((item) => item.key === dayKey);
      return `${day?.label || dayKey} ${times?.[dayKey] || '20:00'}`;
    })
    .join(' · ');
}
