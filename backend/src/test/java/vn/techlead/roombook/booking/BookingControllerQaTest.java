package vn.techlead.roombook.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;

import vn.techlead.roombook.room.RoomRepository;
import vn.techlead.roombook.user.UserRepository;

/** QA cases for RMB-1 beyond the Engineer's BookingControllerTest (boundaries and assumptions A-4, A-5). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BookingControllerQaTest {

    /** Mon 2 Nov 2026 08:07 office time. */
    static final Instant NOW = Instant.parse("2026-11-02T01:07:00Z");

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
    BookingRepository bookingRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    UserRepository userRepository;

    @Test
    void tc27NonNumericUserHeaderIsAClientErrorProblemDetailAndStoresNothing() throws Exception {
        post("abc", body(roomId("Ha Long"), "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"))
                .andExpect(status().is4xxClientError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        assertThat(bookingRepository.count()).isZero();
    }

    @Test
    void tc38AcceptsABookingThatCrossesOfficeMidnight() throws Exception {
        // 23:00–01:00 office time (A-5: the API does not reject a booking over two office days)
        post(userId("binh.tran@roombook.local"), body(roomId("Ha Long"), "2026-11-02T16:00:00Z", "2026-11-02T18:00:00Z"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.start_at").value("2026-11-02T16:00:00Z"))
                .andExpect(jsonPath("$.end_at").value("2026-11-02T18:00:00Z"));
    }

    @Test
    void tc41AnAdminCanBookForThemselves() throws Exception {
        String admin = userId("an.nguyen@roombook.local");
        post(admin, body(roomId("Sa Pa"), "2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user_id").value(Long.parseLong(admin)));
    }

    @Test
    void tc42AcceptsAStartAtOfficeMidnightOfTheNextDay() throws Exception {
        // 2026-11-02T17:00Z = Tue 3 Nov 2026 00:00 office time, on a 15-minute step
        post(userId("binh.tran@roombook.local"), body(roomId("Hue"), "2026-11-02T17:00:00Z", "2026-11-02T17:15:00Z"))
                .andExpect(status().isCreated());
    }

    @Test
    void tc43ReportsStepErrorsForStartAndEndTogether() throws Exception {
        post(userId("binh.tran@roombook.local"), body(roomId("Ha Long"), "2026-11-02T04:10:00Z", "2026-11-02T05:05:00Z"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'start_at')].message").value(hasItem("must be on a 15-minute step")))
                .andExpect(jsonPath("$.errors[?(@.field == 'end_at')].message").value(hasItem("must be on a 15-minute step")));
        assertThat(bookingRepository.count()).isZero();
    }

    @Test
    void tc44RejectsAStartOneMinuteBeforeNowOnlyWhenOnAStepInThePast() throws Exception {
        // 01:00Z is 08:00 office time, 7 minutes before now: in the past
        post(userId("binh.tran@roombook.local"), body(roomId("Ha Long"), "2026-11-02T01:00:00Z", "2026-11-02T01:15:00Z"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'start_at')].message").value(hasItem("must not be in the past")));
        // 01:15Z (08:15) is the next step after now: accepted (AC-13)
        post(userId("binh.tran@roombook.local"), body(roomId("Ha Long"), "2026-11-02T01:15:00Z", "2026-11-02T02:00:00Z"))
                .andExpect(status().isCreated());
        assertThat(bookingRepository.count()).isEqualTo(1);
    }

    private ResultActions post(String userId, String json) throws Exception {
        return mockMvc.perform(MockMvcRequestBuilders.post("/api/bookings")
                .header("X-User-Id", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    private static String body(long roomId, String startAt, String endAt) {
        return "{\"room_id\":%d,\"title\":\"QA\",\"start_at\":\"%s\",\"end_at\":\"%s\"}".formatted(roomId, startAt, endAt);
    }

    private long roomId(String name) {
        return roomRepository.findByName(name).orElseThrow().getId();
    }

    private String userId(String email) {
        return String.valueOf(userRepository.findByEmail(email).orElseThrow().getId());
    }
}
