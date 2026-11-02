package vn.techlead.roombook.booking;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/bookings}. The title is stripped of leading and trailing spaces before validation (BR-8). */
public record BookingRequest(
        @NotNull Long roomId,
        @NotBlank @Size(max = 100, message = "must be at most 100 characters") String title,
        @NotNull Instant startAt,
        @NotNull Instant endAt) {

    public BookingRequest {
        title = title == null ? null : title.strip();
    }
}
