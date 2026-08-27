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
public class AdminStatsResponse {
    private long totalUsers;
    private long totalSellers;
    private long totalBuyers;
    private long totalAdmins;
    private long totalShops;
    private long totalProducts;
    private long totalInvoices;
    private BigDecimal totalMarketCreditOutstanding;
    private BigDecimal totalSalesVolume;
}
