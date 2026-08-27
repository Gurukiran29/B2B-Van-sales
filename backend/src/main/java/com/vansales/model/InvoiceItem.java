package com.vansales.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer boxesCount;

    @Column(nullable = false)
    private Integer looseDozens;

    @Column(nullable = false)
    private Integer totalDozens;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerDozen;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;
}
