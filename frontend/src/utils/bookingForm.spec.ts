import { describe, expect, it } from 'vitest'
import { type BookingFormValues, STEP_MESSAGE, validateBookingForm } from './bookingForm'

const ZONE = 'Asia/Ho_Chi_Minh'
// Mon 2 Nov 2026 08:07 office time
const NOW = new Date('2026-11-02T01:07:00Z')

function validate(values: Partial<BookingFormValues>) {
  return validateBookingForm({ date: '2026-11-02', start: '11:00', end: '12:00', title: 'Sprint planning', ...values }, NOW, ZONE)
}

describe('validateBookingForm', () => {
  it('accepts a complete future booking', () => {
    expect(validate({})).toEqual({})
  })

  it('AC-11: rejects a start or end not on a 15-minute step', () => {
    expect(validate({ start: '09:10', end: '10:00' })).toEqual({ start: STEP_MESSAGE })
    expect(validate({ start: '09:00', end: '10:05' })).toEqual({ end: STEP_MESSAGE })
    expect(STEP_MESSAGE).toBe('Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45.')
  })

  it('AC-12: rejects an end equal to or before the start', () => {
    expect(validate({ start: '11:00', end: '11:00' })).toEqual({ end: 'End must be after start.' })
    expect(validate({ start: '11:00', end: '10:45' })).toEqual({ end: 'End must be after start.' })
  })

  it('AC-13: rejects a start in the past and accepts the next step', () => {
    expect(validate({ start: '08:00', end: '09:00' })).toEqual({ start: 'Start is in the past. Choose a later time.' })
    expect(validate({ start: '08:15', end: '09:00' })).toEqual({})
  })

  it('AC-14: names each empty field; a title of only spaces counts as empty', () => {
    expect(validate({ date: '' })).toEqual({ date: 'Choose a date.' })
    expect(validate({ start: '' })).toEqual({ start: 'Choose a start time.' })
    expect(validate({ end: '' })).toEqual({ end: 'Choose an end time.' })
    expect(validate({ title: '' })).toEqual({ title: 'Enter a title.' })
    expect(validate({ title: '   ' })).toEqual({ title: 'Enter a title.' })
  })
})
