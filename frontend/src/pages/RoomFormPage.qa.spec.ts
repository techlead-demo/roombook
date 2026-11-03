import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { createRoom, fetchAdminRooms, updateRoom } from '@/api/adminRooms'
import { ApiError } from '@/api/http'
import { actAs, seedAdminRooms, testRouter } from '@/testing/fixtures'
import RoomFormPage from './RoomFormPage.vue'

// QA cases for RMB-4 (specs/RMB-4/test-cases.md)

vi.mock('@/api/adminRooms')

let router: Router

async function mountForm(id?: number): Promise<VueWrapper> {
  router = testRouter()
  await router.push(id === undefined ? '/admin/rooms/new' : `/admin/rooms/${id}/edit`)
  const wrapper = mount(RoomFormPage, { props: id === undefined ? {} : { id }, global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

function inputValue(wrapper: VueWrapper, selector: string): string {
  return (wrapper.get(selector).element as HTMLInputElement).value
}

describe('QA RMB-4 RoomFormPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(fetchAdminRooms).mockResolvedValue(seedAdminRooms())
    actAs(1)
  })

  it('TC-19 (AC-14): editing Hue to " HA LONG " shows the duplicate error and keeps the inputs', async () => {
    vi.mocked(updateRoom).mockRejectedValue(new ApiError(409, { detail: 'A room named "Ha Long" already exists.' }))
    const wrapper = await mountForm(3)
    await wrapper.get('#room-name').setValue(' HA LONG ')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateRoom).toHaveBeenCalledWith(3, { name: 'HA LONG', capacity: 6, equipment: ['TV', 'WHITEBOARD'] })
    expect(wrapper.get('#room-name-error').text()).toBe('A room with this name already exists.')
    expect(inputValue(wrapper, '#room-name')).toBe(' HA LONG ')
    expect(inputValue(wrapper, '#room-capacity')).toBe('6')
    expect(router.currentRoute.value.name).toBe('edit-room')
  })

  it('TC-37 (AC-14): editing Hue with its own name in spaces sends the trimmed name', async () => {
    vi.mocked(updateRoom).mockResolvedValue({ ...seedAdminRooms()[3] })
    const wrapper = await mountForm(3)
    await wrapper.get('#room-name').setValue('  Hue  ')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateRoom).toHaveBeenCalledWith(3, { name: 'Hue', capacity: 6, equipment: ['TV', 'WHITEBOARD'] })
    expect(router.currentRoute.value.name).toBe('manage-rooms')
  })

  it('TC-16/TC-17 (AC-12, AC-13): both field errors at once, no request, inputs kept', async () => {
    const wrapper = await mountForm()
    await wrapper.get('#room-name').setValue('  ')
    await wrapper.get('#room-capacity').setValue('0')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('#room-name-error').text()).toBe('Enter a name.')
    expect(wrapper.get('#room-capacity-error').text()).toBe('Enter a whole number from 1 to 100.')
    expect(inputValue(wrapper, '#room-capacity')).toBe('0')
    expect(createRoom).not.toHaveBeenCalled()
  })

  it('TC-16 (AC-12): a corrected name clears its error on the next save', async () => {
    vi.mocked(createRoom).mockResolvedValue({ id: 7, name: 'Nha Trang', capacity: 10, equipment: [], active: true, upcoming_bookings: 0 })
    const wrapper = await mountForm()
    await wrapper.get('#room-capacity').setValue('10')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Enter a name.')

    await wrapper.get('#room-name').setValue('Nha Trang')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createRoom).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('manage-rooms')
  })

  it('TC-22 (AC-16): a second submit while saving sends no second request', async () => {
    vi.mocked(createRoom).mockReturnValue(new Promise(() => {}))
    const wrapper = await mountForm()
    await wrapper.get('#room-name').setValue('Nha Trang')
    await wrapper.get('#room-capacity').setValue('10')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const saveButton = wrapper.findAll('button').find((b) => b.text() === 'Save room')!
    expect(saveButton.attributes('disabled')).toBeDefined()
    await saveButton.trigger('click')
    await flushPromises()

    expect(createRoom).toHaveBeenCalledTimes(1)
  })
})
