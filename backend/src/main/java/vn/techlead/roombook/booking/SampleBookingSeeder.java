package vn.techlead.roombook.booking;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import vn.techlead.roombook.common.OfficeProperties;
import vn.techlead.roombook.room.RoomRepository;
import vn.techlead.roombook.user.UserRepository;

/**
 * Adds a few bookings for today (office time zone) at startup so that availability is visible.
 * Runs only when {@code roombook.sample-bookings.enabled=true} (off in tests) and only if today has no bookings yet.
 */
@Component
@ConditionalOnBooleanProperty("roombook.sample-bookings.enabled")
class SampleBookingSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleBookingSeeder.class);

    private record Sample(String room, String userEmail, String title, LocalTime start, LocalTime end) {
    }

    private static final List<Sample> SAMPLES = List.of(
            new Sample("Hue", "dung.pham@roombook.local", "1:1 Dung / An", LocalTime.of(8, 30), LocalTime.of(9, 0)),
            new Sample("Ha Long", "an.nguyen@roombook.local", "Weekly planning", LocalTime.of(9, 0), LocalTime.of(10, 0)),
            new Sample("Hoi An", "chi.le@roombook.local", "Design review", LocalTime.of(10, 30), LocalTime.of(11, 30)),
            new Sample("Da Lat", "khanh.do@roombook.local", "Interview", LocalTime.of(11, 0), LocalTime.of(12, 15)),
            new Sample("Phu Quoc", "an.nguyen@roombook.local", "All hands", LocalTime.of(13, 0), LocalTime.of(14, 0)),
            new Sample("Ha Long", "binh.tran@roombook.local", "Customer call", LocalTime.of(14, 0), LocalTime.of(15, 30)),
            new Sample("Hue", "hoa.vo@roombook.local", "Sprint retro", LocalTime.of(16, 0), LocalTime.of(17, 0)));

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final OfficeProperties office;
    private final Clock clock;

    SampleBookingSeeder(BookingRepository bookingRepository, RoomRepository roomRepository,
            UserRepository userRepository, OfficeProperties office, Clock clock) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.office = office;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ZoneId zone = office.timeZone();
        LocalDate today = LocalDate.now(clock.withZone(zone));
        Instant dayStart = today.atStartOfDay(zone).toInstant();
        Instant dayEnd = today.plusDays(1).atStartOfDay(zone).toInstant();
        if (bookingRepository.existsByStartAtGreaterThanEqualAndStartAtLessThan(dayStart, dayEnd)) {
            return;
        }
        Instant now = clock.instant();
        List<Booking> bookings = SAMPLES.stream()
                .map(sample -> new Booking(
                        roomRepository.findByName(sample.room()).orElseThrow(),
                        userRepository.findByEmail(sample.userEmail()).orElseThrow(),
                        sample.title(),
                        today.atTime(sample.start()).atZone(zone).toInstant(),
                        today.atTime(sample.end()).atZone(zone).toInstant(),
                        now))
                .toList();
        bookingRepository.saveAll(bookings);
        log.info("Seeded {} sample bookings for {} ({})", bookings.size(), today, zone);
    }
}
