package uz.logicalcontrol.backend.security;

import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import uz.logicalcontrol.backend.entity.UserEntity;
import uz.logicalcontrol.backend.repository.UserRepository;

@Component
@RequiredArgsConstructor
public class SecurityActorResolver {

    private final UserRepository userRepository;

    public String resolveActorId(Authentication authentication, String fallback) {
        return resolveUserId(authentication)
            .map(UUID::toString)
            .orElse(fallback);
    }

    public Optional<UserEntity> resolveUser(Authentication authentication) {
        if (!isAuthenticated(authentication)) {
            return Optional.empty();
        }

        var principal = authentication.getPrincipal();
        if (principal instanceof AppUserPrincipal appUserPrincipal && appUserPrincipal.id() != null) {
            return userRepository.findById(appUserPrincipal.id())
                .or(() -> userRepository.findByUsernameIgnoreCase(appUserPrincipal.username()));
        }

        var username = trimToNull(authentication.getName());
        if (username == null) {
            return Optional.empty();
        }

        return userRepository.findByUsernameIgnoreCase(username);
    }

    public Optional<UUID> resolveUserId(Authentication authentication) {
        if (!isAuthenticated(authentication)) {
            return Optional.empty();
        }

        var principal = authentication.getPrincipal();
        if (principal instanceof AppUserPrincipal appUserPrincipal) {
            return Optional.ofNullable(appUserPrincipal.id());
        }

        return resolveUser(authentication).map(UserEntity::getId);
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
            && authentication.isAuthenticated()
            && !(authentication instanceof AnonymousAuthenticationToken);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        var normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
