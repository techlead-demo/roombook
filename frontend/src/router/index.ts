import { createRouter, createWebHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import BookingFormPage from '@/pages/BookingFormPage.vue'
import RoomListPage from '@/pages/RoomListPage.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'rooms', component: RoomListPage },
  {
    path: '/book/:roomId(\\d+)',
    name: 'book',
    component: BookingFormPage,
    props: (route) => ({ roomId: Number(route.params.roomId) }),
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'rooms' } },
]

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({ history, routes })
}
