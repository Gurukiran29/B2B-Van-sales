package com.vansales.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StockTransferRequest {
    @NotNull(message = "Product ID is required")
    private Long productId;

    private Integer boxes = 0;
    private Integer looseDozens = 0;

    // Operations:
    // "TRANSFER_TO_VAN"  -> Godown -= qty, Van += qty
    // "UNLOAD_TO_GODOWN" -> Van -= qty, Godown += qty
    // "GODOWN_INWARD"    -> Godown += qty (new purchase from agency)
    // "SET_GODOWN"       -> Godown = qty
    // "SET_VAN"          -> Van = qty
    @NotNull(message = "Operation is required")
    private String operation;
}
