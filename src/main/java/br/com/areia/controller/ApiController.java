package br.com.areia.controller;

import br.com.areia.model.*;
import br.com.areia.repository.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final UsuarioRepository usuarios;
    private final ProdutoRepository produtos;
    private final PedidoRepository pedidos;
    private final PasswordEncoder encoder;

    public ApiController(
            UsuarioRepository usuarios,
            ProdutoRepository produtos,
            PedidoRepository pedidos,
            PasswordEncoder encoder) {

        this.usuarios = usuarios;
        this.produtos = produtos;
        this.pedidos = pedidos;
        this.encoder = encoder;
    }

    public record CadastroRequest(
            @NotBlank @Size(max = 100) String nome,
            @Email @NotBlank String email,
            @NotBlank @Size(min = 6, max = 100) String senha,
            @Pattern(regexp = "CLIENTE|VENDEDOR") String tipo) {
    }

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String senha) {
    }

    public record ProdutoRequest(
            @NotBlank @Size(max = 120) String nome,
            @Size(max = 500) String descricao,
            @NotNull @DecimalMin("0.01") BigDecimal preco,
            @Size(max = 500) String imagem,
            @NotNull Long vendedorId) {
    }

    public record ItemPedido(
            @NotNull Long produtoId,
            @Min(1) @Max(99) int quantidade) {
    }

    public record PedidoRequest(
            @NotNull Long clienteId,
            @NotEmpty List<@Valid ItemPedido> itens) {
    }

    @PostMapping("/cadastro")
    public ResponseEntity<?> cadastro(
            @Valid @RequestBody CadastroRequest req) {

        String email = req.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (usuarios.findByEmailIgnoreCase(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "erro",
                            "Este e-mail já está cadastrado."));
        }

        String tipo = "VENDEDOR".equals(req.tipo())
                ? "VENDEDOR"
                : "CLIENTE";

        Usuario usuario = usuarios.save(
                new Usuario(
                        req.nome().trim(),
                        email,
                        encoder.encode(req.senha()),
                        tipo));

        return ResponseEntity.ok(usuarioPublico(usuario));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest req) {

        String email = req.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        Optional<Usuario> encontrado =
                usuarios.findByEmailIgnoreCase(email);

        if (encontrado.isEmpty()
                || !encoder.matches(
                        req.senha(),
                        encontrado.get().getSenhaHash())) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "erro",
                            "E-mail ou senha incorretos."));
        }

        return ResponseEntity.ok(
                usuarioPublico(encontrado.get()));
    }

    @GetMapping("/produtos")
    public List<Produto> listarProdutos() {

        return produtos.findAllByOrderByIdDesc();
    }

    @PostMapping("/produtos")
    public ResponseEntity<?> criarProduto(
            @Valid @RequestBody ProdutoRequest req) {

        Optional<Usuario> vendedor =
                usuarios.findById(req.vendedorId());

        if (vendedor.isEmpty()
                || !"VENDEDOR".equals(
                        vendedor.get().getTipo())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "erro",
                            "Somente uma conta de vendedor pode adicionar produtos."));
        }

        Produto produto = produtos.save(
                new Produto(
                        req.nome().trim(),
                        req.descricao(),
                        req.preco(),
                        req.imagem(),
                        req.vendedorId()));

        return ResponseEntity.ok(produto);
    }

    @DeleteMapping("/produtos/{id}")
    public ResponseEntity<?> excluirProduto(
            @PathVariable Long id,
            @RequestParam Long vendedorId) {

        Optional<Produto> encontrado =
                produtos.findById(id);

        if (encontrado.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "erro",
                            "Produto não encontrado."));
        }

        Produto produto = encontrado.get();

        if (!Objects.equals(
                produto.getVendedorId(),
                vendedorId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "erro",
                            "Você só pode excluir seus próprios produtos."));
        }

        produtos.delete(produto);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/vendedores/{id}/produtos")
    public ResponseEntity<?> produtosVendedor(
            @PathVariable Long id) {

        Optional<Usuario> usuario =
                usuarios.findById(id);

        if (usuario.isEmpty()
                || !"VENDEDOR".equals(
                        usuario.get().getTipo())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "erro",
                            "Conta de vendedor não encontrada."));
        }

        return ResponseEntity.ok(
                produtos.findByVendedorIdOrderByIdDesc(id));
    }

    @PostMapping("/pedidos")
    public ResponseEntity<?> criarPedido(
            @Valid @RequestBody PedidoRequest req) {

        Optional<Usuario> cliente =
                usuarios.findById(req.clienteId());

        if (cliente.isEmpty()
                || !"CLIENTE".equals(
                        cliente.get().getTipo())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "erro",
                            "Entre com uma conta de cliente para comprar."));
        }

        BigDecimal total = BigDecimal.ZERO;

        for (ItemPedido item : req.itens()) {

            Optional<Produto> encontrado =
                    produtos.findById(item.produtoId());

            if (encontrado.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "erro",
                                "Um produto do carrinho não existe mais."));
            }

            Produto produto = encontrado.get();

            total = total.add(
                    produto.getPreco().multiply(
                            BigDecimal.valueOf(
                                    item.quantidade())));
        }

        Pedido pedido = pedidos.save(
                new Pedido(req.clienteId(), total));

        return ResponseEntity.ok(
                Map.of(
                        "id", pedido.getId(),
                        "total", pedido.getTotal(),
                        "status", pedido.getStatus(),
                        "criadoEm", pedido.getCriadoEm()));
    }

    @GetMapping("/clientes/{id}/pedidos")
    public ResponseEntity<?> listarPedidos(
            @PathVariable Long id) {

        Optional<Usuario> usuario =
                usuarios.findById(id);

        if (usuario.isEmpty()
                || !"CLIENTE".equals(
                        usuario.get().getTipo())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "erro",
                            "Conta de cliente não encontrada."));
        }

        return ResponseEntity.ok(
                pedidos.findByClienteIdOrderByIdDesc(id));
    }

    private Map<String, Object> usuarioPublico(
            Usuario usuario) {

        return Map.of(
                "id", usuario.getId(),
                "nome", usuario.getNome(),
                "email", usuario.getEmail(),
                "tipo", usuario.getTipo());
    }
}