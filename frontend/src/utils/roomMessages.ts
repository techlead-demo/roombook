import { ApiError } from '@/api/http'

export const ADMIN_ONLY_MESSAGE = 'Only admins can manage rooms.'

function bookingNoun(count: number): string {
  return count === 1 ? 'booking' : 'bookings'
}

/** Text of the take-out-of-service confirmation (RMB-4 AC-17). */
export function deactivateConfirmation(roomName: string, upcoming: number): string {
  if (upcoming === 0) return `Take ${roomName} out of service? It has no upcoming bookings.`
  return `Take ${roomName} out of service? ${upcoming} upcoming ${bookingNoun(upcoming)} will be cancelled. Past and ongoing bookings are kept.`
}

/** Success message after taking a room out of service (RMB-4 AC-18). */
export function deactivatedMessage(roomName: string, cancelled: number): string {
  const result = cancelled === 0 ? 'No bookings cancelled.' : `${cancelled} ${bookingNoun(cancelled)} cancelled.`
  return `${roomName} is out of service. ${result}`
}

/** The ProblemDetail `detail` when the API sent one, otherwise `fallback`. */
export function problemDetailOr(error: unknown, fallback: string): string {
  return (error instanceof ApiError ? error.problem?.detail : undefined) ?? fallback
}
