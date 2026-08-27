package com.vansales.controller;

import com.vansales.dto.KhataStatementResponse;
import com.vansales.dto.ShopRequest;
import com.vansales.dto.ShopResponse;
import com.vansales.service.ShopService;
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
@RequestMapping("/api/shops")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    @GetMapping
    public ResponseEntity<List<ShopResponse>> getAllShops(
            @RequestParam(required = false) String village,
            @RequestParam(required = false) String route,
            @AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(shopService.getAllShops(village, route, phone));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShopResponse> getShopById(@PathVariable Long id) {
        return ResponseEntity.ok(shopService.getShopById(id));
    }

    @GetMapping("/villages")
    public ResponseEntity<List<String>> getVillages(@AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(shopService.getVillages(phone));
    }

    @GetMapping("/routes")
    public ResponseEntity<List<String>> getRoutes(@AuthenticationPrincipal UserDetails userDetails) {
        String phone = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(shopService.getRoutes(phone));
    }

    @GetMapping("/{id}/statement")
    public ResponseEntity<KhataStatementResponse> getShopKhataStatement(@PathVariable Long id) {
        return ResponseEntity.ok(shopService.getShopKhataStatement(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    public ResponseEntity<ShopResponse> createShop(
            @Valid @RequestBody ShopRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return new ResponseEntity<>(shopService.createShop(request, userDetails.getUsername()), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    public ResponseEntity<ShopResponse> updateShop(
            @PathVariable Long id,
            @Valid @RequestBody ShopRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(shopService.updateShop(id, request, userDetails.getUsername()));
    }
}
