package br.com.areia.model;

import jakarta.persistence.*;

@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String nome;
    @Column(nullable = false, unique = true, length = 160)
    private String email;
    @Column(nullable = false)
    private String senhaHash;
    @Column(nullable = false, length = 20)
    private String tipo;

    public Usuario() {}
    public Usuario(String nome, String email, String senhaHash, String tipo) {
        this.nome = nome; this.email = email; this.senhaHash = senhaHash; this.tipo = tipo;
    }
    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getEmail() { return email; }
    public String getSenhaHash() { return senhaHash; }
    public String getTipo() { return tipo; }
}
