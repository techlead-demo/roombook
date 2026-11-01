package vn.techlead.roombook.availability;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Busy intervals per active room for one calendar day in the office time zone.
 * {@code dayStart}/{@code dayEnd} are the UTC instants of that day's office-time midnights.
 */
public record AvailabilityResponse(
        LocalDate date,
        String timeZone,
        Instant dayStart,
        Instant dayEnd,
        List<RoomAvailability> rooms) {

    public record RoomAvailability(Long roomId, List<BusyInterval> busy) {
    }

    /** A booked interval in UTC; not clipped to the requested day. */
    public record BusyInterval(Instant startAt, Instant endAt) {
    }
}
