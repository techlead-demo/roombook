package vn.techlead.roombook.room;

import static org.assertj.core.api.Assertions.assertThat;
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

/** QA cases for RMB-4 (specs/RMB-4/test-cases.md). "Now" is Mon 2 Nov 2026 10:00 office time (03:00 UTC). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminRoomQaTest {

    static final Instant NOW = Instant.parse("2026-11-02T03:00:00Z");
    static final String VALID_BODY = "{\"name\":\"Nha Trang\",\"capacity\":10,\"equipment\":[\"TV\"]}";

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

    @Test
    void tc7_ac3_answers401OnEveryAdminEndpointForMissingOrUnknownUser() throws Exception {
        roomRepository.findByName("Sa Pa").orElseThrow().deactivate();
        roomRepository.flush();
        for (String userId : new String[] { null, "99" }) {
            for (MockHttpServletRequestBuilder request : allEndpoints()) {
                if (userId != null) {
                    request.header("X-User-Id", userId);
                }
                mockMvc.perform(request)
                        .andExpect(status().isUnauthorized())
                        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                        .andExpect(jsonPath("$.status").value(401))
                        .andExpect(jsonPath("$.detail").value("Unknown user"));
            }
        }
        assertThat(roomRepository.count()).isEqualTo(6);
        assertThat(roomRepository.findById(3L).orElseThrow().getName()).isEqualTo("Hue");
        assertThat(roomRepository.findById(1L).orElseThrow().isActive()).isTrue();
        assertThat(roomRepository.findByName("Sa Pa").orElseThrow().isActive()).isFalse();
    }

    @Test
    void tc6_ac3_employeeCannotDeactivateOrActivateAndBookingsStay() throws Exception {
        Room haLong = room("Ha Long");
        Booking upcoming = book(haLong, "2026-11-02T07:00:00Z", "2026-11-02T08:00:00Z");
        Room saPa = room("Sa Pa");
        saPa.deactivate();
        roomRepository.flush();

        mockMvc.perform(post("/api/admin/rooms/1/deactivate").header("X-User-Id", "2"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Only admins can manage rooms."));
        mockMvc.perform(post("/api/admin/rooms/" + saPa.getId() + "/activate").header("X-User-Id", "2"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Only admins can manage rooms."));

        assertThat(bookingRepository.findById(upcoming.getId())).isPresent();
        assertThat(roomRepository.findById(1L).orElseThrow().isActive()).isTrue();
        assertThat(roomRepository.findById(saPa.getId()).orElseThrow().isActive()).isFalse();
    }

    @Test
    void tc24_ac18_deactivationLeavesOtherRoomsBookingsAlone() throws Exception {
        Booking hueUpcoming = book(room("Hue"), "2026-11-02T07:00:00Z", "2026-11-02T08:00:00Z");
        Booking haLongUpcoming = book(room("Ha Long"), "2026-11-02T07:00:00Z", "2026-11-02T08:00:00Z");

        asAdmin(post("/api/admin/rooms/1/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelled_bookings").value(1));

        assertThat(bookingRepository.findById(haLongUpcoming.getId())).isEmpty();
        assertThat(bookingRepository.findById(hueUpcoming.getId())).isPresent();
        asAdmin(get("/api/admin/rooms"))
                .andExpect(jsonPath("$[3].name").value("Hue"))
                .andExpect(jsonPath("$[3].upcoming_bookings").value(1));
    }

    @Test
    void tc25_ac24_upcomingCountExcludesBookingStartingExactlyNow() throws Exception {
        Room hue = room("Hue");
        book(hue, "2026-11-02T02:45:00Z", "2026-11-02T03:00:00Z");
        book(hue, "2026-11-02T03:00:00Z", "2026-11-02T04:00:00Z");
        book(hue, "2026-11-02T04:15:00Z", "2026-11-02T04:45:00Z");

        asAdmin(get("/api/admin/rooms"))
                .andExpect(jsonPath("$[3].name").value("Hue"))
                .andExpect(jsonPath("$[3].upcoming_bookings").value(1));
    }

    @Test
    void tc37_ac14_roomMayKeepItsOwnNameWithSurroundingSpaces() throws Exception {
        asAdmin(put("/api/admin/rooms/3"), "{\"name\":\"  Hue  \",\"capacity\":7,\"equipment\":[\"TV\",\"WHITEBOARD\"]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Hue"))
                .andExpect(jsonPath("$.capacity").value(7));
    }

    @Test
    void tc33_ac27_putRejectsUnknownEquipmentAndKeepsTheRoom() throws Exception {
        asAdmin(put("/api/admin/rooms/3"), "{\"name\":\"Hue Garden\",\"capacity\":8,\"equipment\":[\"PROJECTOR\"]}")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        Room hue = roomRepository.findById(3L).orElseThrow();
        assertThat(hue.getName()).isEqualTo("Hue");
        assertThat(hue.getCapacity()).isEqualTo(6);
    }

    @Test
    void tc33_ac27_emptyEquipmentListIsValidOnUpdate() throws Exception {
        asAdmin(put("/api/admin/rooms/3"), "{\"name\":\"Hue\",\"capacity\":6,\"equipment\":[]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipment").isEmpty());
        assertThat(roomRepository.findById(3L).orElseThrow().getEquipment()).isEmpty();
    }

    @Test
    void tc33_ac27_duplicateNameIgnoresCaseOfNonAsciiLetters() throws Exception {
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"Đà Nẵng\",\"capacity\":10,\"equipment\":[]}")
                .andExpect(status().isCreated());
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"đà nẵng\",\"capacity\":10,\"equipment\":[]}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("A room named \"Đà Nẵng\" already exists."));
        assertThat(roomRepository.count()).isEqualTo(7);
    }

    @Test
    void tc33_ac27_duplicateOfAnOutOfServiceRoomIsRejected() throws Exception {
        room("Sa Pa").deactivate();
        roomRepository.flush();
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"SA PA\",\"capacity\":10,\"equipment\":[]}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("A room named \"Sa Pa\" already exists."));
    }

    /** D-1: BR-9 capacity is a whole number; a fractional capacity must not be truncated and stored. */
    @Test
    void tc38_br9_ac27_rejectsFractionalCapacityWith400() throws Exception {
        asAdmin(post("/api/admin/rooms"), "{\"name\":\"Nha Trang\",\"capacity\":2.5,\"equipment\":[]}")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        asAdmin(put("/api/admin/rooms/3"), "{\"name\":\"Hue\",\"capacity\":6.5,\"equipment\":[]}")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        assertThat(roomRepository.findByNameIgnoreCase("Nha Trang")).isEmpty();
        assertThat(roomRepository.findById(3L).orElseThrow().getCapacity()).isEqualTo(6);
    }

    @Test
    void tc34_ac28_activateReportsUpcomingBookingsKeptFromBeforeDeactivation() throws Exception {
        Room saPa = room("Sa Pa");
        asAdmin(post("/api/admin/rooms/" + saPa.getId() + "/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.room.active").value(false))
                .andExpect(jsonPath("$.cancelled_bookings").value(0));
        asAdmin(post("/api/admin/rooms/" + saPa.getId() + "/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Sa Pa"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.upcoming_bookings").value(0));
        assertThat(roomRepository.findById(saPa.getId()).orElseThrow().isActive()).isTrue();
    }

    private MockHttpServletRequestBuilder[] allEndpoints() {
        return new MockHttpServletRequestBuilder[] {
                get("/api/admin/rooms"),
                post("/api/admin/rooms").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY),
                put("/api/admin/rooms/3").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY),
                post("/api/admin/rooms/1/deactivate"),
                post("/api/admin/rooms/5/activate"),
        };
    }

    private ResultActions asAdmin(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.header("X-User-Id", "1"));
    }

    private ResultActions asAdmin(MockHttpServletRequestBuilder request, String body) throws Exception {
        return mockMvc.perform(request.header("X-User-Id", "1").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private Room room(String name) {
        return roomRepository.findByName(name).orElseThrow();
    }

    private Booking book(Room room, String startAt, String endAt) {
        User user = userRepository.findByEmail("binh.tran@roombook.local").orElseThrow();
        return bookingRepository.save(new Booking(room, user, "QA booking",
                Instant.parse(startAt), Instant.parse(endAt), Instant.parse("2026-10-30T00:00:00Z")));
    }
}
