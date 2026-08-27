package com.vansales.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InvoiceItemRequest {
    @NotNull(message = "Product ID is required")
    private Long productId;

    @Min(value = 0, message = "Boxes count cannot be negative")
    private Integer boxesCount = 0;

    @Min(value = 0, message = "Loose dozens cannot be negative")
    private Integer looseDozens = 0;
}
