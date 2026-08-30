package com.vansales;

import com.vansales.dto.*;
import com.vansales.exception.InsufficientStockException;
import com.vansales.model.*;
import com.vansales.repository.ProductRepository;
import com.vansales.repository.ShopRepository;
import com.vansales.repository.UserRepository;
import com.vansales.service.AdminService;
import com.vansales.service.BillingService;
import com.vansales.service.ProductService;
import com.vansales.service.ShopService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class VanSalesApplicationTests {

    @Autowired
    private BillingService billingService;

    @Autowired
    private ProductService productService;

    @Autowired
    private ShopService shopService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Shop testShop;
    private Product testProduct;
    private User testSeller;
    private User testSeller2;
    private User testAdmin;

    @BeforeEach
    public void setup() {
        testSeller = userRepository.findByPhoneNumber("9990001111").orElseGet(() -> {
            User seller = User.builder()
                    .phoneNumber("9990001111")
                    .password(passwordEncoder.encode("secret123"))
                    .fullName("Mallu Distributor")
                    .role(Role.ROLE_SELLER)
                    .build();
            return userRepository.save(seller);
        });

        testSeller2 = userRepository.findByPhoneNumber("9990002222").orElseGet(() -> {
            User seller2 = User.builder()
                    .phoneNumber("9990002222")
                    .password(passwordEncoder.encode("secret456"))
                    .fullName("New Guy Distributor")
                    .role(Role.ROLE_SELLER)
                    .build();
            return userRepository.save(seller2);
        });

        testAdmin = userRepository.findByPhoneNumber("9999999999").orElseGet(() -> {
            User admin = User.builder()
                    .phoneNumber("9999999999")
                    .password(passwordEncoder.encode("adminpass"))
                    .fullName("System Administrator")
                    .role(Role.ROLE_ADMIN)
                    .build();
            return userRepository.save(admin);
        });

        testShop = shopRepository.findByPhoneNumberAndCreatedBy("9990003333", testSeller).orElseGet(() -> {
            Shop shop = Shop.builder()
                    .shopName("Mallu Kirana Store")
                    .ownerName("Mallu Owner")
                    .phoneNumber("9990003333")
                    .village("Mallu Village")
                    .route("Mallu Route")
                    .outstandingBalance(new BigDecimal("1500.00"))
                    .createdBy(testSeller)
                    .build();
            return shopRepository.save(shop);
        });

        testProduct = productRepository.findBySkuAndCreatedBy("MALLU-PARLE-G", testSeller).orElseGet(() -> {
            Product product = Product.builder()
                    .sku("MALLU-PARLE-G")
                    .name("Mallu Parle-G Biscuits")
                    .category("Biscuits")
                    .dozensPerBox(10)
                    .pricePerDozen(new BigDecimal("200.00"))
                    .stockInDozens(100)
                    .createdBy(testSeller)
                    .build();
            return productRepository.save(product);
        });
    }

    @Test
    @DisplayName("Verify User Data Isolation between Mallu and New Guy")
    public void testUserDataIsolation() {
        // 1. Mallu's view: should see his product and his shop
        List<ProductResponse> malluProducts = productService.getAllProducts("ALL", testSeller.getPhoneNumber());
        List<ShopResponse> malluShops = shopService.getAllShops("ALL", "ALL", testSeller.getPhoneNumber());

        assertEquals(1, malluProducts.size(), "Mallu should see 1 product");
        assertEquals("MALLU-PARLE-G", malluProducts.get(0).getSku());
        assertEquals(1, malluShops.size(), "Mallu should see 1 shop");
        assertEquals("Mallu Kirana Store", malluShops.get(0).getShopName());

        // 2. New Guy's view: should see ZERO products and ZERO shops
        List<ProductResponse> newGuyProducts = productService.getAllProducts("ALL", testSeller2.getPhoneNumber());
        List<ShopResponse> newGuyShops = shopService.getAllShops("ALL", "ALL", testSeller2.getPhoneNumber());

        assertEquals(0, newGuyProducts.size(), "New Guy must start with 0 products (zero data leakage)");
        assertEquals(0, newGuyShops.size(), "New Guy must start with 0 shops (zero data leakage)");

        // 3. New Guy adds his own product and shop
        ProductRequest newProductReq = new ProductRequest();
        newProductReq.setSku("GOOD-DAY-100");
        newProductReq.setName("Good Day Butter");
        newProductReq.setCategory("Cookies");
        newProductReq.setDozensPerBox(12);
        newProductReq.setPricePerDozen(new BigDecimal("240.00"));
        newProductReq.setStockInDozens(50);
        productService.createProduct(newProductReq, testSeller2.getPhoneNumber());

        ShopRequest newShopReq = new ShopRequest();
        newShopReq.setShopName("New Guy Fresh Mart");
        newShopReq.setOwnerName("Fresh Owner");
        newShopReq.setPhoneNumber("9998887777");
        newShopReq.setVillage("Green Valley");
        newShopReq.setRoute("Route B");
        shopService.createShop(newShopReq, testSeller2.getPhoneNumber());

        // 4. Verify New Guy sees ONLY his own product/shop, and Mallu still sees ONLY his own
        List<ProductResponse> newGuyProductsAfter = productService.getAllProducts("ALL", testSeller2.getPhoneNumber());
        assertEquals(1, newGuyProductsAfter.size());
        assertEquals("GOOD-DAY-100", newGuyProductsAfter.get(0).getSku());

        List<ProductResponse> malluProductsAfter = productService.getAllProducts("ALL", testSeller.getPhoneNumber());
        assertEquals(1, malluProductsAfter.size());
        assertEquals("MALLU-PARLE-G", malluProductsAfter.get(0).getSku());
    }

    @Test
    @DisplayName("Dual-Unit Stock Deduction & Invoice Math")
    public void testDualUnitBillingCalculationAndStockDeduction() {
        int initialStock = testProduct.getStockInDozens();
        BigDecimal initialShopBalance = testShop.getOutstandingBalance();
        BigDecimal pricePerDozen = testProduct.getPricePerDozen();
        int dozensPerBox = testProduct.getDozensPerBox();

        int boxesCount = 2;
        int looseDozens = 3;
        int totalDozens = (boxesCount * dozensPerBox) + looseDozens;
        BigDecimal expectedTotal = pricePerDozen.multiply(BigDecimal.valueOf(totalDozens));
        BigDecimal amountPaid = new BigDecimal("1600.00");
        BigDecimal expectedBalanceDue = expectedTotal.subtract(amountPaid);

        InvoiceItemRequest itemReq = new InvoiceItemRequest();
        itemReq.setProductId(testProduct.getId());
        itemReq.setBoxesCount(boxesCount);
        itemReq.setLooseDozens(looseDozens);

        InvoiceRequest invoiceReq = new InvoiceRequest();
        invoiceReq.setShopId(testShop.getId());
        invoiceReq.setItems(Collections.singletonList(itemReq));
        invoiceReq.setAmountPaid(amountPaid);
        invoiceReq.setPaymentMode(PaymentMode.CASH);
        invoiceReq.setNotes("Dynamic POS Bill");

        InvoiceResponse response = billingService.createInvoice(invoiceReq, testSeller.getPhoneNumber());

        assertNotNull(response);
        assertEquals(0, expectedTotal.compareTo(response.getTotalAmount()), "Invoice total must match formula");
        assertEquals(0, amountPaid.compareTo(response.getAmountPaid()), "Amount paid must match");
        assertEquals(0, expectedBalanceDue.compareTo(response.getBalanceDue()), "Balance due must match");

        Product updatedProduct = productRepository.findById(testProduct.getId()).orElseThrow();
        assertEquals(initialStock - totalDozens, updatedProduct.getStockInDozens(), "Van stock in dozens must decrement atomically");

        Shop updatedShop = shopRepository.findById(testShop.getId()).orElseThrow();
        assertEquals(0, initialShopBalance.add(expectedBalanceDue).compareTo(updatedShop.getOutstandingBalance()),
                "Shop Khata outstanding credit must increase by balance due");
    }

    @Test
    @DisplayName("Insufficient Stock Exception should be thrown when billing exceeds van inventory")
    public void testInsufficientStockException() {
        int availableStock = testProduct.getStockInDozens();
        int excessiveBoxes = (availableStock / testProduct.getDozensPerBox()) + 5;

        InvoiceItemRequest itemReq = new InvoiceItemRequest();
        itemReq.setProductId(testProduct.getId());
        itemReq.setBoxesCount(excessiveBoxes);
        itemReq.setLooseDozens(0);

        InvoiceRequest invoiceReq = new InvoiceRequest();
        invoiceReq.setShopId(testShop.getId());
        invoiceReq.setItems(Collections.singletonList(itemReq));
        invoiceReq.setAmountPaid(BigDecimal.ZERO);
        invoiceReq.setPaymentMode(PaymentMode.CREDIT);

        assertThrows(InsufficientStockException.class, () -> {
            billingService.createInvoice(invoiceReq, testSeller.getPhoneNumber());
        });
    }

    @Test
    @DisplayName("Admin Fraud Control: Inspect Users, System Stats & Remove Fraudulent Account")
    public void testAdminFraudControlWorkflow() {
        User fraudUser = User.builder()
                .phoneNumber("9999990001")
                .password(passwordEncoder.encode("fraud123"))
                .fullName("Fraudulent Driver")
                .role(Role.ROLE_SELLER)
                .build();
        fraudUser = userRepository.save(fraudUser);

        List<AdminUserResponse> users = adminService.getAllUsers("ROLE_SELLER");
        assertTrue(users.stream().anyMatch(u -> u.getPhoneNumber().equals("9999990001")),
                "Admin user list should contain the newly registered seller");

        AdminStatsResponse stats = adminService.getSystemStats();
        assertTrue(stats.getTotalUsers() >= 2, "System stats should report all registered users");

        adminService.deleteFraudUser(fraudUser.getId(), testAdmin.getPhoneNumber());

        assertFalse(userRepository.existsById(fraudUser.getId()),
                "Fraudulent user account must be completely purged from database");
    }
}
