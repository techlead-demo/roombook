# Data model

Schema is owned by Flyway (`backend/src/main/resources/db/migration/`); Hibernate only validates it (`ddl-auto=validate`), so every entity change needs a migration.

## Migrations
| Version | File | Content |
|---|---|---|
| V1 | `V1__create_schema.sql` | Tables `users`, `rooms`, `room_equipment`, `bookings` |
| V2 | `V2__seed_users_and_rooms.sql` | 6 users, 6 rooms and their equipment |

Bookings are not seeded by Flyway: `SampleBookingSeeder` adds sample bookings for today at startup (see runbook.md).

## Tables

### `users` — entity `user.User`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT | PK, identity | |
| `name` | VARCHAR(100) | not null | Display name |
| `email` | VARCHAR(255) | not null, unique | |
| `role` | VARCHAR(20) | not null | Enum `Role`: `EMPLOYEE`, `ADMIN` (stored as name) |

### `rooms` — entity `room.Room`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT | PK, identity | |
| `name` | VARCHAR(50) | not null, unique | |
| `capacity` | INT | not null, `> 0` | People |
| `active` | BOOLEAN | not null, default true | Inactive rooms are hidden (BR-1) |

### `room_equipment` — `@ElementCollection` `Room.equipment` (`Set<Equipment>`)
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `room_id` | BIGINT | PK part, FK → `rooms.id` | |
| `equipment` | VARCHAR(30) | PK part, not null | Enum `Equipment`: `TV`, `WHITEBOARD`, `VIDEO_CONFERENCE` |

### `bookings` — entity `booking.Booking`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT | PK, identity | |
| `room_id` | BIGINT | not null, FK → `rooms.id` | `@ManyToOne(LAZY)` |
| `user_id` | BIGINT | not null, FK → `users.id` | `@ManyToOne(LAZY)`; who made the booking |
| `title` | VARCHAR(100) | not null | |
| `start_at` | TIMESTAMP(6) WITH TIME ZONE | not null | `Instant`, UTC |
| `end_at` | TIMESTAMP(6) WITH TIME ZONE | not null, `end_at > start_at` | `Instant`, UTC |
| `created_at` | TIMESTAMP(6) WITH TIME ZONE | not null | `Instant`, UTC, from the injected `Clock` |

Index: `bookings_room_start_idx (room_id, start_at)`.

## Invariants
- All instants are UTC; no local date-time columns.
- Booking start and end are on 15-minute steps (BR-2). Not enforced by the database.
- The office day of a booking is derived, never stored (BR-4).

## Seed data (V2)
| id | User | Email | Role |
|---|---|---|---|
| 1 | An Nguyen | an.nguyen@roombook.local | ADMIN |
| 2 | Binh Tran | binh.tran@roombook.local | EMPLOYEE |
| 3 | Chi Le | chi.le@roombook.local | EMPLOYEE |
| 4 | Dung Pham | dung.pham@roombook.local | EMPLOYEE |
| 5 | Hoa Vo | hoa.vo@roombook.local | EMPLOYEE |
| 6 | Khanh Do | khanh.do@roombook.local | EMPLOYEE |

| id | Room | Capacity | Equipment |
|---|---|---|---|
| 1 | Ha Long | 12 | TV, WHITEBOARD, VIDEO_CONFERENCE |
| 2 | Hoi An | 8 | TV, VIDEO_CONFERENCE |
| 3 | Hue | 6 | TV, WHITEBOARD |
| 4 | Da Lat | 4 | WHITEBOARD |
| 5 | Sa Pa | 2 | — |
| 6 | Phu Quoc | 20 | TV, WHITEBOARD, VIDEO_CONFERENCE |

All rooms are active.
