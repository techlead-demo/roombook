package vn.techlead.roombook.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import vn.techlead.roombook.booking.BookingControllerTest.TestClock;
import vn.techlead.roombook.room.Room;
import vn.techlead.roombook.room.RoomRepository;
import vn.techlead.roombook.user.User;
import vn.techlead.roombook.user.UserRepository;

/** RMB-2: overlapping bookings of the same room are rejected with 409 (BR-12). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(BookingControllerTest.TestClockConfig.class)
class BookingOverlapTest {

    static final String HA_LONG_09_10 =
            "Ha Long is already booked from 09:00 to 10:00 on Mon 2 Nov 2026. Choose another time or another room.";

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

    Room haLong;
    User binh;
    User chi;

    /** Ha Long on Mon 2 Nov: 09:00–10:00 by Binh Tran and 14:00–15:30; now is 08:07 office time. */
    @BeforeEach
    void setUp() {
        clock.set(BookingControllerTest.NOW);
        haLong = roomRepository.findByName("Ha Long").orElseThrow();
        binh = userRepository.findByEmail("binh.tran@roombook.local").orElseThrow();
        chi = userRepository.findByEmail("chi.le@roombook.local").orElseThrow();
        store(haLong, binh, "Sprint planning", "2026-11-02T02:00:00Z", "2026-11-02T03:00:00Z");
        store(haLong, chi, "Design review", "2026-11-02T07:00:00Z", "2026-11-02T08:30:00Z");
    }

    @Test
    void ac1RejectsTheSameTimesWith409() throws Exception {
        expectConflict(chi, haLong, "2026-11-02T02:00:00Z", "2026-11-02T03:00:00Z", HA_LONG_09_10);
    }

    @ParameterizedTest(name = "AC-2: {0}–{1} overlaps 09:00–10:00 -> 409")
    @CsvSource({
            "2026-11-02T01:30:00Z, 2026-11-02T02:15:00Z",
            "2026-11-02T02:45:00Z, 2026-11-02T03:30:00Z",
            "2026-11-02T02:15:00Z, 2026-11-02T02:45:00Z",
            "2026-11-02T01:30:00Z, 2026-11-02T03:30:00Z",
    })
    void ac2RejectsEveryKindOfOverlap(String startAt, String endAt) throws Exception {
        expectConflict(chi, haLong, startAt, endAt, HA_LONG_09_10);
    }

    @ParameterizedTest(name = "AC-3: {0}–{1} touches but does not overlap -> 201")
    @CsvSource({
            "2026-11-02T01:15:00Z, 2026-11-02T02:00:00Z",
            "2026-11-02T03:00:00Z, 2026-11-02T04:00:00Z",
            "2026-11-02T03:00:00Z, 2026-11-02T07:00:00Z",
    })
    void ac3AcceptsBackToBackBookings(String startAt, String endAt) throws Exception {
        postBooking(chi, haLong, startAt, endAt)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.start_at").value(startAt))
                .andExpect(jsonPath("$.end_at").value(endAt));
        assertThat(haLongBookings()).hasSize(3);
    }

    @Test
    void ac4NamesTheEarliestStartingConflict() throws Exception {
        expectConflict(chi, haLong, "2026-11-02T02:30:00Z", "2026-11-02T07:30:00Z", HA_LONG_09_10);
    }

    @Test
    void ac5AcceptsTheSameTimeInAnotherRoom() throws Exception {
        Room hue = roomRepository.findByName("Hue").orElseThrow();
        postBooking(binh, hue, "2026-11-02T02:00:00Z", "2026-11-02T03:00:00Z")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.room_id").value(hue.getId()));
    }

    @Test
    void ac6RejectsOverlapWithTheActingUsersOwnBooking() throws Exception {
        expectConflict(binh, haLong, "2026-11-02T02:30:00Z", "2026-11-02T03:30:00Z", HA_LONG_09_10);
    }

    @Test
    void ac7RejectsOverlapWithABookingInProgress() throws Exception {
        clock.set(Instant.parse("2026-11-02T02:30:00Z"));
        expectConflict(chi, haLong, "2026-11-02T02:30:00Z", "2026-11-02T03:30:00Z", HA_LONG_09_10);
    }

    @Test
    void ac8NamesBothDatesForABookingAcrossMidnight() throws Exception {
        store(haLong, binh, "Night shift", "2026-11-02T15:00:00Z", "2026-11-02T18:00:00Z");

        expectConflict(chi, haLong, "2026-11-02T17:00:00Z", "2026-11-02T17:30:00Z",
                "Ha Long is already booked from 22:00 on Mon 2 Nov 2026 to 01:00 on Tue 3 Nov 2026. "
                        + "Choose another time or another room.");
    }

    @Test
    void ac9UnknownUserIsAnsweredBeforeTheOverlap() throws Exception {
        perform("99", body(haLong.getId(), "\"Sprint planning\"", "2026-11-02T02:00:00Z", "2026-11-02T03:00:00Z"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Unknown user"));
        assertThat(haLongBookings()).hasSize(2);
    }

    @ParameterizedTest(name = "AC-9: title {0}, {1}–{2} -> 400 {3}")
    @CsvSource(delimiter = '|', value = {
            "\"\"                 | 2026-11-02T02:00:00Z | 2026-11-02T03:00:00Z | title    | must not be blank",
            "\"Sprint planning\"  | 2026-11-02T02:10:00Z | 2026-11-02T03:00:00Z | start_at | must be on a 15-minute step",
            "\"Sprint planning\"  | 2026-11-02T02:30:00Z | 2026-11-02T02:15:00Z | end_at   | must be after start_at",
    })
    void ac9FieldErrorsAreAnsweredBeforeTheOverlap(String titleJson, String startAt, String endAt, String field, String message)
            throws Exception {
        expectFieldError(body(haLong.getId(), titleJson, startAt, endAt), field, message);
    }

    @Test
    void ac9PastStartIsAnsweredBeforeTheOverlap() throws Exception {
        clock.set(Instant.parse("2026-11-02T02:30:00Z"));
        expectFieldError(body(haLong.getId(), "\"Sprint planning\"", "2026-11-02T02:15:00Z", "2026-11-02T03:00:00Z"),
                "start_at", "must not be in the past");
    }

    @Test
    void ac14KeepsExistingOverlapsAndRejectsNewBookingsThatOverlapThem() throws Exception {
        store(haLong, binh, "Old one", "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z");
        store(haLong, chi, "Old two", "2026-11-02T04:30:00Z", "2026-11-02T05:30:00Z");

        String busy = "$.rooms[?(@.room_id == %d)].busy[*].start_at".formatted(haLong.getId());
        mockMvc.perform(get("/api/rooms/availability").param("date", "2026-11-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(busy).value(hasItem("2026-11-02T04:00:00Z")))
                .andExpect(jsonPath(busy).value(hasItem("2026-11-02T04:30:00Z")));

        expectConflict(chi, haLong, "2026-11-02T05:00:00Z", "2026-11-02T05:30:00Z",
                "Ha Long is already booked from 11:30 to 12:30 on Mon 2 Nov 2026. Choose another time or another room.");
        assertThat(haLongBookings()).hasSize(4);
    }

    private void expectConflict(User user, Room room, String startAt, String endAt, String detail) throws Exception {
        int before = haLongBookings().size();
        postBooking(user, room, startAt, endAt)
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.title").value("Conflict"))
                .andExpect(jsonPath("$.detail").value(detail));
        assertThat(haLongBookings()).hasSize(before);
    }

    private void expectFieldError(String json, String field, String message) throws Exception {
        perform(String.valueOf(chi.getId()), json)
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[?(@.field == '%s')].message".formatted(field)).value(hasItem(message)));
        assertThat(haLongBookings()).hasSize(2);
    }

    private ResultActions postBooking(User user, Room room, String startAt, String endAt) throws Exception {
        return perform(String.valueOf(user.getId()), body(room.getId(), "\"Sprint planning\"", startAt, endAt));
    }

    private ResultActions perform(String userId, String json) throws Exception {
        MockHttpServletRequestBuilder request = post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(json)
                .header("X-User-Id", userId);
        return mockMvc.perform(request);
    }

    private static String body(long roomId, String titleJson, String startAt, String endAt) {
        return "{\"room_id\":%d,\"title\":%s,\"start_at\":\"%s\",\"end_at\":\"%s\"}".formatted(roomId, titleJson, startAt, endAt);
    }

    private void store(Room room, User user, String title, String startAt, String endAt) {
        bookingRepository.save(new Booking(room, user, title, Instant.parse(startAt), Instant.parse(endAt),
                Instant.parse("2026-11-01T01:00:00Z")));
    }

    private List<Booking> haLongBookings() {
        return bookingRepository.findAll().stream().filter(booking -> booking.getRoom().getId().equals(haLong.getId())).toList();
    }
}
