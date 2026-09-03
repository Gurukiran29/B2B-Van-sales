package com.vansales.repository;

import com.vansales.model.Invoice;
import com.vansales.model.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByShopOrderByCreatedAtDesc(Shop shop);
    List<Invoice> findByShopIdOrderByCreatedAtDesc(Long shopId);
    List<Invoice> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.items WHERE i.id = :id")
    Optional<Invoice> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.items WHERE i.invoiceNumber = :invoiceNumber")
    Optional<Invoice> findByInvoiceNumberWithItems(@Param("invoiceNumber") String invoiceNumber);

    // Ultra-Fast JOIN FETCH queries (Eliminates N+1 latency over Neon DB)
    @Query("SELECT DISTINCT i FROM Invoice i " +
           "JOIN FETCH i.shop s " +
           "LEFT JOIN FETCH i.seller u " +
           "LEFT JOIN FETCH i.items it " +
           "LEFT JOIN FETCH it.product p " +
           "ORDER BY i.createdAt DESC")
    List<Invoice> findAllWithDetails();

    @Query("SELECT DISTINCT i FROM Invoice i " +
           "JOIN FETCH i.shop s " +
           "LEFT JOIN FETCH i.seller u " +
           "LEFT JOIN FETCH i.items it " +
           "LEFT JOIN FETCH it.product p " +
           "WHERE s.id = :shopId " +
           "ORDER BY i.createdAt DESC")
    List<Invoice> findByShopIdWithDetails(@Param("shopId") Long shopId);

    @Query("SELECT DISTINCT i FROM Invoice i " +
           "JOIN FETCH i.shop s " +
           "LEFT JOIN FETCH i.seller u " +
           "LEFT JOIN FETCH i.items it " +
           "LEFT JOIN FETCH it.product p " +
           "WHERE u.id = :sellerId " +
           "ORDER BY i.createdAt DESC")
    List<Invoice> findBySellerIdWithDetails(@Param("sellerId") Long sellerId);

    @Query("SELECT DISTINCT i FROM Invoice i " +
           "JOIN FETCH i.shop s " +
           "LEFT JOIN FETCH i.seller u " +
           "LEFT JOIN FETCH i.items it " +
           "LEFT JOIN FETCH it.product p " +
           "WHERE u.id = :sellerId AND s.id = :shopId " +
           "ORDER BY i.createdAt DESC")
    List<Invoice> findBySellerIdAndShopIdWithDetails(@Param("sellerId") Long sellerId, @Param("shopId") Long shopId);
}
