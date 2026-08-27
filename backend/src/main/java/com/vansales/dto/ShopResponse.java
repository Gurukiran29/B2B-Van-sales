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
public class ShopResponse {
    private Long id;
    private String shopName;
    private String ownerName;
    private String phoneNumber;
    private String village;
    private String route;
    private String address;
    private String gstNumber;
    private BigDecimal outstandingBalance;
    private Long ownerUserId;
    private LocalDateTime createdAt;
}
