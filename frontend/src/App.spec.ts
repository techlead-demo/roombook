import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchUsers } from '@/api/users'
import App from '@/App.vue'
import { USERS, testRouter } from '@/testing/fixtures'
import { useUserStore } from '@/stores/user'

vi.mock('@/api/users')

async function mountApp() {
  const router = testRouter()
  await router.push('/')
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('App header', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.mocked(fetchUsers).mockResolvedValue(USERS)
  })

  it('AC-1: shows the "Manage rooms" link to an admin and opens the Manage rooms screen', async () => {
    localStorage.setItem('roombook.user_id', '1')
    const { wrapper, router } = await mountApp()

    const link = wrapper.find('nav a')
    expect(link.text()).toBe('Manage rooms')
    await link.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('manage-rooms')
  })

  it('AC-1: hides the "Manage rooms" link from an employee', async () => {
    localStorage.setItem('roombook.user_id', '2')
    const { wrapper } = await mountApp()

    expect(wrapper.find('nav').text()).not.toContain('Manage rooms')

    useUserStore().selectUser(1)
    await flushPromises()
    expect(wrapper.find('nav').text()).toContain('Manage rooms')
  })
})
