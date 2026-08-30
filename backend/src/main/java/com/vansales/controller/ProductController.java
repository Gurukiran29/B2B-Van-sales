package com.vansales.controller;

import com.vansales.dto.ProductRequest;
import com.vansales.dto.ProductResponse;
import com.vansales.dto.StockAdjustmentRequest;
import com.vansales.dto.StockTransferRequest;
import com.vansales.service.ProductService;
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
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAllProducts(
            @RequestParam(required = false) String category,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(productService.getAllProducts(category, phone));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories(@AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(productService.getCategories(phone));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ResponseEntity<ProductResponse> createProduct(
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return new ResponseEntity<>(productService.createProduct(request, phone), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(productService.updateProduct(id, request, phone));
    }

    @PostMapping("/transfer-stock")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ResponseEntity<ProductResponse> transferStock(
            @Valid @RequestBody StockTransferRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(productService.transferStock(request, phone));
    }

    @PostMapping("/adjust-stock")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ResponseEntity<ProductResponse> adjustStock(
            @Valid @RequestBody StockAdjustmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(productService.adjustStock(request, phone));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SELLER', 'ADMIN')")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        productService.deleteProduct(id, phone);
        return ResponseEntity.noContent().build();
    }
}
