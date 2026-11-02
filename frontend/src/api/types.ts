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

/** A room on the Manage rooms screen (`GET /api/admin/rooms`). */
export interface AdminRoom extends Room {
  upcoming_bookings: number
}

/** Body of `POST /api/admin/rooms` and `PUT /api/admin/rooms/{id}`. */
export interface RoomInput {
  name: string
  capacity: number
  equipment: Equipment[]
}

export interface DeactivateRoomResult {
  room: AdminRoom
  cancelled_bookings: number
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

export interface BookingRequest {
  room_id: number
  title: string
  start_at: string
  end_at: string
}

export interface Booking {
  id: number
  room_id: number
  user_id: number
  title: string
  start_at: string
  end_at: string
  created_at: string
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
