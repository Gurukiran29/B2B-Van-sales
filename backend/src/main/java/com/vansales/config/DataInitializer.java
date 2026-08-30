package com.vansales.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            // Drop NOT NULL constraint on min_stock_alert if it exists from older schema
            try {
                jdbcTemplate.execute("ALTER TABLE products ALTER COLUMN min_stock_alert DROP NOT NULL");
                jdbcTemplate.execute("ALTER TABLE products ALTER COLUMN min_stock_alert SET DEFAULT 0");
            } catch (Exception ignored) {
                // Column might already be nullable or handled
            }

            // Ensure all new columns exist in Neon PostgreSQL
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS godown_stock_in_dozens INTEGER DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price_per_box NUMERIC(10,2) DEFAULT 0.00");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_box_offer_price NUMERIC(10,2)");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_in_dozens INTEGER DEFAULT 0");
            
            jdbcTemplate.execute("UPDATE products SET godown_stock_in_dozens = 0 WHERE godown_stock_in_dozens IS NULL");
            jdbcTemplate.execute("UPDATE products SET stock_in_dozens = 0 WHERE stock_in_dozens IS NULL");
            jdbcTemplate.execute("UPDATE products SET purchase_price_per_box = 0 WHERE purchase_price_per_box IS NULL");
            jdbcTemplate.execute("UPDATE products SET wholesale_box_offer_price = price_per_dozen * dozens_per_box WHERE wholesale_box_offer_price IS NULL AND price_per_dozen IS NOT NULL AND dozens_per_box IS NOT NULL");
            
            log.info("Neon PostgreSQL schema migration and null-safety executed successfully.");
        } catch (Exception e) {
            log.warn("Database initialization notice: {}", e.getMessage());
        }
        log.info("VanSales Khata database initialized in persistent file-backed mode. Ready for dynamic user registrations.");
    }
}
