package vn.techlead.roombook;

import java.time.ZoneOffset;
import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class RoombookApplication {

    public static void main(String[] args) {
        // All time handling is UTC; the office time zone is applied explicitly where needed.
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneOffset.UTC));
        SpringApplication.run(RoombookApplication.class, args);
    }
}
