package vn.techlead.roombook.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import vn.techlead.roombook.room.RoomRepository;
import vn.techlead.roombook.user.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BookingControllerTest {

    /** Mon 2 Nov 2026 08:07 office time. */
    static final Instant NOW = Instant.parse("2026-11-02T01:07:00Z");

    /** A clock whose instant the test sets; reset to {@link #NOW} before each test. */
    static class TestClock extends Clock {
        private Instant instant = NOW;

        void set(Instant instant) {
            this.instant = instant;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return Clock.fixed(instant, zone);
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        TestClock testClock() {
            return new TestClock();
        }
    }

    @Autowired
    TestClock clock;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @BeforeEach
    void resetClock() {
        clock.set(NOW);
    }

    @Test
    void ac18CreatesBookingForActingUserWithClockCreatedAt() throws Exception {
        long haLong = roomId("Ha Long");
        long binh = binhId();

        postBooking(String.valueOf(binh), body(haLong, "\"Sprint planning\"", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.room_id").value(haLong))
                .andExpect(jsonPath("$.user_id").value(binh))
                .andExpect(jsonPath("$.title").value("Sprint planning"))
                .andExpect(jsonPath("$.start_at").value("2026-11-02T04:00:00Z"))
                .andExpect(jsonPath("$.end_at").value("2026-11-02T05:00:00Z"))
                .andExpect(jsonPath("$.created_at").value("2026-11-02T01:07:00Z"));

        assertThat(bookingRepository.findAll()).singleElement().satisfies(booking -> {
            assertThat(booking.getRoom().getId()).isEqualTo(haLong);
            assertThat(booking.getUser().getId()).isEqualTo(binh);
            assertThat(booking.getTitle()).isEqualTo("Sprint planning");
            assertThat(booking.getStartAt()).isEqualTo(Instant.parse("2026-11-02T04:00:00Z"));
            assertThat(booking.getEndAt()).isEqualTo(Instant.parse("2026-11-02T05:00:00Z"));
            assertThat(booking.getCreatedAt()).isEqualTo(NOW);
        });
    }

    @Test
    void ac7CreatedBookingAppearsInAvailability() throws Exception {
        long haLong = roomId("Ha Long");
        postBooking(String.valueOf(binhId()), body(haLong, "\"Sprint planning\"", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/rooms/availability").param("date", "2026-11-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rooms[?(@.room_id == %d)].busy[0].start_at".formatted(haLong))
                        .value(hasItem("2026-11-02T04:00:00Z")))
                .andExpect(jsonPath("$.rooms[?(@.room_id == %d)].busy[0].end_at".formatted(haLong))
                        .value(hasItem("2026-11-02T05:00:00Z")));
    }

    @Test
    void ac9StoresTitleWithoutLeadingAndTrailingSpaces() throws Exception {
        postBooking(String.valueOf(binhId()), body(roomId("Ha Long"), "\"  Retro  \"", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Retro"));

        assertThat(bookingRepository.findAll()).singleElement()
                .satisfies(booking -> assertThat(booking.getTitle()).isEqualTo("Retro"));
    }

    @Test
    void ac19RejectsMissingUserHeaderWith401() throws Exception {
        postBooking(null, validBody())
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.detail").value("Unknown user"));
        assertThat(bookingRepository.count()).isZero();
    }

    @Test
    void ac19RejectsUnknownUserWith401() throws Exception {
        postBooking("99", validBody())
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Unknown user"));
        assertThat(bookingRepository.count()).isZero();
    }

    @ParameterizedTest(name = "AC-19: user {0} with an invalid body -> 401")
    @CsvSource(nullValues = "none", value = {"none", "99"})
    void ac19ChecksUserBeforeValidatingTheBody(String userId) throws Exception {
        postBooking(userId, "{\"title\":\"  \",\"start_at\":\"2026-11-02T04:10:00Z\"}")
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Unknown user"))
                .andExpect(jsonPath("$.errors").doesNotExist());
        assertThat(bookingRepository.count()).isZero();
    }

    @Test
    void ac20RejectsUnknownRoomWith404() throws Exception {
        postBooking(String.valueOf(binhId()), body(99, "\"Sprint planning\"", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Not Found"))
                .andExpect(jsonPath("$.detail").value("Room 99 not found."));
        assertThat(bookingRepository.count()).isZero();
    }

    @Test
    void ac20RejectsInactiveRoomWith404() throws Exception {
        // Plain JDBC, so that no Room entity is cached in the persistence context before the update
        long saPa = jdbcTemplate.queryForObject("SELECT id FROM rooms WHERE name = 'Sa Pa'", Long.class);
        jdbcTemplate.update("UPDATE rooms SET active = FALSE WHERE id = ?", saPa);

        postBooking(String.valueOf(binhId()), body(saPa, "\"Sprint planning\"", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Room %d not found.".formatted(saPa)));
        assertThat(bookingRepository.count()).isZero();
    }

    @ParameterizedTest(name = "AC-21: start {0}, end {1} -> {2} {3}")
    @CsvSource({
            "2026-11-02T04:10:00Z, 2026-11-02T05:00:00Z, start_at, must be on a 15-minute step",
            "2026-11-02T04:00:30Z, 2026-11-02T05:00:00Z, start_at, must be on a 15-minute step",
            "2026-11-02T04:00:00Z, 2026-11-02T05:05:00Z, end_at, must be on a 15-minute step",
            "2026-11-02T04:00:00Z, 2026-11-02T05:00:30Z, end_at, must be on a 15-minute step",
            "2026-11-02T04:00:00Z, 2026-11-02T04:00:00Z, end_at, must be after start_at",
            "2026-11-02T04:00:00Z, 2026-11-02T03:45:00Z, end_at, must be after start_at",
            "2026-11-02T01:00:00Z, 2026-11-02T02:00:00Z, start_at, must not be in the past",
    })
    void ac21RejectsInvalidTimes(String startAt, String endAt, String field, String message) throws Exception {
        expectFieldError(body(roomId("Ha Long"), "\"Sprint planning\"", startAt, endAt), field, message);
    }

    @ParameterizedTest(name = "AC-21: title {0} -> must not be blank")
    @CsvSource(delimiter = '|', value = {"null", "\"\"", "\"   \""})
    void ac21RejectsBlankTitle(String titleJson) throws Exception {
        expectFieldError(body(roomId("Ha Long"), titleJson, "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"),
                "title", "must not be blank");
    }

    @Test
    void ac21RejectsMissingTitleProperty() throws Exception {
        expectFieldError("{\"room_id\":%d,\"start_at\":\"2026-11-02T04:00:00Z\",\"end_at\":\"2026-11-02T05:00:00Z\"}"
                .formatted(roomId("Ha Long")), "title", "must not be blank");
    }

    @Test
    void ac21RejectsTitleLongerThan100CharactersAfterTrimming() throws Exception {
        String title101 = "a".repeat(101);
        expectFieldError(body(roomId("Ha Long"), "\" " + title101 + " \"", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"),
                "title", "must be at most 100 characters");
    }

    @Test
    void ac21AcceptsTitleOf100CharactersSurroundedBySpaces() throws Exception {
        postBooking(String.valueOf(binhId()),
                body(roomId("Ha Long"), "\" " + "a".repeat(100) + " \"", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"))
                .andExpect(status().isCreated());
    }

    @ParameterizedTest(name = "AC-21: missing {0} -> must not be null")
    @CsvSource({
            "room_id, '{\"title\":\"T\",\"start_at\":\"2026-11-02T04:00:00Z\",\"end_at\":\"2026-11-02T05:00:00Z\"}'",
            "start_at, '{\"room_id\":1,\"title\":\"T\",\"end_at\":\"2026-11-02T05:00:00Z\"}'",
            "end_at, '{\"room_id\":1,\"title\":\"T\",\"start_at\":\"2026-11-02T04:00:00Z\"}'",
    })
    void ac21RejectsMissingRequiredFields(String field, String json) throws Exception {
        expectFieldError(json, field, "must not be null");
    }

    @Test
    void ac22AcceptsStartEqualToNow() throws Exception {
        clock.set(Instant.parse("2026-11-02T01:15:00Z"));

        postBooking(String.valueOf(binhId()), body(roomId("Ha Long"), "\"Stand-up\"", "2026-11-02T01:15:00Z", "2026-11-02T01:30:00Z"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.start_at").value("2026-11-02T01:15:00Z"));
    }

    @Test
    void ac22RejectsStartOneStepBeforeNow() throws Exception {
        clock.set(Instant.parse("2026-11-02T01:15:00Z"));

        expectFieldError(body(roomId("Ha Long"), "\"Stand-up\"", "2026-11-02T01:00:00Z", "2026-11-02T01:30:00Z"),
                "start_at", "must not be in the past");
    }

    private void expectFieldError(String json, String field, String message) throws Exception {
        postBooking(String.valueOf(binhId()), json)
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.errors[?(@.field == '%s')].message".formatted(field)).value(hasItem(message)));
        assertThat(bookingRepository.count()).isZero();
    }

    private ResultActions postBooking(String userId, String json) throws Exception {
        MockHttpServletRequestBuilder request = post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(json);
        if (userId != null) {
            request.header("X-User-Id", userId);
        }
        return mockMvc.perform(request);
    }

    private String validBody() {
        return body(roomId("Ha Long"), "\"Sprint planning\"", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z");
    }

    private static String body(long roomId, String titleJson, String startAt, String endAt) {
        return "{\"room_id\":%d,\"title\":%s,\"start_at\":\"%s\",\"end_at\":\"%s\"}".formatted(roomId, titleJson, startAt, endAt);
    }

    private long roomId(String name) {
        return roomRepository.findByName(name).orElseThrow().getId();
    }

    private long binhId() {
        return userRepository.findByEmail("binh.tran@roombook.local").orElseThrow().getId();
    }
}
