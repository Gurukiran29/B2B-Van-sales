package com.vansales.dto;

import com.vansales.model.PaymentMode;
import com.vansales.model.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private Long shopId;
    private String shopName;
    private String ownerName;
    private String village;
    private String route;
    private String shopPhoneNumber;
    private Long sellerId;
    private String sellerName;
    private BigDecimal totalAmount;
    private BigDecimal amountPaid;
    private BigDecimal balanceDue;
    private PaymentStatus paymentStatus;
    private PaymentMode paymentMode;
    private String notes;
    private List<InvoiceItemResponse> items;
    private LocalDateTime createdAt;
    private BigDecimal shopNewBalance;
}
