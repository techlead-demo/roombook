import { apiGet, apiRequest } from './http'
import type { AdminRoom, DeactivateRoomResult, RoomInput } from './types'

export function fetchAdminRooms(): Promise<AdminRoom[]> {
  return apiGet<AdminRoom[]>('/api/admin/rooms')
}

export function createRoom(input: RoomInput): Promise<AdminRoom> {
  return apiRequest<AdminRoom>('POST', '/api/admin/rooms', input)
}

export function updateRoom(id: number, input: RoomInput): Promise<AdminRoom> {
  return apiRequest<AdminRoom>('PUT', `/api/admin/rooms/${id}`, input)
}

export function deactivateRoom(id: number): Promise<DeactivateRoomResult> {
  return apiRequest<DeactivateRoomResult>('POST', `/api/admin/rooms/${id}/deactivate`)
}

export function activateRoom(id: number): Promise<AdminRoom> {
  return apiRequest<AdminRoom>('POST', `/api/admin/rooms/${id}/activate`)
}
