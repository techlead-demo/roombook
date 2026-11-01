package vn.techlead.roombook.common;

import java.time.ZoneId;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Office settings ({@code roombook.office.*}).
 *
 * @param timeZone time zone of the office; used only to interpret calendar dates and for display
 */
@Validated
@ConfigurationProperties(prefix = "roombook.office")
public record OfficeProperties(@NotNull ZoneId timeZone) {
}
