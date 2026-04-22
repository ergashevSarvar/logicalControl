package uz.logicalcontrol.backend.config;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.logicalcontrol.backend.security.SecurityActorResolver;

@Configuration
@RequiredArgsConstructor
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    private final SecurityActorResolver securityActorResolver;

    @Bean
    AuditorAware<String> auditorAware() {
        return () -> Optional.of(
            securityActorResolver.resolveActorId(SecurityContextHolder.getContext().getAuthentication(), "system")
        );
    }
}
