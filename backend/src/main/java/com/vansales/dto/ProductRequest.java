package com.vansales.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductRequest {
    @NotBlank(message = "SKU is required")
    private String sku;

    @NotBlank(message = "Product name is required")
    private String name;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Dozens per box is required")
    @Min(value = 1, message = "Dozens per box must be at least 1")
    private Integer dozensPerBox;

    @NotNull(message = "Price per dozen is required")
    @DecimalMin(value = "0.01", message = "Price per dozen must be greater than 0")
    private BigDecimal pricePerDozen;

    @Min(value = 0, message = "Stock in dozens cannot be negative")
    private Integer stockInDozens;

    @Min(value = 0, message = "Min stock alert cannot be negative")
    private Integer minStockAlert;

    private String imageUrl;
    private String description;
}
