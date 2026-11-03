import { defineComponent, type Component } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { AdminRoom, User } from '@/api/types'
import { useUserStore } from '@/stores/user'

export const USERS: User[] = [
  { id: 1, name: 'An Nguyen', email: 'an.nguyen@roombook.local', role: 'ADMIN' },
  { id: 2, name: 'Binh Tran', email: 'binh.tran@roombook.local', role: 'EMPLOYEE' },
]

/** The seed rooms as `GET /api/admin/rooms` returns them, ordered by name. */
export function seedAdminRooms(): AdminRoom[] {
  return [
    { id: 4, name: 'Da Lat', capacity: 4, equipment: ['WHITEBOARD'], active: true, upcoming_bookings: 0 },
    { id: 1, name: 'Ha Long', capacity: 12, equipment: ['TV', 'WHITEBOARD', 'VIDEO_CONFERENCE'], active: true, upcoming_bookings: 2 },
    { id: 2, name: 'Hoi An', capacity: 8, equipment: ['TV', 'VIDEO_CONFERENCE'], active: true, upcoming_bookings: 0 },
    { id: 3, name: 'Hue', capacity: 6, equipment: ['TV', 'WHITEBOARD'], active: true, upcoming_bookings: 1 },
    { id: 6, name: 'Phu Quoc', capacity: 20, equipment: ['TV', 'WHITEBOARD', 'VIDEO_CONFERENCE'], active: true, upcoming_bookings: 0 },
    { id: 5, name: 'Sa Pa', capacity: 2, equipment: [], active: true, upcoming_bookings: 0 },
  ]
}

/** Sets the acting user in the (already active) user store. */
export function actAs(userId: number): void {
  const store = useUserStore()
  store.users = USERS
  store.selectUser(userId)
}

const Stub = defineComponent({ name: 'Stub', render: () => null })

/** A router with the app's route names; pages not under test are stubs. */
export function testRouter(pages: Record<string, Component> = {}): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'rooms', component: pages.rooms ?? Stub },
      { path: '/admin/rooms', name: 'manage-rooms', component: pages['manage-rooms'] ?? Stub },
      { path: '/admin/rooms/new', name: 'add-room', component: pages['add-room'] ?? Stub },
      { path: '/admin/rooms/:id/edit', name: 'edit-room', component: pages['edit-room'] ?? Stub },
    ],
  })
}
