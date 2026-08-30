package com.vansales.service;

import com.vansales.dto.ProductRequest;
import com.vansales.dto.ProductResponse;
import com.vansales.dto.StockAdjustmentRequest;
import com.vansales.dto.StockTransferRequest;
import com.vansales.exception.BadRequestException;
import com.vansales.exception.ResourceNotFoundException;
import com.vansales.exception.UnauthorizedException;
import com.vansales.model.Product;
import com.vansales.model.Role;
import com.vansales.model.Shop;
import com.vansales.model.User;
import com.vansales.repository.ProductRepository;
import com.vansales.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts(String category, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        User sellerTarget = resolveDistributorForUser(currentUser);

        if (sellerTarget == null && currentUser.getRole() != Role.ROLE_ADMIN) {
            return Collections.emptyList();
        }

        List<Product> products;
        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            if (category != null && !category.equalsIgnoreCase("ALL")) {
                products = productRepository.findByCategoryIgnoreCase(category);
            } else {
                products = productRepository.findAll();
            }
        } else {
            if (category != null && !category.equalsIgnoreCase("ALL")) {
                products = productRepository.findByCreatedByAndCategoryIgnoreCase(sellerTarget, category);
            } else {
                products = productRepository.findByCreatedBy(sellerTarget);
            }
        }

        return products.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        return mapToResponse(product);
    }

    @Transactional(readOnly = true)
    public List<String> getCategories(String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        User sellerTarget = resolveDistributorForUser(currentUser);

        if (sellerTarget == null && currentUser.getRole() != Role.ROLE_ADMIN) {
            return Collections.emptyList();
        }

        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            return productRepository.findDistinctCategories();
        } else {
            return productRepository.findDistinctCategoriesByCreatedBy(sellerTarget);
        }
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);

        // Dozens per box is optional - defaults to 1 for direct boxes (e.g. chocolate boxes)
        int dozensPerBox = (request.getDozensPerBox() != null && request.getDozensPerBox() > 0) 
                ? request.getDozensPerBox() 
                : 1;

        String cleanSku = request.getSku();
        if (cleanSku == null || cleanSku.trim().isEmpty()) {
            String sanitized = request.getName().replaceAll("[^a-zA-Z0-9]", "-").toUpperCase();
            cleanSku = sanitized + "-" + (System.currentTimeMillis() % 10000);
        } else {
            cleanSku = cleanSku.trim().toUpperCase();
        }

        // Godown Stock (in dozens/units)
        int godownBoxes = request.getGodownStockBoxes() != null ? request.getGodownStockBoxes() : 0;
        int godownLoose = request.getGodownStockLooseDozens() != null ? request.getGodownStockLooseDozens() : 0;
        int initialGodownDozens = (godownBoxes * dozensPerBox) + godownLoose;
        if (request.getGodownStockInDozens() != null && request.getGodownStockInDozens() > 0) {
            initialGodownDozens = request.getGodownStockInDozens();
        }

        // Van Stock defaults to 0 on product creation
        int vanBoxes = request.getVanStockBoxes() != null ? request.getVanStockBoxes() : 0;
        int vanLoose = request.getVanStockLooseDozens() != null ? request.getVanStockLooseDozens() : 0;
        int initialVanDozens = (vanBoxes * dozensPerBox) + vanLoose;
        if (request.getStockInDozens() != null && request.getStockInDozens() > 0) {
            initialVanDozens = request.getStockInDozens();
        }

        if (initialGodownDozens < initialVanDozens) {
            initialGodownDozens = initialVanDozens;
        }

        int remainingGodownDozens = initialGodownDozens - initialVanDozens;

        BigDecimal purchasePriceBox = request.getPurchasePricePerBox() != null ? request.getPurchasePricePerBox() : BigDecimal.ZERO;
        
        // Flexible Pricing: resolve dozen price and box offer price
        BigDecimal wholesaleOffer = request.getWholesaleBoxOfferPrice();
        BigDecimal pricePerDozen = request.getPricePerDozen();

        if (wholesaleOffer == null || wholesaleOffer.compareTo(BigDecimal.ZERO) <= 0) {
            if (pricePerDozen != null && pricePerDozen.compareTo(BigDecimal.ZERO) > 0) {
                wholesaleOffer = pricePerDozen.multiply(BigDecimal.valueOf(dozensPerBox));
            } else {
                wholesaleOffer = BigDecimal.ZERO;
            }
        }

        if (pricePerDozen == null || pricePerDozen.compareTo(BigDecimal.ZERO) <= 0) {
            if (wholesaleOffer.compareTo(BigDecimal.ZERO) > 0) {
                pricePerDozen = wholesaleOffer.divide(BigDecimal.valueOf(dozensPerBox), 2, RoundingMode.HALF_UP);
            } else {
                pricePerDozen = BigDecimal.ZERO;
            }
        }

        Product product = Product.builder()
                .sku(cleanSku)
                .name(request.getName().trim())
                .category(request.getCategory().trim())
                .dozensPerBox(dozensPerBox)
                .purchasePricePerBox(purchasePriceBox)
                .pricePerDozen(pricePerDozen)
                .wholesaleBoxOfferPrice(wholesaleOffer)
                .godownStockInDozens(remainingGodownDozens)
                .stockInDozens(initialVanDozens)
                .imageUrl(request.getImageUrl())
                .description(request.getDescription())
                .createdBy(currentUser)
                .build();

        return mapToResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        verifyOwnership(product, currentUser);

        int dozensPerBox = (request.getDozensPerBox() != null && request.getDozensPerBox() > 0)
                ? request.getDozensPerBox()
                : (product.getDozensPerBox() != null ? product.getDozensPerBox() : 1);

        product.setName(request.getName().trim());
        product.setCategory(request.getCategory().trim());
        product.setDozensPerBox(dozensPerBox);

        if (request.getPurchasePricePerBox() != null) {
            product.setPurchasePricePerBox(request.getPurchasePricePerBox());
        }
        if (request.getWholesaleBoxOfferPrice() != null) {
            product.setWholesaleBoxOfferPrice(request.getWholesaleBoxOfferPrice());
        }
        if (request.getPricePerDozen() != null && request.getPricePerDozen().compareTo(BigDecimal.ZERO) > 0) {
            product.setPricePerDozen(request.getPricePerDozen());
        } else if (product.getWholesaleBoxOfferPrice() != null && product.getWholesaleBoxOfferPrice().compareTo(BigDecimal.ZERO) > 0) {
            product.setPricePerDozen(product.getWholesaleBoxOfferPrice().divide(BigDecimal.valueOf(dozensPerBox), 2, RoundingMode.HALF_UP));
        }

        if (request.getGodownStockInDozens() != null) {
            product.setGodownStockInDozens(request.getGodownStockInDozens());
        }
        if (request.getStockInDozens() != null) {
            product.setStockInDozens(request.getStockInDozens());
        }
        product.setImageUrl(request.getImageUrl());
        product.setDescription(request.getDescription());

        return mapToResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse transferStock(StockTransferRequest request, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        verifyOwnership(product, currentUser);

        int dozensPerBox = product.getDozensPerBox() != null && product.getDozensPerBox() > 0 ? product.getDozensPerBox() : 1;
        int currentGodown = product.getGodownStockInDozens() != null ? product.getGodownStockInDozens() : 0;
        int currentVan = product.getStockInDozens() != null ? product.getStockInDozens() : 0;

        int boxes = request.getBoxes() != null ? request.getBoxes() : 0;
        int loose = request.getLooseDozens() != null ? request.getLooseDozens() : 0;
        int deltaDozens = (boxes * dozensPerBox) + loose;

        String op = request.getOperation().toUpperCase();

        switch (op) {
            case "TRANSFER_TO_VAN" -> {
                if (currentGodown < deltaDozens) {
                    throw new BadRequestException(String.format(
                            "Cannot load Van: Insufficient Godown stock for %s! Available in Godown: %d boxes (%d total units), Requested to load: %d boxes (%d total units)",
                            product.getName(),
                            currentGodown / dozensPerBox,
                            currentGodown,
                            boxes,
                            deltaDozens
                    ));
                }
                product.setGodownStockInDozens(currentGodown - deltaDozens);
                product.setStockInDozens(currentVan + deltaDozens);
            }
            case "UNLOAD_TO_GODOWN" -> {
                if (currentVan < deltaDozens) {
                    throw new BadRequestException(String.format(
                            "Cannot unload from Van: Requested %d units exceeds available Van stock (%d units) for %s",
                            deltaDozens, currentVan, product.getName()
                    ));
                }
                product.setStockInDozens(currentVan - deltaDozens);
                product.setGodownStockInDozens(currentGodown + deltaDozens);
            }
            case "GODOWN_INWARD" -> {
                product.setGodownStockInDozens(currentGodown + deltaDozens);
            }
            case "SET_GODOWN" -> {
                product.setGodownStockInDozens(deltaDozens);
            }
            case "SET_VAN" -> {
                product.setStockInDozens(deltaDozens);
            }
            default -> throw new BadRequestException("Invalid stock operation: " + request.getOperation());
        }

        return mapToResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse adjustStock(StockAdjustmentRequest request, String currentUserPhone) {
        StockTransferRequest tr = new StockTransferRequest();
        tr.setProductId(request.getProductId());
        tr.setBoxes(request.getBoxes());
        tr.setLooseDozens(request.getLooseDozens());
        
        String op = request.getOperation().toUpperCase();
        if ("ADD".equals(op)) {
            tr.setOperation("GODOWN_INWARD");
        } else if ("SUBTRACT".equals(op)) {
            tr.setOperation("UNLOAD_TO_GODOWN");
        } else {
            tr.setOperation("SET_VAN");
        }
        return transferStock(tr, currentUserPhone);
    }

    @Transactional
    public void deleteProduct(Long id, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        verifyOwnership(product, currentUser);
        productRepository.delete(product);
    }

    public ProductResponse mapToResponse(Product p) {
        int vanStock = (p.getStockInDozens() != null) ? p.getStockInDozens() : 0;
        int godownStock = (p.getGodownStockInDozens() != null) ? p.getGodownStockInDozens() : 0;
        int dozensPerBox = (p.getDozensPerBox() != null && p.getDozensPerBox() > 0) ? p.getDozensPerBox() : 1;

        int vanFullBoxes = vanStock / dozensPerBox;
        int vanLoose = vanStock % dozensPerBox;

        int godownFullBoxes = godownStock / dozensPerBox;
        int godownLoose = godownStock % dozensPerBox;

        BigDecimal pricePerDozen = (p.getPricePerDozen() != null) ? p.getPricePerDozen() : BigDecimal.ZERO;
        BigDecimal purchasePricePerBox = (p.getPurchasePricePerBox() != null) ? p.getPurchasePricePerBox() : BigDecimal.ZERO;
        BigDecimal wholesaleBoxOfferPrice = (p.getWholesaleBoxOfferPrice() != null) ? p.getWholesaleBoxOfferPrice() : p.getBoxPrice();

        return ProductResponse.builder()
                .id(p.getId())
                .sku(p.getSku())
                .name(p.getName())
                .category(p.getCategory())
                .dozensPerBox(dozensPerBox)
                .purchasePricePerBox(purchasePricePerBox)
                .purchasePricePerDozen(p.getPurchasePricePerDozen())
                .pricePerDozen(pricePerDozen)
                .wholesaleBoxOfferPrice(wholesaleBoxOfferPrice)
                .boxPrice(p.getBoxPrice())
                .godownStockInDozens(godownStock)
                .godownFullBoxes(godownFullBoxes)
                .godownRemainingLooseDozens(godownLoose)
                .stockInDozens(vanStock)
                .vanFullBoxes(vanFullBoxes)
                .vanRemainingLooseDozens(vanLoose)
                .fullBoxesInStock(vanFullBoxes)
                .remainingLooseDozens(vanLoose)
                .imageUrl(p.getImageUrl())
                .description(p.getDescription())
                .build();
    }

    private User getCurrentUser(String phone) {
        return userRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new UnauthorizedException("User not authenticated"));
    }

    private User resolveDistributorForUser(User user) {
        if (user.getRole() == Role.ROLE_SELLER) {
            return user;
        } else if (user.getRole() == Role.ROLE_BUYER) {
            Shop shop = user.getShop();
            if (shop != null && shop.getCreatedBy() != null) {
                return shop.getCreatedBy();
            }
            return null;
        }
        return null;
    }

    private void verifyOwnership(Product product, User currentUser) {
        if (currentUser.getRole() == Role.ROLE_ADMIN) return;
        if (product.getCreatedBy() != null && !product.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You do not have permission to modify this product.");
        }
    }
}
