package uz.logicalcontrol.backend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import uz.logicalcontrol.backend.entity.UserEntity;
import uz.logicalcontrol.backend.config.JwtProperties;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties jwtProperties;

    public String generateToken(UserEntity user) {
        var now = Instant.now();
        var expiresAt = now.plusSeconds(jwtProperties.accessTokenExpirationMinutes() * 60);
        var roles = user.getRoles().stream()
            .map(role -> role.getCode())
            .toList();

        return Jwts.builder()
            .issuer(jwtProperties.issuer())
            .subject(user.getUsername())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .claim("userId", user.getId().toString())
            .claim("fullName", user.getFullName())
            .claim("locale", user.getLocale())
            .claim("roles", roles)
            .signWith(signingKey())
            .compact();
    }

    public Instant extractExpiration(String token) {
        return extractClaims(token).getExpiration().toInstant();
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public List<String> extractRoles(String token) {
        var rolesClaim = extractClaims(token).get("roles");
        if (!(rolesClaim instanceof List<?> roles)) {
            return List.of();
        }

        return roles.stream()
            .map(String::valueOf)
            .toList();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        var claims = extractClaims(token);
        return claims.getSubject().equalsIgnoreCase(userDetails.getUsername())
            && claims.getExpiration().toInstant().isAfter(Instant.now());
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
    }
}
