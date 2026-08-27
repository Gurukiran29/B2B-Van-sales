package com.vansales.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StockAdjustmentRequest {
    @NotNull(message = "Product ID is required")
    private Long productId;

    private Integer boxes = 0;
    private Integer looseDozens = 0;

    @NotNull(message = "Operation type is required (ADD, SUBTRACT, SET)")
    private String operation;

    private String reason;
}
