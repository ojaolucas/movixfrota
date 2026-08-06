---
name: spa_page_creation
description: Guia passo a passo para criar novas telas e rotas SPA no frontend do MovixFrota.
---

# Frontend SPA - Criação de Novas Telas e Rotas

Esta Skill orienta como estender o frontend do MovixFrota adicionando novas views (telas) na estrutura Single Page Application (SPA).

## Arquitetura SPA do Projeto
O frontend é desenvolvido em JavaScript puro (Vanilla JS). Não há frameworks como React ou Vue. O controle de estado é mantido em memória no [store.js](file:///c:/Users/SAMSUNG/Downloads/movixfrota/public/js/store.js) e o roteamento baseado em hash (#rota) é gerenciado pelo [router.js](file:///c:/Users/SAMSUNG/Downloads/movixfrota/public/js/router.js).

## Passo a Passo para Criar uma Nova Tela

### Passo 1: Adicionar Link de Navegação
No arquivo [index.html](file:///c:/Users/SAMSUNG/Downloads/movixfrota/public/index.html), localize a barra lateral (sidebar) e adicione um novo link contendo o atributo `data-route`:
```html
<li class="sidebar-item">
    <a href="#nova-rota" class="sidebar-link" data-route="nova-rota">
        <i class="fa-solid fa-list-check"></i>
        <span>Minha Nova Tela</span>
    </a>
</li>
```

### Passo 2: Criar o Módulo do Frontend
Crie um novo arquivo Javascript em `public/js/modules/nova-rota.js`. Este módulo deve expor a função de renderização correspondente:

```javascript
/* 
   MovixFrota - Módulo de Minha Nova Tela
*/

(function() {
    // 1. Registrar a rota no roteador global
    window.movixRouter.register('nova-rota', renderNovaTela);

    async function renderNovaTela(container, targetId = null) {
        // Exemplo de busca de dados usando a store
        // const dados = await window.movixStore.fetchData('/api/nova-rota');

        container.innerHTML = `
            <div class="view-header">
                <div>
                    <h1>Minha Nova Tela</h1>
                    <p class="text-subtitle">Gerencie e visualize as novas configurações do sistema</p>
                </div>
            </div>
            
            <div class="view-content animate-fade-in">
                <!-- Conteúdo Visual Principal -->
                <div class="card-glass">
                    <h3>Dados do Módulo</h3>
                    <p>Interface responsiva e dinâmica em JavaScript puro.</p>
                </div>
            </div>
        `;

        // 2. Fazer o binding de eventos interativos
        setupEventListeners(container);
    }

    function setupEventListeners(container) {
        // Realize aqui os event listeners locais da tela
    }
})();
```

### Passo 3: Incluir o Script no HTML Principal
Abra o [index.html](file:///c:/Users/SAMSUNG/Downloads/movixfrota/public/index.html) e inclua a tag script correspondente no final do `<body>`, garantindo que seja carregado após o roteador:
```html
<script src="js/modules/nova-rota.js"></script>
```

### Passo 4: Estilizar (se necessário)
Sempre use a paleta de cores e o Glassmorphism definidos em [variables.css](file:///c:/Users/SAMSUNG/Downloads/movixfrota/public/css/variables.css). Estilos específicos do módulo podem ser adicionados no arquivo [modules.css](file:///c:/Users/SAMSUNG/Downloads/movixfrota/public/css/modules.css).
