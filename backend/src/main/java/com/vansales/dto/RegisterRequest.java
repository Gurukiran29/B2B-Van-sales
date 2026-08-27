package com.vansales.dto;

import com.vansales.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RegisterRequest {
    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "Password / PIN is required")
    private String password;

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotNull(message = "Role is required")
    private Role role;

    private String shopName;
    private String ownerName;
    private String village;
    private String route;
    private String address;
    private String gstNumber;
    private BigDecimal initialOutstandingBalance;
}
