package com.vansales.service;

import com.vansales.dto.InvoiceItemRequest;
import com.vansales.dto.InvoiceItemResponse;
import com.vansales.dto.InvoiceRequest;
import com.vansales.dto.InvoiceResponse;
import com.vansales.exception.BadRequestException;
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
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PaymentRecordRepository paymentRecordRepository;

    @Transactional
    public InvoiceResponse createInvoice(InvoiceRequest request, String sellerPhoneNumber) {
        Shop shop = shopRepository.findById(request.getShopId())
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + request.getShopId()));

        User seller = userRepository.findByPhoneNumber(sellerPhoneNumber)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with phone: " + sellerPhoneNumber));

        String invoiceNumber = generateInvoiceNumber();

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<InvoiceItem> invoiceItems = new ArrayList<>();

        for (InvoiceItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemReq.getProductId()));

            int dozensPerBox = (product.getDozensPerBox() != null && product.getDozensPerBox() > 0) ? product.getDozensPerBox() : 1;
            int boxes = itemReq.getBoxesCount() != null ? itemReq.getBoxesCount() : 0;
            int looseDozens = itemReq.getLooseDozens() != null ? itemReq.getLooseDozens() : 0;
            int requestedDozens = (boxes * dozensPerBox) + looseDozens;

            if (requestedDozens <= 0) {
                continue;
            }

            int currentVanStock = product.getStockInDozens() != null ? product.getStockInDozens() : 0;
            if (currentVanStock < requestedDozens) {
                        "Insufficient Van Stock for product %s! Available: %d units (%d boxes, %d loose), Requested: %d units (%d boxes, %d loose)",
                        product.getName(),
                        currentVanStock,
                        currentVanStock / dozensPerBox,
                        currentVanStock % dozensPerBox,
                        requestedDozens,
                        boxes,
                        looseDozens
                ));
            }

            // Deduct strictly from Van Stock
            product.setStockInDozens(currentVanStock - requestedDozens);
            productRepository.save(product);

            BigDecimal effectiveBoxPrice = product.getEffectiveBoxPrice();
            BigDecimal pricePerDozen = product.getPricePerDozen() != null ? product.getPricePerDozen() : BigDecimal.ZERO;

            BigDecimal boxTotal = effectiveBoxPrice.multiply(BigDecimal.valueOf(boxes));
            BigDecimal looseTotal = pricePerDozen.multiply(BigDecimal.valueOf(looseDozens));
            BigDecimal itemSubtotal = boxTotal.add(looseTotal);

            InvoiceItem invoiceItem = InvoiceItem.builder()
                    .product(product)
                    .boxesCount(boxes)
                    .looseDozens(looseDozens)
                    .totalDozens(requestedDozens)
                    .pricePerDozen(pricePerDozen)
                    .subtotal(itemSubtotal)
                    .build();

            invoiceItems.add(invoiceItem);
            totalAmount = totalAmount.add(itemSubtotal);
        }

        if (invoiceItems.isEmpty()) {
            throw new BadRequestException("Invoice must contain at least one product item with quantity > 0");
        }

        BigDecimal amountPaid = request.getAmountPaid() != null ? request.getAmountPaid() : BigDecimal.ZERO;
        PaymentMode paymentMode = request.getPaymentMode() != null ? request.getPaymentMode() : PaymentMode.CASH;

        if (amountPaid.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Amount paid cannot be negative");
        }

        BigDecimal balanceDue = totalAmount.subtract(amountPaid);
        PaymentStatus paymentStatus;

        if (balanceDue.compareTo(BigDecimal.ZERO) <= 0) {
            paymentStatus = PaymentStatus.PAID;
            balanceDue = BigDecimal.ZERO;
        } else if (amountPaid.compareTo(BigDecimal.ZERO) > 0) {
            paymentStatus = PaymentStatus.PARTIAL;
        } else {
            paymentStatus = PaymentStatus.UNPAID;
        }

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

        User sellerTarget = (currentUser.getRole() == Role.ROLE_SELLER) ? currentUser : null;

        List<Invoice> invoices;
        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            if (shopId != null) {
                invoices = invoiceRepository.findByShopIdOrderByCreatedAtDesc(shopId);
            } else {
                invoices = invoiceRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            }
        } else if (currentUser.getRole() == Role.ROLE_SELLER) {
            if (shopId != null) {
                invoices = invoiceRepository.findByShopIdOrderByCreatedAtDesc(shopId).stream()
                        .filter(inv -> inv.getSeller() != null && inv.getSeller().getId().equals(sellerTarget.getId()))
                        .collect(Collectors.toList());
            } else {
                invoices = invoiceRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                        .filter(inv -> inv.getSeller() != null && inv.getSeller().getId().equals(sellerTarget.getId()))
                        .collect(Collectors.toList());
            }
        } else if (currentUser.getRole() == Role.ROLE_BUYER) {
            Shop shop = currentUser.getShop();
            if (shop != null) {
                invoices = invoiceRepository.findByShopIdOrderByCreatedAtDesc(shop.getId());
            } else {
                invoices = Collections.emptyList();
            }
        } else {
            invoices = Collections.emptyList();
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

    @Transactional
    public void deleteInvoice(Long id, String currentUserPhone) {
        User currentUser = userRepository.findByPhoneNumber(currentUserPhone)
                .orElseThrow(() -> new UnauthorizedException("User not authenticated"));

        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));

        if (currentUser.getRole() != Role.ROLE_ADMIN) {
            if (invoice.getSeller() != null && !invoice.getSeller().getId().equals(currentUser.getId())) {
                throw new UnauthorizedException("You do not have permission to delete this invoice.");
            }
        }

        // Strict Safety Rule: Unpaid or Partially Paid bills CANNOT be deleted to protect Khata ledger integrity
        if (invoice.getBalanceDue() != null && invoice.getBalanceDue().compareTo(BigDecimal.ZERO) > 0) {
            throw new BadRequestException("Cannot delete unpaid bill #" + invoice.getInvoiceNumber() + 
                    "! This bill has an outstanding debt of ₹" + invoice.getBalanceDue() + 
                    ". Unpaid bills cannot be removed to preserve your Khata ledger integrity.");
        }

        if (invoice.getItems() != null) {
            invoiceItemRepository.deleteAll(invoice.getItems());
        }
        invoiceRepository.delete(invoice);
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

        Shop s = invoice.getShop();
        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .shopId(s.getId())
                .shopName(s.getShopName())
                .village(s.getVillage())
                .route(s.getRoute())
                .shopPhoneNumber(s.getPhoneNumber())
                .ownerName(s.getOwnerName())
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
