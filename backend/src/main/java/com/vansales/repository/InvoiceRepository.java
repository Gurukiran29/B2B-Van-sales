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
}
