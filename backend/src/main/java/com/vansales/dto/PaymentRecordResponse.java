package com.vansales.dto;

import com.vansales.model.PaymentMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRecordResponse {
    private Long id;
    private Long shopId;
    private String shopName;
    private String village;
    private Long recordedByUserId;
    private String recordedByName;
    private BigDecimal amount;
    private PaymentMode paymentMode;
    private String transactionReference;
    private String notes;
    private BigDecimal previousBalance;
    private BigDecimal remainingBalance;
    private LocalDateTime createdAt;
}
