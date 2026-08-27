package com.vansales.service;

import com.vansales.dto.AuthRequest;
import com.vansales.dto.AuthResponse;
import com.vansales.dto.RegisterRequest;
import com.vansales.exception.BadRequestException;
import com.vansales.model.Role;
import com.vansales.model.Shop;
import com.vansales.model.User;
import com.vansales.repository.ShopRepository;
import com.vansales.repository.UserRepository;
import com.vansales.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new BadRequestException("Phone number already registered: " + request.getPhoneNumber());
        }

        User user = User.builder()
                .phoneNumber(request.getPhoneNumber())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole())
                .build();

        user = userRepository.save(user);

        Shop shop = null;
        if (request.getRole() == Role.ROLE_BUYER) {
            shop = Shop.builder()
                    .shopName(request.getShopName() != null ? request.getShopName() : request.getFullName() + "'s Shop")
                    .ownerName(request.getOwnerName() != null ? request.getOwnerName() : request.getFullName())
                    .phoneNumber(request.getPhoneNumber())
                    .village(request.getVillage() != null ? request.getVillage() : "Unassigned Village")
                    .route(request.getRoute() != null ? request.getRoute() : "Route 1")
                    .address(request.getAddress())
                    .gstNumber(request.getGstNumber())
                    .outstandingBalance(request.getInitialOutstandingBalance() != null ? request.getInitialOutstandingBalance() : BigDecimal.ZERO)
                    .owner(user)
                    .build();
            shop = shopRepository.save(shop);
            user.setShop(shop);
        }

        String token = jwtUtils.generateTokenFromPhoneNumber(user.getPhoneNumber(), user.getRole().name());

        return buildAuthResponse(user, shop, token);
    }

    public AuthResponse login(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getPhoneNumber(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        User user = userRepository.findByPhoneNumber(request.getPhoneNumber())
                .orElseThrow(() -> new BadRequestException("User not found"));

        return buildAuthResponse(user, user.getShop(), jwt);
    }

    public AuthResponse getCurrentUserResponse(String phoneNumber) {
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new BadRequestException("User not found with phone: " + phoneNumber));

        String token = jwtUtils.generateTokenFromPhoneNumber(user.getPhoneNumber(), user.getRole().name());
        return buildAuthResponse(user, user.getShop(), token);
    }

    private AuthResponse buildAuthResponse(User user, Shop shop, String token) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .id(user.getId())
                .phoneNumber(user.getPhoneNumber())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .shopId(shop != null ? shop.getId() : null)
                .shopName(shop != null ? shop.getShopName() : null)
                .village(shop != null ? shop.getVillage() : null)
                .route(shop != null ? shop.getRoute() : null)
                .build();
    }
}
