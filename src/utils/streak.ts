import { Book } from '../types';

export const calculateReadingStreak = (books: Book[]): number => {
  // Collect all unique reading dates
  const dates = new Set<string>();
  
  books.forEach(book => {
    if (book.readingSessions) {
      book.readingSessions.forEach(session => {
        // Just extract the local date portion YYYY-MM-DD
        const dateObj = new Date(session.date);
        const dateStr = dateObj.toISOString().split('T')[0];
        dates.add(dateStr);
      });
    }
  });
  
  if (dates.size === 0) return 0;
  
  const sortedDates = Array.from(dates).sort().reverse();
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if today or yesterday has a session to start the streak
  let currentDateToCheck = today;
  let todayStr = today.toISOString().split('T')[0];
  let yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (sortedDates.includes(todayStr)) {
    streak = 1;
    currentDateToCheck = today;
  } else if (sortedDates.includes(yesterdayStr)) {
    streak = 1;
    currentDateToCheck = yesterday;
  } else {
    return 0; // No session today or yesterday, streak is 0
  }
  
  // Go backwards
  for (let i = 1; i < dates.size; i++) {
    const nextDateToCheck = new Date(currentDateToCheck);
    nextDateToCheck.setDate(nextDateToCheck.getDate() - 1);
    const nextDateStr = nextDateToCheck.toISOString().split('T')[0];
    
    if (sortedDates.includes(nextDateStr)) {
      streak++;
      currentDateToCheck = nextDateToCheck;
    } else {
      break;
    }
  }
  
  return streak;
};
