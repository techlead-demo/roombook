package vn.techlead.roombook.room;

import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

import vn.techlead.roombook.booking.BookingRepository;
import vn.techlead.roombook.booking.RoomBookingCount;
import vn.techlead.roombook.user.UserService;

/** Room administration for admins (RMB-4, BR-9, BR-10, BR-11). */
@Service
@Transactional(readOnly = true)
public class RoomAdminService {

    static final String ADMIN_ONLY = "Only admins can manage rooms.";

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final UserService userService;
    private final Clock clock;

    public RoomAdminService(
            RoomRepository roomRepository, BookingRepository bookingRepository, UserService userService, Clock clock) {
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
        this.userService = userService;
        this.clock = clock;
    }

    /** All rooms, in service and out of service, ordered by name, with their number of upcoming bookings. */
    public List<AdminRoomResponse> listRooms(Long userId) {
        userService.requireAdmin(userId, ADMIN_ONLY);
        Map<Long, Long> upcoming = bookingRepository.countStartingAfterByRoom(clock.instant()).stream()
                .collect(Collectors.toMap(RoomBookingCount::roomId, RoomBookingCount::count));
        return roomRepository.findAllByOrderByNameAsc().stream()
                .map(room -> AdminRoomResponse.from(room, upcoming.getOrDefault(room.getId(), 0L)))
                .toList();
    }

    @Transactional
    public AdminRoomResponse createRoom(Long userId, RoomRequest request) {
        userService.requireAdmin(userId, ADMIN_ONLY);
        requireUniqueName(request.name(), null);
        Room room = roomRepository.save(new Room(request.name(), request.capacity(), equipmentOf(request)));
        return AdminRoomResponse.from(room, 0);
    }

    @Transactional
    public AdminRoomResponse updateRoom(Long userId, Long roomId, RoomRequest request) {
        userService.requireAdmin(userId, ADMIN_ONLY);
        Room room = findRoom(roomId);
        requireUniqueName(request.name(), roomId);
        room.update(request.name(), request.capacity(), equipmentOf(request));
        roomRepository.flush();
        return AdminRoomResponse.from(room, upcomingBookings(roomId));
    }

    /** Takes the room out of service and cancels (deletes) its bookings that start after now (BR-11). */
    @Transactional
    public DeactivateRoomResponse deactivateRoom(Long userId, Long roomId) {
        userService.requireAdmin(userId, ADMIN_ONLY);
        Room room = findRoom(roomId);
        if (!room.isActive()) {
            throw conflict("Room %d is already out of service.".formatted(roomId));
        }
        room.deactivate();
        int cancelled = bookingRepository.deleteByRoomIdAndStartAtAfter(roomId, clock.instant());
        return new DeactivateRoomResponse(AdminRoomResponse.from(room, 0), cancelled);
    }

    /** Puts the room back into service; cancelled bookings are not restored (BR-11). */
    @Transactional
    public AdminRoomResponse activateRoom(Long userId, Long roomId) {
        userService.requireAdmin(userId, ADMIN_ONLY);
        Room room = findRoom(roomId);
        if (room.isActive()) {
            throw conflict("Room %d is already in service.".formatted(roomId));
        }
        room.activate();
        return AdminRoomResponse.from(room, upcomingBookings(roomId));
    }

    private Room findRoom(Long roomId) {
        return roomRepository.findById(roomId).orElseThrow(() -> {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                    HttpStatus.NOT_FOUND, "Room %d not found.".formatted(roomId));
            problem.setTitle("Room not found");
            return new ErrorResponseException(HttpStatus.NOT_FOUND, problem, null);
        });
    }

    /** BR-9: names are unique ignoring letter case; a room may keep its own name in another case. */
    private void requireUniqueName(String name, Long ownId) {
        roomRepository.findByNameIgnoreCase(name)
                .filter(existing -> !existing.getId().equals(ownId))
                .ifPresent(existing -> {
                    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                            HttpStatus.CONFLICT, "A room named \"%s\" already exists.".formatted(existing.getName()));
                    problem.setTitle("Room name taken");
                    throw new ErrorResponseException(HttpStatus.CONFLICT, problem, null);
                });
    }

    private long upcomingBookings(Long roomId) {
        return bookingRepository.countByRoomIdAndStartAtAfter(roomId, clock.instant());
    }

    private static Set<Equipment> equipmentOf(RoomRequest request) {
        return request.equipment().isEmpty() ? EnumSet.noneOf(Equipment.class) : EnumSet.copyOf(request.equipment());
    }

    private static ErrorResponseException conflict(String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detail);
        problem.setTitle("Room status unchanged");
        return new ErrorResponseException(HttpStatus.CONFLICT, problem, null);
    }
}
