package com.vansales.service;

import com.vansales.dto.AdminStatsResponse;
import com.vansales.dto.AdminUserResponse;
import com.vansales.exception.BadRequestException;
import com.vansales.exception.ResourceNotFoundException;
import com.vansales.model.Invoice;
import com.vansales.model.PaymentRecord;
import com.vansales.model.Role;
import com.vansales.model.Shop;
import com.vansales.model.User;
import com.vansales.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRecordRepository paymentRecordRepository;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getAllUsers(String roleFilter) {
        List<User> users;
        if (roleFilter != null && !roleFilter.equalsIgnoreCase("ALL")) {
            try {
                Role role = Role.valueOf(roleFilter.toUpperCase());
                users = userRepository.findByRole(role);
            } catch (IllegalArgumentException e) {
                users = userRepository.findAll();
            }
        } else {
            users = userRepository.findAll();
        }

        return users.stream().map(this::mapUserToAdminResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse getSystemStats() {
        List<User> allUsers = userRepository.findAll();
        List<Shop> allShops = shopRepository.findAll();
        List<Invoice> allInvoices = invoiceRepository.findAll();

        long sellers = allUsers.stream().filter(u -> u.getRole() == Role.ROLE_SELLER).count();
        long buyers = allUsers.stream().filter(u -> u.getRole() == Role.ROLE_BUYER).count();
        long admins = allUsers.stream().filter(u -> u.getRole() == Role.ROLE_ADMIN).count();

        BigDecimal totalCredit = allShops.stream()
                .map(Shop::getOutstandingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSales = allInvoices.stream()
                .map(Invoice::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return AdminStatsResponse.builder()
                .totalUsers(allUsers.size())
                .totalSellers(sellers)
                .totalBuyers(buyers)
                .totalAdmins(admins)
                .totalShops(allShops.size())
                .totalProducts(productRepository.count())
                .totalInvoices(allInvoices.size())
                .totalMarketCreditOutstanding(totalCredit)
                .totalSalesVolume(totalSales)
                .build();
    }

    @Transactional
    public void deleteFraudUser(Long userId, String adminPhoneNumber) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (targetUser.getPhoneNumber().equals(adminPhoneNumber)) {
            throw new BadRequestException("Admin cannot delete their own account.");
        }

        log.warn("ADMIN ACTION: Purging fraudulent user ID {} (Name: {}, Phone: {}, Role: {})",
                targetUser.getId(), targetUser.getFullName(), targetUser.getPhoneNumber(), targetUser.getRole());

        // 1. Unlink invoices where this user was the seller
        List<Invoice> sellerInvoices = invoiceRepository.findAll().stream()
                .filter(inv -> inv.getSeller() != null && inv.getSeller().getId().equals(userId))
                .collect(Collectors.toList());
        for (Invoice inv : sellerInvoices) {
            inv.setSeller(null);
            invoiceRepository.save(inv);
        }

        // 2. Unlink payment records recorded by this user
        List<PaymentRecord> collectedPayments = paymentRecordRepository.findAll().stream()
                .filter(p -> p.getRecordedBy() != null && p.getRecordedBy().getId().equals(userId))
                .collect(Collectors.toList());
        for (PaymentRecord p : collectedPayments) {
            p.setRecordedBy(null);
            paymentRecordRepository.save(p);
        }

        // 3. If user owns a shop, unlink the user from the shop
        if (targetUser.getShop() != null) {
            Shop shop = targetUser.getShop();
            shop.setOwner(null);
            shopRepository.save(shop);
            targetUser.setShop(null);
        }

        // 4. Delete the user
        userRepository.delete(targetUser);
    }

    @Transactional
    public void deleteShop(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + shopId));

        log.warn("ADMIN ACTION: Deleting fraudulent shop ID {} (Name: {}, Village: {})",
                shop.getId(), shop.getShopName(), shop.getVillage());

        if (shop.getOwner() != null) {
            User owner = shop.getOwner();
            owner.setShop(null);
            userRepository.save(owner);
        }

        shopRepository.delete(shop);
    }

    private AdminUserResponse mapUserToAdminResponse(User u) {
        Shop s = u.getShop();
        return AdminUserResponse.builder()
                .id(u.getId())
                .phoneNumber(u.getPhoneNumber())
                .fullName(u.getFullName())
                .role(u.getRole().name())
                .shopId(s != null ? s.getId() : null)
                .shopName(s != null ? s.getShopName() : null)
                .village(s != null ? s.getVillage() : null)
                .route(s != null ? s.getRoute() : null)
                .shopOutstandingBalance(s != null ? s.getOutstandingBalance() : null)
                .createdAt(u.getCreatedAt())
                .build();
    }
}
