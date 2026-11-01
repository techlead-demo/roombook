package vn.techlead.roombook.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    List<User> findAllByOrderByNameAsc();

    Optional<User> findByEmail(String email);
}
