const API = "/api";

let usuario = JSON.parse(localStorage.getItem("areiaUsuario") || "null");
let carrinho = JSON.parse(localStorage.getItem("areiaCarrinho") || "[]");
let produtos = [];
let ultimoPedido = null;

const $ = (id) => document.getElementById(id);

const dinheiro = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(API + url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(opcoes.headers || {})
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            dados.erro || dados.message || "Não foi possível concluir a operação."
        );
    }

    return dados;
}

function mensagem(texto, erro = false) {
    const elemento = $("mensagem");

    if (elemento) {
        elemento.textContent = texto;
        elemento.className = erro ? "erro" : "ok";
    }

    let aviso = $("avisoGlobal");

    if (!aviso) {
        aviso = document.createElement("p");
        aviso.id = "avisoGlobal";
        aviso.setAttribute("role", "status");

        const cabecalho = document.querySelector("header");
        cabecalho.insertAdjacentElement("afterend", aviso);
    }

    aviso.textContent = texto;
    aviso.style.padding = "10px 20px";
    aviso.style.margin = "0";
    aviso.style.textAlign = "center";
    aviso.style.backgroundColor = erro ? "#ffe0e0" : "#e0f5e5";
    aviso.style.color = erro ? "#a00000" : "#176b36";

    clearTimeout(mensagem.temporizador);

    mensagem.temporizador = setTimeout(() => {
        aviso.textContent = "";
        aviso.style.padding = "0";
    }, 5000);
}

function abrirPagina(nome) {
    const paginas = [
        "loja",
        "conta",
        "vendedor",
        "compras",
        "carrinho",
        "confirmacao"
    ];

    if (nome === "produtos") {
        nome = "loja";
    }

    if (!paginas.includes(nome)) {
        nome = "loja";
    }

    if (nome === "vendedor") {
        if (!usuario || usuario.tipo !== "VENDEDOR") {
            mensagem("Entre com uma conta de vendedor para acessar essa área.", true);
            nome = "conta";
        }
    }

    if (nome === "compras") {
        if (!usuario || usuario.tipo !== "CLIENTE") {
            mensagem("Entre com uma conta de cliente para ver suas compras.", true);
            nome = "conta";
        }
    }

    if (nome === "carrinho" || nome === "confirmacao") {
        if (nome === "confirmacao" && !ultimoPedido) {
            mensagem("Você ainda não tem uma compra confirmada nesta sessão.", true);
            nome = "loja";
        }
    }

    paginas.forEach(pagina => {
        const secao = $("pagina-" + pagina);

        if (secao) {
            secao.classList.toggle("escondido", pagina !== nome);
        }
    });

    document.querySelectorAll(".link-menu").forEach(botao => {
        botao.classList.toggle("ativo", botao.dataset.pagina === nome);
    });

    if (nome === "vendedor") {
        carregarMeusProdutos();
    }

    if (nome === "compras") {
        carregarCompras();
    }

    if (nome === "carrinho") {
        renderCarrinho();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".link-menu").forEach(botao => {
    botao.addEventListener("click", () => {
        abrirPagina(botao.dataset.pagina);
    });
});

document.querySelectorAll("[data-ir]").forEach(botao => {
    botao.addEventListener("click", () => {
        abrirPagina(botao.dataset.ir);
    });
});

function salvarUsuario(novoUsuario) {
    usuario = novoUsuario;
    localStorage.setItem("areiaUsuario", JSON.stringify(usuario));

    atualizarConta();

    if (usuario.tipo === "VENDEDOR") {
        abrirPagina("vendedor");
    } else {
        abrirPagina("loja");
    }
}

function atualizarConta() {
    $("estadoConta").textContent = usuario
        ? `Conectado como ${usuario.nome} (${usuario.tipo.toLowerCase()}).`
        : "Entre ou crie sua conta para comprar.";

    $("sair").classList.toggle("escondido", !usuario);

    document.querySelectorAll(".link-menu").forEach(botao => {
        if (botao.dataset.pagina === "vendedor") {
            botao.disabled = !usuario || usuario.tipo !== "VENDEDOR";
        }

        if (botao.dataset.pagina === "compras") {
            botao.disabled = !usuario || usuario.tipo !== "CLIENTE";
        }
    });

    if (usuario?.tipo === "VENDEDOR") {
        carregarMeusProdutos();
    }

    if (usuario?.tipo === "CLIENTE") {
        carregarCompras();
    }
}

$("formCadastro").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    try {
        const novoUsuario = await requisicao("/cadastro", {
            method: "POST",
            body: JSON.stringify({
                nome: $("cadNome").value.trim(),
                email: $("cadEmail").value.trim(),
                senha: $("cadSenha").value,
                tipo: $("cadTipo").value
            })
        });

        salvarUsuario(novoUsuario);
        evento.target.reset();

        mensagem("Cadastro realizado com sucesso!");
    } catch (erro) {
        mensagem(erro.message, true);
    }
});

