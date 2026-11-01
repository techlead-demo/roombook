package vn.techlead.roombook.booking;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    /** Bookings that start before {@code to} and end after {@code from}, ordered by start time. */
    @Query("select b from Booking b where b.startAt < :to and b.endAt > :from order by b.startAt")
    List<Booking> findOverlapping(@Param("from") Instant from, @Param("to") Instant to);

    boolean existsByStartAtGreaterThanEqualAndStartAtLessThan(Instant from, Instant to);
}
