# MovixFrota Design System & Style Guide

Este documento serve como guia de referência técnica e visual para replicar a interface e a experiência de usuário premium do MovixFrota ERP em qualquer outro sistema ou segmento.

Ao iniciar um novo projeto com uma IA de programação, instrua-a a ler este arquivo para garantir fidelidade visual absoluta ao padrão do sistema.

---

## 1. Estrutura de Temas (Modo Claro & Modo Escuro)

O sistema utiliza CSS Variables injetadas no escopo do `body` através das classes `.theme-light` e `.theme-dark`.

### Cores de Marca (Brand)
Configuradas no `:root` através do modelo HSL:
* **Primary:** `#0055ff` (Modo Claro) / `#3b82f6` (Modo Escuro)
* **Success (Verde):** `#22c55e` (Sucesso, Ativo, Concluído)
* **Warning (Amarelo):** `#f59e0b` (Avisos, Em Andamento)
* **Danger (Vermelho):** `#ef4444` (Vencidos, Cancelados)
* **Info (Azul Claro):** `#0ea5e9` (Informativo)

---

## 2. Tipografia e Fontes

* **Fonte Principal (Textos e Tabelas):** `'Inter'`, sans-serif
* **Fonte de Destaque (Títulos e Números de KPI):** `'Outfit'`, sans-serif
Ambas as fontes são carregadas via Google Fonts no topo do arquivo `variables.css`.

---

## 3. Estrutura HTML da Casca (Shell SPA)

O layout principal consiste em um menu lateral fixo (Sidebar) e uma área de conteúdo fluido que abriga o cabeçalho e a área de visualização dinâmica.

```html
<div class="app-container">
    <!-- SIDEBAR -->
    <aside class="sidebar" id="sidebar">
        <!-- Logo e Links -->
        <a href="#modulo" class="sidebar-link" data-route="modulo">
            <i class="fa-solid fa-icon"></i> <span>Módulo</span>
        </a>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="content-wrapper">
        <!-- HEADER (NavBar) -->
        <header class="header">
            <!-- Barra de Busca Global e Toggle de Tema -->
            <button id="theme-toggle" class="theme-toggle-btn"></button>
        </header>

        <!-- VIEW PORT (Onde as telas renderizam) -->
        <div id="view-content-wrapper" class="view-content"></div>
    </main>
</div>
```

---

## 4. Classes de Layout e Grids Responsivos

Para organizar componentes, utilize as classes de grid utilitárias integradas:
* `.grid-1`: 1 coluna cheia.
* `.grid-2`: 2 colunas iguais.
* `.grid-3`: 3 colunas iguais (colapsa para 2 em tablets, e 1 em mobile).
* `.grid-4`: 4 colunas iguais.
* `.grid-2-1`: Layout assimétrico (2/3 da tela para conteúdo principal e 1/3 para sidebar lateral).

---

## 5. Componentes Principais do UI

### A. Cartões Premium (Glassmorphism / Neon Hover)
```html
<div class="card">
    <div class="card-header-simple">
        <h3><i class="fa-solid fa-chart-line"></i> Título do Card</h3>
    </div>
    <div class="card-body">
        Conteúdo aqui...
    </div>
</div>
```

### B. Tabelas Inteligentes (Smart Tables)
Tabelas devem ser envelopadas em uma div `.table-responsive` para habilitar rolagem horizontal em telas menores:
```html
<div class="table-responsive">
    <table class="smart-table">
        <thead>
            <tr>
                <th>Nome</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Item Exemplo</td>
                <td><span class="status-pill realizada">Ativo</span></td>
            </tr>
        </tbody>
    </table>
</div>
```

### C. Badges de Status (.status-pill)
Cores de badges pré-estilizadas para listagens:
* `.status-pill.realizada` / `.status-pill.ativo`: Fundo verde claro com bolinha verde.
* `.status-pill.em_andamento` / `.status-pill.programada`: Fundo amarelo claro com bolinha amarela.
* `.status-pill.atrasada` / `.status-pill.cancelada` / `.status-pill.inativo`: Fundo vermelho claro com bolinha vermelha.

---

## 6. Engine Javascript (Router SPA & Módulos)

Toda nova página do sistema é um módulo dinâmico estruturado como uma **IIFE** (função auto-executável) para isolar o escopo:

```javascript
(function() {
    function renderNovoModulo(container, targetId) {
        // Inicializa estado padrão de rolagem e paginação
        let state = window.movixApp.getListState('novo_modulo');
        if (!state) {
            state = { currentPage: 1, filters: { search: '' }, scroll: 0 };
            window.movixApp.saveListState('novo_modulo', state);
        }

        // Renderiza o HTML base
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Título</h1>
            </div>
            <!-- Conteúdo -->
        `;
    }

    // Registra o módulo na rota SPA
    window.movixRouter.register('novo_modulo', renderNovoModulo);
})();
```

---

## 7. Regras de Ouro para Impressão de Relatórios

Para garantir que a impressão ocorra sem cortes em folhas A4:
* Utilize a classe `.no-print` em elementos que devem ser omitidos na impressão (filtros, paginações, menus).
* Garanta a injeção temporária do estilo de página `@page { size: landscape; }` antes da chamada `window.print()` se o relatório possuir muitas colunas.
* A engine global do app altera temporariamente o tema do `body` para `.theme-light` no evento `beforeprint` e restaura no `afterprint` para poupar tinta de impressão e manter as folhas com alto contraste.
