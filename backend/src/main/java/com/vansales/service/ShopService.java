package com.vansales.service;

import com.vansales.dto.*;
import com.vansales.exception.BadRequestException;
import com.vansales.exception.ResourceNotFoundException;
import com.vansales.exception.UnauthorizedException;
import com.vansales.model.Invoice;
import com.vansales.model.PaymentRecord;
import com.vansales.model.Role;
import com.vansales.model.Shop;
import com.vansales.model.User;
import com.vansales.repository.InvoiceRepository;
import com.vansales.repository.PaymentRecordRepository;
import com.vansales.repository.ShopRepository;
import com.vansales.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShopService {

    private final ShopRepository shopRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ShopResponse> getAllShops(String village, String route, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);

        List<Shop> shops;
        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            if (village != null && !village.equalsIgnoreCase("ALL")) {
                shops = shopRepository.findByVillageIgnoreCase(village);
            } else if (route != null && !route.equalsIgnoreCase("ALL")) {
                shops = shopRepository.findByRouteIgnoreCase(route);
            } else {
                shops = shopRepository.findAll();
            }
        } else if (currentUser.getRole() == Role.ROLE_SELLER) {
            if (village != null && !village.equalsIgnoreCase("ALL")) {
                shops = shopRepository.findByCreatedByAndVillageIgnoreCase(currentUser, village);
            } else if (route != null && !route.equalsIgnoreCase("ALL")) {
                shops = shopRepository.findByCreatedByAndRouteIgnoreCase(currentUser, route);
            } else {
                shops = shopRepository.findByCreatedBy(currentUser);
            }
        } else {
            // ROLE_BUYER: only sees their own linked shop
            Shop ownShop = currentUser.getShop();
            shops = ownShop != null ? Collections.singletonList(ownShop) : Collections.emptyList();
        }

        return shops.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ShopResponse getShopById(Long id) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + id));
        return mapToResponse(shop);
    }

    @Transactional(readOnly = true)
    public List<String> getVillages(String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            return shopRepository.findDistinctVillages();
        } else {
            return shopRepository.findDistinctVillagesByCreatedBy(currentUser);
        }
    }

    @Transactional(readOnly = true)
    public List<String> getRoutes(String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            return shopRepository.findDistinctRoutes();
        } else {
            return shopRepository.findDistinctRoutesByCreatedBy(currentUser);
        }
    }

    @Transactional
    public ShopResponse createShop(ShopRequest request, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);

        String cleanPhone = request.getPhoneNumber().trim();
        if (shopRepository.findByPhoneNumberAndCreatedBy(cleanPhone, currentUser).isPresent()) {
            throw new BadRequestException("Shop with phone number '" + cleanPhone + "' already exists in your route list.");
        }

        Shop shop = Shop.builder()
                .shopName(request.getShopName().trim())
                .ownerName(request.getOwnerName().trim())
                .phoneNumber(cleanPhone)
                .village(request.getVillage().trim())
                .route(request.getRoute().trim())
                .address(request.getAddress())
                .gstNumber(request.getGstNumber())
                .outstandingBalance(request.getInitialOutstandingBalance() != null ? request.getInitialOutstandingBalance() : BigDecimal.ZERO)
                .createdBy(currentUser)
                .build();

        return mapToResponse(shopRepository.save(shop));
    }

    @Transactional
    public ShopResponse updateShop(Long id, ShopRequest request, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + id));

        verifyOwnership(shop, currentUser);

        shop.setShopName(request.getShopName().trim());
        shop.setOwnerName(request.getOwnerName().trim());
        shop.setVillage(request.getVillage().trim());
        shop.setRoute(request.getRoute().trim());
        shop.setAddress(request.getAddress());
        shop.setGstNumber(request.getGstNumber());

        return mapToResponse(shopRepository.save(shop));
    }

    @Transactional(readOnly = true)
    public KhataStatementResponse getShopKhataStatement(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + shopId));

        List<Invoice> invoices = invoiceRepository.findByShopOrderByCreatedAtDesc(shop);
        List<PaymentRecord> payments = paymentRecordRepository.findByShopOrderByCreatedAtDesc(shop);

        BigDecimal totalBilled = invoices.stream()
                .map(Invoice::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPaid = invoices.stream()
                .map(Invoice::getAmountPaid)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(payments.stream().map(PaymentRecord::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add));

        List<InvoiceResponse> invoiceResponses = invoices.stream()
                .map(this::mapInvoiceToResponse)
                .collect(Collectors.toList());

        List<PaymentRecordResponse> paymentResponses = payments.stream()
                .map(this::mapPaymentToResponse)
                .collect(Collectors.toList());

        return KhataStatementResponse.builder()
                .shop(mapToResponse(shop))
                .currentOutstandingBalance(shop.getOutstandingBalance())
                .totalBilledAmount(totalBilled)
                .totalPaidAmount(totalPaid)
                .invoices(invoiceResponses)
                .payments(paymentResponses)
                .build();
    }

    public ShopResponse mapToResponse(Shop s) {
        return ShopResponse.builder()
                .id(s.getId())
                .shopName(s.getShopName())
                .ownerName(s.getOwnerName())
                .phoneNumber(s.getPhoneNumber())
                .village(s.getVillage())
                .route(s.getRoute())
                .address(s.getAddress())
                .gstNumber(s.getGstNumber())
                .outstandingBalance(s.getOutstandingBalance())
                .ownerUserId(s.getOwner() != null ? s.getOwner().getId() : null)
                .createdAt(s.getCreatedAt())
                .build();
    }

    private InvoiceResponse mapInvoiceToResponse(Invoice inv) {
        List<InvoiceItemResponse> itemResponses = inv.getItems().stream()
                .map(item -> InvoiceItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productSku(item.getProduct().getSku())
                        .productName(item.getProduct().getName())
                        .boxesCount(item.getBoxesCount())
                        .looseDozens(item.getLooseDozens())
                        .totalDozens(item.getTotalDozens())
                        .pricePerDozen(item.getPricePerDozen())
                        .subtotal(item.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        return InvoiceResponse.builder()
                .id(inv.getId())
                .invoiceNumber(inv.getInvoiceNumber())
                .shopId(inv.getShop().getId())
                .shopName(inv.getShop().getShopName())
                .ownerName(inv.getShop().getOwnerName())
                .village(inv.getShop().getVillage())
                .route(inv.getShop().getRoute())
                .shopPhoneNumber(inv.getShop().getPhoneNumber())
                .sellerId(inv.getSeller() != null ? inv.getSeller().getId() : null)
                .sellerName(inv.getSeller() != null ? inv.getSeller().getFullName() : "Van Distributor")
                .totalAmount(inv.getTotalAmount())
                .amountPaid(inv.getAmountPaid())
                .balanceDue(inv.getBalanceDue())
                .paymentStatus(inv.getPaymentStatus())
                .paymentMode(inv.getPaymentMode())
                .notes(inv.getNotes())
                .items(itemResponses)
                .createdAt(inv.getCreatedAt())
                .build();
    }

    private PaymentRecordResponse mapPaymentToResponse(PaymentRecord p) {
        return PaymentRecordResponse.builder()
                .id(p.getId())
                .shopId(p.getShop().getId())
                .shopName(p.getShop().getShopName())
                .village(p.getShop().getVillage())
                .recordedByUserId(p.getRecordedBy() != null ? p.getRecordedBy().getId() : null)
                .recordedByName(p.getRecordedBy() != null ? p.getRecordedBy().getFullName() : "System")
                .amount(p.getAmount())
                .paymentMode(p.getPaymentMode())
                .transactionReference(p.getTransactionReference())
                .notes(p.getNotes())
                .previousBalance(p.getPreviousBalance())
                .remainingBalance(p.getRemainingBalance())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private User getCurrentUser(String phone) {
        return userRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new UnauthorizedException("User not authenticated"));
    }

    private void verifyOwnership(Shop shop, User currentUser) {
        if (currentUser.getRole() == Role.ROLE_ADMIN) return;
        if (shop.getCreatedBy() != null && !shop.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You do not have permission to modify this shop.");
        }
    }
}
