import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { createRoom, fetchAdminRooms, updateRoom } from '@/api/adminRooms'
import { ApiError } from '@/api/http'
import { useNoticeStore } from '@/stores/notice'
import { useUserStore } from '@/stores/user'
import { actAs, seedAdminRooms, testRouter } from '@/testing/fixtures'
import RoomFormPage from './RoomFormPage.vue'

vi.mock('@/api/adminRooms')

let router: Router

async function mountForm(id?: number): Promise<VueWrapper> {
  router = testRouter()
  await router.push(id === undefined ? '/admin/rooms/new' : `/admin/rooms/${id}/edit`)
  const wrapper = mount(RoomFormPage, { props: id === undefined ? {} : { id }, global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

function checkbox(wrapper: VueWrapper, label: string) {
  const found = wrapper.findAll('.checks label').find((candidate) => candidate.text() === label)
  if (!found) throw new Error(`No checkbox "${label}"`)
  return found.get('input')
}

function checkedEquipment(wrapper: VueWrapper): string[] {
  return wrapper
    .findAll('.checks label')
    .filter((label) => (label.get('input').element as HTMLInputElement).checked)
    .map((label) => label.text())
}

async function fill(wrapper: VueWrapper, name: string, capacity: string): Promise<void> {
  await wrapper.get('#room-name').setValue(name)
  await wrapper.get('#room-capacity').setValue(capacity)
}

async function save(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

function buttonTexts(wrapper: VueWrapper): string[] {
  return wrapper.findAll('button').map((b) => b.text())
}

describe('RoomFormPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(fetchAdminRooms).mockResolvedValue(seedAdminRooms())
    actAs(1)
  })

  it('AC-2: shows only the no-access alert to an employee', async () => {
    actAs(2)
    const wrapper = await mountForm(3)

    expect(wrapper.text()).toBe('Only admins can manage rooms.')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(fetchAdminRooms).not.toHaveBeenCalled()
  })

  it('AC-2: shows only the no-access alert when the user switches to an employee while the form is open', async () => {
    const wrapper = await mountForm(3)
    expect(wrapper.find('form').exists()).toBe(true)

    useUserStore().selectUser(2)
    await flushPromises()

    expect(wrapper.text()).toBe('Only admins can manage rooms.')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('shows the room of the new id, or an empty Add form, when the route reuses the page', async () => {
    const wrapper = await mountForm(3)
    expect((wrapper.get('#room-name').element as HTMLInputElement).value).toBe('Hue')

    await wrapper.setProps({ id: 1 })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Edit room')
    expect((wrapper.get('#room-name').element as HTMLInputElement).value).toBe('Ha Long')
    expect((wrapper.get('#room-capacity').element as HTMLInputElement).value).toBe('12')

    await wrapper.setProps({ id: undefined })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Add room')
    expect((wrapper.get('#room-name').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('#room-capacity').element as HTMLInputElement).value).toBe('')
    expect(checkedEquipment(wrapper)).toEqual([])
  })

  it('AC-6: opens an empty Add room form', async () => {
    const wrapper = await mountForm()

    expect(wrapper.get('h1').text()).toBe('Add room')
    expect((wrapper.get('#room-name').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('#room-capacity').element as HTMLInputElement).value).toBe('')
    expect(checkedEquipment(wrapper)).toEqual([])
    expect(wrapper.findAll('.checks label').map((label) => label.text())).toEqual(['TV', 'Whiteboard', 'Video conference'])
    expect(buttonTexts(wrapper)).toEqual(['Save room', 'Cancel'])
    expect(wrapper.text()).toContain('People, from 1 to 100.')
  })

  it('AC-7: saves the trimmed name and checked equipment and returns with "Added …"', async () => {
    vi.mocked(createRoom).mockResolvedValue({
      id: 7, name: 'Nha Trang', capacity: 10, equipment: ['TV', 'WHITEBOARD'], active: true, upcoming_bookings: 0,
    })
    const wrapper = await mountForm()
    await fill(wrapper, '  Nha Trang  ', '10')
    await checkbox(wrapper, 'Whiteboard').setValue(true)
    await checkbox(wrapper, 'TV').setValue(true)

    await save(wrapper)

    expect(createRoom).toHaveBeenCalledWith({ name: 'Nha Trang', capacity: 10, equipment: ['TV', 'WHITEBOARD'] })
    expect(useNoticeStore().message).toBe('Added Nha Trang.')
    expect(router.currentRoute.value.name).toBe('manage-rooms')
  })

  it('AC-8: Cancel returns to Manage rooms without a request', async () => {
    const wrapper = await mountForm(3)
    await fill(wrapper, 'Changed', '9')

    await wrapper.findAll('button').find((b) => b.text() === 'Cancel')!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('manage-rooms')
    expect(createRoom).not.toHaveBeenCalled()
    expect(updateRoom).not.toHaveBeenCalled()
  })

  it('AC-9: prefills the Edit room form', async () => {
    const wrapper = await mountForm(3)

    expect(wrapper.get('h1').text()).toBe('Edit room')
    expect((wrapper.get('#room-name').element as HTMLInputElement).value).toBe('Hue')
    expect((wrapper.get('#room-capacity').element as HTMLInputElement).value).toBe('6')
    expect(checkedEquipment(wrapper)).toEqual(['TV', 'Whiteboard'])
  })

  it('AC-10: saves the changed room and returns with "Saved …"', async () => {
    vi.mocked(updateRoom).mockResolvedValue({
      id: 3, name: 'Hue Garden', capacity: 8, equipment: ['WHITEBOARD', 'VIDEO_CONFERENCE'], active: true, upcoming_bookings: 1,
    })
    const wrapper = await mountForm(3)
    await fill(wrapper, 'Hue Garden', '8')
    await checkbox(wrapper, 'TV').setValue(false)
    await checkbox(wrapper, 'Video conference').setValue(true)

    await save(wrapper)

    expect(updateRoom).toHaveBeenCalledWith(3, { name: 'Hue Garden', capacity: 8, equipment: ['WHITEBOARD', 'VIDEO_CONFERENCE'] })
    expect(useNoticeStore().message).toBe('Saved Hue Garden.')
    expect(router.currentRoute.value.name).toBe('manage-rooms')
  })

  it.each(['', '   '])('AC-12: rejects the name %j without a request', async (name) => {
    const wrapper = await mountForm()
    await fill(wrapper, name, '10')

    await save(wrapper)

    expect(wrapper.text()).toContain('Enter a name.')
    expect(createRoom).not.toHaveBeenCalled()
    expect(wrapper.get('#room-name').attributes('maxlength')).toBe('50')
  })

  it.each(['', '0', '101', '-1', '2.5'])('AC-13: rejects the capacity %j without a request', async (capacity) => {
    const wrapper = await mountForm()
    await fill(wrapper, 'Nha Trang', capacity)

    await save(wrapper)

    expect(wrapper.text()).toContain('Enter a whole number from 1 to 100.')
    expect((wrapper.get('#room-name').element as HTMLInputElement).value).toBe('Nha Trang')
    expect(createRoom).not.toHaveBeenCalled()
  })

  it.each(['1', '100'])('AC-13: saves the capacity %s', async (capacity) => {
    vi.mocked(createRoom).mockResolvedValue({
      id: 7, name: 'Edge', capacity: Number(capacity), equipment: [], active: true, upcoming_bookings: 0,
    })
    const wrapper = await mountForm()
    await fill(wrapper, 'Edge', capacity)

    await save(wrapper)

    expect(createRoom).toHaveBeenCalledWith({ name: 'Edge', capacity: Number(capacity), equipment: [] })
  })

  it('AC-14: shows the duplicate-name error under Name when the API answers 409', async () => {
    vi.mocked(createRoom).mockRejectedValue(new ApiError(409, { detail: 'A room named "Ha Long" already exists.' }))
    const wrapper = await mountForm()
    await fill(wrapper, 'ha long', '10')

    await save(wrapper)

    expect(wrapper.get('#room-name-error').text()).toBe('A room with this name already exists.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('add-room')
  })

  it('AC-15: saves a room with no equipment', async () => {
    vi.mocked(createRoom).mockResolvedValue({
      id: 7, name: 'Mui Ne', capacity: 4, equipment: [], active: true, upcoming_bookings: 0,
    })
    const wrapper = await mountForm()
    await fill(wrapper, 'Mui Ne', '4')

    await save(wrapper)

    expect(createRoom).toHaveBeenCalledWith({ name: 'Mui Ne', capacity: 4, equipment: [] })
  })

  it('AC-16: disables "Save room" while saving and shows the server error above the form, inputs kept', async () => {
    let reject: (reason: unknown) => void = () => {}
    vi.mocked(updateRoom).mockReturnValue(new Promise((_, r) => (reject = r)))
    const wrapper = await mountForm(3)
    await fill(wrapper, 'Hue Garden', '8')

    await wrapper.get('form').trigger('submit')
    const saveButton = () => wrapper.findAll('button').find((b) => b.text() === 'Save room')!
    expect(saveButton().attributes('disabled')).toBeDefined()

    reject(new ApiError(500, null))
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Could not save the room. Try again later.')
    expect((wrapper.get('#room-name').element as HTMLInputElement).value).toBe('Hue Garden')
    expect(saveButton().attributes('disabled')).toBeUndefined()
  })

  it('AC-16: shows the ProblemDetail detail of a failed save', async () => {
    vi.mocked(updateRoom).mockRejectedValue(new ApiError(404, { detail: 'Room 3 not found.' }))
    const wrapper = await mountForm(3)

    await save(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toBe('Room 3 not found.')
  })
})
