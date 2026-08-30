package com.vansales.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    @Builder.Default
    private Integer dozensPerBox = 12;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal purchasePricePerBox = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal pricePerDozen = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal wholesaleBoxOfferPrice;

    @Column(nullable = false)
    @Builder.Default
    private Integer godownStockInDozens = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer stockInDozens = 0;

    private String imageUrl;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public BigDecimal getPurchasePricePerDozen() {
        if (purchasePricePerBox == null || dozensPerBox == null || dozensPerBox == 0) {
            return BigDecimal.ZERO;
        }
        return purchasePricePerBox.divide(BigDecimal.valueOf(dozensPerBox), 2, java.math.RoundingMode.HALF_UP);
    }

    public BigDecimal getEffectiveBoxPrice() {
        if (wholesaleBoxOfferPrice != null && wholesaleBoxOfferPrice.compareTo(BigDecimal.ZERO) > 0) {
            return wholesaleBoxOfferPrice;
        }
        if (pricePerDozen == null || dozensPerBox == null) return BigDecimal.ZERO;
        return pricePerDozen.multiply(BigDecimal.valueOf(dozensPerBox));
    }

    public BigDecimal getBoxPrice() {
        return getEffectiveBoxPrice();
    }
}
