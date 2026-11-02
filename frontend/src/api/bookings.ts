import { apiRequest } from './http'
import type { Booking, BookingRequest } from './types'

/** Books a room for the acting user (`X-User-Id`). */
export function createBooking(request: BookingRequest): Promise<Booking> {
  return apiRequest<Booking>('POST', '/api/bookings', request)
}
