package uz.logicalcontrol.backend.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
    @NotBlank String issuer,
    @NotBlank String secret,
    @Min(5) long accessTokenExpirationMinutes
) {
}
