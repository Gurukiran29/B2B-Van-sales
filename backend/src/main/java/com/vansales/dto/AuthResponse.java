package com.vansales.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String type;
    private Long id;
    private String phoneNumber;
    private String fullName;
    private String role;
    private Long shopId;
    private String shopName;
    private String village;
    private String route;
}
