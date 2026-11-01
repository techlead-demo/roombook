# Business overview

## Purpose
RoomBook lets the employees of one small office see when the meeting rooms are free and reserve them, so that teams find a room without asking around.

## Users
- **Employee** — any member of the office. Looks at room availability.
- **Office admin** — an employee with role `ADMIN`. Responsible for the rooms. Has no extra screens yet.

There is no real login. The user picks who they are in the "Acting as" picker in the header; the web app sends that user's id with every API request (header `X-User-Id`). The choice is remembered in the browser.

## Office
- One office, in time zone **Asia/Ho_Chi_Minh** (UTC+7, no daylight saving).
- 6 meeting rooms, each with a name, a capacity (people) and equipment (TV, whiteboard, video conference).
- About 6 employees, one of them admin.

## Main flows (current)
1. **See today's room availability** — the start page lists every active room (name, capacity, equipment) with a timeline of today from 08:00 to 18:00 office time; booked periods are shown as busy blocks.
2. **Choose the acting user** — pick an employee in the header; the choice applies to the whole app.

## Not in the product today
- Creating, changing or cancelling bookings (bookings exist in the data and are shown as busy time, but there is no way to make one in the app or API).
- Any administration screen.
- Real authentication or permissions.
- Anything outside the single office and its time zone.
