package com.vansales.controller;

import com.vansales.dto.InvoiceRequest;
import com.vansales.dto.InvoiceResponse;
import com.vansales.service.BillingService;
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
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @PostMapping
    public ResponseEntity<InvoiceResponse> createInvoice(
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return new ResponseEntity<>(
                billingService.createInvoice(request, phone),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<List<InvoiceResponse>> getAllInvoices(
            @RequestParam(required = false) Long shopId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        if (phone != null) {
            return ResponseEntity.ok(billingService.getAllInvoices(shopId, phone));
        }
        return ResponseEntity.ok(billingService.getAllInvoices());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getInvoiceById(@PathVariable Long id) {
        return ResponseEntity.ok(billingService.getInvoiceById(id));
    }

    @GetMapping("/number/{invoiceNumber}")
    public ResponseEntity<InvoiceResponse> getInvoiceByNumber(@PathVariable String invoiceNumber) {
        return ResponseEntity.ok(billingService.getInvoiceByNumber(invoiceNumber));
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<InvoiceResponse>> getInvoicesByShopId(@PathVariable Long shopId) {
        return ResponseEntity.ok(billingService.getInvoicesByShopId(shopId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ResponseEntity<Void> deleteInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        billingService.deleteInvoice(id, phone);
        return ResponseEntity.noContent().build();
    }
}
