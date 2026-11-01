import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoomTimeline from './RoomTimeline.vue'

const ZONE = 'Asia/Ho_Chi_Minh'
const DATE = '2026-11-02'

describe('RoomTimeline', () => {
  it('positions a busy block within the 08:00–18:00 office-time window', () => {
    // 09:00–10:00 office time = 02:00–03:00 UTC
    const wrapper = mount(RoomTimeline, {
      props: { busy: [{ start_at: '2026-11-02T02:00:00Z', end_at: '2026-11-02T03:00:00Z' }], date: DATE, timeZone: ZONE },
    })

    const block = wrapper.get('.busy')
    expect(block.attributes('style')).toContain('left: 10%')
    expect(block.attributes('style')).toContain('width: 10%')
    expect(block.text()).toBe('Busy 09:00–10:00')
  })

  it('clips blocks to the window and hides blocks outside it', () => {
    const wrapper = mount(RoomTimeline, {
      props: {
        busy: [
          { start_at: '2026-11-02T00:30:00Z', end_at: '2026-11-02T01:30:00Z' }, // 07:30–08:30
          { start_at: '2026-11-02T12:00:00Z', end_at: '2026-11-02T13:00:00Z' }, // 19:00–20:00
        ],
        date: DATE,
        timeZone: ZONE,
      },
    })

    const blocks = wrapper.findAll('.busy')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].attributes('style')).toContain('left: 0%')
    expect(blocks[0].attributes('style')).toContain('width: 5%')
  })
})
