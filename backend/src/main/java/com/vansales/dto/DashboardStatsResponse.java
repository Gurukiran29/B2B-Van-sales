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
public class DashboardStatsResponse {
    private BigDecimal todaySales;
    private BigDecimal todayCollections;
    private BigDecimal todayCreditGiven;
    private BigDecimal totalMarketCreditOutstanding;
    private long todayBillsCount;
    private long totalShopsCount;
    private long shopsWithCreditCount;
    private List<ShopResponse> topCreditShops;
    private List<ProductResponse> lowStockAlerts;
}
