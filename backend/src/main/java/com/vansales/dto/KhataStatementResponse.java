package com.vansales.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KhataStatementResponse {
    private ShopResponse shop;
    private BigDecimal currentOutstandingBalance;
    private BigDecimal totalBilledAmount;
    private BigDecimal totalPaidAmount;
    private List<InvoiceResponse> invoices;
    private List<PaymentRecordResponse> payments;
}
