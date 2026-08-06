# Diretrizes de Desenvolvimento - MovixFrota ERP

Este arquivo serve como guia de diretrizes, regras e boas práticas para agentes de IA que trabalham neste repositório.

## 1. Visão Geral do Projeto
MovixFrota é um ERP completo para gestão de frotas corporativas. Possui arquitetura SPA (Single Page Application) simples e rápida no frontend e backend baseado em Node.js, Express e PostgreSQL.

## 2. Estrutura de Arquivos e Organização
- **`server.js`**: Contém todas as rotas da API REST, controle de sessões, middlewares (como `requireAuth`) e inicialização do servidor.
- **`db.js`**: Gerencia a conexão com o banco de dados PostgreSQL usando o driver `pg` (Pool) e inicializa as tabelas de forma dinâmica através da função `initDB()`.
- **`public/`**: Contém o frontend da aplicação.
  - `index.html`: Único ponto de entrada.
  - `css/variables.css`: Variáveis CSS globais (design system tokens, cores, sombras, tipografia).
  - `css/styles.css` e `css/modules.css`: Layout básico e estilos dos módulos/componentes.
  - `js/store.js`: Centralizador de chamadas de API e estado local compartilhado.
  - `js/router.js`: Roteamento baseado em hash (#rota).
  - `js/app.js`: Orquestrador global da aplicação.
  - `js/modules/`: Módulos de telas individuais (ex: `veiculos.js`, `motoristas.js`).

## 3. Diretrizes de Banco de Dados e SQL
- **Schema e Migrações**: As tabelas e colunas adicionais devem ser criadas via instruções `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ou `CREATE TABLE IF NOT EXISTS` dentro da função `initDB()` no arquivo `db.js`. Não crie arquivos de migração separados, a inicialização ocorre dinamicamente na inicialização do backend.
- **CamelCase e Aspas**: O banco de dados utiliza colunas em camelCase (ex: `senhaHash`, `kmAtual`, `tipoUnidade`). Em queries SQL brutas, nomes de colunas que contenham letras maiúsculas **precisam** ser envoltos por aspas duplas, por exemplo: `SELECT "senhaHash", "kmAtual" FROM veiculos`.
- **Valores Numéricos**: Ao processar valores decimais como `valor` de manutenção ou abastecimento, faça o tratamento e higienização adequada de strings formatadas com vírgulas e pontos antes de convertê-las para float.

## 4. Diretrizes de Frontend (SPA e JS)
- **Renderização Dinâmica**: Os arquivos JS em `public/js/modules/` devem expor funções de renderização que limpam e injetam HTML diretamente em `view-content-wrapper`.
- **Roteamento**: Novas telas devem ser registradas no `window.movixRouter` (geralmente feito na inicialização do arquivo correspondente) associando a rota hash à sua respectiva função de renderização.
- **Sem Frameworks**: O frontend é JavaScript puro (Vanilla JS). Não adicione frameworks como React, Vue ou Angular, exceto se expressamente solicitado.
- **Estilo e Design System**:
  - Siga a paleta de cores e o Glassmorphism definidos em `public/css/variables.css`.
  - O sistema possui suporte a modo escuro e claro. A mudança de tema adiciona a classe `theme-light` ou `theme-dark` no elemento `body`. Qualquer estilo novo deve herdar as variáveis CSS corretamente para funcionar nos dois temas.

## 5. Convenções de Código e Segurança
- **Proteção de Rotas**: Todas as rotas administrativas e de dados no backend devem utilizar o middleware `requireAuth` para validar a sessão.
- **Logs de Auditoria**: Sempre que ocorrerem operações de inserção, edição ou exclusão de dados críticos, registre a ação usando a função utilitária `addLog(req.session.nome, req.session.perfil, acao, modulo, detalhe)`.
- **Consistência de Comentários**: Mantenha os cabeçalhos de arquivo explicativos e comentários em português para consistência com o restante do projeto.
