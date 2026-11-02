import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import { deactivateConfirmation, deactivatedMessage, problemDetailOr } from './roomMessages'

describe('roomMessages', () => {
  it('AC-17: words the confirmation for several, one and no upcoming bookings', () => {
    expect(deactivateConfirmation('Ha Long', 2)).toBe(
      'Take Ha Long out of service? 2 upcoming bookings will be cancelled. Past and ongoing bookings are kept.',
    )
    expect(deactivateConfirmation('Hue', 1)).toBe(
      'Take Hue out of service? 1 upcoming booking will be cancelled. Past and ongoing bookings are kept.',
    )
    expect(deactivateConfirmation('Sa Pa', 0)).toBe('Take Sa Pa out of service? It has no upcoming bookings.')
  })

  it('AC-18: words the success message for several, one and no cancelled bookings', () => {
    expect(deactivatedMessage('Ha Long', 2)).toBe('Ha Long is out of service. 2 bookings cancelled.')
    expect(deactivatedMessage('Hue', 1)).toBe('Hue is out of service. 1 booking cancelled.')
    expect(deactivatedMessage('Sa Pa', 0)).toBe('Sa Pa is out of service. No bookings cancelled.')
  })

  it('AC-5, AC-16, AC-23: uses the ProblemDetail detail, or the fallback when there is none', () => {
    expect(problemDetailOr(new ApiError(409, { detail: 'Room 1 is already in service.' }), 'Fallback')).toBe(
      'Room 1 is already in service.',
    )
    expect(problemDetailOr(new ApiError(500, null), 'Fallback')).toBe('Fallback')
    expect(problemDetailOr(new TypeError('Failed to fetch'), 'Fallback')).toBe('Fallback')
  })
})
