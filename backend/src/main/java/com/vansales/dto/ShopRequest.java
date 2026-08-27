package com.vansales.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ShopRequest {
    @NotBlank(message = "Shop name is required")
    private String shopName;

    @NotBlank(message = "Owner name is required")
    private String ownerName;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "Village is required")
    private String village;

    @NotBlank(message = "Route is required")
    private String route;

    private String address;
    private String gstNumber;
    private BigDecimal initialOutstandingBalance;
}
