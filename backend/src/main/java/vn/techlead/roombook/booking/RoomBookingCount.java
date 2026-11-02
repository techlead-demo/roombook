package vn.techlead.roombook.booking;

/** Query projection: number of bookings of one room. */
public record RoomBookingCount(Long roomId, long count) {
}
