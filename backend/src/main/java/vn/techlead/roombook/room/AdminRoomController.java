package vn.techlead.roombook.room;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only room management (RMB-4). The acting user comes from {@code X-User-Id}. */
@RestController
@RequestMapping("/api/admin/rooms")
public class AdminRoomController {

    private final RoomAdminService roomAdminService;

    public AdminRoomController(RoomAdminService roomAdminService) {
        this.roomAdminService = roomAdminService;
    }

    @GetMapping
    public List<AdminRoomResponse> listRooms(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return roomAdminService.listRooms(userId);
    }

    /** The body is validated in the service after the admin check (no {@code @Valid}), so 401/403 come first (AC-3). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminRoomResponse createRoom(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody RoomRequest request) {
        return roomAdminService.createRoom(userId, request);
    }

    @PutMapping("/{id}")
    public AdminRoomResponse updateRoom(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable Long id,
            @RequestBody RoomRequest request) {
        return roomAdminService.updateRoom(userId, id, request);
    }

    @PostMapping("/{id}/deactivate")
    public DeactivateRoomResponse deactivateRoom(
            @RequestHeader(value = "X-User-Id", required = false) Long userId, @PathVariable Long id) {
        return roomAdminService.deactivateRoom(userId, id);
    }

    @PostMapping("/{id}/activate")
    public AdminRoomResponse activateRoom(
            @RequestHeader(value = "X-User-Id", required = false) Long userId, @PathVariable Long id) {
        return roomAdminService.activateRoom(userId, id);
    }
}
