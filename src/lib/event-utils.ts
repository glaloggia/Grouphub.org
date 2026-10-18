import type { Event, RecurrenceRule } from '@/types';
import {
  addDays,
  addWeeks,
  addMonths,
  isAfter,
  isEqual,
  parseISO,
  formatISO,
  getDay,
  getDate as getDayOfMonth,
  isBefore,
  startOfDay,
} from 'date-fns';

// Helper to parse date string to Date object (start of day for consistency)
const parseDate = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') {
      return null;
  }
  try {
      const date = parseISO(dateStr);
      // Check if the parsed date is valid
      if (isNaN(date.getTime())) {
          console.warn(`[event-utils] Invalid date string provided, could not be parsed: ${dateStr}`);
          return null;
      }
      return startOfDay(date);
  } catch (e) {
      console.warn(`[event-utils] Error parsing date string "${dateStr}":`, e);
      return null;
  }
};


/**
 * Generates occurrences for a recurring event within a given date range.
 * @param masterEvent The master recurring event object.
 * @param rangeStartDate The start date of the range to generate occurrences for.
 * @param rangeEndDate The end date of the range to generate occurrences for.
 * @returns An array of Event objects, each representing an instance.
 */
export function generateEventOccurrences(
  masterEvent: Event,
  rangeStartDate: Date,
  rangeEndDate: Date
): Event[] {
  const masterStartDate = parseDate(masterEvent.date);

  if (!masterEvent.isRecurring || !masterEvent.recurrence || !masterStartDate) {
    // If the event is not recurring or has an invalid start date, check if the single instance falls within the range.
    if (masterStartDate && !isBefore(masterStartDate, rangeStartDate) && !isAfter(masterStartDate, rangeEndDate) && !masterEvent.isCancelled) {
       return [{ ...masterEvent, isInstance: false }];
    }
    if (!masterStartDate) {
      console.warn(`[event-utils] Cannot process event "${masterEvent.name}" (ID: ${masterEvent.id}) due to invalid start date: "${masterEvent.date}".`);
    }
    return [];
  }

  const occurrences: Event[] = [];
  const recurrence = masterEvent.recurrence;
  let currentDate = masterStartDate; 

  const recurrenceEndDate = recurrence.endDate ? parseDate(recurrence.endDate) : null;

  while (isBefore(currentDate, rangeEndDate) || isEqual(currentDate, rangeEndDate)) {
    if (recurrenceEndDate && isAfter(currentDate, recurrenceEndDate)) {
      break; 
    }

    if (isAfter(currentDate, rangeStartDate) || isEqual(currentDate, rangeStartDate)) {
          
      let shouldAdd = false;
      switch (recurrence.frequency) {
        case 'daily':
          shouldAdd = true;
          break;
        case 'weekly':
          if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
            if (recurrence.daysOfWeek.includes(getDay(currentDate))) {
              shouldAdd = true;
            }
          } else if (getDay(currentDate) === getDay(masterStartDate)) {
            shouldAdd = true;
          }
          break;
        case 'monthly':
          if (recurrence.dayOfMonth) {
            if (getDayOfMonth(currentDate) === recurrence.dayOfMonth) {
              shouldAdd = true;
            }
          } else if (getDayOfMonth(currentDate) === getDayOfMonth(masterStartDate)) {
            shouldAdd = true;
          }
          break;
      }

      if (shouldAdd) {
        const instanceDateStr = formatISO(currentDate, { representation: 'date' });
        const isInstanceCancelled = masterEvent.instanceMetadata?.[instanceDateStr]?.isCancelled || false;

        if (!isInstanceCancelled) {
            occurrences.push({
                ...masterEvent,
                id: `${masterEvent.id}_${instanceDateStr}`,
                date: instanceDateStr,
                masterEventId: masterEvent.id,
                isInstance: true,
                isRecurring: false, 
                recurrence: undefined, 
                attendees: masterEvent.instanceAttendees?.[instanceDateStr] || [],
                isCancelled: isInstanceCancelled,
            });
        }
      }
    }
    
    // Safety break for invalid recurrence rules to prevent infinite loops
    if (isBefore(currentDate, masterStartDate) && recurrence.interval <=0) break;

    // Move to the next potential date
    if (recurrence.frequency === 'daily') {
      currentDate = addDays(currentDate, recurrence.interval);
    } else if (recurrence.frequency === 'weekly') {
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          currentDate = addDays(currentDate, 1); 
      } else {
          currentDate = addWeeks(currentDate, recurrence.interval);
      }
    } else if (recurrence.frequency === 'monthly') {
       if (recurrence.dayOfMonth) {
           currentDate = addDays(currentDate, 1); 
       } else {
           currentDate = addMonths(currentDate, recurrence.interval);
       }
    } else {
      break; 
    }
    if (occurrences.length > 500) break; 
  }
  
  return occurrences;
}

// Helper to determine if an event (or instance) is in the past
export const isEventInstancePast = (eventDateStr: string): boolean => {
  const dateOfEvent = parseDate(eventDateStr);
  if (!dateOfEvent) {
    // If the date is invalid, we can consider it "past" to be safe and hide it.
    return true;
  }
  const today = startOfDay(new Date());
  return isBefore(dateOfEvent, today);
};
