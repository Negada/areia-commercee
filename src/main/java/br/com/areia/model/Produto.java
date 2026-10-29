package br.com.areia.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "produtos")
public class Produto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String nome;
    @Column(length = 500)
    private String descricao;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal preco;
    @Column(length = 500)
    private String imagem;
    @Column(nullable = false)
    private Long vendedorId;

    public Produto() {}
    public Produto(String nome, String descricao, BigDecimal preco, String imagem, Long vendedorId) {
        this.nome = nome; this.descricao = descricao; this.preco = preco; this.imagem = imagem; this.vendedorId = vendedorId;
    }
    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getDescricao() { return descricao; }
    public BigDecimal getPreco() { return preco; }
    public String getImagem() { return imagem; }
    public Long getVendedorId() { return vendedorId; }
}