$("formLogin").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    try {
        const usuarioLogado = await requisicao("/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("loginEmail").value.trim(),
                senha: $("loginSenha").value
            })
        });

        salvarUsuario(usuarioLogado);
        evento.target.reset();

        mensagem("Login realizado com sucesso!");
    } catch (erro) {
        mensagem(erro.message, true);
    }
});

$("sair").addEventListener("click", () => {
    usuario = null;

    localStorage.removeItem("areiaUsuario");

    atualizarConta();
    abrirPagina("loja");

    mensagem("Você saiu da sua conta.");
});

async function carregarProdutos() {
    try {
        produtos = await requisicao("/produtos");

        renderProdutos();
        renderCarrinho();
    } catch (erro) {
        $("produtos").innerHTML =
            `<p>Não foi possível carregar os produtos: ${escapar(erro.message)}</p>`;
    }
}

function renderProdutos() {
    $("produtos").innerHTML = produtos.length
        ? produtos.map(produto => `
            <article class="produto">
                <img
                    src="${escapar(produto.imagem || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600")}"
                    alt="${escapar(produto.nome)}"
                    onerror="this.style.display='none'"
                >

                <div class="produto-conteudo">
                    <h3>${escapar(produto.nome)}</h3>

                    <p>${escapar(
                        produto.descricao || "Produto para aproveitar seu dia de praia."
                    )}</p>

                    <p class="preco">${dinheiro(produto.preco)}</p>

                    <button type="button" onclick="adicionar(${produto.id})">
                        Adicionar ao carrinho
                    </button>
                </div>
            </article>
        `).join("")
        : "<p>Ainda não há produtos cadastrados na loja.</p>";
}

window.adicionar = (id) => {
    const produto = produtos.find(item => item.id === id);

    if (!produto) {
        mensagem("Produto não encontrado.", true);
        return;
    }

    const item = carrinho.find(item => item.produtoId === id);

    if (item) {
        item.quantidade++;
    } else {
        carrinho.push({
            produtoId: id,
            quantidade: 1
        });
    }

    salvarCarrinho();
    mensagem("Produto adicionado ao carrinho!");
};

function salvarCarrinho() {
    localStorage.setItem("areiaCarrinho", JSON.stringify(carrinho));
    renderCarrinho();
}

function renderCarrinho() {
    const quantidade = carrinho.reduce(
        (total, item) => total + item.quantidade,
        0
    );

    $("quantidadeCarrinho").textContent = `Carrinho: ${quantidade}`;

    if (!carrinho.length) {
        $("itensCarrinho").innerHTML = "<p>Seu carrinho está vazio.</p>";
        return;
    }

    let total = 0;

    const itensHTML = carrinho.map(item => {
        const produto = produtos.find(p => p.id === item.produtoId);

        if (!produto) {
            return "";
        }

        const subtotal = Number(produto.preco) * item.quantidade;
        total += subtotal;

        return `
            <div class="linha-carrinho">
                <span>
                    ${escapar(produto.nome)} × ${item.quantidade}
                </span>

                <span>
                    ${dinheiro(subtotal)}

                    <button
                        type="button"
                        class="secundario"
                        onclick="remover(${item.produtoId})"
                    >
                        Remover
                    </button>
                </span>
            </div>
        `;
    }).join("");

    $("itensCarrinho").innerHTML = `
        ${itensHTML}
        <p><strong>Total: ${dinheiro(total)}</strong></p>
    `;
}

window.remover = (id) => {
    carrinho = carrinho.filter(item => item.produtoId !== id);

    salvarCarrinho();
    mensagem("Produto removido do carrinho.");
};

$("finalizar").addEventListener("click", async () => {
    if (!usuario || usuario.tipo !== "CLIENTE") {
        mensagem("Entre com uma conta de cliente para finalizar a compra.", true);
        abrirPagina("conta");
        return;
    }

    if (!carrinho.length) {
        mensagem("Adicione produtos ao carrinho antes de finalizar.", true);
        return;
    }

    try {
        const pedido = await requisicao("/pedidos", {
            method: "POST",
            body: JSON.stringify({
                clienteId: usuario.id,
                itens: carrinho.map(item => ({
                    produtoId: item.produtoId,
                    quantidade: item.quantidade
                }))
            })
        });

        ultimoPedido = {
            id: pedido.id,
            total: pedido.total,
            status: pedido.status,
            criadoEm: pedido.criadoEm,
            itens: carrinho.map(item => {
                const produto = produtos.find(p => p.id === item.produtoId);

                return {
                    nome: produto?.nome || "Produto",
                    quantidade: item.quantidade,
                    preco: produto?.preco || 0
                };
            })
        };

        localStorage.setItem("areiaUltimoPedido", JSON.stringify(ultimoPedido));

        carrinho = [];
        salvarCarrinho();

        mostrarConfirmacao();
        await carregarCompras();

        abrirPagina("confirmacao");
    } catch (erro) {
        mensagem(erro.message, true);
    }
});

