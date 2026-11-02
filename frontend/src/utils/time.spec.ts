import { describe, expect, it } from 'vitest'
import {
  formatCalendarDate,
  formatOfficeTime,
  formatOfficeTimeRange,
  isQuarterHourTime,
  minutesFromOfficeMidnight,
  toOfficeDate,
  toUtcInstant,
} from './time'

const ZONE = 'Asia/Ho_Chi_Minh' // UTC+7

describe('time utils', () => {
  it('formats a UTC instant as office wall-clock time', () => {
    expect(formatOfficeTime('2026-11-02T02:00:00Z', ZONE)).toBe('09:00')
    expect(formatOfficeTime('2026-11-01T17:00:00Z', ZONE)).toBe('00:00')
  })

  it('formats a range', () => {
    expect(formatOfficeTimeRange('2026-11-02T02:00:00Z', '2026-11-02T03:15:00Z', ZONE)).toBe('09:00–10:15')
  })

  it('returns the office calendar date, which can differ from the UTC date', () => {
    expect(toOfficeDate('2026-11-01T16:59:00Z', ZONE)).toBe('2026-11-01')
    expect(toOfficeDate('2026-11-01T17:00:00Z', ZONE)).toBe('2026-11-02')
  })

  it('counts minutes from office midnight of a given day, across day boundaries', () => {
    expect(minutesFromOfficeMidnight('2026-11-02T02:00:00Z', '2026-11-02', ZONE)).toBe(9 * 60)
    expect(minutesFromOfficeMidnight('2026-11-01T16:30:00Z', '2026-11-02', ZONE)).toBe(-30)
    expect(minutesFromOfficeMidnight('2026-11-02T17:15:00Z', '2026-11-02', ZONE)).toBe(24 * 60 + 15)
  })

  it('formats a calendar date for display', () => {
    expect(formatCalendarDate('2026-11-02')).toBe('Mon 2 Nov 2026')
  })

  it('AC-6: converts an office date and wall-clock time to a UTC instant', () => {
    expect(toUtcInstant('2026-11-02', '11:00', ZONE)).toBe('2026-11-02T04:00:00Z')
    expect(toUtcInstant('2026-11-02', '00:00', ZONE)).toBe('2026-11-01T17:00:00Z')
    expect(toUtcInstant('2026-11-02', '23:45', ZONE)).toBe('2026-11-02T16:45:00Z')
  })

  it('AC-11: recognises wall-clock times on a 15-minute step', () => {
    expect(isQuarterHourTime('09:00')).toBe(true)
    expect(isQuarterHourTime('09:45')).toBe(true)
    expect(isQuarterHourTime('09:10')).toBe(false)
    expect(isQuarterHourTime('10:05')).toBe(false)
    expect(isQuarterHourTime('09:00:30')).toBe(false)
  })
})
