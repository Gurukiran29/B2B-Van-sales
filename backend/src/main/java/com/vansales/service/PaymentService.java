package com.vansales.service;

import com.vansales.dto.PaymentRecordResponse;
import com.vansales.dto.PaymentSettlementRequest;
import com.vansales.exception.BadRequestException;
import com.vansales.exception.ResourceNotFoundException;
import com.vansales.model.PaymentRecord;
import com.vansales.model.Shop;
import com.vansales.model.User;
import com.vansales.repository.PaymentRecordRepository;
import com.vansales.repository.ShopRepository;
import com.vansales.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRecordRepository paymentRecordRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    @Transactional
    public PaymentRecordResponse settlePayment(PaymentSettlementRequest request, String currentPhoneNumber) {
        Shop shop = shopRepository.findById(request.getShopId())
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + request.getShopId()));

        User collector = userRepository.findByPhoneNumber(currentPhoneNumber)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with phone: " + currentPhoneNumber));

        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Settlement payment amount must be greater than 0");
        }

        BigDecimal prevBalance = shop.getOutstandingBalance();
        BigDecimal remainingBalance = prevBalance.subtract(amount);

        shop.setOutstandingBalance(remainingBalance);
        shopRepository.save(shop);

        PaymentRecord paymentRecord = PaymentRecord.builder()
                .shop(shop)
                .recordedBy(collector)
                .amount(amount)
                .paymentMode(request.getPaymentMode())
                .transactionReference(request.getTransactionReference())
                .notes(request.getNotes() != null ? request.getNotes() : "Weekly Khata Payment Settlement")
                .previousBalance(prevBalance)
                .remainingBalance(remainingBalance)
                .build();

        return mapToResponse(paymentRecordRepository.save(paymentRecord));
    }

    @Transactional(readOnly = true)
    public List<PaymentRecordResponse> getAllPayments() {
        return paymentRecordRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentRecordResponse> getPaymentsByShopId(Long shopId) {
        return paymentRecordRepository.findByShopIdOrderByCreatedAtDesc(shopId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private PaymentRecordResponse mapToResponse(PaymentRecord p) {
        return PaymentRecordResponse.builder()
                .id(p.getId())
                .shopId(p.getShop().getId())
                .shopName(p.getShop().getShopName())
                .village(p.getShop().getVillage())
                .recordedByUserId(p.getRecordedBy() != null ? p.getRecordedBy().getId() : null)
                .recordedByName(p.getRecordedBy() != null ? p.getRecordedBy().getFullName() : "Van Distributor")
                .amount(p.getAmount())
                .paymentMode(p.getPaymentMode())
                .transactionReference(p.getTransactionReference())
                .notes(p.getNotes())
                .previousBalance(p.getPreviousBalance())
                .remainingBalance(p.getRemainingBalance())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
