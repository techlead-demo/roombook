// Types mirror the API JSON exactly (snake_case, date-times as ISO 8601 UTC strings).
// See project-context/architecture/api.md.

export type Role = 'EMPLOYEE' | 'ADMIN'

export type Equipment = 'TV' | 'WHITEBOARD' | 'VIDEO_CONFERENCE'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface Room {
  id: number
  name: string
  capacity: number
  equipment: Equipment[]
  active: boolean
}

export interface BusyInterval {
  start_at: string
  end_at: string
}

export interface RoomAvailability {
  room_id: number
  busy: BusyInterval[]
}

export interface Availability {
  date: string
  time_zone: string
  day_start: string
  day_end: string
  rooms: RoomAvailability[]
}

/** RFC 7807 error body returned for every non-2xx response. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  [extension: string]: unknown
}
