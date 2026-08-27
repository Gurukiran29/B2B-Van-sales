package com.vansales.service;

import com.vansales.dto.InvoiceItemRequest;
import com.vansales.dto.InvoiceItemResponse;
import com.vansales.dto.InvoiceRequest;
import com.vansales.dto.InvoiceResponse;
import com.vansales.exception.BadRequestException;
import com.vansales.exception.InsufficientStockException;
import com.vansales.exception.ResourceNotFoundException;
import com.vansales.model.*;
import com.vansales.repository.InvoiceRepository;
import com.vansales.repository.ProductRepository;
import com.vansales.repository.ShopRepository;
import com.vansales.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final InvoiceRepository invoiceRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    @Transactional
    public InvoiceResponse createInvoice(InvoiceRequest request, String currentPhoneNumber) {
        Shop shop = shopRepository.findById(request.getShopId())
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + request.getShopId()));

        User seller = userRepository.findByPhoneNumber(currentPhoneNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Seller not found with phone: " + currentPhoneNumber));

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

            if (product.getStockInDozens() < totalDozensToDeduct) {
                throw new InsufficientStockException(
                        String.format("Insufficient van stock for %s. Requested: %d dozens, Available in Van: %d dozens",
                                product.getName(), totalDozensToDeduct, product.getStockInDozens())
                );
            }

            product.setStockInDozens(product.getStockInDozens() - totalDozensToDeduct);
            productRepository.save(product);

            BigDecimal itemSubtotal = product.getPricePerDozen().multiply(BigDecimal.valueOf(totalDozensToDeduct));
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
            throw new BadRequestException("Cannot create an invoice with 0 items.");
        }

        BigDecimal amountPaid = request.getAmountPaid() != null ? request.getAmountPaid() : BigDecimal.ZERO;
        if (amountPaid.compareTo(totalAmount) > 0) {
            throw new BadRequestException("Amount paid cannot exceed total bill amount: ₹" + totalAmount);
        }

        BigDecimal balanceDue = totalAmount.subtract(amountPaid);

        PaymentStatus paymentStatus;
        if (balanceDue.compareTo(BigDecimal.ZERO) == 0) {
            paymentStatus = PaymentStatus.PAID;
        } else if (amountPaid.compareTo(BigDecimal.ZERO) > 0) {
            paymentStatus = PaymentStatus.PARTIAL;
        } else {
            paymentStatus = PaymentStatus.UNPAID;
        }

        shop.setOutstandingBalance(shop.getOutstandingBalance().add(balanceDue));
        shopRepository.save(shop);

        String invoiceNumber = generateInvoiceNumber();

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .shop(shop)
                .seller(seller)
                .totalAmount(totalAmount)
                .amountPaid(amountPaid)
                .balanceDue(balanceDue)
                .paymentStatus(paymentStatus)
                .paymentMode(request.getPaymentMode())
                .notes(request.getNotes())
                .build();

        for (InvoiceItem item : invoiceItems) {
            item.setInvoice(invoice);
        }
        invoice.setItems(invoiceItems);

        Invoice savedInvoice = invoiceRepository.save(invoice);
        InvoiceResponse response = mapToResponse(savedInvoice);
        response.setShopNewBalance(shop.getOutstandingBalance());
        return response;
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getAllInvoices() {
        return invoiceRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long id) {
        Invoice invoice = invoiceRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));
        return mapToResponse(invoice);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByNumber(String invoiceNumber) {
        Invoice invoice = invoiceRepository.findByInvoiceNumberWithItems(invoiceNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with number: " + invoiceNumber));
        return mapToResponse(invoice);
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoicesByShopId(Long shopId) {
        return invoiceRepository.findByShopIdOrderByCreatedAtDesc(shopId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private String generateInvoiceNumber() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        int random = 100 + new Random().nextInt(900);
        return "INV-" + timestamp + "-" + random;
    }

    public InvoiceResponse mapToResponse(Invoice inv) {
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
                .sellerName(inv.getSeller() != null ? inv.getSeller().getFullName() : "Van Lead")
                .totalAmount(inv.getTotalAmount())
                .amountPaid(inv.getAmountPaid())
                .balanceDue(inv.getBalanceDue())
                .paymentStatus(inv.getPaymentStatus())
                .paymentMode(inv.getPaymentMode())
                .notes(inv.getNotes())
                .items(itemResponses)
                .createdAt(inv.getCreatedAt())
                .shopNewBalance(inv.getShop().getOutstandingBalance())
                .build();
    }
}
