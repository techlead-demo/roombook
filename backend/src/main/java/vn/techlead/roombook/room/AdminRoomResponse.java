package vn.techlead.roombook.room;

import java.util.List;

/** A room as seen on the Manage rooms screen; {@code upcomingBookings} counts bookings that start after now. */
public record AdminRoomResponse(
        Long id, String name, int capacity, List<Equipment> equipment, boolean active, long upcomingBookings) {

    static AdminRoomResponse from(Room room, long upcomingBookings) {
        List<Equipment> equipment = room.getEquipment().stream().sorted().toList();
        return new AdminRoomResponse(
                room.getId(), room.getName(), room.getCapacity(), equipment, room.isActive(), upcomingBookings);
    }
}
