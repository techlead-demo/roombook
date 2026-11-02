package vn.techlead.roombook.booking;

import java.time.Instant;

public record BookingResponse(
        Long id,
        Long roomId,
        Long userId,
        String title,
        Instant startAt,
        Instant endAt,
        Instant createdAt) {

    public static BookingResponse from(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getRoom().getId(),
                booking.getUser().getId(),
                booking.getTitle(),
                booking.getStartAt(),
                booking.getEndAt(),
                booking.getCreatedAt());
    }
}
