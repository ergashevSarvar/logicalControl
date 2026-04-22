package uz.logicalcontrol.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import uz.logicalcontrol.backend.repository.UserRepository;
import uz.logicalcontrol.backend.security.AppUserPrincipal;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var user = userRepository.findByUsernameIgnoreCase(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        var authorities = user.getRoles().stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getCode()))
            .toList();

        return new AppUserPrincipal(
            user.getId(),
            user.getUsername(),
            user.getPasswordHash(),
            user.getFullName(),
            user.getLocale(),
            user.isEnabled(),
            authorities
        );
    }
}
