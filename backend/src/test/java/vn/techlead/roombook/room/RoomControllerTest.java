package vn.techlead.roombook.room;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RoomControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void listsActiveRoomsOrderedByNameInSnakeCase() throws Exception {
        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[*].name").value(contains("Da Lat", "Ha Long", "Hoi An", "Hue", "Phu Quoc", "Sa Pa")))
                .andExpect(jsonPath("$[1].capacity").value(12))
                .andExpect(jsonPath("$[1].equipment").value(contains("TV", "WHITEBOARD", "VIDEO_CONFERENCE")))
                .andExpect(jsonPath("$[1].active").value(true))
                .andExpect(jsonPath("$[5].equipment").isEmpty());
    }
}
