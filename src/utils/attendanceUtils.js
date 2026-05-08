import { getKSTComponents, scheduleIncludesDay } from './streakUtils';

export function getAttendanceDockingStatus({ clusterData, todayAttendance }) {
  if (todayAttendance) {
    return {
      state: 'completed',
      message: `도킹 완료 (${todayAttendance.status === 'late' ? '지각' : '정상'})`
    };
  }

  if (!clusterData?.classSchedule?.length) {
    return { state: 'invalid', message: '출석 일정이 설정되지 않았습니다.' };
  }

  const { dayOfWeek, hours, minutes, seconds } = getKSTComponents();
  const currentTimeInMins = hours * 60 + minutes;
  const todaySchedule = clusterData.classSchedule.find(s => scheduleIncludesDay(s, dayOfWeek));

  if (!todaySchedule) {
    return { state: 'invalid', message: '오늘은 수업이 없습니다.' };
  }

  const [startHour, startMin] = todaySchedule.startTime.split(':').map(Number);
  const [endHour, endMin] = todaySchedule.endTime.split(':').map(Number);
  const startTimeInMins = startHour * 60 + startMin;
  const endTimeInMins = endHour * 60 + endMin;
  const dockingOpenTimeInMins = startTimeInMins - 10;
  const onTimeGraceMins = startTimeInMins + 5;

  if (currentTimeInMins < dockingOpenTimeInMins) {
    return { state: 'invalid', message: `수업 시작 10분 전부터 도킹이 가능합니다. (${todaySchedule.startTime})` };
  }

  if (currentTimeInMins >= dockingOpenTimeInMins && currentTimeInMins < startTimeInMins) {
    return { state: 'open', message: '탐사선 도킹 승인' };
  }

  if (currentTimeInMins >= startTimeInMins && currentTimeInMins <= onTimeGraceMins) {
    const totalClosingSecs = (onTimeGraceMins * 60) - (hours * 3600 + minutes * 60 + seconds);
    const mins = Math.floor(totalClosingSecs / 60);
    const secs = totalClosingSecs % 60;
    return {
      state: 'closing',
      message: `도킹 마감 임박 - ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    };
  }

  if (currentTimeInMins > onTimeGraceMins && currentTimeInMins <= endTimeInMins) {
    return { state: 'late', message: '게이트 폐쇄 (지각 도킹)' };
  }

  return { state: 'invalid', message: '오늘 수업이 종료되었습니다.' };
}
