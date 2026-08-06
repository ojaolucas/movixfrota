---
name: db_migration
description: Regras e padrões para adicionar novas tabelas, colunas ou migrar o banco de dados PostgreSQL.
---

# Banco de Dados - Migração e DDL Dinâmico

Esta Skill orienta como realizar modificações e extensões no banco de dados PostgreSQL do projeto MovixFrota.

## Padrões de DDL no db.js
Toda a criação de tabelas e atualizações de schema do banco de dados ocorrem de forma dinâmica na inicialização do servidor, através da função `initDB()` no arquivo [db.js](file:///c:/Users/SAMSUNG/Downloads/movixfrota/db.js).

### Regras Obrigatórias:
1. **Não use arquivos de migração separados**: Não crie arquivos em diretórios como `migrations/` ou `sql/`. Adicione os comandos SQL de criação e alteração diretamente no arquivo `db.js`.
2. **Criação de Tabelas**: Use sempre `CREATE TABLE IF NOT EXISTS <tabela> (...)` para garantir que o script seja idempotente.
3. **Alteração de Colunas**: Use `ALTER TABLE <tabela> ADD COLUMN IF NOT EXISTS "<coluna>" <tipo>` para colunas adicionais.
4. **Nomes de Colunas camelCase**:
   - As colunas de banco de dados neste projeto utilizam camelCase (ex: `senhaHash`, `kmAtual`, `tipoUnidade`).
   - Em queries SQL brutas no Express ou no inicializador, nomes de tabelas/colunas contendo letras maiúsculas **devem** obrigatoriamente estar entre aspas duplas:
     ```sql
     SELECT "senhaHash", "kmAtual" FROM veiculos;
     ```
     
### Exemplo Prático de Migração no `db.js`:
```javascript
// Dentro da função initDB()
await query(`
    CREATE TABLE IF NOT EXISTS nova_tabela (
        id VARCHAR(50) PRIMARY KEY,
        "campoUm" VARCHAR(100),
        "campoDois" INTEGER DEFAULT 0
    )
`);

// Adicionando coluna a uma tabela existente
await query(`ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS "novoCampoAdicional" VARCHAR(50)`);
```
