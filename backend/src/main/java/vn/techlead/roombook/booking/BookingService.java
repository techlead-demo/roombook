package vn.techlead.roombook.booking;

import java.time.Clock;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

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

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final OfficeProperties office;
    private final Clock clock;

    public BookingService(BookingRepository bookingRepository, RoomRepository roomRepository,
            UserRepository userRepository, OfficeProperties office, Clock clock) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.office = office;
        this.clock = clock;
    }

    /** Books an active room for the acting user (BR-2, BR-3, BR-7, BR-8). */
    @Transactional
    public BookingResponse create(Long userId, BookingRequest request) {
        User user = (userId == null ? null : userRepository.findById(userId).orElse(null));
        if (user == null) {
            throw new ErrorResponseException(HttpStatus.UNAUTHORIZED,
                    ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Unknown user"), null);
        }
        Room room = roomRepository.findById(request.roomId()).filter(Room::isActive).orElseThrow(() ->
                new ErrorResponseException(HttpStatus.NOT_FOUND, ProblemDetail.forStatusAndDetail(
                        HttpStatus.NOT_FOUND, "Room %d not found.".formatted(request.roomId())), null));

        Instant now = clock.instant();
        validateTimes(request.startAt(), request.endAt(), now);

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

    private boolean isOnQuarterHour(Instant instant) {
        ZonedDateTime time = instant.atZone(office.timeZone());
        return time.getMinute() % 15 == 0 && time.getSecond() == 0 && time.getNano() == 0;
    }
}
