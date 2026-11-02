package vn.techlead.roombook.user;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponse> listUsers() {
        return userRepository.findAllByOrderByNameAsc().stream().map(UserResponse::from).toList();
    }

    /**
     * Checks that the acting user ({@code X-User-Id}) is an admin (BR-6, BR-10).
     * Answers {@code 401} "Unknown user" for a missing or unknown id, {@code 403} with {@code deniedDetail} otherwise.
     */
    public void requireAdmin(Long userId, String deniedDetail) {
        User user = (userId == null ? null : userRepository.findById(userId).orElse(null));
        if (user == null) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Unknown user");
            throw new ErrorResponseException(HttpStatus.UNAUTHORIZED, problem, null);
        }
        if (user.getRole() != Role.ADMIN) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, deniedDetail);
            throw new ErrorResponseException(HttpStatus.FORBIDDEN, problem, null);
        }
    }
}
