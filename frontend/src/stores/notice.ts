import { defineStore } from 'pinia'
import { ref } from 'vue'

/** A one-time success message handed from one page to the next (e.g. room form → Manage rooms). */
export const useNoticeStore = defineStore('notice', () => {
  const message = ref<string | null>(null)

  function set(text: string): void {
    message.value = text
  }

  /** Returns the message and clears it, so it is shown only once. */
  function take(): string | null {
    const text = message.value
    message.value = null
    return text
  }

  return { message, set, take }
})
