package vn.techlead.roombook.booking;

import java.time.Clock;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

import vn.techlead.roombook.common.FieldValidationException;
import vn.techlead.roombook.common.FieldValidationException.FieldError;
import vn.techlead.roombook.common.OfficeProperties;
import vn.techlead.roombook.room.Room;
import vn.techlead.roombook.room.RoomRepository;
import vn.techlead.roombook.user.User;
import vn.techlead.roombook.user.UserRepository;

@Service
@Transactional(readOnly = true)
public class BookingService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("EEE d MMM yyyy", Locale.ENGLISH);

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final OfficeProperties office;
    private final Clock clock;
    private final Validator validator;

    public BookingService(BookingRepository bookingRepository, RoomRepository roomRepository,
            UserRepository userRepository, OfficeProperties office, Clock clock, Validator validator) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.office = office;
        this.clock = clock;
        this.validator = validator;
    }

    /** Books an active room for the acting user (BR-2, BR-3, BR-7, BR-8, BR-12). */
    @Transactional
    public BookingResponse create(Long userId, BookingRequest request) {
        User user = (userId == null ? null : userRepository.findById(userId).orElse(null));
        if (user == null) {
            throw new ErrorResponseException(HttpStatus.UNAUTHORIZED,
                    ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Unknown user"), null);
        }
        // Validated here, after the user check, so that an unknown caller gets 401 and no field feedback (AC-19)
        Set<ConstraintViolation<BookingRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw FieldValidationException.of(violations);
        }
        // The room row stays locked until commit, so two requests for one room run the overlap check one after the other
        Room room = roomRepository.findByIdForUpdate(request.roomId()).filter(Room::isActive).orElseThrow(() ->
                new ErrorResponseException(HttpStatus.NOT_FOUND, ProblemDetail.forStatusAndDetail(
                        HttpStatus.NOT_FOUND, "Room %d not found.".formatted(request.roomId())), null));

        Instant now = clock.instant();
        validateTimes(request.startAt(), request.endAt(), now);
        rejectOverlap(room, request.startAt(), request.endAt());

        Booking booking = bookingRepository.save(
                new Booking(room, user, request.title(), request.startAt(), request.endAt(), now));
        return BookingResponse.from(booking);
    }

    private void validateTimes(Instant startAt, Instant endAt, Instant now) {
        List<FieldError> errors = new ArrayList<>();
        boolean startOnStep = isOnQuarterHour(startAt);
        boolean endOnStep = isOnQuarterHour(endAt);
        if (!startOnStep) {
            errors.add(new FieldError("start_at", "must be on a 15-minute step"));
        }
        if (!endOnStep) {
            errors.add(new FieldError("end_at", "must be on a 15-minute step"));
        }
        if (endOnStep && !endAt.isAfter(startAt)) {
            errors.add(new FieldError("end_at", "must be after start_at"));
        }
        if (startOnStep && startAt.isBefore(now)) {
            errors.add(new FieldError("start_at", "must not be in the past"));
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
    }

    /** BR-12: rejects the booking with 409 naming the earliest-starting booking of the room that it overlaps. */
    private void rejectOverlap(Room room, Instant startAt, Instant endAt) {
        bookingRepository.findOverlappingInRoom(room.getId(), startAt, endAt).stream().findFirst().ifPresent(conflict -> {
            String detail = "%s is already booked %s. Choose another time or another room."
                    .formatted(room.getName(), describePeriod(conflict.getStartAt(), conflict.getEndAt()));
            throw new ErrorResponseException(HttpStatus.CONFLICT,
                    ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detail), null);
        });
    }

    /** "from 09:00 to 10:00 on Mon 2 Nov 2026", or with a date on each side when start and end are on different office days (BR-5). */
    private String describePeriod(Instant startAt, Instant endAt) {
        ZonedDateTime start = startAt.atZone(office.timeZone());
        ZonedDateTime end = endAt.atZone(office.timeZone());
        if (start.toLocalDate().equals(end.toLocalDate())) {
            return "from %s to %s on %s".formatted(TIME.format(start), TIME.format(end), DATE.format(start));
        }
        return "from %s on %s to %s on %s".formatted(TIME.format(start), DATE.format(start), TIME.format(end), DATE.format(end));
    }

    private boolean isOnQuarterHour(Instant instant) {
        ZonedDateTime time = instant.atZone(office.timeZone());
        return time.getMinute() % 15 == 0 && time.getSecond() == 0 && time.getNano() == 0;
    }
}
