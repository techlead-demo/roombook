package vn.techlead.roombook.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;

import vn.techlead.roombook.booking.BookingControllerTest.TestClock;
import vn.techlead.roombook.room.RoomRepository;
import vn.techlead.roombook.user.UserRepository;

/**
 * RMB-2 AC-10: concurrent requests for the same room and time store one booking. Not {@code @Transactional}: each
 * request must commit in its own transaction, so the bookings are deleted after each test instead.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(BookingControllerTest.TestClockConfig.class)
class BookingConcurrencyTest {

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

    @BeforeEach
    void setUp() {
        clock.set(BookingControllerTest.NOW);
    }

    @AfterEach
    void deleteBookings() {
        bookingRepository.deleteAll();
    }

    @Test
    void ac10ExactlyOneOfTwoSimultaneousRequestsIsBooked() throws Exception {
        long haLong = roomRepository.findByName("Ha Long").orElseThrow().getId();
        long binh = userRepository.findByEmail("binh.tran@roombook.local").orElseThrow().getId();
        long chi = userRepository.findByEmail("chi.le@roombook.local").orElseThrow().getId();
        String json = "{\"room_id\":%d,\"title\":\"Sprint planning\",\"start_at\":\"2026-11-02T04:00:00Z\",\"end_at\":\"2026-11-02T05:00:00Z\"}"
                .formatted(haLong);

        List<MockHttpServletResponse> responses = postAtTheSameTime(json, binh, chi);

        assertThat(responses).extracting(MockHttpServletResponse::getStatus).containsExactlyInAnyOrder(201, 409);
        MockHttpServletResponse conflict = responses.stream().filter(response -> response.getStatus() == 409).findFirst().orElseThrow();
        assertThat(conflict.getContentAsString()).contains(
                "\"detail\":\"Ha Long is already booked from 11:00 to 12:00 on Mon 2 Nov 2026. Choose another time or another room.\"");
        assertThat(bookingRepository.findAll()).singleElement().satisfies(booking -> {
            assertThat(booking.getRoom().getId()).isEqualTo(haLong);
            assertThat(booking.getStartAt()).isEqualTo(Instant.parse("2026-11-02T04:00:00Z"));
            assertThat(booking.getEndAt()).isEqualTo(Instant.parse("2026-11-02T05:00:00Z"));
        });
    }

    /** Sends one request per user, all released together. */
    private List<MockHttpServletResponse> postAtTheSameTime(String json, long... userIds) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(userIds.length);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<MockHttpServletResponse>> futures = new ArrayList<>();
            for (long userId : userIds) {
                futures.add(executor.submit(() -> {
                    start.await();
                    return mockMvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(json)
                            .header("X-User-Id", userId)).andReturn().getResponse();
                }));
            }
            start.countDown();
            List<MockHttpServletResponse> responses = new ArrayList<>();
            for (Future<MockHttpServletResponse> future : futures) {
                responses.add(future.get());
            }
            return responses;
        } finally {
            executor.shutdownNow();
        }
    }
}
