package br.com.areia.repository;

import br.com.areia.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    List<Produto> findAllByOrderByIdDesc();
    List<Produto> findByVendedorIdOrderByIdDesc(Long vendedorId);
}
