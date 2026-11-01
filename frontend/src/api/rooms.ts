import { apiGet } from './http'
import type { Availability, Room } from './types'

export function fetchRooms(): Promise<Room[]> {
  return apiGet<Room[]>('/api/rooms')
}

/** `date` is a calendar day (YYYY-MM-DD) in the office time zone. */
export function fetchAvailability(date: string): Promise<Availability> {
  return apiGet<Availability>(`/api/rooms/availability?date=${encodeURIComponent(date)}`)
}
