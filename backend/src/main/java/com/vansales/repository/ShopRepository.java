package com.vansales.repository;

import com.vansales.model.Shop;
import com.vansales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {
    Optional<Shop> findByPhoneNumber(String phoneNumber);
    Optional<Shop> findByPhoneNumberAndCreatedBy(String phoneNumber, User createdBy);

    List<Shop> findByCreatedBy(User createdBy);
    List<Shop> findByCreatedByAndVillageIgnoreCase(User createdBy, String village);
    List<Shop> findByCreatedByAndRouteIgnoreCase(User createdBy, String route);

    @Query("SELECT DISTINCT s.village FROM Shop s WHERE s.createdBy = :user ORDER BY s.village")
    List<String> findDistinctVillagesByCreatedBy(@Param("user") User user);

    @Query("SELECT DISTINCT s.route FROM Shop s WHERE s.createdBy = :user ORDER BY s.route")
    List<String> findDistinctRoutesByCreatedBy(@Param("user") User user);

    List<Shop> findByVillageIgnoreCase(String village);
    List<Shop> findByRouteIgnoreCase(String route);

    @Query("SELECT DISTINCT s.village FROM Shop s ORDER BY s.village")
    List<String> findDistinctVillages();

    @Query("SELECT DISTINCT s.route FROM Shop s ORDER BY s.route")
    List<String> findDistinctRoutes();

    List<Shop> findByOutstandingBalanceGreaterThan(BigDecimal balance);
}
