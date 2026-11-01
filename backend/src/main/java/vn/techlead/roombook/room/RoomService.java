package vn.techlead.roombook.room;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    /** Active rooms ordered by name (BR-1). */
    public List<RoomResponse> listActiveRooms() {
        return roomRepository.findByActiveTrueOrderByNameAsc().stream().map(RoomResponse::from).toList();
    }
}
