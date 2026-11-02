package vn.techlead.roombook.common;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * Field errors found in the service (rules that Bean Validation cannot check, e.g. "now" or the office zone).
 * Rendered like a {@code @Valid} failure: {@code 400} with an {@code errors} array of {@code field}/{@code message}.
 */
public class FieldValidationException extends ErrorResponseException {

    public record FieldError(String field, String message) {
    }

    public FieldValidationException(List<FieldError> errors) {
        super(HttpStatus.BAD_REQUEST, problem(errors), null);
    }

    private static ProblemDetail problem(List<FieldError> errors) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request validation failed.");
        problem.setProperty("errors", errors.stream()
                .map(error -> Map.of("field", error.field(), "message", error.message()))
                .toList());
        return problem;
    }
}
