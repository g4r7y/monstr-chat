import type { ChatMessage } from '@core/chatModel';

export const messageTimestampLabel = (msg: ChatMessage): string => {
  const nowDate = new Date();
  const msgDate = new Date(msg.time);
  const timeDeltaHours = Math.floor((nowDate.getTime() - msgDate.getTime()) / 3600000);
  const isToday = nowDate.getDay() === msgDate.getDay() && timeDeltaHours < 24;
  const isThisWeek = timeDeltaHours < 24 * 6 || (timeDeltaHours < 24 * 7 && nowDate.getDay() !== msgDate.getDay());
  const isThisYear = timeDeltaHours < 24 * 365;
  const msgDay = `${msg.time.toLocaleDateString(undefined, {
    weekday: isThisYear ? (isThisWeek ? 'long' : 'short') : undefined,
    day: isThisWeek ? undefined : 'numeric',
    month: isThisWeek ? undefined : 'short',
    year: isThisYear ? undefined : 'numeric'
  })}`;
  const msgTime = `${msg.time.getHours()}:${String(msg.time.getMinutes()).padStart(2, '0')}`;
  return isToday ? `${msgTime}` : `${msgDay}, ${msgTime}`;
};
