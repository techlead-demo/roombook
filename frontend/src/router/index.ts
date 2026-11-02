import { createRouter, createWebHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import BookingFormPage from '@/pages/BookingFormPage.vue'
import ManageRoomsPage from '@/pages/ManageRoomsPage.vue'
import RoomFormPage from '@/pages/RoomFormPage.vue'
import RoomListPage from '@/pages/RoomListPage.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'rooms', component: RoomListPage },
  {
    path: '/book/:roomId(\\d+)',
    name: 'book',
    component: BookingFormPage,
    props: (route) => ({ roomId: Number(route.params.roomId) }),
  },
  { path: '/admin/rooms', name: 'manage-rooms', component: ManageRoomsPage },
  { path: '/admin/rooms/new', name: 'add-room', component: RoomFormPage },
  { path: '/admin/rooms/:id/edit', name: 'edit-room', component: RoomFormPage, props: (route) => ({ id: Number(route.params.id) }) },
  { path: '/:pathMatch(.*)*', redirect: { name: 'rooms' } },
]

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({ history, routes })
}
