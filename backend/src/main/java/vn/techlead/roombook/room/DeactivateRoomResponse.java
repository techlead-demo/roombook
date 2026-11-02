package vn.techlead.roombook.room;

/** Result of taking a room out of service: the room and the number of bookings cancelled (BR-11). */
public record DeactivateRoomResponse(AdminRoomResponse room, int cancelledBookings) {
}
