package com.vansales.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductRequest {
    private String sku;

    @NotBlank(message = "Product name is required")
    private String name;

    @NotBlank(message = "Category is required")
    private String category;

    // Optional: Defaults to 1 for direct item/chocolate boxes with no loose dozens
    @Min(value = 1, message = "Dozens per box must be at least 1")
    private Integer dozensPerBox;

    @DecimalMin(value = "0.00", message = "Purchase price per box cannot be negative")
    private BigDecimal purchasePricePerBox;

    // Optional: If sold as a whole box, user can just specify wholesaleBoxOfferPrice
    @DecimalMin(value = "0.00", message = "Price per dozen cannot be negative")
    private BigDecimal pricePerDozen;

    @DecimalMin(value = "0.00", message = "Wholesale box offer price cannot be negative")
    private BigDecimal wholesaleBoxOfferPrice;

    @Min(value = 0, message = "Godown stock boxes cannot be negative")
    private Integer godownStockBoxes;

    @Min(value = 0, message = "Godown stock loose dozens cannot be negative")
    private Integer godownStockLooseDozens;

    @Min(value = 0, message = "Van stock boxes cannot be negative")
    private Integer vanStockBoxes;

    @Min(value = 0, message = "Van stock loose dozens cannot be negative")
    private Integer vanStockLooseDozens;

    // Backward compatibility fields
    private Integer stockInDozens;
    private Integer godownStockInDozens;

    private String imageUrl;
    private String description;
}
