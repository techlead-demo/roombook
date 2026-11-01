import type { ProblemDetail } from './types'

/** Error thrown for every non-2xx API response; `detail` is safe to show to the user. */
export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail: string
  readonly problem: ProblemDetail | null

  constructor(status: number, problem: ProblemDetail | null) {
    const title = problem?.title ?? `HTTP ${status}`
    super(problem?.detail ?? title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.detail = problem?.detail ?? title
    this.problem = problem
  }
}

let actingUserId: number | null = null

/** Called by the user store; the id is sent as `X-User-Id` on every request. */
export function setActingUserId(id: number | null): void {
  actingUserId = id
}

export async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (actingUserId !== null) headers['X-User-Id'] = String(actingUserId)
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetail | null
    throw new ApiError(response.status, problem)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>('GET', path)
}
