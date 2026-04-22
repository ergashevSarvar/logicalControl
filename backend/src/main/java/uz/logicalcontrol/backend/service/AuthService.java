package uz.logicalcontrol.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import uz.logicalcontrol.backend.entity.UserEntity;
import uz.logicalcontrol.backend.payload.AuthDtos;
import uz.logicalcontrol.backend.repository.UserRepository;
import uz.logicalcontrol.backend.security.SecurityActorResolver;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecurityActorResolver securityActorResolver;

    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest request) {
        var user = userRepository.findByUsernameIgnoreCase(request.username())
            .orElseThrow(() -> new BadCredentialsException("Username yoki parol noto'g'ri"));

        if (!user.isEnabled() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Username yoki parol noto'g'ri");
        }

        var token = jwtService.generateToken(user);
        return new AuthDtos.LoginResponse(
            token,
            "Bearer",
            jwtService.extractExpiration(token),
            toProfile(user)
        );
    }

    public AuthDtos.UserProfile currentUser(Authentication authentication) {
        var user = securityActorResolver.resolveUser(authentication)
            .orElseThrow(() -> new BadCredentialsException("Foydalanuvchi topilmadi"));

        return toProfile(user);
    }

    private AuthDtos.UserProfile toProfile(uz.logicalcontrol.backend.entity.UserEntity user) {
        return new AuthDtos.UserProfile(
            user.getId(),
            user.getUsername(),
            user.getFullName(),
            normalizeLocaleCode(user.getLocale()),
            user.getRoles().stream().map(role -> role.getCode()).toList()
        );
    }

    private String normalizeLocaleCode(String locale) {
        if (locale == null || locale.isBlank()) {
            return "OZ";
        }

        return switch (locale.trim().toLowerCase()) {
            case "uz", "uzcyrl", "uz-cyrl" -> "UZ";
            case "oz", "uzlatn", "uz-latn" -> "OZ";
            case "ru" -> "RU";
            case "en" -> "EN";
            default -> locale.equals("UZ") || locale.equals("OZ") || locale.equals("RU") || locale.equals("EN")
                ? locale
                : "OZ";
        };
    }
}
