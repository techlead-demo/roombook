// All API date-times are ISO 8601 UTC strings. These helpers convert them to the office
// time zone for display only; never send office-local times to the API.

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function zonedParts(instant: Date | string, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** Calendar date (YYYY-MM-DD) of `instant` in `timeZone`. */
export function toOfficeDate(instant: Date | string, timeZone: string): string {
  const { year, month, day } = zonedParts(instant, timeZone)
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Wall-clock time "HH:mm" (24-hour) of `instant` in `timeZone`. */
export function formatOfficeTime(instant: Date | string, timeZone: string): string {
  const { hour, minute } = zonedParts(instant, timeZone)
  return `${pad(hour)}:${pad(minute)}`
}

/** "HH:mm–HH:mm" in `timeZone`. */
export function formatOfficeTimeRange(startAt: string, endAt: string, timeZone: string): string {
  return `${formatOfficeTime(startAt, timeZone)}–${formatOfficeTime(endAt, timeZone)}`
}

/**
 * Minutes from midnight of `date` (YYYY-MM-DD) in `timeZone` to `instant`.
 * Negative when `instant` falls on an earlier day, 1440 or more when it falls on a later day.
 */
export function minutesFromOfficeMidnight(instant: Date | string, date: string, timeZone: string): number {
  const { year, month, day, hour, minute } = zonedParts(instant, timeZone)
  const [dateYear, dateMonth, dateDay] = date.split('-').map(Number)
  const dayDifference = (Date.UTC(year, month - 1, day) - Date.UTC(dateYear, dateMonth - 1, dateDay)) / 86_400_000
  return dayDifference * 1440 + hour * 60 + minute
}

/**
 * UTC instant (ISO 8601 with `Z`) of the wall-clock time `time` ("HH:mm") on `date` (YYYY-MM-DD) in `timeZone`.
 * Use this to send office-time input to the API.
 */
export function toUtcInstant(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wallClock = Date.UTC(year, month - 1, day, hour, minute)
  let instant = wallClock
  // Correct by the zone offset; the second pass settles offsets that change around `instant`.
  for (let pass = 0; pass < 2; pass++) {
    const shown = zonedParts(new Date(instant), timeZone)
    instant += wallClock - Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute)
  }
  return new Date(instant).toISOString().replace('.000Z', 'Z')
}

/** True when a wall-clock time "HH:mm" is on a 15-minute step (:00, :15, :30, :45). */
export function isQuarterHourTime(time: string): boolean {
  const match = /^(\d{2}):(\d{2})(?::00(?:\.0+)?)?$/.exec(time)
  return match !== null && Number(match[2]) % 15 === 0
}

/** Display form of a calendar date (YYYY-MM-DD), e.g. "Mon 2 Nov 2026"; months always have three letters, as in the API's messages. */
export function formatCalendarDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      .formatToParts(new Date(Date.UTC(year, month - 1, day)))
      .map((part) => [part.type, part.value]),
  )
  // en-GB writes September as "Sept"
  return `${parts.weekday} ${parts.day} ${parts.month.slice(0, 3)} ${parts.year}`
}
