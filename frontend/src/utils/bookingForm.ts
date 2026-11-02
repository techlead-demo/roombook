import { isQuarterHourTime, toUtcInstant } from './time'

export const TITLE_MAX_LENGTH = 100

export interface BookingFormValues {
  /** Calendar day (YYYY-MM-DD) in the office time zone. */
  date: string
  /** Office wall-clock times "HH:mm". */
  start: string
  end: string
  title: string
}

export type BookingFormErrors = Partial<Record<keyof BookingFormValues, string>>

export const STEP_MESSAGE = 'Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45.'

/** Field errors of the booking form (BR-2, BR-3, BR-7, BR-8); empty when the form can be sent. */
export function validateBookingForm(values: BookingFormValues, now: Date, timeZone: string): BookingFormErrors {
  const errors: BookingFormErrors = {}
  if (!values.date) errors.date = 'Choose a date.'
  if (!values.start) errors.start = 'Choose a start time.'
  else if (!isQuarterHourTime(values.start)) errors.start = STEP_MESSAGE
  if (!values.end) errors.end = 'Choose an end time.'
  else if (!isQuarterHourTime(values.end)) errors.end = STEP_MESSAGE
  if (!values.title.trim()) errors.title = 'Enter a title.'

  if (values.date && !errors.start) {
    const startAt = toUtcInstant(values.date, values.start, timeZone)
    if (new Date(startAt) < now) errors.start = 'Start is in the past. Choose a later time.'
    if (values.end && !errors.end && new Date(toUtcInstant(values.date, values.end, timeZone)) <= new Date(startAt)) {
      errors.end = 'End must be after start.'
    }
  }
  return errors
}
