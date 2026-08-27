package com.vansales.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthRequest {
    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "Password / PIN is required")
    private String password;
}
