package vn.techlead.roombook.room;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/admin/rooms} and {@code PUT /api/admin/rooms/{id}} (BR-9). {@code name} is trimmed. */
public record RoomRequest(
        @NotBlank @Size(max = 50, message = "must be at most 50 characters") String name,
        @NotNull @Min(value = 1, message = "must be between 1 and 100") @Max(value = 100, message = "must be between 1 and 100") Integer capacity,
        @NotNull List<@NotNull Equipment> equipment) {

    public RoomRequest {
        name = name == null ? null : name.strip();
    }
}
