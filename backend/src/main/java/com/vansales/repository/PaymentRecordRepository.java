package com.vansales.repository;

import com.vansales.model.PaymentRecord;
import com.vansales.model.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, Long> {
    List<PaymentRecord> findByShopOrderByCreatedAtDesc(Shop shop);
    List<PaymentRecord> findByShopIdOrderByCreatedAtDesc(Long shopId);
    List<PaymentRecord> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);
}
