package com.vansales.controller;

import com.vansales.dto.PaymentRecordResponse;
import com.vansales.dto.PaymentSettlementRequest;
import com.vansales.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/settle")
    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    public ResponseEntity<PaymentRecordResponse> settlePayment(
            @Valid @RequestBody PaymentSettlementRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return new ResponseEntity<>(
                paymentService.settlePayment(request, userDetails.getUsername()),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<List<PaymentRecordResponse>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<PaymentRecordResponse>> getPaymentsByShopId(@PathVariable Long shopId) {
        return ResponseEntity.ok(paymentService.getPaymentsByShopId(shopId));
    }
}
