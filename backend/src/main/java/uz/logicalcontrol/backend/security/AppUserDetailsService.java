package uz.logicalcontrol.backend.security;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import uz.logicalcontrol.backend.user.UserRepository;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var user = userRepository.findByUsernameIgnoreCase(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        var authorities = user.getRoles().stream()
            .map(role -> "ROLE_" + role.getCode())
            .toList();

        return User.withUsername(user.getUsername())
            .password(user.getPasswordHash())
            .disabled(!user.isEnabled())
            .authorities(authorities.toArray(String[]::new))
            .build();
    }
}
