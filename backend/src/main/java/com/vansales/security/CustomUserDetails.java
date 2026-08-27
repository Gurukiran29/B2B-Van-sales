package com.vansales.security;

import com.vansales.model.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@AllArgsConstructor
@Getter
public class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String phoneNumber;
    private final String password;
    private final String fullName;
    private final String role;
    private final Long shopId;
    private final Collection<? extends GrantedAuthority> authorities;

    public static CustomUserDetails build(User user) {
        GrantedAuthority authority = new SimpleGrantedAuthority(user.getRole().name());
        Long shopId = user.getShop() != null ? user.getShop().getId() : null;

        return new CustomUserDetails(
                user.getId(),
                user.getPhoneNumber(),
                user.getPassword(),
                user.getFullName(),
                user.getRole().name(),
                shopId,
                Collections.singletonList(authority)
        );
    }

    @Override
    public String getUsername() {
        return phoneNumber;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
