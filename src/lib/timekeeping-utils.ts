
import { TimeEntry } from './types-timekeeper';
import { 
  startOfDay, endOfDay, differenceInMinutes, isSameDay, 
  startOfMonth, endOfMonth, setDate, isAfter, isBefore 
} from 'date-fns';

export interface DailyShift {
  clockInId: string;
  clockOutId?: string;
  date: Date;
  clockIn: Date;
  clockOut?: Date;
  durationMinutes: number;
  status: 'COMPLETED' | 'ACTIVE' | 'MISSING_OUT';
}

export interface EmployeePeriodSummary {
  employeeId: string;
  employeeName: string;
  totalMinutes: number;
  totalHours: number;
  shifts: DailyShift[];
  missingPunches: number;
}

// Helper to determine specific Pay Cycles (1st-15th or 16th-End)
export function getPayPeriod(referenceDate: Date = new Date()) {
  const day = referenceDate.getDate();
  const currentMonthStart = startOfMonth(referenceDate);
  const currentMonthEnd = endOfMonth(referenceDate);

  if (day <= 15) {
    // First Period: 1st - 15th
    return {
      start: currentMonthStart,
      end: endOfDay(setDate(referenceDate, 15)),
      label: '1st - 15th'
    };
  } else {
    // Second Period: 16th - End of Month
    return {
      start: setDate(currentMonthStart, 16),
      end: currentMonthEnd,
      label: `16th - ${currentMonthEnd.getDate()}th`
    };
  }
}

// Core Logic: transform raw log list into paired shifts
export function processTimeEntries(entries: TimeEntry[], periodStart: Date, periodEnd: Date): Record<string, EmployeePeriodSummary> {
  const summary: Record<string, EmployeePeriodSummary> = {};

  // 1. Sort entries by time ASC
  const sortedEntries = [...entries].sort((a, b) => {
    const timeA = a.timestamp instanceof Date ? a.timestamp : (a.timestamp as any).toDate();
    const timeB = b.timestamp instanceof Date ? b.timestamp : (b.timestamp as any).toDate();
    return timeA.getTime() - timeB.getTime();
  });

  // 2. Group by Employee
  const grouped: Record<string, TimeEntry[]> = {};
  sortedEntries.forEach(entry => {
    if (!grouped[entry.employeeId]) grouped[entry.employeeId] = [];
    grouped[entry.employeeId].push(entry);
  });

  // 3. Process Pairs (In -> Out)
  Object.keys(grouped).forEach(empId => {
    const empEntries = grouped[empId];
    const shifts: DailyShift[] = [];
    let currentIn: TimeEntry | null = null;
    let totalMinutes = 0;
    let missingPunches = 0;

    empEntries.forEach(entry => {
      const entryTime = entry.timestamp instanceof Date ? entry.timestamp : (entry.timestamp as any).toDate();
      
      // Filter out entries outside the requested period
      if (isBefore(entryTime, periodStart) || isAfter(entryTime, periodEnd)) return;

      if (entry.type === 'CLOCK_IN') {
        if (currentIn) {
          // Double Clock In (Forgot to clock out previous shift)
          shifts.push({
            clockInId: currentIn.id,
            date: startOfDay(currentIn.timestamp instanceof Date ? currentIn.timestamp : (currentIn.timestamp as any).toDate()),
            clockIn: currentIn.timestamp instanceof Date ? currentIn.timestamp : (currentIn.timestamp as any).toDate(),
            durationMinutes: 0,
            status: 'MISSING_OUT'
          });
          missingPunches++;
        }
        currentIn = entry;
      } else if (entry.type === 'CLOCK_OUT') {
        if (currentIn) {
          // Valid Pair
          const inTime = currentIn.timestamp instanceof Date ? currentIn.timestamp : (currentIn.timestamp as any).toDate();
          const duration = differenceInMinutes(entryTime, inTime);
          
          shifts.push({
            clockInId: currentIn.id,
            clockOutId: entry.id,
            date: startOfDay(inTime),
            clockIn: inTime,
            clockOut: entryTime,
            durationMinutes: duration,
            status: 'COMPLETED'
          });
          totalMinutes += duration;
          currentIn = null;
        } else {
          // Orphaned Clock Out (Ignore or log error)
        }
      }
    });

    // Handle Active Shift (Still clocked in right now)
    if (currentIn) {
       shifts.push({
          clockInId: currentIn.id,
          date: startOfDay(currentIn.timestamp instanceof Date ? currentIn.timestamp : (currentIn.timestamp as any).toDate()),
          clockIn: currentIn.timestamp instanceof Date ? currentIn.timestamp : (currentIn.timestamp as any).toDate(),
          durationMinutes: 0,
          status: 'ACTIVE'
       });
    }

    if (shifts.length > 0) {
      summary[empId] = {
        employeeId: empId,
        employeeName: grouped[empId][0].employeeName,
        totalMinutes,
        totalHours: Number((totalMinutes / 60).toFixed(2)),
        shifts: shifts.sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime()), // Newest first
        missingPunches
      };
    }
  });

  return summary;
}
