# Design

Static HTML mockups of the screens, built on the shared tokens. Open a file in a browser; each one shows its states one after another, each labelled with a dashed "State: …" note (the notes are not part of the UI). Sample data in mockups is illustrative.

## Tokens
`tokens.css` defines colours, typography, spacing, radii and component sizes as CSS custom properties. The web app imports the same file (`frontend/src/main.ts` → `@design/tokens.css`), so a token change applies to both. Use tokens instead of raw values; add new ones here.

## Screens
| Screen | File | States shown | Status in the app |
|---|---|---|---|
| Room list with today's availability | `screens/room-list.html` | default list with timelines, loading, error, success message after booking | Implemented (start page), except the header navigation |
| Booking form | `screens/booking-form.html` | default; errors: overlaps an existing booking, booking too long, time not on a 15-minute step | Implemented (RMB-1), except the "overlaps" (RMB-2) and "booking too long" (RMB-6) states and the header navigation |
| My bookings | `screens/my-bookings.html` | upcoming and past bookings, after cancelling, no upcoming bookings | Not implemented |
| Find a free room | `screens/find-room.html` | results, no room matches, invalid search | Not implemented |

Shared elements in every mockup: header with brand, navigation (Rooms · Find a room · My bookings) and the "Acting as" user picker; content column max 960px; cards; buttons (`.btn`, `.btn-primary`, `.btn-danger`); form fields with label, hint and field error; alerts (`.alert-danger`, `.alert-success`); equipment chips; the 08:00–18:00 timeline.

## Rules for using the mockups
- Texts (labels, messages) are the intended copy; keep them unless the spec says otherwise.
- Times in mockups are office time, 24-hour; dates as "Mon 2 Nov 2026".
- The layout may adapt to real data, but spacing, colours and components follow the mockup.
- A screen or state that has no mockup here has no design yet: draw a wireframe in `specs/<KEY>/wireframes/<screen>.html` using `tokens.css` and the same shared elements.
