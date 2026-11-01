package vn.techlead.roombook.room;

import java.util.List;

/** {@code equipment} is sorted in enum declaration order. */
public record RoomResponse(Long id, String name, int capacity, List<Equipment> equipment, boolean active) {

    static RoomResponse from(Room room) {
        List<Equipment> equipment = room.getEquipment().stream().sorted().toList();
        return new RoomResponse(room.getId(), room.getName(), room.getCapacity(), equipment, room.isActive());
    }
}
