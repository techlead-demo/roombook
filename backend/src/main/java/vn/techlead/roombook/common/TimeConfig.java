package vn.techlead.roombook.common;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TimeConfig {

    /** Inject this clock instead of calling {@code Instant.now()} so tests can control "now". */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
