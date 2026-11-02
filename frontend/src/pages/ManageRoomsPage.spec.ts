import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activateRoom, deactivateRoom, fetchAdminRooms } from '@/api/adminRooms'
import { ApiError } from '@/api/http'
import type { AdminRoom } from '@/api/types'
import { useNoticeStore } from '@/stores/notice'
import { useUserStore } from '@/stores/user'
import { actAs, seedAdminRooms, testRouter } from '@/testing/fixtures'
import ManageRoomsPage from './ManageRoomsPage.vue'

vi.mock('@/api/adminRooms')

async function mountPage(): Promise<VueWrapper> {
  const router = testRouter({ 'manage-rooms': ManageRoomsPage })
  await router.push('/admin/rooms')
  const wrapper = mount(ManageRoomsPage, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

function row(wrapper: VueWrapper, name: string) {
  const found = wrapper.findAll('[data-testid="admin-room-row"]').find((candidate) => candidate.get('h2').text() === name)
  if (!found) throw new Error(`No row for ${name}`)
  return found
}

function button(container: Pick<VueWrapper, 'findAll'>, text: string) {
  const found = container.findAll('button').find((candidate) => candidate.text() === text)
  if (!found) throw new Error(`No button "${text}"`)
  return found
}

function withSaPaOutOfService(): AdminRoom[] {
  return seedAdminRooms().map((room) => (room.name === 'Sa Pa' ? { ...room, active: false } : room))
}

describe('ManageRoomsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(fetchAdminRooms).mockResolvedValue(seedAdminRooms())
    actAs(1)
  })

  it('AC-2: shows only the no-access alert to an employee, also after switching user', async () => {
    actAs(2)
    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toBe('Only admins can manage rooms.')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.find('[data-testid="admin-room-row"]').exists()).toBe(false)
    expect(fetchAdminRooms).not.toHaveBeenCalled()

    useUserStore().selectUser(1)
    await flushPromises()
    expect(wrapper.findAll('[data-testid="admin-room-row"]')).toHaveLength(6)

    useUserStore().selectUser(2)
    await flushPromises()
    expect(wrapper.text()).toBe('Only admins can manage rooms.')
  })

  it('AC-4: lists all rooms by name with capacity, equipment, status and actions', async () => {
    vi.mocked(fetchAdminRooms).mockResolvedValue(withSaPaOutOfService())
    const wrapper = await mountPage()

    expect(wrapper.get('h1').text()).toBe('Manage rooms')
    expect(wrapper.get('a.btn-primary').text()).toBe('Add room')
    const rows = wrapper.findAll('[data-testid="admin-room-row"]')
    expect(rows.map((r) => r.get('h2').text())).toEqual(['Da Lat', 'Ha Long', 'Hoi An', 'Hue', 'Phu Quoc', 'Sa Pa'])

    const haLong = row(wrapper, 'Ha Long')
    expect(haLong.text()).toContain('Up to 12 people')
    expect(haLong.findAll('.chip').map((chip) => chip.text())).toEqual(['TV', 'Whiteboard', 'Video conference'])
    expect(haLong.get('.status').text()).toBe('In service')
    expect(haLong.get('a').text()).toBe('Edit')
    expect(haLong.findAll('button').map((b) => b.text())).toEqual(['Take out of service'])

    const saPa = row(wrapper, 'Sa Pa')
    expect(saPa.classes()).toContain('out-of-service')
    expect(saPa.get('.status').text()).toBe('Out of service')
    expect(saPa.findAll('button').map((b) => b.text())).toEqual(['Put back in service'])
  })

  it('AC-5: shows the loading state, then the load error', async () => {
    let reject: (reason: unknown) => void = () => {}
    vi.mocked(fetchAdminRooms).mockReturnValue(new Promise((_, r) => (reject = r)))
    const router = testRouter()
    const wrapper = mount(ManageRoomsPage, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Loading rooms…')

    reject(new ApiError(500, null))
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Could not load rooms. Try again later.')
  })

  it('AC-5: shows the ProblemDetail detail when loading fails with one', async () => {
    vi.mocked(fetchAdminRooms).mockRejectedValue(new ApiError(503, { detail: 'Database is down.' }))
    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toBe('Database is down.')
  })

  it('AC-7, AC-10: shows the success message handed over by the room form once', async () => {
    useNoticeStore().set('Added Nha Trang.')
    const wrapper = await mountPage()

    expect(wrapper.get('[role="status"]').text()).toBe('Added Nha Trang.')
    expect(useNoticeStore().message).toBeNull()
  })

  it('AC-17: shows the confirmation in the row with the upcoming bookings taken when it opens', async () => {
    const wrapper = await mountPage()
    await button(row(wrapper, 'Ha Long'), 'Take out of service').trigger('click')
    await flushPromises()

    const dialog = row(wrapper, 'Ha Long').get('[role="alertdialog"]')
    expect(dialog.text()).toContain(
      'Take Ha Long out of service? 2 upcoming bookings will be cancelled. Past and ongoing bookings are kept.',
    )
    expect(dialog.findAll('button').map((b) => b.text())).toEqual(['Take out of service', 'Keep in service'])
    expect(button(dialog, 'Take out of service').classes()).toContain('btn-danger')
    expect(fetchAdminRooms).toHaveBeenCalledTimes(2)

    await button(row(wrapper, 'Sa Pa'), 'Take out of service').trigger('click')
    await flushPromises()
    expect(row(wrapper, 'Sa Pa').get('[role="alertdialog"]').text()).toContain(
      'Take Sa Pa out of service? It has no upcoming bookings.',
    )
  })

  it('AC-18: takes the room out of service and reports the cancelled bookings', async () => {
    const haLong = seedAdminRooms()[1]
    vi.mocked(deactivateRoom).mockResolvedValue({ room: { ...haLong, active: false, upcoming_bookings: 0 }, cancelled_bookings: 2 })
    const wrapper = await mountPage()
    await button(row(wrapper, 'Ha Long'), 'Take out of service').trigger('click')
    await flushPromises()

    await button(row(wrapper, 'Ha Long').get('[role="alertdialog"]'), 'Take out of service').trigger('click')
    await flushPromises()

    expect(deactivateRoom).toHaveBeenCalledWith(1)
    expect(wrapper.get('[role="status"]').text()).toBe('Ha Long is out of service. 2 bookings cancelled.')
    const updated = row(wrapper, 'Ha Long')
    expect(updated.get('.status').text()).toBe('Out of service')
    expect(updated.find('[role="alertdialog"]').exists()).toBe(false)
    expect(updated.findAll('button').map((b) => b.text())).toEqual(['Put back in service'])
  })

  it('AC-20: "Keep in service" closes the confirmation without a request', async () => {
    const wrapper = await mountPage()
    await button(row(wrapper, 'Ha Long'), 'Take out of service').trigger('click')
    await flushPromises()

    await button(row(wrapper, 'Ha Long'), 'Keep in service').trigger('click')

    expect(row(wrapper, 'Ha Long').find('[role="alertdialog"]').exists()).toBe(false)
    expect(row(wrapper, 'Ha Long').get('.status').text()).toBe('In service')
    expect(deactivateRoom).not.toHaveBeenCalled()
  })

  it('AC-22: puts a room back in service without a confirmation', async () => {
    vi.mocked(fetchAdminRooms).mockResolvedValue(withSaPaOutOfService())
    vi.mocked(activateRoom).mockResolvedValue(seedAdminRooms()[5])
    const wrapper = await mountPage()

    await button(row(wrapper, 'Sa Pa'), 'Put back in service').trigger('click')
    await flushPromises()

    expect(activateRoom).toHaveBeenCalledWith(5)
    expect(wrapper.get('[role="status"]').text()).toBe('Sa Pa is back in service.')
    expect(row(wrapper, 'Sa Pa').get('.status').text()).toBe('In service')
    expect(row(wrapper, 'Sa Pa').findAll('button').map((b) => b.text())).toEqual(['Take out of service'])
  })

  it('AC-23: disables the clicked button while the request runs and shows the error, status unchanged', async () => {
    vi.mocked(fetchAdminRooms).mockResolvedValue(withSaPaOutOfService())
    let reject: (reason: unknown) => void = () => {}
    vi.mocked(activateRoom).mockReturnValue(new Promise((_, r) => (reject = r)))
    const wrapper = await mountPage()

    await button(row(wrapper, 'Sa Pa'), 'Put back in service').trigger('click')
    expect(button(row(wrapper, 'Sa Pa'), 'Put back in service').attributes('disabled')).toBeDefined()

    reject(new ApiError(500, null))
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Could not change the room. Try again later.')
    expect(row(wrapper, 'Sa Pa').get('.status').text()).toBe('Out of service')
    expect(button(row(wrapper, 'Sa Pa'), 'Put back in service').attributes('disabled')).toBeUndefined()
  })

  it('AC-23: shows the ProblemDetail detail when taking out of service fails', async () => {
    vi.mocked(deactivateRoom).mockRejectedValue(new ApiError(409, { detail: 'Room 1 is already out of service.' }))
    const wrapper = await mountPage()
    await button(row(wrapper, 'Ha Long'), 'Take out of service').trigger('click')
    await flushPromises()

    await button(row(wrapper, 'Ha Long').get('[role="alertdialog"]'), 'Take out of service').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Room 1 is already out of service.')
    expect(row(wrapper, 'Ha Long').get('.status').text()).toBe('In service')
  })
})
