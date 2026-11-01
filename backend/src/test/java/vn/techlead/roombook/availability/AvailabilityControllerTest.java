package vn.techlead.roombook.availability;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.techlead.roombook.booking.Booking;
import vn.techlead.roombook.booking.BookingRepository;
import vn.techlead.roombook.room.Room;
import vn.techlead.roombook.room.RoomRepository;
import vn.techlead.roombook.user.User;
import vn.techlead.roombook.user.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AvailabilityControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    UserRepository userRepository;

    @Test
    void convertsOfficeDayBoundariesToUtc() throws Exception {
        // Asia/Ho_Chi_Minh is UTC+7: 2026-11-02 00:00 office time = 2026-11-01T17:00:00Z
        mockMvc.perform(get("/api/rooms/availability").param("date", "2026-11-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-11-02"))
                .andExpect(jsonPath("$.time_zone").value("Asia/Ho_Chi_Minh"))
                .andExpect(jsonPath("$.day_start").value("2026-11-01T17:00:00Z"))
                .andExpect(jsonPath("$.day_end").value("2026-11-02T17:00:00Z"))
                .andExpect(jsonPath("$.rooms.length()").value(6))
                .andExpect(jsonPath("$.rooms[0].busy").isEmpty());
    }

    @Test
    void returnsBookingsOverlappingTheOfficeDayAsUtcIntervals() throws Exception {
        Room room = roomRepository.findByName("Da Lat").orElseThrow();
        // 2026-11-01 23:30 to 2026-11-02 00:30 office time: overlaps the start of the day
        book(room, "2026-11-01T16:30:00Z", "2026-11-01T17:30:00Z");
        // 2026-11-02 09:00 to 10:15 office time
        book(room, "2026-11-02T02:00:00Z", "2026-11-02T03:15:00Z");
        // 2026-11-03 00:00 office time: the next day, excluded
        book(room, "2026-11-02T17:00:00Z", "2026-11-02T18:00:00Z");

        mockMvc.perform(get("/api/rooms/availability").param("date", "2026-11-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rooms[0].room_id").value(room.getId()))
                .andExpect(jsonPath("$.rooms[0].busy.length()").value(2))
                .andExpect(jsonPath("$.rooms[0].busy[0].start_at").value("2026-11-01T16:30:00Z"))
                .andExpect(jsonPath("$.rooms[0].busy[0].end_at").value("2026-11-01T17:30:00Z"))
                .andExpect(jsonPath("$.rooms[0].busy[1].start_at").value("2026-11-02T02:00:00Z"))
                .andExpect(jsonPath("$.rooms[0].busy[1].end_at").value("2026-11-02T03:15:00Z"));
    }

    @Test
    void rejectsInvalidDateWithProblemDetail() throws Exception {
        mockMvc.perform(get("/api/rooms/availability").param("date", "2026-13-45"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.detail").value(containsString("'date'")));
    }

    @Test
    void rejectsMissingDateWithProblemDetail() throws Exception {
        mockMvc.perform(get("/api/rooms/availability"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));
    }

    private void book(Room room, String startAt, String endAt) {
        User user = userRepository.findByEmail("binh.tran@roombook.local").orElseThrow();
        bookingRepository.save(new Booking(room, user, "Test booking",
                Instant.parse(startAt), Instant.parse(endAt), Instant.parse("2026-10-30T00:00:00Z")));
    }
}
