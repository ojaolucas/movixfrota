/* 
   MovixFrota - PostgreSQL Database Pool and Initialization Engine
   Handles database connections and dynamic table creations.
*/

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("FATAL: Variável de ambiente DATABASE_URL não configurada no arquivo .env!");
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase') || connectionString.includes('neon') || connectionString.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Erro de conexão com o PostgreSQL:', err.message);
    } else {
        console.log('⚡ Conexão com o PostgreSQL estabelecida com sucesso em:', res.rows[0].now);
    }
});

// Helper for quick queries
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        return res;
    } catch (error) {
        console.error(`❌ Erro na query: ${text}`, error);
        throw error;
    }
}

// dynamic DDL initialization
async function initDB() {
    console.log("🛠️  Verificando e inicializando tabelas do PostgreSQL...");
    
    try {
        // 1. Usuarios Table
        await query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id VARCHAR(50) PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                cpf VARCHAR(20) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                cargo VARCHAR(150),
                perfil VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'ativo',
                foto TEXT,
                "senhaHash" TEXT NOT NULL,
                "dataCadastro" VARCHAR(20),
                "rememberToken" VARCHAR(255)
            )
        `);

        // Migration logic for existing tables
        await query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "rememberToken" VARCHAR(255)`);
        await query(`ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS "configRodagem" VARCHAR(50) DEFAULT 'Personalizado'`);
        await query(`ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS "configEixos" JSONB DEFAULT '[]'::jsonb`);
        await query(`ALTER TABLE pneus ADD COLUMN IF NOT EXISTS "recapado" BOOLEAN DEFAULT FALSE`);
        await query(`ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS "dataNascimento" VARCHAR(20)`);

        // 2. Veiculos Table
        await query(`
            CREATE TABLE IF NOT EXISTS veiculos (
                id VARCHAR(50) PRIMARY KEY,
                marca VARCHAR(100) NOT NULL,
                modelo VARCHAR(100) NOT NULL,
                ano VARCHAR(10) NOT NULL,
                cor VARCHAR(50) NOT NULL,
                tipo VARCHAR(100),
                renavam VARCHAR(50),
                chassi VARCHAR(50),
                placa VARCHAR(20) UNIQUE NOT NULL,
                combustivel VARCHAR(50),
                "kmAtual" NUMERIC DEFAULT 0,
                "dataAquisicao" VARCHAR(20),
                status VARCHAR(20) DEFAULT 'disponivel',
                observacoes TEXT,
                "historicoKM" JSONB DEFAULT '[]'::jsonb,
                "tipoUnidade" VARCHAR(50) DEFAULT 'Veículo Motorizado',
                "qtdEixos" VARCHAR(10),
                "tipoImplemento" VARCHAR(50),
                "qtdPneus" VARCHAR(10),
                "capacidadeCarga" VARCHAR(50),
                "configRodagem" VARCHAR(50) DEFAULT 'Personalizado',
                "configEixos" JSONB DEFAULT '[]'::jsonb,
                "possuiSeguro" VARCHAR(10) DEFAULT 'Não',
                "docVeiculoAnexo" TEXT,
                seguradora VARCHAR(150),
                apolice VARCHAR(150),
                "valorMensalSeguro" VARCHAR(50),
                "vencimentoBoletoSeguro" VARCHAR(20),
                "inicioContratoSeguro" VARCHAR(20),
                "validadeContratoSeguro" VARCHAR(20),
                "contratoSeguroAnexo" TEXT,
                "observacoesSeguro" TEXT,
                "possuiRastreador" VARCHAR(10) DEFAULT 'Não',
                "empresaRastreador" VARCHAR(150),
                "modeloRastreador" VARCHAR(150),
                "idRastreador" VARCHAR(150),
                "imeiRastreador" VARCHAR(150),
                "dataInstalacaoRastreador" VARCHAR(20),
                "statusRastreador" VARCHAR(50),
                "valorMensalRastreador" VARCHAR(50),
                "inicioContratoRastreador" VARCHAR(20),
                "validadeContratoRastreador" VARCHAR(20),
                "rastreadorContratoAnexo" TEXT,
                "rastreadorNotaFiscalAnexo" TEXT,
                "rastreadorOrdemServicoAnexo" TEXT,
                "rastreadorComprovanteAnexo" TEXT,
                "observacoesRastreador" TEXT,
                "possuiExtintor" VARCHAR(10) DEFAULT 'Não',
                "tipoExtintor" VARCHAR(50),
                "capacidadeExtintor" VARCHAR(50),
                "seloExtintor" VARCHAR(150),
                "dataFabricacaoExtintor" VARCHAR(20),
                "dataRecargaExtintor" VARCHAR(20),
                "validadeExtintor" VARCHAR(20),
                "proximaRecargaExtintor" VARCHAR(20),
                "statusExtintor" VARCHAR(50),
                "extintorCertificadoAnexo" TEXT,
                "extintorComprovanteAnexo" TEXT,
                "extintorLaudoAnexo" TEXT,
                "extintorNotaFiscalAnexo" TEXT,
                "observacoesExtintor" TEXT,
                "possuiTacografo" VARCHAR(10) DEFAULT 'Não',
                "marcaTacografo" VARCHAR(150),
                "modeloTacografo" VARCHAR(150),
                "numSerieTacografo" VARCHAR(150),
                "dataInstalacaoTacografo" VARCHAR(20),
                "dataUltimaAfericaoTacografo" VARCHAR(20),
                "validadeAfericaoTacografo" VARCHAR(20),
                "empresaAfericaoTacografo" VARCHAR(150),
                "anexoComprovanteTacografo" TEXT,
                "observacoesTacografo" TEXT
            )
        `);

        // 3. Motoristas Table
        await query(`
            CREATE TABLE IF NOT EXISTS motoristas (
                id VARCHAR(50) PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                cpf VARCHAR(20) UNIQUE NOT NULL,
                rg VARCHAR(50),
                cnh VARCHAR(20) UNIQUE NOT NULL,
                "categoriaCNH" VARCHAR(10) NOT NULL,
                "dataVencimentoCNH" VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'ativo',
                foto TEXT,
                telefone VARCHAR(20),
                email VARCHAR(255),
                endereco TEXT,
                "cnhAnexo" TEXT,
                "comprovanteResidenciaAnexo" TEXT,
                "dataNascimento" VARCHAR(20),
                observacoes TEXT,
                historico JSONB DEFAULT '[]'::jsonb
            )
        `);

        // 4. Abastecimentos Table
        await query(`
            CREATE TABLE IF NOT EXISTS abastecimentos (
                id VARCHAR(50) PRIMARY KEY,
                "veiculoId" VARCHAR(50) REFERENCES veiculos(id) ON DELETE CASCADE,
                "motoristaId" VARCHAR(50) REFERENCES motoristas(id) ON DELETE SET NULL,
                data VARCHAR(20) NOT NULL,
                combustivel VARCHAR(50) NOT NULL,
                litros NUMERIC NOT NULL,
                "valorLitro" NUMERIC NOT NULL,
                "valorTotal" NUMERIC NOT NULL,
                "kmAtual" NUMERIC NOT NULL,
                posto VARCHAR(150),
                comprovante TEXT,
                observacoes TEXT,
                "kmL" NUMERIC,
                "custoKM" NUMERIC
            )
        `);

        // 5. Manutencoes Table
        await query(`
            CREATE TABLE IF NOT EXISTS manutencoes (
                id VARCHAR(50) PRIMARY KEY,
                "veiculoId" VARCHAR(50) REFERENCES veiculos(id) ON DELETE CASCADE,
                data VARCHAR(20) NOT NULL,
                tipo VARCHAR(100) NOT NULL,
                categoria VARCHAR(100) NOT NULL,
                descricao TEXT,
                valor NUMERIC NOT NULL,
                km NUMERIC NOT NULL,
                oficina VARCHAR(150),
                fornecedor VARCHAR(150),
                status VARCHAR(50) DEFAULT 'Agendada',
                comprovante TEXT,
                anexo TEXT
            )
        `);

        // 6. Pneus Table
        await query(`
            CREATE TABLE IF NOT EXISTS pneus (
                id VARCHAR(50) PRIMARY KEY,
                codigo VARCHAR(100) UNIQUE NOT NULL,
                marca VARCHAR(100),
                modelo VARCHAR(100),
                medida VARCHAR(50),
                custo NUMERIC,
                "vidaEstimada" NUMERIC,
                "kmInicial" NUMERIC,
                "veiculoAtual" VARCHAR(50) REFERENCES veiculos(id) ON DELETE SET NULL,
                posicao VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Regular',
                "dataInstalacao" VARCHAR(20),
                "comprovanteAnexo" TEXT,
                recapado BOOLEAN DEFAULT FALSE,
                anotacoes JSONB DEFAULT '[]'::jsonb,
                historico JSONB DEFAULT '[]'::jsonb
            )
        `);

        // 7. Oleos Table
        await query(`
            CREATE TABLE IF NOT EXISTS oleos (
                id VARCHAR(50) PRIMARY KEY,
                "veiculoId" VARCHAR(50) REFERENCES veiculos(id) ON DELETE CASCADE,
                "dataTroca" VARCHAR(20) NOT NULL,
                "kmTroca" NUMERIC NOT NULL,
                "proximaTrocaKM" NUMERIC NOT NULL,
                "proximaTrocaDias" VARCHAR(20),
                "tipoOleo" VARCHAR(100),
                valor NUMERIC,
                estabelecimento VARCHAR(255),
                "filtroAr" BOOLEAN DEFAULT FALSE,
                "filtroOleo" BOOLEAN DEFAULT FALSE,
                "filtroCombustivel" BOOLEAN DEFAULT FALSE,
                observacoes TEXT
            )
        `);

        // 8. Viagens Table
        await query(`
            CREATE TABLE IF NOT EXISTS viagens (
                id VARCHAR(50) PRIMARY KEY,
                "veiculoId" VARCHAR(50) REFERENCES veiculos(id) ON DELETE CASCADE,
                "motoristaId" VARCHAR(50) REFERENCES motoristas(id) ON DELETE CASCADE,
                "dataSaida" VARCHAR(20) NOT NULL,
                "horaSaida" VARCHAR(20),
                "dataRetorno" VARCHAR(20),
                "horaRetorno" VARCHAR(20),
                "kmInicial" NUMERIC NOT NULL,
                "kmFinal" NUMERIC,
                origem VARCHAR(255) NOT NULL,
                destino VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Em Andamento',
                observacoes TEXT,
                "kmRodado" NUMERIC,
                custos NUMERIC DEFAULT 0
            )
        `);

        // 9. Multas Table
        await query(`
            CREATE TABLE IF NOT EXISTS multas (
                id VARCHAR(50) PRIMARY KEY,
                "veiculoId" VARCHAR(50) REFERENCES veiculos(id) ON DELETE CASCADE,
                "motoristaId" VARCHAR(50) REFERENCES motoristas(id) ON DELETE CASCADE,
                data VARCHAR(20) NOT NULL,
                hora VARCHAR(20),
                horario VARCHAR(20),
                codigo VARCHAR(100),
                descricao TEXT,
                gravidade VARCHAR(50),
                pontos INTEGER,
                valor NUMERIC NOT NULL,
                status VARCHAR(50) DEFAULT 'Não Pago',
                observacoes TEXT,
                anexo TEXT,
                "anexoBoleto" TEXT,
                "anexoComprovante" TEXT,
                historico JSONB DEFAULT '[]'::jsonb,
                "associacaoTipo" VARCHAR(50) DEFAULT 'sem_motorista',
                "viagemId" VARCHAR(50) REFERENCES viagens(id) ON DELETE SET NULL
            )
        `);

        // Migration Alters for Multas
        await query(`ALTER TABLE multas ADD COLUMN IF NOT EXISTS "associacaoTipo" VARCHAR(50) DEFAULT 'sem_motorista'`);
        await query(`ALTER TABLE multas ADD COLUMN IF NOT EXISTS "viagemId" VARCHAR(50) REFERENCES viagens(id) ON DELETE SET NULL`);

        // 10. Logs Table
        await query(`
            CREATE TABLE IF NOT EXISTS logs (
                id VARCHAR(50) PRIMARY KEY,
                data TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                usuario VARCHAR(150),
                perfil VARCHAR(50),
                acao VARCHAR(150),
                entidade VARCHAR(100),
                detalhes TEXT
            )
        `);

        // Enable Row Level Security (RLS) on all tables to prevent unauthorized public REST API access
        const tables = ['usuarios', 'veiculos', 'motoristas', 'abastecimentos', 'manutencoes', 'pneus', 'oleos', 'viagens', 'multas', 'logs'];
        for (const table of tables) {
            await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        }
        console.log("🛡️  Row Level Security (RLS) ativado em todas as tabelas.");

        console.log("✅ Todas as tabelas do PostgreSQL prontas para uso.");
    } catch (err) {
        console.error("❌ Falha crítica ao inicializar banco de dados PostgreSQL:", err);
        throw err;
    }
}

module.exports = {
    pool,
    query,
    initDB
};
