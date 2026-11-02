package vn.techlead.roombook.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import vn.techlead.roombook.booking.Booking;
import vn.techlead.roombook.booking.BookingRepository;
import vn.techlead.roombook.user.User;
import vn.techlead.roombook.user.UserRepository;

/** RMB-4: admin room endpoints. "Now" is Mon 2 Nov 2026 10:00 office time (03:00 UTC). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminRoomControllerTest {

    static final Instant NOW = Instant.parse("2026-11-02T03:00:00Z");

    /** A valid booking of Ha Long today 12:00–13:00 office time, for POST /api/bookings (RMB-1). */
    static final String HA_LONG_BOOKING =
            "{\"room_id\":1,\"title\":\"Sprint planning\",\"start_at\":\"2026-11-02T05:00:00Z\",\"end_at\":\"2026-11-02T06:00:00Z\"}";

    @TestConfiguration
    static class FixedClockConfig {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    MockMvc mockMvc;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    UserRepository userRepository;

    // --- Access (AC-3) ---

    @Test
    void ac3_rejectsEmployeeOnEveryAdminEndpointWith403() throws Exception {
        String body = "{\"name\":\"Nha Trang\",\"capacity\":10,\"equipment\":[]}";
        MockHttpServletRequestBuilder[] requests = {
                get("/api/admin/rooms"),
                post("/api/admin/rooms").contentType(MediaType.APPLICATION_JSON).content(body),
                put("/api/admin/rooms/3").contentType(MediaType.APPLICATION_JSON).content(body),
                post("/api/admin/rooms/1/deactivate"),
                post("/api/admin/rooms/1/activate"),
        };
        for (MockHttpServletRequestBuilder request : requests) {
            mockMvc.perform(request.header("X-User-Id", "2"))
                    .andExpect(status().isForbidden())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.detail").value("Only admins can manage rooms."));
        }
        assertThat(roomRepository.findByNameIgnoreCase("Nha Trang")).isEmpty();
        assertThat(roomRepository.findByName("Hue").orElseThrow().getCapacity()).isEqualTo(6);
        assertThat(roomRepository.findByName("Ha Long").orElseThrow().isActive()).isTrue();
    }

    @Test
    void ac3_rejectsMissingOrUnknownUserWith401() throws Exception {
        mockMvc.perform(get("/api/admin/rooms"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Unknown user"));
        mockMvc.perform(post("/api/admin/rooms/1/deactivate").header("X-User-Id", "99"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.detail").value("Unknown user"));
        assertThat(roomRepository.findByName("Ha Long").orElseThrow().isActive()).isTrue();
    }

    @Test
    void ac3_checksAccessBeforeTheBodySoNonAdminsGetNoFieldErrors() throws Exception {
        String invalid = "{\"name\":\"\",\"capacity\":0}";
        for (MockHttpServletRequestBuilder request : new MockHttpServletRequestBuilder[] {
                post("/api/admin/rooms"), put("/api/admin/rooms/3") }) {
            mockMvc.perform(request.header("X-User-Id", "2").contentType(MediaType.APPLICATION_JSON).content(invalid))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.detail").value("Only admins can manage rooms."))
                    .andExpect(jsonPath("$.errors").doesNotExist());
        }
        for (MockHttpServletRequestBuilder request : new MockHttpServletRequestBuilder[] {
                post("/api/admin/rooms"), put("/api/admin/rooms/3") }) {
            mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(invalid))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.detail").value("Unknown user"))
                    .andExpect(jsonPath("$.errors").doesNotExist());
        }
    }

    // --- List (AC-24, AC-4) ---

    @Test
    void ac24_listsAllRoomsByNameWithUpcomingBookings() throws Exception {
        Room haLong = room("Ha Long");
        bookHaLongAsInAc17(haLong);
        roomRepository.findByName("Sa Pa").orElseThrow().deactivate();

        asAdmin(get("/api/admin/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(contains("Da Lat", "Ha Long", "Hoi An", "Hue", "Phu Quoc", "Sa Pa")))
                .andExpect(jsonPath("$[1].id").value(1))
                .andExpect(jsonPath("$[1].capacity").value(12))
                .andExpect(jsonPath("$[1].equipment").value(contains("TV", "WHITEBOARD", "VIDEO_CONFERENCE")))
                .andExpect(jsonPath("$[1].active").value(true))
                .andExpect(jsonPath("$[1].upcoming_bookings").value(2))
                .andExpect(jsonPath("$[0].upcoming_bookings").value(0))
                .andExpect(jsonPath("$[5].active").value(false));
    }

    // --- Create (AC-25, AC-7, AC-13, AC-15) ---

    @Test
    void ac25_createsTrimmedRoomInService() throws Exception {
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"  Nha Trang  \",\"capacity\":10,\"equipment\":[\"WHITEBOARD\",\"TV\"]}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Nha Trang"))
                .andExpect(jsonPath("$.capacity").value(10))
                .andExpect(jsonPath("$.equipment").value(contains("TV", "WHITEBOARD")))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.upcoming_bookings").value(0));
    }

    @Test
    void ac7_createdRoomIsListedBetweenHueAndPhuQuocOnRoomListAndAdminList() throws Exception {
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"Nha Trang\",\"capacity\":10,\"equipment\":[\"TV\",\"WHITEBOARD\"]}")
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/rooms"))
                .andExpect(jsonPath("$[*].name")
                        .value(contains("Da Lat", "Ha Long", "Hoi An", "Hue", "Nha Trang", "Phu Quoc", "Sa Pa")));
        asAdmin(get("/api/admin/rooms"))
                .andExpect(jsonPath("$[4].name").value("Nha Trang"));
    }

    @Test
    void ac13_savesCapacityOneAndOneHundred() throws Exception {
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"Tiny\",\"capacity\":1,\"equipment\":[]}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capacity").value(1));
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"Hall\",\"capacity\":100,\"equipment\":[]}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capacity").value(100));
    }

    @Test
    void ac15_storesRoomWithoutEquipment() throws Exception {
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"Mui Ne\",\"capacity\":4,\"equipment\":[]}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.equipment").isEmpty());
        assertThat(roomRepository.findByName("Mui Ne").orElseThrow().getEquipment()).isEmpty();
    }

    // --- Update (AC-26, AC-10, AC-11) ---

    @Test
    void ac26_updatesRoomKeepingIdAndStatus() throws Exception {
        asAdmin(put("/api/admin/rooms/3"), "{\"name\":\"Hue Garden\",\"capacity\":8,\"equipment\":[\"WHITEBOARD\",\"VIDEO_CONFERENCE\"]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.name").value("Hue Garden"))
                .andExpect(jsonPath("$.capacity").value(8))
                .andExpect(jsonPath("$.equipment").value(contains("WHITEBOARD", "VIDEO_CONFERENCE")))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void ac26_answers404ForUnknownRoom() throws Exception {
        asAdmin(put("/api/admin/rooms/99"), "{\"name\":\"Hue Garden\",\"capacity\":8,\"equipment\":[]}")
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Room not found"))
                .andExpect(jsonPath("$.detail").value("Room 99 not found."));
    }

    @Test
    void ac10_renamedRoomKeepsItsBookings() throws Exception {
        Room hue = room("Hue");
        Booking booking = book(hue, "2026-11-02T07:00:00Z", "2026-11-02T08:00:00Z");

        asAdmin(put("/api/admin/rooms/3"), "{\"name\":\"Hue Garden\",\"capacity\":8,\"equipment\":[\"WHITEBOARD\",\"VIDEO_CONFERENCE\"]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upcoming_bookings").value(1));

        assertThat(bookingRepository.findById(booking.getId()).orElseThrow().getRoom().getName()).isEqualTo("Hue Garden");
        mockMvc.perform(get("/api/rooms"))
                .andExpect(jsonPath("$[*].name").value(hasItem("Hue Garden")));
    }

    @Test
    void ac11_editingRoomOutOfServiceKeepsItOutOfService() throws Exception {
        Room saPa = room("Sa Pa");
        saPa.deactivate();

        asAdmin(put("/api/admin/rooms/" + saPa.getId()), "{\"name\":\"Sa Pa\",\"capacity\":3,\"equipment\":[]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.capacity").value(3))
                .andExpect(jsonPath("$.active").value(false));
    }

    // --- Validation (AC-27, AC-14) ---

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            {"capacity":10,"equipment":[]}                                                           | name      | must not be blank
            {"name":"","capacity":10,"equipment":[]}                                                 | name      | must not be blank
            {"name":"   ","capacity":10,"equipment":[]}                                              | name      | must not be blank
            {"name":"  ABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJX  ","capacity":10,"equipment":[]} | name | must be at most 50 characters
            {"name":"Nha Trang","equipment":[]}                                                      | capacity  | must not be null
            {"name":"Nha Trang","capacity":0,"equipment":[]}                                         | capacity  | must be between 1 and 100
            {"name":"Nha Trang","capacity":101,"equipment":[]}                                       | capacity  | must be between 1 and 100
            {"name":"Nha Trang","capacity":10}                                                       | equipment | must not be null
            """)
    void ac27_rejectsInvalidBodyWithFieldError(String body, String field, String message) throws Exception {
        for (MockHttpServletRequestBuilder request : new MockHttpServletRequestBuilder[] {
                post("/api/admin/rooms"), put("/api/admin/rooms/3") }) {
            asAdmin(request, body)
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors[0].field").value(field))
                    .andExpect(jsonPath("$.errors[0].message").value(message));
        }
        assertThat(roomRepository.count()).isEqualTo(6);
        assertThat(roomRepository.findByName("Hue").orElseThrow().getCapacity()).isEqualTo(6);
    }

    @Test
    void ac27_acceptsNameOfFiftyCharactersAfterTrimming() throws Exception {
        String fifty = "ABCDEFGHIJ".repeat(5);
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"  " + fifty + "  \",\"capacity\":10,\"equipment\":[]}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(fifty));
    }

    @Test
    void ac27_rejectsUnknownEquipment() throws Exception {
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"Nha Trang\",\"capacity\":10,\"equipment\":[\"PROJECTOR\"]}")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        assertThat(roomRepository.count()).isEqualTo(6);
    }

    @Test
    void ac27_ac14_rejectsDuplicateNameIgnoringCaseAndSpacesWith409() throws Exception {
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"ha long \",\"capacity\":10,\"equipment\":[]}")
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.detail").value("A room named \"Ha Long\" already exists."));
        asAdmin(put("/api/admin/rooms/3"), "{\"name\":\" HA LONG \",\"capacity\":6,\"equipment\":[]}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("A room named \"Ha Long\" already exists."));
        assertThat(roomRepository.count()).isEqualTo(6);
        assertThat(roomRepository.findById(3L).orElseThrow().getName()).isEqualTo("Hue");
    }

    @Test
    void ac14_roomMayChangeTheCaseOfItsOwnName() throws Exception {
        asAdmin(put("/api/admin/rooms/1"), "{\"name\":\"HA LONG\",\"capacity\":12,\"equipment\":[\"TV\"]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("HA LONG"));
    }

    // --- Deactivate / activate (AC-28, AC-18, AC-19, AC-21, AC-22) ---

    @Test
    void ac28_ac18_deactivationCancelsOnlyBookingsStartingAfterNow() throws Exception {
        Room haLong = room("Ha Long");
        Booking[] bookings = bookHaLongAsInAc17(haLong);

        asAdmin(post("/api/admin/rooms/1/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.room.id").value(1))
                .andExpect(jsonPath("$.room.name").value("Ha Long"))
                .andExpect(jsonPath("$.room.active").value(false))
                .andExpect(jsonPath("$.room.upcoming_bookings").value(0))
                .andExpect(jsonPath("$.cancelled_bookings").value(2));

        assertThat(roomRepository.findById(1L).orElseThrow().isActive()).isFalse();
        assertThat(bookingRepository.findById(bookings[0].getId())).isPresent();
        assertThat(bookingRepository.findById(bookings[1].getId())).isPresent();
        assertThat(bookingRepository.findById(bookings[2].getId())).isEmpty();
        assertThat(bookingRepository.findById(bookings[3].getId())).isEmpty();
    }

    @Test
    void ac19_keepsBookingStartingExactlyNowAndCancelsLaterOne() throws Exception {
        Room hue = room("Hue");
        Booking atNow = book(hue, "2026-11-02T03:00:00Z", "2026-11-02T04:00:00Z");
        Booking later = book(hue, "2026-11-02T03:15:00Z", "2026-11-02T03:45:00Z");

        asAdmin(post("/api/admin/rooms/3/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelled_bookings").value(1));

        assertThat(bookingRepository.findById(atNow.getId())).isPresent();
        assertThat(bookingRepository.findById(later.getId())).isEmpty();
    }

    @Test
    void ac21_roomOutOfServiceIsHiddenFromRoomListAndAvailability() throws Exception {
        asAdmin(post("/api/admin/rooms/1/deactivate")).andExpect(status().isOk());

        mockMvc.perform(get("/api/rooms"))
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[*].name").value(not(hasItem("Ha Long"))));
        mockMvc.perform(get("/api/rooms/availability").param("date", "2026-11-02"))
                .andExpect(jsonPath("$.rooms.length()").value(5))
                .andExpect(jsonPath("$.rooms[*].room_id").value(not(hasItem(1))));
        mockMvc.perform(post("/api/bookings").header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON).content(HA_LONG_BOOKING))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Room 1 not found."));
    }

    @Test
    void ac28_ac22_activationPutsRoomBackWithoutRestoringCancelledBookings() throws Exception {
        Room haLong = room("Ha Long");
        bookHaLongAsInAc17(haLong);
        asAdmin(post("/api/admin/rooms/1/deactivate")).andExpect(status().isOk());

        asAdmin(post("/api/admin/rooms/1/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.upcoming_bookings").value(0));

        mockMvc.perform(get("/api/rooms"))
                .andExpect(jsonPath("$[*].name").value(hasItem("Ha Long")));
        mockMvc.perform(get("/api/rooms/availability").param("date", "2026-11-02"))
                .andExpect(jsonPath("$.rooms[1].room_id").value(1))
                .andExpect(jsonPath("$.rooms[1].busy.length()").value(2))
                .andExpect(jsonPath("$.rooms[1].busy[0].start_at").value("2026-11-02T01:00:00Z"))
                .andExpect(jsonPath("$.rooms[1].busy[1].start_at").value("2026-11-02T02:30:00Z"));
        mockMvc.perform(post("/api/bookings").header("X-User-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON).content(HA_LONG_BOOKING))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.room_id").value(1));
    }

    @Test
    void ac28_rejectsStatusChangeToTheCurrentStatusWith409() throws Exception {
        asAdmin(post("/api/admin/rooms/1/activate"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.detail").value("Room 1 is already in service."));

        Room haLong = room("Ha Long");
        haLong.deactivate();
        Booking upcoming = book(haLong, "2026-11-03T02:00:00Z", "2026-11-03T03:00:00Z");
        asAdmin(post("/api/admin/rooms/1/deactivate"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Room 1 is already out of service."));
        assertThat(bookingRepository.findById(upcoming.getId())).isPresent();
    }

    @Test
    void ac28_answers404ForUnknownRoom() throws Exception {
        asAdmin(post("/api/admin/rooms/99/deactivate"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Room 99 not found."));
        asAdmin(post("/api/admin/rooms/99/activate"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Room 99 not found."));
    }

    // --- Helpers ---

    private ResultActions asAdmin(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.header("X-User-Id", "1"));
    }

    private ResultActions asAdmin(MockHttpServletRequestBuilder request, String body) throws Exception {
        return mockMvc.perform(request.header("X-User-Id", "1").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private Room room(String name) {
        return roomRepository.findByName(name).orElseThrow();
    }

    /** AC-17: 08:00–09:00 (past), 09:30–10:30 (in progress), 14:00–15:30, Tue 3 Nov 09:00–10:00 office time. */
    private Booking[] bookHaLongAsInAc17(Room haLong) {
        return new Booking[] {
                book(haLong, "2026-11-02T01:00:00Z", "2026-11-02T02:00:00Z"),
                book(haLong, "2026-11-02T02:30:00Z", "2026-11-02T03:30:00Z"),
                book(haLong, "2026-11-02T07:00:00Z", "2026-11-02T08:30:00Z"),
                book(haLong, "2026-11-03T02:00:00Z", "2026-11-03T03:00:00Z"),
        };
    }

    private Booking book(Room room, String startAt, String endAt) {
        User user = userRepository.findByEmail("binh.tran@roombook.local").orElseThrow();
        return bookingRepository.save(new Booking(room, user, "Test booking",
                Instant.parse(startAt), Instant.parse(endAt), Instant.parse("2026-10-30T00:00:00Z")));
    }
}
