package vn.techlead.roombook.room;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * RMB-4 AC-27: two saves of the same name at the same time. The name check of the second request runs before the
 * first one is stored (simulated: the check finds nothing), so the unique index rejects the save; the answer is
 * still the {@code 409} ProblemDetail, not a {@code 500}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RoomNameRaceTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoSpyBean
    RoomRepository roomRepository;

    @BeforeEach
    void nameCheckMissesTheConcurrentRoom() {
        doReturn(Optional.empty()).when(roomRepository).findByNameIgnoreCase(anyString());
    }

    @Test
    void ac27_concurrentCreateWithTakenNameAnswers409() throws Exception {
        mockMvc.perform(post("/api/admin/rooms").header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"ha long\",\"capacity\":10,\"equipment\":[]}"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.detail").value("A room named \"ha long\" already exists."));
    }

    @Test
    void ac27_concurrentUpdateWithTakenNameAnswers409() throws Exception {
        mockMvc.perform(put("/api/admin/rooms/3").header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"HA LONG\",\"capacity\":6,\"equipment\":[]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.detail").value("A room named \"HA LONG\" already exists."));
    }
}
