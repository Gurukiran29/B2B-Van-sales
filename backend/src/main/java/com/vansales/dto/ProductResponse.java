package com.vansales.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private String sku;
    private String name;
    private String category;
    private Integer dozensPerBox;
    
    private BigDecimal purchasePricePerBox;
    private BigDecimal purchasePricePerDozen;
    private BigDecimal pricePerDozen;
    private BigDecimal wholesaleBoxOfferPrice;
    private BigDecimal boxPrice;
    
    // Godown Stock Metrics
    private Integer godownStockInDozens;
    private Integer godownFullBoxes;
    private Integer godownRemainingLooseDozens;

    // Van Stock Metrics
    private Integer stockInDozens; // Van stock in dozens
    private Integer vanFullBoxes;
    private Integer vanRemainingLooseDozens;
    private Integer fullBoxesInStock; // for backward compatibility
    private Integer remainingLooseDozens; // for backward compatibility

    private String imageUrl;
    private String description;
}
