# MovixFrota ERP

> **Sistema de Gestão Inteligente de Frotas Corporativas**  
> Versão 2.0.0 | Node.js + Express + PostgreSQL

MovixFrota é um ERP completo desenvolvido para **gestão operacional, financeira e de conformidade de frotas corporativas**. Oferece controle total sobre veículos, motoristas, abastecimentos, manutenções, pneus, viagens, multas e muito mais — tudo em uma interface moderna, responsiva e com suporte a relatórios gerenciais avançados.

---

## Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura do Projeto](#arquitetura-do-projeto)
- [Módulos do Sistema](#módulos-do-sistema)
- [Banco de Dados](#banco-de-dados)
- [API REST](#api-rest)
- [Instalação e Configuração Local](#instalação-e-configuração-local)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Deploy em Produção (Render)](#deploy-em-produção-render)
- [Controle de Acesso](#controle-de-acesso)
- [Central de Relatórios Gerenciais](#central-de-relatórios-gerenciais)
- [Upload de Arquivos e Documentos](#upload-de-arquivos-e-documentos)
- [Auditoria e Logs](#auditoria-e-logs)

---

## Tecnologias

### Backend
| Tecnologia | Versão | Função |
|---|---|---|
| **Node.js** | ≥ 18.x | Runtime JavaScript |
| **Express** | ^4.18.2 | Framework HTTP / API REST |
| **express-session** | ^1.17.3 | Gerenciamento de sessões |
| **pg (node-postgres)** | ^8.21.0 | Driver PostgreSQL |
| **bcryptjs** | ^2.4.3 | Hash seguro de senhas |
| **multer** | ^1.4.5-lts.1 | Upload de arquivos |
| **uuid** | ^9.0.0 | Geração de IDs únicos |
| **dotenv** | ^17.4.2 | Variáveis de ambiente |
| **cors** | ^2.8.5 | Cross-Origin Resource Sharing |

### Frontend
| Tecnologia | Função |
|---|---|
| **HTML5 / CSS3 / JavaScript (ES6+)** | Core SPA sem framework |
| **Chart.js** (CDN) | Gráficos dinâmicos e dashboards |
| **Font Awesome 6.4** (CDN) | Ícones vetoriais |
| **Flaticon UIcons** (CDN) | Ícones complementares |
| **CSS Custom Properties (Variables)** | Design system tokens |
| **CSS Glassmorphism** | Estética visual premium |

### Banco de Dados
| Tecnologia | Função |
|---|---|
| **PostgreSQL** | Banco de dados relacional principal |
| **Supabase** (nuvem) | Hosting de PostgreSQL em produção |

---

## Arquitetura do Projeto

```
movixfrota/
│
├── server.js              # Servidor Express principal (API REST + Middlewares)
├── db.js                  # Pool de conexão PostgreSQL + DDL (criação de tabelas)
├── migrate.js             # Script de migração JSON → PostgreSQL (uso único)
├── package.json           # Dependências e scripts NPM
├── .env                   # Variáveis de ambiente (não commitado)
├── .env.example           # Exemplo de configuração do .env
├── .gitignore             # Arquivos ignorados pelo Git
│
├── data/
│   └── db.json            # Arquivo legado (migrado para PostgreSQL)
│
└── public/                # Frontend SPA servido como estático
    ├── index.html         # Ponto de entrada único da aplicação
    ├── favicon.png        # Logotipo / ícone do sistema
    │
    ├── css/
    │   ├── variables.css  # Design tokens (cores, tipografia, sombras)
    │   ├── styles.css     # Estilos globais (layout, login, sidebar, header)
    │   └── modules.css    # Estilos de componentes (cards, tabelas, modais, formulários)
    │
    ├── js/
    │   ├── store.js       # Estado global (dados em memória + chamadas à API)
    │   ├── router.js      # Roteador SPA baseado em hash (#rota)
    │   ├── app.js         # Controlador principal (inicialização, sidebar, toast)
    │   │
    │   └── modules/       # Um arquivo JS por módulo de tela
    │       ├── dashboard.js
    │       ├── veiculos.js
    │       ├── motoristas.js
    │       ├── multas.js
    │       ├── abastecimentos.js
    │       ├── manutencoes.js
    │       ├── pneus.js
    │       ├── oleo.js
    │       ├── viagens.js
    │       ├── relatorios.js
    │       ├── usuarios.js
    │       └── auditoria.js
    │
    ├── img/               # Imagens estáticas (avatar padrão, etc.)
    └── uploads/           # Fotos e documentos enviados pelos usuários
```

### Padrão de Arquitetura

O MovixFrota é uma **SPA (Single Page Application)** com roteamento baseado em hash (`#rota`):

- **`store.js`** — gerencia o estado global. Carrega todos os dados da API REST em memória quando o usuário faz login. Cada módulo consome dados diretamente do store, sem re-requisições ao servidor a cada navegação.
- **`router.js`** — registra handlers por rota e chama `renderModulo(container)` quando o hash da URL muda.
- **`app.js`** — orquestra o sistema: inicializa sessão, controla sidebar, modo claro/escuro, notificações (toasts) e alertas do sino.
- **Módulos** — cada arquivo em `modules/` é responsável por renderizar e controlar uma tela específica, sendo totalmente independente e auto-contido.

---

## Módulos do Sistema

### 1. Dashboard
- KPIs em tempo real: total de veículos, motoristas, valor gasto em combustível e manutenção no mês
- Gráfico de barras: evolução mensal dos gastos com combustível (Chart.js)
- Gráfico de rosca: distribuição do custo total da frota
- Lista de alertas de vencimento (CNH, seguro, extintor, tacógrafo, próximas revisões)
- Últimas O.S. de manutenção abertas

### 2. Veículos
- Cadastro completo: marca, modelo, ano, placa, RENAVAM, chassi, cor, tipo, combustível, odômetro
- Suporte a tipos de unidade: **Veículo Motorizado** e **Implemento/Reboque** (com campos específicos de eixos, pneus, capacidade de carga)
- Ficha de vida útil com abas:
  - **Dados Gerais** — especificações e documentação básica
  - **Seguro** — seguradora, apólice, vigência, documentos anexados
  - **Rastreador** — empresa, modelo, IMEI, contrato, nota fiscal
  - **Extintor** — tipo, capacidade, validade, laudo, certificado
  - **Tacógrafo** — marca, modelo, número de série, validade da aferição, documentos INMETRO
  - **Histórico KM** — gráfico de evolução do odômetro ao longo do tempo
- Histórico de alertas reativos: vencimento de seguro, extintor, rastreador e tacógrafo
- Upload de múltiplos documentos (CRLV, contrato de seguro, NF rastreador, laudo extintor, etc.)
- Status: Disponível / Em Viagem / Em Manutenção / Inativo

### 3. ‍️ Motoristas
- Cadastro completo: nome, CPF, RG, CNH, categoria, vencimento da CNH, foto, contato, endereço
- Upload de CNH e comprovante de residência
- Timeline de histórico por motorista (anotações e ocorrências)
- Status: Ativo / Afastado / Inativo
- Indicador visual de vencimento de CNH (semáforo: ok/atenção/vencido)

### 4. Controle de Multas
- Cadastro de infrações: veículo, data, hora, código DETRAN, descrição, gravidade, pontos, valor
- Status: Não Pago / Pago / Contestado / Cancelado
- Anexos: notificação, boleto, comprovante de pagamento
- **Motor de Associação Inteligente de Motoristas**: cruza automaticamente a data/hora da infração com as viagens ativas do veículo e sugere o motorista responsável
  - Sugestão única (card verde): motorista confirmado automaticamente
  - Conflito detectado (card laranja): operador seleciona manualmente
- Badge de associação:  Automática /  Manual /  Sem motorista
- Painel de viagem relacionada (vínculo inteligente com a infração)

### 5. Abastecimentos
- Registro de abastecimentos: veículo, motorista, data, combustível, litros, valor/litro, total, KM, posto
- **Cálculo automático**: km/L (consumo médio) e custo por quilômetro
- Atualização automática do odômetro do veículo
- Histórico cronológico por veículo e por motorista
- Upload de comprovante fiscal

### 6. Manutenções (Ordens de Serviço)
- Tipos: Preventiva / Corretiva / Elétrica / Pneus / Funilaria / Revisão
- Categorias personalizáveis por tipo de serviço
- Status da OS: Agendada / Em Andamento / Concluída / Cancelada
- Registro de oficina, fornecedor, valor e KM no momento da manutenção
- Upload de comprovantes e laudos técnicos

### 7. Pneus
- Cadastro por código único: marca, modelo, medida, custo, vida estimada (km)
- Instalação em posição específica do veículo (eixos e posições)
- Semáforo de status com base no desgaste real (KM rodados vs. vida estimada):
  -  Regular |  Atenção |  Vencido
- Histórico de remanejamentos e rodízios
- Anotações técnicas por pneu (timeline interativa)
- CRUD completo com confirmação modal para exclusão

### 8. ️ Troca de Óleo
- Registro por veículo: data, KM da troca, tipo de óleo, próxima troca em KM e data
- Controle de substituição de filtros (ar, óleo, combustível)
- Semáforo de vencimento: KM restante e dias restantes
- Edição e exclusão com recálculo automático de odômetro

### 9. Viagens
- Registro de saída: veículo, motorista, data, hora, KM inicial, origem, destino
- Registro de retorno: data, hora, KM final, observações
- Status: Em Andamento / Realizada / Cancelada
- **Cálculo automático** de KM rodado com atualização do odômetro
- Campos flexíveis de origem/destino (texto livre)
- CRUD completo com edição de histórico e exclusão segura

### 10. Relatórios Gerenciais
> Ver seção dedicada [Central de Relatórios Gerenciais](#-central-de-relatórios-gerenciais)

### 11. Gestão de Usuários *(Administrador)*
- Cadastro de usuários com perfis: **Administrador** ou **Operacional**
- Hash seguro de senhas com bcrypt
- Edição de perfil pelo próprio usuário (nome, foto, e-mail, senha)
- Ativação/inativação de contas
- Proteção contra autoexclusão

### 12. ️ Auditoria & Logs
- Registro automático de todas as operações: criação, edição, exclusão, login/logout
- Campos: data/hora, usuário, perfil, ação, entidade, detalhes
- Filtros por período, usuário e tipo de ação
- Exportação de logs para CSV

---

## ️ Banco de Dados

O banco de dados é PostgreSQL. As tabelas são criadas automaticamente pelo `db.js` ao iniciar o servidor (`initDB()`).

### Diagrama de Tabelas

```
usuarios
  └── id (PK), nome, cpf (UNIQUE), email (UNIQUE), cargo, perfil, status, foto, senhaHash, dataCadastro

veiculos
  └── id (PK), marca, modelo, ano, cor, tipo, renavam, chassi, placa (UNIQUE), combustivel, kmAtual,
       dataAquisicao, status, historicoKM (JSONB), tipoUnidade,
       [campos de seguro, rastreador, extintor e tacógrafo]

motoristas
  └── id (PK), nome, cpf (UNIQUE), rg, cnh (UNIQUE), categoriaCNH, dataVencimentoCNH,
       status, foto, telefone, email, endereco, cnhAnexo, historico (JSONB)

abastecimentos
  └── id (PK), veiculoId (FK→veiculos), motoristaId (FK→motoristas),
       data, combustivel, litros, valorLitro, valorTotal, kmAtual, posto, comprovante, kmL, custoKM

manutencoes
  └── id (PK), veiculoId (FK→veiculos), data, tipo, categoria, descricao,
       valor, km, oficina, fornecedor, status, comprovante, anexo

pneus
  └── id (PK), codigo (UNIQUE), marca, modelo, medida, custo, vidaEstimada, kmInicial,
       veiculoAtual (FK→veiculos), posicao, status, dataInstalacao, anotacoes (JSONB), historico (JSONB)

oleos
  └── id (PK), veiculoId (FK→veiculos), dataTroca, kmTroca, proximaTrocaKM, proximaTrocaDias,
       tipoOleo, valor, estabelecimento, filtroAr, filtroOleo, filtroCombustivel

viagens
  └── id (PK), veiculoId (FK→veiculos), motoristaId (FK→motoristas),
       dataSaida, horaSaida, dataRetorno, horaRetorno, kmInicial, kmFinal,
       origem, destino, status, kmRodado

multas
  └── id (PK), veiculoId (FK→veiculos), motoristaId (FK→motoristas),
       data, hora, codigo, descricao, gravidade, pontos, valor, status,
       anexo, anexoBoleto, anexoComprovante, historico (JSONB),
       associacaoTipo, viagemId (FK→viagens)

logs
  └── id (PK), data (TIMESTAMP), usuario, perfil, acao, entidade, detalhes
```

### Integridade Referencial
- `ON DELETE CASCADE`: ao excluir um veículo, todos os seus abastecimentos, manutenções, oleos e viagens são removidos automaticamente.
- `ON DELETE SET NULL`: ao excluir um motorista, o campo `motoristaId` em abastecimentos e multas é zerado (sem perder os registros financeiros).

---

## API REST

Todas as rotas da API exigem autenticação via sessão (`requireAuth`). Rotas de exclusão e gestão de usuários exigem perfil **Administrador** (`requireAdmin`).

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login com CPF/e-mail + senha. Suporte a "Manter Conectado" (sessão 7 dias) |
| `POST` | `/api/auth/logout` | Encerrar sessão ativa |
| `GET` | `/api/auth/me` | Retorna dados do usuário autenticado |
| `PUT` | `/api/perfil` | Editar próprio perfil (nome, foto, e-mail, senha) |

### Upload de Arquivos
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/upload/foto` | Upload de foto de perfil (JPG/PNG/GIF/WEBP, max 5MB) |
| `POST` | `/api/upload` | Upload genérico de documentos (JPG/PNG/PDF, max 10MB) |

### Recursos CRUD

| Recurso | GET (lista) | POST (criar) | PUT (editar) | DELETE (remover) |
|---|---|---|---|---|
| **Veículos** | `/api/veiculos` | `/api/veiculos` | `/api/veiculos/:id` | `/api/veiculos/:id` *(Admin)* |
| **Motoristas** | `/api/motoristas` | `/api/motoristas` | `/api/motoristas/:id` | `/api/motoristas/:id` *(Admin)* |
| **Usuários** | `/api/usuarios` *(Admin)* | `/api/usuarios` *(Admin)* | `/api/usuarios/:id` *(Admin)* | `/api/usuarios/:id` *(Admin)* |
| **Abastecimentos** | `/api/abastecimentos` | `/api/abastecimentos` | `/api/abastecimentos/:id` | `/api/abastecimentos/:id` *(Admin)* |
| **Manutenções** | `/api/manutencoes` | `/api/manutencoes` | `/api/manutencoes/:id` | `/api/manutencoes/:id` *(Admin)* |
| **Pneus** | `/api/pneus` | `/api/pneus` | `/api/pneus/:id` | `/api/pneus/:id` *(Admin)* |
| **Óleos** | `/api/oleos` | `/api/oleos` | `/api/oleos/:id` | `/api/oleos/:id` *(Admin)* |
| **Viagens** | `/api/viagens` | `/api/viagens` | `/api/viagens/:id` | `/api/viagens/:id` *(Admin)* |
| **Multas** | `/api/multas` | `/api/multas` | `/api/multas/:id` | `/api/multas/:id` *(Admin)* |
| **Logs** | `/api/logs` | — | — | — |

### Endpoints Especiais
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/metricas` | KPIs do dashboard (totais, gastos do mês) |
| `GET` | `/api/alertas` | Alertas de vencimento para o sino de notificações |

---

## ️ Instalação e Configuração Local

### Pré-requisitos
- **Node.js** ≥ 18.x ([nodejs.org](https://nodejs.org))
- **PostgreSQL** ≥ 14 instalado localmente **ou** conta no [Supabase](https://supabase.com)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/ojaolucas/movixfrota.git
cd movixfrota

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com sua string de conexão PostgreSQL

# 4. Inicie o servidor
npm start
# Ou em modo desenvolvimento com hot-reload:
npm run dev
```

Acesse em: **http://localhost:3000**

### Credenciais Padrão (após inicialização)

> O sistema cria um usuário administrador padrão na primeira vez que o banco é inicializado:

| Campo | Valor |
|---|---|
| CPF | `123.456.789-00` |
| Senha | `movix@2026` |

> ️ **Altere a senha padrão imediatamente após o primeiro acesso em produção.**

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
# Porta do servidor Express (padrão: 3000)
PORT=3000

# String de conexão PostgreSQL
# Local:
DATABASE_URL=postgres://postgres:sua_senha@localhost:5432/movixfrota

# Supabase (Transaction Pooler - recomendado para produção):
DATABASE_URL=postgres://postgres.SEU_PROJECT_REF:SUA_SENHA%40ESPECIAL@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

> ️ **Atenção com senhas contendo `@`**: O caractere `@` na senha deve ser **URL-encoded** como `%40` para evitar que o parser da URL divida incorretamente o host.
>
> Exemplo: senha `MinhaFrota@2026` → `MinhaFrota%402026`

---

## Deploy em Produção (Render)

O MovixFrota é compatível com o [Render.com](https://render.com) (plano gratuito).

### Configuração no Render

1. Crie um novo **Web Service** conectado ao repositório GitHub
2. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Adicione a variável de ambiente `DATABASE_URL` com a string de conexão do Supabase
4. Faça o deploy

### Conexão com Supabase

No painel do Supabase, vá em **Project Settings → Database → Connection string → Transaction pooler** e copie a URI. Substitua `[YOUR-PASSWORD]` pela senha real (com `%40` no lugar de `@` se necessário).

>  Use o **Transaction Pooler** (porta **6543**) em vez de Session Pooler para melhor compatibilidade com o Render (que usa conexões efêmeras).

---

## Controle de Acesso

O sistema possui dois perfis de usuário:

| Perfil | Permissões |
|---|---|
| **Administrador** | Acesso total: criação, edição, exclusão de qualquer registro; gestão de usuários; visualização de logs de auditoria |
| **Operacional** | Cadastro e edição de registros operacionais; **sem permissão** para excluir registros, gerenciar usuários |

A autenticação é feita via **sessões HTTP** (`express-session`). As senhas são armazenadas como **hash bcrypt** (salt rounds = 10).

- **Sessão padrão**: expira ao fechar o navegador
- **"Manter conectado"**: sessão estendida para **7 dias**

---

## Central de Relatórios Gerenciais

O módulo de relatórios oferece **15 tipos de análise** com filtros dinâmicos, KPIs, gráficos interativos, busca em tela, ordenação por colunas, paginação e exportação.

### Relatórios Disponíveis

| Grupo | Relatório | Descrição |
|---|---|---|
| **Operações & Custos** |  Combustíveis | Consumo por veículo/motorista, KM/L, valor gasto, evolução mensal |
| |  Multas | Multas por veículo/motorista, valor total, distribuição por gravidade |
| |  Manutenções | OS por veículo, custo total, tipo e categoria, evolução mensal |
| |  Viagens | Viagens por veículo/motorista, KM total rodado, duração, origem/destino |
| **Manutenção Fina** |  Pneus | Status de desgaste, custo, posições, vida útil restante |
| | ️ Troca de Óleo | Histórico por veículo, próximas trocas, filtros substituídos |
| |  Extintores | Validades, status, tipos, próximas recargas |
| **Contratos** | ️ Seguros | Vigência, seguradora, valor mensal, vencimentos |
| |  Rastreadores | Contratos ativos, empresas, validades, valores |
| **Cadastros & Auditorias** |  Veículos | Inventário completo, status, tipo, odômetro |
| | ‍️ Motoristas | Situação das CNHs, categorias, status, vencimentos |
| | ️ Implementos | Filtrado de veículos do tipo Implemento/Reboque |
| **Executivos** |  Custos da Frota | Consolidado de todos os custos por veículo e período |
| |  Vida Útil do Veículo | Timeline cronológica de abastecimentos, OS, multas, troca de óleo e pneus |
| |  Vencimentos e Alertas | CNH, seguro, extintor, rastreador, tacógrafo — todos próximos ao vencimento |

### Funcionalidades

- **Filtros dinâmicos**: o painel de filtros se adapta ao tipo de relatório selecionado (período, veículo, motorista, tipo, status)
- **KPI Summary Cards**: totais, médias e contagens calculados em tempo real
- **Gráficos Chart.js**: barras, linhas e rosca conforme o tipo de análise
- **Busca em tela**: filtragem imediata na tabela exibida
- **Ordenação**: clique nos cabeçalhos para ordenar por qualquer coluna
- **Paginação**: 10 registros por página com navegação inteligente
- **Exportar Excel**: CSV com separador `;` e marcador UTF-8 BOM (`\uFEFF`) — preserva acentos no Excel em pt-BR
- **Imprimir / PDF**: layout exclusivo para impressão com cabeçalho de auditoria (logo, nome do relatório, operador e timestamp)

---

## Upload de Arquivos e Documentos

O sistema suporta upload de dois tipos de arquivo:

| Tipo | Rota | Tamanho Máximo | Formatos |
|---|---|---|---|
| **Fotos de perfil** | `POST /api/upload/foto` | 5 MB | JPG, PNG, GIF, WEBP |
| **Documentos** | `POST /api/upload` | 10 MB | JPG, PNG, PDF |

Os arquivos são armazenados em `public/uploads/` com nomes únicos gerados por UUID (ex: `foto_abc123.jpg`, `doc_xyz456.pdf`).

>  Em produção no Render (serviço efêmero), os uploads são perdidos a cada redeploy. Para persistência, considere migrar para um serviço de object storage (ex: Supabase Storage, AWS S3 ou Cloudinary).

---

## ️ Auditoria e Logs

Toda operação relevante no sistema é registrada automaticamente na tabela `logs`:

| Campo | Exemplo |
|---|---|
| Data/Hora | `2026-05-31T13:15:00Z` |
| Usuário | `João Silva` |
| Perfil | `Administrador` |
| Ação | `Cadastro` / `Edição` / `Exclusão` / `Login` |
| Entidade | `Veículo` / `Motorista` / `Abastecimento` / `Sessão` |
| Detalhes | `Cadastrou veículo Ford Cargo (ABC-1234)` |

Os logs são acessíveis na aba **Auditoria & Logs** (disponível para todos os perfis) e podem ser filtrados por data, usuário e tipo de ação, além de exportados para CSV.

---

## Licença

Este projeto é **UNLICENSED** — uso privado e comercial restrito ao proprietário.

```
"license": "UNLICENSED",
"private": true
```

---

## ‍ Autor

Desenvolvido e mantido por **Lucas Ojao** — [@ojaolucas](https://github.com/ojaolucas)

> Construído com o apoio de **Antigravity** (Google DeepMind) — assistente de IA para desenvolvimento de software.

---

*Última atualização: Maio de 2026 — MovixFrota v2.0.0*
