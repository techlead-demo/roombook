import { apiGet } from './http'
import type { User } from './types'

export function fetchUsers(): Promise<User[]> {
  return apiGet<User[]>('/api/users')
}
