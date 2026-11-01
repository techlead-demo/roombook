package vn.techlead.roombook.booking;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import vn.techlead.roombook.room.Room;
import vn.techlead.roombook.user.User;

/** A reservation of one room by one user from {@code startAt} to {@code endAt} (UTC instants). */
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Booking() {
    }

    public Booking(Room room, User user, String title, Instant startAt, Instant endAt, Instant createdAt) {
        this.room = room;
        this.user = user;
        this.title = title;
        this.startAt = startAt;
        this.endAt = endAt;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Room getRoom() {
        return room;
    }

    public User getUser() {
        return user;
    }

    public String getTitle() {
        return title;
    }

    public Instant getStartAt() {
        return startAt;
    }

    public Instant getEndAt() {
        return endAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
