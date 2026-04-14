package uz.logicalcontrol.backend.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
    @NotBlank String issuer,
    @NotBlank String secret,
    @Min(5) long accessTokenExpirationMinutes
) {
}

