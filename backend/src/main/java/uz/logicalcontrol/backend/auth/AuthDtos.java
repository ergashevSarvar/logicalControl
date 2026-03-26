package uz.logicalcontrol.backend.auth;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
        @NotBlank String username,
        @NotBlank String password
    ) {
    }

    public record UserProfile(
        UUID id,
        String username,
        String fullName,
        String locale,
        List<String> roles
    ) {
    }

    public record LoginResponse(
        String accessToken,
        String tokenType,
        Instant expiresAt,
        UserProfile user
    ) {
    }
}
