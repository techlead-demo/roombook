import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import ManageRoomsPage from '@/pages/ManageRoomsPage.vue'
import RoomFormPage from '@/pages/RoomFormPage.vue'
import RoomListPage from '@/pages/RoomListPage.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'rooms', component: RoomListPage },
  { path: '/admin/rooms', name: 'manage-rooms', component: ManageRoomsPage },
  { path: '/admin/rooms/new', name: 'add-room', component: RoomFormPage },
  { path: '/admin/rooms/:id/edit', name: 'edit-room', component: RoomFormPage, props: (route) => ({ id: Number(route.params.id) }) },
]

export const router = createRouter({ history: createWebHistory(), routes })
