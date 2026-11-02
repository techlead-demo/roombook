# Business rules

Rules that hold in the product today. New rules get the next free number; a rule that changes keeps its number and its text is updated.

- **BR-1** Only active rooms appear in the room list and in availability. Rooms are listed by name, A–Z.
- **BR-2** Booking start and end times are on 15-minute steps of office time (:00, :15, :30, :45).
- **BR-3** A booking ends after it starts.
- **BR-4** A calendar date (for example "today" or the `date` of an availability request) means a day in the office time zone, Asia/Ho_Chi_Minh. A booking belongs to every office day it overlaps.
- **BR-5** Times are shown to users in office time, 24-hour format ("09:00", "14:30"); dates as "Mon 2 Nov 2026".
- **BR-6** A user has exactly one role: `EMPLOYEE` or `ADMIN`.
- **BR-7** A booking cannot start in the past: its start must be at or after the current time when it is made.
- **BR-8** A booking is made by the acting user for one active room and has a title of 1–100 characters; leading and trailing spaces are removed before the title is checked and stored.
