package com.vansales.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserResponse {
    private Long id;
    private String phoneNumber;
    private String fullName;
    private String role;
    private Long shopId;
    private String shopName;
    private String village;
    private String route;
    private BigDecimal shopOutstandingBalance;
    private LocalDateTime createdAt;
}