function mostrarConfirmacao() {
    if (!ultimoPedido) {
        return;
    }

    $("mensagemConfirmacao").textContent =
        "Seu pedido foi registrado com sucesso! Obrigado por comprar na Areia Commerce.";

    $("detalhesConfirmacao").innerHTML = `
        <div class="painel">
            <h3>Detalhes do pedido</h3>

            <p><strong>Número do pedido:</strong> #${escapar(ultimoPedido.id)}</p>

            <p><strong>Status:</strong> ${escapar(ultimoPedido.status)}</p>

            <p><strong>Total:</strong> ${dinheiro(ultimoPedido.total)}</p>

            <h4>Produtos comprados</h4>

            ${ultimoPedido.itens.map(item => `
                <p>
                    ${escapar(item.nome)} × ${item.quantidade}
                    — ${dinheiro(Number(item.preco) * item.quantidade)}
                </p>
            `).join("")}
        </div>
    `;
}

$("formProduto").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!usuario || usuario.tipo !== "VENDEDOR") {
        mensagem("Entre com uma conta de vendedor.", true);
        abrirPagina("conta");
        return;
    }

    try {
        await requisicao("/produtos", {
            method: "POST",
            body: JSON.stringify({
                nome: $("produtoNome").value.trim(),
                descricao: $("produtoDescricao").value.trim(),
                preco: Number($("produtoPreco").value),
                imagem: $("produtoImagem").value.trim() || null,
                vendedorId: usuario.id
            })
        });

        evento.target.reset();

        await carregarProdutos();
        await carregarMeusProdutos();

        mensagem("Produto cadastrado com sucesso!");
    } catch (erro) {
        mensagem(erro.message, true);
    }
});

async function carregarMeusProdutos() {
    if (!usuario || usuario.tipo !== "VENDEDOR") {
        $("meusProdutos").innerHTML =
            "<p>Entre com uma conta de vendedor para ver seus produtos.</p>";
        return;
    }

    try {
        const lista = await requisicao(
            `/vendedores/${usuario.id}/produtos`
        );

        $("meusProdutos").innerHTML = lista.length
            ? lista.map(produto => `
                <article class="produto">
                    ${produto.imagem ? `
                        <img
                            src="${escapar(produto.imagem)}"
                            alt="${escapar(produto.nome)}"
                            onerror="this.style.display='none'"
                        >
                    ` : ""}

                    <div class="produto-conteudo">
                        <h3>${escapar(produto.nome)}</h3>

                        <p>${escapar(produto.descricao || "")}</p>

                        <p class="preco">${dinheiro(produto.preco)}</p>

                        <button
                            type="button"
                            class="botao-excluir"
                            onclick="excluirProduto(${produto.id})"
                        >
                            Excluir produto
                        </button>
                    </div>
                </article>
            `).join("")
            : "<p>Você ainda não cadastrou produtos.</p>";
    } catch (erro) {
        $("meusProdutos").textContent = erro.message;
    }
}

window.excluirProduto = async (id) => {
    if (!usuario || usuario.tipo !== "VENDEDOR") {
        mensagem("Entre com uma conta de vendedor.", true);
        return;
    }

    if (!confirm("Tem certeza de que deseja excluir este produto?")) {
        return;
    }

    try {
        const resposta = await fetch(
            `${API}/produtos/${id}?vendedorId=${encodeURIComponent(usuario.id)}`,
            { method: "DELETE" }
        );

        if (!resposta.ok) {
            const dados = await resposta.json().catch(() => ({}));

            throw new Error(
                dados.erro || "Não foi possível excluir o produto."
            );
        }

        await carregarProdutos();
        await carregarMeusProdutos();

        mensagem("Produto excluído com sucesso!");
    } catch (erro) {
        mensagem(erro.message, true);
    }
};

async function carregarCompras() {
    if (!usuario || usuario.tipo !== "CLIENTE") {
        $("listaCompras").textContent =
            "Entre com uma conta de cliente para ver seus pedidos.";
        return;
    }

    try {
        const lista = await requisicao(
            `/clientes/${usuario.id}/pedidos`
        );

        $("listaCompras").innerHTML = lista.length
            ? lista.map(pedido => `
                <div class="linha-carrinho">
                    <span>
                        Pedido #${escapar(pedido.id)}
                        · ${pedido.criadoEm
                            ? new Date(pedido.criadoEm).toLocaleString("pt-BR")
                            : ""}
                    </span>

                    <strong>
                        ${dinheiro(pedido.total)}
                        — ${escapar(pedido.status)}
                    </strong>
                </div>
            `).join("")
            : "<p>Você ainda não fez compras.</p>";
    } catch (erro) {
        $("listaCompras").textContent = erro.message;
    }
}

atualizarConta();

ultimoPedido = JSON.parse(
    localStorage.getItem("areiaUltimoPedido") || "null"
);

if (ultimoPedido) {
    mostrarConfirmacao();
}

carregarProdutos().then(() => {
    renderCarrinho();
    abrirPagina("loja");
});