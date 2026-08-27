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
    private BigDecimal pricePerDozen;
    private BigDecimal boxPrice;
    private Integer stockInDozens;
    private Integer fullBoxesInStock;
    private Integer remainingLooseDozens;
    private Integer minStockAlert;
    private String imageUrl;
    private String description;
}
