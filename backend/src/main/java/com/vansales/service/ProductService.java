package com.vansales.service;

import com.vansales.dto.ProductRequest;
import com.vansales.dto.ProductResponse;
import com.vansales.dto.StockAdjustmentRequest;
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

    @Transactional(readOnly = true)
    public List<ProductResponse> getLowStockProducts(String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            return productRepository.findLowStockProducts().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        return productRepository.findLowStockProductsByCreatedBy(currentUser).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);

        String cleanSku = request.getSku().toUpperCase().trim();
        if (productRepository.findBySkuAndCreatedBy(cleanSku, currentUser).isPresent()) {
            throw new BadRequestException("Product with SKU '" + cleanSku + "' already exists in your van catalog.");
        }

        Product product = Product.builder()
                .sku(cleanSku)
                .name(request.getName().trim())
                .category(request.getCategory().trim())
                .dozensPerBox(request.getDozensPerBox())
                .pricePerDozen(request.getPricePerDozen())
                .stockInDozens(request.getStockInDozens() != null ? request.getStockInDozens() : 0)
                .minStockAlert(request.getMinStockAlert() != null ? request.getMinStockAlert() : 20)
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

        product.setName(request.getName().trim());
        product.setCategory(request.getCategory().trim());
        product.setDozensPerBox(request.getDozensPerBox());
        product.setPricePerDozen(request.getPricePerDozen());
        if (request.getStockInDozens() != null) {
            product.setStockInDozens(request.getStockInDozens());
        }
        if (request.getMinStockAlert() != null) {
            product.setMinStockAlert(request.getMinStockAlert());
        }
        product.setImageUrl(request.getImageUrl());
        product.setDescription(request.getDescription());

        return mapToResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse adjustStock(StockAdjustmentRequest request, String currentUserPhone) {
        User currentUser = getCurrentUser(currentUserPhone);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        verifyOwnership(product, currentUser);

        int boxes = request.getBoxes() != null ? request.getBoxes() : 0;
        int loose = request.getLooseDozens() != null ? request.getLooseDozens() : 0;
        int deltaDozens = (boxes * product.getDozensPerBox()) + loose;

        String op = request.getOperation().toUpperCase();
        if ("ADD".equals(op)) {
            product.setStockInDozens(product.getStockInDozens() + deltaDozens);
        } else if ("SUBTRACT".equals(op)) {
            int newStock = product.getStockInDozens() - deltaDozens;
            if (newStock < 0) {
                throw new BadRequestException("Cannot reduce stock below 0. Current: " + product.getStockInDozens() + " doz");
            }
            product.setStockInDozens(newStock);
        } else if ("SET".equals(op)) {
            product.setStockInDozens(deltaDozens);
        } else {
            throw new BadRequestException("Invalid stock operation: " + request.getOperation());
        }

        return mapToResponse(productRepository.save(product));
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
        int stock = p.getStockInDozens();
        int dozensPerBox = p.getDozensPerBox();
        int fullBoxes = dozensPerBox > 0 ? (stock / dozensPerBox) : 0;
        int remainingLoose = dozensPerBox > 0 ? (stock % dozensPerBox) : stock;

        return ProductResponse.builder()
                .id(p.getId())
                .sku(p.getSku())
                .name(p.getName())
                .category(p.getCategory())
                .dozensPerBox(p.getDozensPerBox())
                .pricePerDozen(p.getPricePerDozen())
                .boxPrice(p.getBoxPrice())
                .stockInDozens(p.getStockInDozens())
                .fullBoxesInStock(fullBoxes)
                .remainingLooseDozens(remainingLoose)
                .minStockAlert(p.getMinStockAlert())
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
            // If standalone buyer without explicit distributor, return null or fallback
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
