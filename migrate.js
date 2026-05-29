/*
   MovixFrota - PostgreSQL Automatic JSON Migration Engine
   Reads existing local data/db.json and imports all collections securely into PostgreSQL.
*/

const fs = require('fs');
const path = require('path');
const db = require('./db');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

async function migrate() {
    // 1. Check if db.json exists
    if (!fs.existsSync(DB_PATH)) {
        console.log("ℹ️  Nenhum arquivo local 'data/db.json' encontrado. Pulando etapa de migração.");
        return;
    }

    let localData;
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        localData = JSON.parse(raw);
    } catch (err) {
        console.error("❌ Erro ao ler ou parsear o arquivo 'data/db.json':", err.message);
        return;
    }

    console.log("🚀 Iniciando migração de dados locais para o PostgreSQL...");

    // Make sure tables exist
    await db.initDB();

    // Helper for safe JSON stringifying of nested arrays/objects
    const safeJson = (val) => val ? JSON.stringify(val) : '[]';

    // Helper for numbers
    const safeNum = (val) => {
        if (val === undefined || val === null || val === '') return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
    };

    // Helper for booleans
    const safeBool = (val) => {
        if (val === 'true' || val === true) return true;
        return false;
    };

    // Helper for string
    const safeStr = (val) => {
        if (val === undefined || val === null) return '';
        return String(val);
    };

    // Helper for safe foreign keys (maps empty string to null)
    const safeFK = (val) => {
        if (val === undefined || val === null || val === '') return null;
        const trimmed = String(val).trim();
        return trimmed === '' ? null : trimmed;
    };

    try {
        // 1. Migrate Usuarios
        if (Array.isArray(localData.usuarios)) {
            console.log(`👤 Migrando ${localData.usuarios.length} usuários...`);
            for (const u of localData.usuarios) {
                await db.query(`
                    INSERT INTO usuarios (id, nome, cpf, email, cargo, perfil, status, foto, "senhaHash", "dataCadastro")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (id) DO NOTHING
                `, [u.id, u.nome, u.cpf, u.email, u.cargo, u.perfil, u.status || 'ativo', u.foto, u.senhaHash, u.dataCadastro]);
            }
        }

        // 2. Migrate Veiculos
        if (Array.isArray(localData.veiculos)) {
            console.log(`🚚 Migrando ${localData.veiculos.length} veículos...`);
            for (const v of localData.veiculos) {
                await db.query(`
                    INSERT INTO veiculos (
                        id, marca, modelo, ano, cor, tipo, renavam, chassi, placa, combustivel, "kmAtual", "dataAquisicao", status, observacoes, "historicoKM", 
                        "tipoUnidade", "qtdEixos", "tipoImplemento", "qtdPneus", "capacidadeCarga", "possuiSeguro", "docVeiculoAnexo", seguradora, apolice, 
                        "valorMensalSeguro", "vencimentoBoletoSeguro", "inicioContratoSeguro", "validadeContratoSeguro", "contratoSeguroAnexo", "observacoesSeguro", 
                        "possuiRastreador", "empresaRastreador", "modeloRastreador", "idRastreador", "imeiRastreador", "dataInstalacaoRastreador", "statusRastreador", 
                        "valorMensalRastreador", "inicioContratoRastreador", "validadeContratoRastreador", "rastreadorContratoAnexo", "rastreadorNotaFiscalAnexo", 
                        "rastreadorOrdemServicoAnexo", "rastreadorComprovanteAnexo", "observacoesRastreador", "possuiExtintor", "tipoExtintor", "capacidadeExtintor", 
                        "seloExtintor", "dataFabricacaoExtintor", "dataRecargaExtintor", "validadeExtintor", "proximaRecargaExtintor", "statusExtintor", 
                        "extintorCertificadoAnexo", "extintorComprovanteAnexo", "extintorLaudoAnexo", "extintorNotaFiscalAnexo", "observacoesExtintor", 
                        "possuiTacografo", "marcaTacografo", "modeloTacografo", "numSerieTacografo", "dataInstalacaoTacografo", "dataUltimaAfericaoTacografo", 
                        "validadeAfericaoTacografo", "empresaAfericaoTacografo", "anexoComprovanteTacografo", "observacoesTacografo"
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                        $16, $17, $18, $19, $20, $21, $22, $23, $24, 
                        $25, $26, $27, $28, $29, $30, 
                        $31, $32, $33, $34, $35, $36, $37, 
                        $38, $39, $40, $41, $42, 
                        $43, $44, $45, $46, $47, $48, 
                        $49, $50, $51, $52, $53, $54, 
                        $55, $56, $57, $58, $59, 
                        $60, $61, $62, $63, $64, $65, 
                        $66, $67, $68, $69
                    ) ON CONFLICT (id) DO NOTHING
                `, [
                    v.id, v.marca, v.modelo, v.ano, v.cor, v.tipo, v.renavam, v.chassi, v.placa, v.combustivel, safeNum(v.kmAtual), v.dataAquisicao, v.status || 'disponivel', v.observacoes, safeJson(v.historicoKM),
                    v.tipoUnidade || 'Veículo Motorizado', safeStr(v.qtdEixos), v.tipoImplemento, safeStr(v.qtdPneus), safeStr(v.capacidadeCarga), v.possuiSeguro || 'Não', v.docVeiculoAnexo, v.seguradora, v.apolice,
                    v.valorMensalSeguro, v.vencimentoBoletoSeguro, v.inicioContratoSeguro, v.validadeContratoSeguro, v.contratoSeguroAnexo, v.observacoesSeguro,
                    v.possuiRastreador || 'Não', v.empresaRastreador, v.modeloRastreador, v.idRastreador, v.imeiRastreador, v.dataInstalacaoRastreador, v.statusRastreador,
                    v.valorMensalRastreador, v.inicioContratoRastreador, v.validadeContratoRastreador, v.rastreadorContratoAnexo, v.rastreadorNotaFiscalAnexo,
                    v.rastreadorOrdemServicoAnexo, v.rastreadorComprovanteAnexo, v.observacoesRastreador, v.possuiExtintor || 'Não', v.tipoExtintor, v.capacidadeExtintor,
                    v.seloExtintor, v.dataFabricacaoExtintor, v.dataRecargaExtintor, v.validadeExtintor, v.proximaRecargaExtintor, v.statusExtintor,
                    v.extintorCertificadoAnexo, v.extintorComprovanteAnexo, v.extintorLaudoAnexo, v.extintorNotaFiscalAnexo, v.observacoesExtintor,
                    v.possuiTacografo || 'Não', v.marcaTacografo, v.modeloTacografo, v.numSerieTacografo, v.dataInstalacaoTacografo, v.dataUltimaAfericaoTacografo,
                    v.validadeAfericaoTacografo, v.empresaAfericaoTacografo, v.anexoComprovanteTacografo, v.observacoesTacografo
                ]);
            }
        }

        // 3. Migrate Motoristas
        if (Array.isArray(localData.motoristas)) {
            console.log(`👨‍✈️ Migrando ${localData.motoristas.length} motoristas...`);
            for (const m of localData.motoristas) {
                await db.query(`
                    INSERT INTO motoristas (id, nome, cpf, rg, cnh, "categoriaCNH", "dataVencimentoCNH", status, foto, telefone, email, endereco, "cnhAnexo", "comprovanteResidenciaAnexo", observacoes, historico)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    m.id, m.nome, m.cpf, m.rg, m.cnh, m.categoriaCNH, m.dataVencimentoCNH, m.status || 'ativo', m.foto, m.telefone, m.email, m.endereco, m.cnhAnexo, m.comprovanteResidenciaAnexo, m.observacoes, safeJson(m.historico)
                ]);
            }
        }

        // 4. Migrate Abastecimentos
        if (Array.isArray(localData.abastecimentos)) {
            console.log(`⛽ Migrando ${localData.abastecimentos.length} abastecimentos...`);
            for (const a of localData.abastecimentos) {
                await db.query(`
                    INSERT INTO abastecimentos (id, "veiculoId", "motoristaId", data, combustivel, litros, "valorLitro", "valorTotal", "kmAtual", posto, comprovante, observacoes, "kmL", "custoKM")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    a.id, safeFK(a.veiculoId), safeFK(a.motoristaId), a.data, a.combustivel, safeNum(a.litros), safeNum(a.valorLitro), safeNum(a.valorTotal), safeNum(a.kmAtual), a.posto, a.comprovante, a.observacoes, safeNum(a.kmL), safeNum(a.custoKM)
                ]);
            }
        }

        // 5. Migrate Manutencoes
        if (Array.isArray(localData.manutencoes)) {
            console.log(`🔧 Migrando ${localData.manutencoes.length} ordens de serviço...`);
            for (const m of localData.manutencoes) {
                await db.query(`
                    INSERT INTO manutencoes (id, "veiculoId", data, tipo, categoria, descricao, valor, km, oficina, fornecedor, status, comprovante, anexo)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    m.id, safeFK(m.veiculoId), m.data, m.tipo, m.categoria, m.descricao, safeNum(m.valor), safeNum(m.km), m.oficina, m.fornecedor, m.status || 'Agendada', m.comprovante || m.anexo, m.anexo || m.comprovante
                ]);
            }
        }

        // 6. Migrate Pneus
        if (Array.isArray(localData.pneus)) {
            console.log(`⭕ Migrando ${localData.pneus.length} pneus...`);
            for (const p of localData.pneus) {
                // Ensure foreign key or set null
                const vehicleExists = p.veiculoAtual ? (await db.query('SELECT 1 FROM veiculos WHERE id = $1', [p.veiculoAtual])).rowCount > 0 : false;
                const vId = vehicleExists ? p.veiculoAtual : null;
                
                await db.query(`
                    INSERT INTO pneus (id, codigo, marca, modelo, medida, custo, "vidaEstimada", "kmInicial", "veiculoAtual", posicao, status, "dataInstalacao", "comprovanteAnexo", anotacoes, historico)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    p.id, p.codigo, p.marca, p.modelo, p.medida, safeNum(p.custo), safeNum(p.vidaEstimada), safeNum(p.kmInicial), vId, p.posicao, p.status || 'Regular', p.dataInstalacao, p.comprovanteAnexo, safeJson(p.anotacoes), safeJson(p.historico)
                ]);
            }
        }

        // 7. Migrate Oleos
        if (Array.isArray(localData.oleos)) {
            console.log(`🛢️  Migrando ${localData.oleos.length} trocas de óleo...`);
            for (const o of localData.oleos) {
                await db.query(`
                    INSERT INTO oleos (id, "veiculoId", "dataTroca", "kmTroca", "proximaTrocaKM", "proximaTrocaDias", "tipoOleo", valor, estabelecimento, "filtroAr", "filtroOleo", "filtroCombustivel", observacoes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    o.id, safeFK(o.veiculoId), o.dataTroca, safeNum(o.kmTroca), safeNum(o.proximaTrocaKM), o.proximaTrocaDias, o.tipoOleo, safeNum(o.valor), o.estabelecimento, safeBool(o.filtroAr), safeBool(o.filtroOleo), safeBool(o.filtroCombustivel), o.observacoes
                ]);
            }
        }

        // 8. Migrate Viagens
        if (Array.isArray(localData.viagens)) {
            console.log(`🛣️  Migrando ${localData.viagens.length} viagens...`);
            for (const vi of localData.viagens) {
                await db.query(`
                    INSERT INTO viagens (id, "veiculoId", "motoristaId", "dataSaida", "horaSaida", "dataRetorno", "horaRetorno", "kmInicial", "kmFinal", origem, destino, status, observacoes, "kmRodado", custos)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    vi.id, safeFK(vi.veiculoId), safeFK(vi.motoristaId), vi.dataSaida, vi.horaSaida, vi.dataRetorno, vi.horaRetorno, safeNum(vi.kmInicial), safeNum(vi.kmFinal), vi.origem, vi.destino, vi.status || 'Em Andamento', vi.observacoes, safeNum(vi.kmRodado), safeNum(vi.custos)
                ]);
            }
        }

        // 9. Migrate Multas
        if (Array.isArray(localData.multas)) {
            console.log(`📋 Migrando ${localData.multas.length} multas...`);
            for (const mu of localData.multas) {
                await db.query(`
                    INSERT INTO multas (id, "veiculoId", "motoristaId", data, hora, horario, codigo, descricao, gravidade, pontos, valor, status, observacoes, anexo, "anexoBoleto", "anexoComprovante", historico)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    mu.id, safeFK(mu.veiculoId), safeFK(mu.motoristaId), mu.data, mu.hora || mu.horario, mu.horario || mu.hora, mu.codigo, mu.descricao, mu.gravidade, safeNum(mu.pontos), safeNum(mu.valor), mu.status || 'Não Pago', mu.observacoes, mu.anexo, mu.anexoBoleto, mu.anexoComprovante, safeJson(mu.historico)
                ]);
            }
        }

        // 10. Migrate Logs
        if (Array.isArray(localData.logs)) {
            console.log(`📝 Migrando ${localData.logs.length} logs de auditoria...`);
            for (const l of localData.logs) {
                await db.query(`
                    INSERT INTO logs (id, data, usuario, perfil, acao, entidade, detalhes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    l.id, l.data, l.usuario, l.perfil, l.acao, l.entidade, l.detalhes
                ]);
            }
        }

        console.log("🏁 Migração de dados do db.json para o PostgreSQL concluída com total sucesso!");
        
        // backup the old JSON file so it's not run again repeatedly or mistakenly
        try {
            const backupPath = path.join(__dirname, 'data', 'db.json.bak');
            fs.renameSync(DB_PATH, backupPath);
            console.log(`💾 Backup de segurança do arquivo JSON criado em: ${backupPath}`);
        } catch (e) {
            console.warn("⚠️  Não foi possível renomear o db.json original, mas os dados estão seguros.", e.message);
        }

    } catch (err) {
        console.error("❌ Falha na migração dos dados locais:", err);
    }
}

module.exports = migrate;
