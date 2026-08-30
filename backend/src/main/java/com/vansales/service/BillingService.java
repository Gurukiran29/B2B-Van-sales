package com.vansales.service;

import com.vansales.dto.InvoiceItemRequest;
import com.vansales.dto.InvoiceItemResponse;
import com.vansales.dto.InvoiceRequest;
import com.vansales.dto.InvoiceResponse;
import com.vansales.exception.BadRequestException;
import com.vansales.exception.InsufficientStockException;
import com.vansales.exception.ResourceNotFoundException;
import com.vansales.exception.UnauthorizedException;
import com.vansales.model.*;
import com.vansales.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final PaymentRecordRepository paymentRecordRepository;

    @Transactional
    public InvoiceResponse createInvoice(InvoiceRequest request, String currentUserPhone) {
        User seller = userRepository.findByPhoneNumber(currentUserPhone)
                .orElseThrow(() -> new UnauthorizedException("User not authenticated"));

        Shop shop = shopRepository.findById(request.getShopId())
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + request.getShopId()));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Invoice must contain at least one item");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<InvoiceItem> invoiceItems = new ArrayList<>();

        for (InvoiceItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemReq.getProductId()));

            int boxes = itemReq.getBoxesCount() != null ? itemReq.getBoxesCount() : 0;
            int loose = itemReq.getLooseDozens() != null ? itemReq.getLooseDozens() : 0;
            int totalDozensToDeduct = (boxes * product.getDozensPerBox()) + loose;

            if (totalDozensToDeduct <= 0) {
                continue;
            }

            // Deduct strictly from Van Stock
            if (product.getStockInDozens() < totalDozensToDeduct) {
                throw new InsufficientStockException(
                        String.format("Insufficient Van stock for %s. Requested: %d dozens, Available in Van: %d dozens. Please load stock from Godown first!",
                                product.getName(), totalDozensToDeduct, product.getStockInDozens())
                );
            }

            product.setStockInDozens(product.getStockInDozens() - totalDozensToDeduct);
            productRepository.save(product);

            // Calculate pricing: if whole boxes, apply box offer price; loose dozens at pricePerDozen
            BigDecimal boxesPrice = product.getEffectiveBoxPrice().multiply(BigDecimal.valueOf(boxes));
            BigDecimal loosePrice = product.getPricePerDozen().multiply(BigDecimal.valueOf(loose));
            BigDecimal itemSubtotal = boxesPrice.add(loosePrice);

            totalAmount = totalAmount.add(itemSubtotal);

            InvoiceItem invoiceItem = InvoiceItem.builder()
                    .product(product)
                    .boxesCount(boxes)
                    .looseDozens(loose)
                    .totalDozens(totalDozensToDeduct)
                    .pricePerDozen(product.getPricePerDozen())
                    .subtotal(itemSubtotal)
                    .build();

            invoiceItems.add(invoiceItem);
        }

        if (invoiceItems.isEmpty()) {
            throw new BadRequestException("No valid items with quantity > 0 in invoice");
        }

        BigDecimal amountPaid = request.getAmountPaid() != null ? request.getAmountPaid() : BigDecimal.ZERO;
        if (amountPaid.compareTo(totalAmount) > 0) {
            amountPaid = totalAmount;
        }

        BigDecimal balanceDue = totalAmount.subtract(amountPaid);

        PaymentStatus paymentStatus;
        if (amountPaid.compareTo(BigDecimal.ZERO) == 0) {
            paymentStatus = PaymentStatus.UNPAID;
        } else if (amountPaid.compareTo(totalAmount) >= 0) {
            paymentStatus = PaymentStatus.PAID;
        } else {
            paymentStatus = PaymentStatus.PARTIAL;
        }

        PaymentMode paymentMode = request.getPaymentMode() != null ? request.getPaymentMode() : PaymentMode.CASH;

        String invoiceNumber = generateInvoiceNumber();

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .shop(shop)
                .seller(seller)
                .totalAmount(totalAmount)
                .amountPaid(amountPaid)
                .balanceDue(balanceDue)
                .paymentStatus(paymentStatus)
                .paymentMode(paymentMode)
                .notes(request.getNotes())
                .items(new ArrayList<>())
                .build();

        Invoice savedInvoice = invoiceRepository.save(invoice);

        for (InvoiceItem item : invoiceItems) {
            item.setInvoice(savedInvoice);
            savedInvoice.getItems().add(invoiceItemRepository.save(item));
        }

        BigDecimal currentShopBalance = shop.getOutstandingBalance() != null ? shop.getOutstandingBalance() : BigDecimal.ZERO;
        BigDecimal newShopBalance = currentShopBalance.add(balanceDue);
        shop.setOutstandingBalance(newShopBalance);
        shopRepository.save(shop);

        if (amountPaid.compareTo(BigDecimal.ZERO) > 0) {
            PaymentRecord paymentRecord = PaymentRecord.builder()
                    .shop(shop)
                    .amount(amountPaid)
                    .paymentMode(paymentMode)
                    .previousBalance(currentShopBalance.add(totalAmount))
                    .remainingBalance(newShopBalance)
                    .recordedBy(seller)
                    .notes("Invoice #" + invoiceNumber + " Spot Collection")
                    .build();
            paymentRecordRepository.save(paymentRecord);
        }

        return mapToResponse(savedInvoice);
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getAllInvoices() {
        return invoiceRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getAllInvoices(Long shopId, String currentUserPhone) {
        User currentUser = userRepository.findByPhoneNumber(currentUserPhone)
                .orElseThrow(() -> new UnauthorizedException("User not authenticated"));

        List<Invoice> invoices;
        if (currentUser.getRole() == Role.ROLE_BUYER) {
            Shop buyerShop = currentUser.getShop();
            if (buyerShop == null) {
                return Collections.emptyList();
            }
            invoices = invoiceRepository.findByShopIdOrderByCreatedAtDesc(buyerShop.getId());
        } else if (shopId != null) {
            invoices = invoiceRepository.findByShopIdOrderByCreatedAtDesc(shopId);
        } else {
            invoices = invoiceRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        return invoices.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoicesByShopId(Long shopId) {
        return invoiceRepository.findByShopIdOrderByCreatedAtDesc(shopId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long id) {
        Invoice invoice = invoiceRepository.findByIdWithItems(id)
                .or(() -> invoiceRepository.findById(id))
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));
        return mapToResponse(invoice);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByNumber(String invoiceNumber) {
        Invoice invoice = invoiceRepository.findByInvoiceNumberWithItems(invoiceNumber)
                .or(() -> invoiceRepository.findByInvoiceNumber(invoiceNumber))
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with invoice number: " + invoiceNumber));
        return mapToResponse(invoice);
    }

    private InvoiceResponse mapToResponse(Invoice invoice) {
        List<InvoiceItemResponse> itemResponses = new ArrayList<>();
        if (invoice.getItems() != null) {
            for (InvoiceItem item : invoice.getItems()) {
                itemResponses.add(InvoiceItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                        .productSku(item.getProduct() != null ? item.getProduct().getSku() : "N/A")
                        .productName(item.getProduct() != null ? item.getProduct().getName() : "Unknown Item")
                        .boxesCount(item.getBoxesCount())
                        .looseDozens(item.getLooseDozens())
                        .totalDozens(item.getTotalDozens())
                        .pricePerDozen(item.getPricePerDozen())
                        .subtotal(item.getSubtotal())
                        .build());
            }
        }

        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .shopId(invoice.getShop().getId())
                .shopName(invoice.getShop().getShopName())
                .village(invoice.getShop().getVillage())
                .ownerName(invoice.getShop().getOwnerName())
                .sellerName(invoice.getSeller() != null ? invoice.getSeller().getFullName() : "N/A")
                .totalAmount(invoice.getTotalAmount())
                .amountPaid(invoice.getAmountPaid())
                .balanceDue(invoice.getBalanceDue())
                .paymentStatus(invoice.getPaymentStatus())
                .paymentMode(invoice.getPaymentMode())
                .notes(invoice.getNotes())
                .createdAt(invoice.getCreatedAt())
                .items(itemResponses)
                .build();
    }

    private String generateInvoiceNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "INV-" + datePart + "-" + randomPart;
    }
}
