package vn.techlead.roombook.room;

import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.ErrorResponseException;

import vn.techlead.roombook.booking.BookingRepository;
import vn.techlead.roombook.booking.RoomBookingCount;
import vn.techlead.roombook.common.FieldValidationException;
import vn.techlead.roombook.user.UserService;

/**
 * Room administration for admins (RMB-4, BR-9, BR-10, BR-11). Every method checks admin access itself, although
 * {@link AdminAccessInterceptor} already checks it for web requests: defense in depth for callers outside the web
 * layer and for a non-numeric {@code X-User-Id}, which the interceptor passes on.
 */
@Service
@Transactional(readOnly = true)
public class RoomAdminService {

    static final String ADMIN_ONLY = "Only admins can manage rooms.";
    private static final String NAME_INDEX = "rooms_name_key_idx";

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final UserService userService;
    private final Clock clock;
    private final Validator validator;
    private final TransactionTemplate newReadTransaction;

    public RoomAdminService(RoomRepository roomRepository, BookingRepository bookingRepository,
            UserService userService, Clock clock, Validator validator, PlatformTransactionManager transactionManager) {
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
        this.userService = userService;
        this.clock = clock;
        this.validator = validator;
        this.newReadTransaction = new TransactionTemplate(transactionManager);
        this.newReadTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.newReadTransaction.setReadOnly(true);
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
        validate(request);
        requireUniqueName(request.name(), null);
        Room room = saveUniqueName(request.name(),
                () -> roomRepository.saveAndFlush(new Room(request.name(), request.capacity(), equipmentOf(request))));
        return AdminRoomResponse.from(room, 0);
    }

    @Transactional
    public AdminRoomResponse updateRoom(Long userId, Long roomId, RoomRequest request) {
        userService.requireAdmin(userId, ADMIN_ONLY);
        validate(request);
        Room room = findRoom(roomId);
        requireUniqueName(request.name(), roomId);
        room.update(request.name(), request.capacity(), equipmentOf(request));
        saveUniqueName(request.name(), () -> roomRepository.saveAndFlush(room));
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

    /** BR-9 field rules, checked after the admin check so that non-admins get no field feedback (AC-3, AC-27). */
    private void validate(RoomRequest request) {
        Set<ConstraintViolation<RoomRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw FieldValidationException.of(violations);
        }
    }

    /** BR-9: names are unique ignoring letter case; a room may keep its own name in another case. */
    private void requireUniqueName(String name, Long ownId) {
        roomRepository.findByNameIgnoreCase(name)
                .filter(existing -> !existing.getId().equals(ownId))
                .ifPresent(existing -> {
                    throw nameTaken(existing.getName());
                });
    }

    /**
     * Saves and flushes; a concurrent save of the same name that passed {@link #requireUniqueName} first is
     * rejected by the unique index {@code rooms_name_key_idx} and answered with the same {@code 409}, naming the
     * room that now holds the name.
     */
    private Room saveUniqueName(String name, Supplier<Room> save) {
        try {
            return save.get();
        } catch (DataIntegrityViolationException ex) {
            String cause = String.valueOf(ex.getMostSpecificCause().getMessage());
            if (cause.toLowerCase(Locale.ROOT).contains(NAME_INDEX)) {
                throw nameTaken(existingRoomName(name));
            }
            throw ex;
        }
    }

    /** The failed flush leaves the current persistence context unusable, so the name is read in a new transaction. */
    private String existingRoomName(String name) {
        String existing = newReadTransaction.execute(status -> roomRepository.findByNameIgnoreCase(name)
                .map(Room::getName)
                .orElse(null));
        return existing != null ? existing : name;
    }

    private static ErrorResponseException nameTaken(String existingName) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, "A room named \"%s\" already exists.".formatted(existingName));
        problem.setTitle("Room name taken");
        return new ErrorResponseException(HttpStatus.CONFLICT, problem, null);
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
