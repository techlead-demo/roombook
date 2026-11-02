package vn.techlead.roombook.booking;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    /**
     * Books a room for the acting user ({@code X-User-Id}); a missing header is answered with {@code 401}.
     * The body is validated in the service after the user check (no {@code @Valid}), so that check comes first.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(
            @RequestHeader(name = "X-User-Id", required = false) Long userId,
            @RequestBody BookingRequest request) {
        return bookingService.create(userId, request);
    }
}
