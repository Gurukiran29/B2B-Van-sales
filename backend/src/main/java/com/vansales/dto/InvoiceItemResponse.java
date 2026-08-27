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
public class InvoiceItemResponse {
    private Long id;
    private Long productId;
    private String productSku;
    private String productName;
    private Integer boxesCount;
    private Integer looseDozens;
    private Integer totalDozens;
    private BigDecimal pricePerDozen;
    private BigDecimal subtotal;
}
