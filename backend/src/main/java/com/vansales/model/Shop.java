package com.vansales.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "shops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String shopName;

    @Column(nullable = false)
    private String ownerName;

    @Column(nullable = false, length = 15)
    private String phoneNumber;

    @Column(nullable = false)
    private String village;

    @Column(nullable = false)
    private String route;

    private String address;

    private String gstNumber;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal outstandingBalance = BigDecimal.ZERO;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
