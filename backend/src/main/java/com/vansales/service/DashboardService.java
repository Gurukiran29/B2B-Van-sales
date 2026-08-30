package com.vansales.service;

import com.vansales.dto.DashboardStatsResponse;
import com.vansales.dto.ProductResponse;
import com.vansales.dto.ShopResponse;
import com.vansales.exception.UnauthorizedException;
import com.vansales.model.Invoice;
import com.vansales.model.PaymentRecord;
import com.vansales.model.Role;
import com.vansales.model.Shop;
import com.vansales.model.User;
import com.vansales.repository.InvoiceRepository;
import com.vansales.repository.PaymentRecordRepository;
import com.vansales.repository.ProductRepository;
import com.vansales.repository.ShopRepository;
import com.vansales.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ShopService shopService;
    private final ProductService productService;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(String currentUserPhone) {
        User currentUser = userRepository.findByPhoneNumber(currentUserPhone)
                .orElseThrow(() -> new UnauthorizedException("User not authenticated"));

        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        List<Invoice> todayInvoices;
        List<PaymentRecord> todayPayments;
        List<Shop> userShops;
        List<ProductResponse> lowStock;

        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            todayInvoices = invoiceRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startOfDay, endOfDay);
            todayPayments = paymentRecordRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startOfDay, endOfDay);
            userShops = shopRepository.findAll();
            lowStock = productRepository.findLowStockProducts().stream()
                    .map(productService::mapToResponse)
                    .collect(Collectors.toList());
        } else {
            todayInvoices = invoiceRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startOfDay, endOfDay).stream()
                    .filter(inv -> inv.getSeller() != null && inv.getSeller().getId().equals(currentUser.getId()))
                    .collect(Collectors.toList());

            todayPayments = paymentRecordRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startOfDay, endOfDay).stream()
                    .filter(pay -> pay.getRecordedBy() != null && pay.getRecordedBy().getId().equals(currentUser.getId()))
                    .collect(Collectors.toList());

            userShops = shopRepository.findByCreatedBy(currentUser);
            lowStock = productRepository.findLowStockProductsByCreatedBy(currentUser).stream()
                    .map(productService::mapToResponse)
                    .collect(Collectors.toList());
        }

        BigDecimal todaySales = todayInvoices.stream()
                .map(Invoice::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Total cash/UPI collections today (from PaymentRecords: includes both invoice spot payments and Khata repayments)
        BigDecimal todayCollections = todayPayments.stream()
                .map(PaymentRecord::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal todayCreditGiven = todayInvoices.stream()
                .map(Invoice::getBalanceDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalMarketCredit = userShops.stream()
                .map(Shop::getOutstandingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long shopsWithCredit = userShops.stream()
                .filter(s -> s.getOutstandingBalance().compareTo(BigDecimal.ZERO) > 0)
                .count();

        List<ShopResponse> topCreditShops = userShops.stream()
                .filter(s -> s.getOutstandingBalance().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> b.getOutstandingBalance().compareTo(a.getOutstandingBalance()))
                .limit(5)
                .map(shopService::mapToResponse)
                .collect(Collectors.toList());

        return DashboardStatsResponse.builder()
                .todaySales(todaySales)
                .todayCollections(todayCollections)
                .todayCreditGiven(todayCreditGiven)
                .totalMarketCreditOutstanding(totalMarketCredit)
                .todayBillsCount(todayInvoices.size())
                .totalShopsCount(userShops.size())
                .shopsWithCreditCount(shopsWithCredit)
                .topCreditShops(topCreditShops)
                .lowStockAlerts(lowStock)
                .build();
    }
}
