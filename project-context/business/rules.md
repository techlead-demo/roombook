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
- **BR-9** A room has a name of 1–50 characters, unique ignoring letter case; leading and trailing spaces are removed before the name is checked and stored. Its capacity is a whole number from 1 to 100. Its equipment is any subset of TV, Whiteboard, Video conference (possibly none).
- **BR-10** Only admins can add rooms, change them, take them out of service and put them back into service.
- **BR-11** Taking a room out of service takes effect immediately and lasts until an admin puts it back into service. It cancels (deletes) every booking of the room that starts after that moment; bookings that started at or before it are kept. Putting the room back into service does not restore cancelled bookings.
- **BR-12** A room is free for a time range when none of its bookings overlaps the range: a booking overlaps when it starts before the range ends and ends after the range starts. A booking that ends exactly when the range starts, or starts exactly when it ends, does not overlap.
- **BR-13** A room fits a search when it is active, free for the whole searched range (BR-12), its capacity is at least the number of attendees, and it has every selected equipment (more is fine). Fitting rooms are listed by capacity, smallest first, then by name A–Z.
