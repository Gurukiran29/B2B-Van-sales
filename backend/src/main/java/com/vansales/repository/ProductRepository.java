package com.vansales.repository;

import com.vansales.model.Product;
import com.vansales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    Optional<Product> findBySkuAndCreatedBy(String sku, User createdBy);
    
    List<Product> findByCreatedBy(User createdBy);
    List<Product> findByCreatedByAndCategoryIgnoreCase(User createdBy, String category);

    @Query("SELECT DISTINCT p.category FROM Product p WHERE p.createdBy = :user ORDER BY p.category")
    List<String> findDistinctCategoriesByCreatedBy(@Param("user") User user);

    @Query("SELECT p FROM Product p WHERE p.createdBy = :user AND p.stockInDozens <= p.minStockAlert")
    List<Product> findLowStockProductsByCreatedBy(@Param("user") User user);

    @Query("SELECT DISTINCT p.category FROM Product p ORDER BY p.category")
    List<String> findDistinctCategories();

    @Query("SELECT p FROM Product p WHERE p.stockInDozens <= p.minStockAlert")
    List<Product> findLowStockProducts();
}
