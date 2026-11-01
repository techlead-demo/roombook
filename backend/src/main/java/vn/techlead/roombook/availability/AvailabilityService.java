package vn.techlead.roombook.availability;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.techlead.roombook.availability.AvailabilityResponse.BusyInterval;
import vn.techlead.roombook.availability.AvailabilityResponse.RoomAvailability;
import vn.techlead.roombook.booking.BookingRepository;
import vn.techlead.roombook.common.OfficeProperties;
import vn.techlead.roombook.room.RoomRepository;

@Service
@Transactional(readOnly = true)
public class AvailabilityService {

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final OfficeProperties office;

    public AvailabilityService(RoomRepository roomRepository, BookingRepository bookingRepository,
            OfficeProperties office) {
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
        this.office = office;
    }

    /** Availability of all active rooms for {@code date}, a calendar day in the office time zone. */
    public AvailabilityResponse forDate(LocalDate date) {
        ZoneId zone = office.timeZone();
        Instant dayStart = date.atStartOfDay(zone).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant();

        Map<Long, List<BusyInterval>> busyByRoom = bookingRepository.findOverlapping(dayStart, dayEnd).stream()
                .collect(Collectors.groupingBy(
                        booking -> booking.getRoom().getId(),
                        Collectors.mapping(
                                booking -> new BusyInterval(booking.getStartAt(), booking.getEndAt()),
                                Collectors.toList())));

        List<RoomAvailability> rooms = roomRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(room -> new RoomAvailability(room.getId(), busyByRoom.getOrDefault(room.getId(), List.of())))
                .toList();
        return new AvailabilityResponse(date, zone.getId(), dayStart, dayEnd, rooms);
    }
}
