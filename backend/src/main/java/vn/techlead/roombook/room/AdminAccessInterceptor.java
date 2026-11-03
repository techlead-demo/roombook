package vn.techlead.roombook.room;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import vn.techlead.roombook.user.UserService;

/**
 * Checks the admin access of {@code /api/admin/**} before the request body is read, so that a non-admin gets
 * {@code 401}/{@code 403} even for an unreadable body, e.g. an unknown equipment value (RMB-4 AC-3, BR-10).
 * A non-numeric {@code X-User-Id} is left to the controller.
 */
@Configuration
public class AdminAccessInterceptor implements HandlerInterceptor, WebMvcConfigurer {

    private final UserService userService;

    public AdminAccessInterceptor(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this).addPathPatterns("/api/admin/**");
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String header = request.getHeader("X-User-Id");
        Long userId;
        try {
            userId = header == null ? null : Long.valueOf(header.trim());
        } catch (NumberFormatException ex) {
            return true;
        }
        userService.requireAdmin(userId, RoomAdminService.ADMIN_ONLY);
        return true;
    }
}
