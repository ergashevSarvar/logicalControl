package uz.logicalcontrol.backend.auth;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import uz.logicalcontrol.backend.security.JwtService;
import uz.logicalcontrol.backend.user.UserRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

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
        var user = userRepository.findByUsernameIgnoreCase(authentication.getName())
            .orElseThrow(() -> new BadCredentialsException("Foydalanuvchi topilmadi"));

        return toProfile(user);
    }

    private AuthDtos.UserProfile toProfile(uz.logicalcontrol.backend.user.UserEntity user) {
        return new AuthDtos.UserProfile(
            user.getId(),
            user.getUsername(),
            user.getFullName(),
            user.getLocale(),
            user.getRoles().stream().map(role -> role.getCode()).toList()
        );
    }
}
