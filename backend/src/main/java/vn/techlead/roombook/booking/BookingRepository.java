package vn.techlead.roombook.booking;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    /** Bookings that start before {@code to} and end after {@code from}, ordered by start time. */
    @Query("select b from Booking b where b.startAt < :to and b.endAt > :from order by b.startAt")
    List<Booking> findOverlapping(@Param("from") Instant from, @Param("to") Instant to);

    boolean existsByStartAtGreaterThanEqualAndStartAtLessThan(Instant from, Instant to);

    /** Number of bookings per room that start strictly after {@code now}; rooms without such bookings are missing. */
    @Query("select new vn.techlead.roombook.booking.RoomBookingCount(b.room.id, count(b)) from Booking b"
            + " where b.startAt > :now group by b.room.id")
    List<RoomBookingCount> countStartingAfterByRoom(@Param("now") Instant now);

    long countByRoomIdAndStartAtAfter(Long roomId, Instant now);

    /** Deletes the bookings of the room that start strictly after {@code now} (BR-11); returns how many. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Booking b where b.room.id = :roomId and b.startAt > :now")
    int deleteByRoomIdAndStartAtAfter(@Param("roomId") Long roomId, @Param("now") Instant now);
}
