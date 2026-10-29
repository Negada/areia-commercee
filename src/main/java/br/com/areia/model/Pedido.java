package br.com.areia.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pedidos")
public class Pedido {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long clienteId;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;
    @Column(nullable = false, length = 30)
    private String status;
    @Column(nullable = false)
    private LocalDateTime criadoEm;

    public Pedido() {}
    public Pedido(Long clienteId, BigDecimal total) {
        this.clienteId = clienteId; this.total = total; this.status = "CONFIRMADO"; this.criadoEm = LocalDateTime.now();
    }
    public Long getId() { return id; }
    public Long getClienteId() { return clienteId; }
    public BigDecimal getTotal() { return total; }
    public String getStatus() { return status; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
}
