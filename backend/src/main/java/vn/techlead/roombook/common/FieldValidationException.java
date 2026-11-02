package vn.techlead.roombook.common;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import jakarta.validation.ConstraintViolation;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * Field errors found in the service: Bean Validation run after the acting user is known, and rules that Bean
 * Validation cannot check (e.g. "now" or the office zone).
 * Rendered like a {@code @Valid} failure: {@code 400} with an {@code errors} array of {@code field}/{@code message}.
 */
public class FieldValidationException extends ErrorResponseException {

    public record FieldError(String field, String message) {
    }

    public FieldValidationException(List<FieldError> errors) {
        super(HttpStatus.BAD_REQUEST, problem(errors), null);
    }

    /** The Bean Validation violations of a request body, with the JSON (snake_case) field names. */
    public static FieldValidationException of(Set<? extends ConstraintViolation<?>> violations) {
        return new FieldValidationException(violations.stream()
                .map(violation -> new FieldError(jsonFieldName(violation.getPropertyPath().toString()), violation.getMessage()))
                .sorted(Comparator.comparing(FieldError::field).thenComparing(FieldError::message))
                .toList());
    }

    /** Field names in {@code errors} use the JSON (snake_case) names, e.g. {@code startAt} → {@code start_at}. */
    static String jsonFieldName(String field) {
        return field.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }

    private static ProblemDetail problem(List<FieldError> errors) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request validation failed.");
        problem.setProperty("errors", errors.stream()
                .map(error -> Map.of("field", error.field(), "message", error.message()))
                .toList());
        return problem;
    }
}
