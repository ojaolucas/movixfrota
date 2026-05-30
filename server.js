/* =====================================================
   MovixFrota - Servidor Express Node.js
   Porta: 3000 | localhost:3000
   ===================================================== */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Paths ────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const UPLOADS_PATH = path.join(__dirname, 'public', 'uploads');

// Garantir que os diretórios existam
[path.join(__dirname, 'data'), UPLOADS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Middlewares ──────────────────────────────────────────
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use(session({
    secret: 'movixfrota_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // true em produção com HTTPS
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
    }
}));

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_PATH));

// ─── Configuração Multer (Upload de Fotos) ────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_PATH),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `foto_${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const isValid = allowed.test(file.mimetype);
        if (isValid) cb(null, true);
        else cb(new Error('Apenas imagens são permitidas (jpg, png, gif, webp)'));
    }
});

// ─── Funções de Banco de Dados (JSON File) ────────────────
async function addLog(usuarioNome, usuarioPerfil, acao, entidade, detalhes) {
    const id = 'LOG-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    try {
        await db.query(`
            INSERT INTO logs (id, data, usuario, perfil, acao, entidade, detalhes)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6)
        `, [id, usuarioNome, usuarioPerfil, acao, entidade, detalhes]);
    } catch (err) {
        console.error("Erro ao gravar log no PostgreSQL:", err);
    }
}

// ─── Middleware de Autenticação ───────────────────────────
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.perfil === 'Administrador') return next();
    return res.status(403).json({ error: 'Acesso restrito a Administradores.' });
}

// ─── ROTAS DE AUTENTICAÇÃO ────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const { identifier, senha, rememberMe } = req.body;
    if (!identifier || !senha) {
        return res.status(400).json({ error: 'Informe CPF/E-mail e senha.' });
    }

    try {
        const cleanId = identifier.replace(/\D/g, ''); // Remove pontuação do CPF
        // Buscar usuário por CPF (sem pontuação) ou e-mail
        const result = await db.query(
            `SELECT * FROM usuarios WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1 OR LOWER(email) = LOWER($2)`,
            [cleanId, identifier]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'CPF/E-mail não encontrado no sistema.' });
        }

        if (user.status === 'inativo') {
            return res.status(401).json({ error: 'Usuário inativo. Contate o administrador.' });
        }

        // Verificar senha (bcrypt ou texto simples para usuários legados)
        let senhaValida = false;
        if (user.senhaHash) {
            senhaValida = bcrypt.compareSync(senha, user.senhaHash);
        } else if (user.senha) {
            senhaValida = user.senha === senha;
        }

        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        // Criar sessão
        req.session.userId = user.id;
        req.session.perfil = user.perfil;
        req.session.nome = user.nome;

        if (rememberMe) {
            req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
        } else {
            req.session.cookie.maxAge = null; // Expira ao fechar o navegador
        }

        // Log de acesso
        await addLog(user.nome, user.perfil, 'Login', 'Sessão', `Login realizado com sucesso (${identifier})`);

        const { senhaHash, senha: _, ...userSafe } = user;
        res.json({ success: true, user: userSafe });
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
        await addLog(req.session.nome, req.session.perfil, 'Logout', 'Sessão', 'Usuário encerrou a sessão.');
        req.session.destroy();
        res.json({ success: true });
    } catch (err) {
        console.error("Erro no logout:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
        const { senhaHash, senha: _, ...userSafe } = user;
        res.json(userSafe);
    } catch (err) {
        console.error("Erro ao obter dados do usuário:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── UPLOAD DE FOTO ───────────────────────────────────────
app.post('/api/upload/foto', requireAuth, upload.single('foto'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url });
});

// Configuração Multer Genérica para Documentos e PDFs (Manutenção, CRLV, CNH, Seguro)
const storageDoc = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_PATH),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `doc_${uuidv4()}${ext}`);
    }
});

const uploadDoc = multer({
    storage: storageDoc,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|pdf/;
        const extname = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowed.test(file.mimetype);
        if (extname || mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens (jpg, png, jpeg) e PDFs são permitidos.'));
        }
    }
});

// Rota genérica de upload para documentos e comprovantes
app.post('/api/upload', requireAuth, uploadDoc.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url, name: req.file.originalname });
});

// ─── VEÍCULOS ─────────────────────────────────────────────
app.get('/api/veiculos', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM veiculos ORDER BY placa ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter veículos:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/veiculos', requireAuth, async (req, res) => {
    try {
        const v = req.body;
        const id = 'VEI-' + uuidv4().substr(0, 8).toUpperCase();
        const kmVal = parseFloat(v.kmAtual) || 0;
        const historicoKM = [{ data: new Date().toISOString().split('T')[0], km: kmVal }];
        
        const result = await db.query(`
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
            ) RETURNING *
        `, [
            id, v.marca, v.modelo, v.ano, v.cor, v.tipo, v.renavam, v.chassi, v.placa, v.combustivel, kmVal, v.dataAquisicao, v.status || 'disponivel', v.observacoes, JSON.stringify(historicoKM),
            v.tipoUnidade || 'Veículo Motorizado', v.qtdEixos, v.tipoImplemento, v.qtdPneus, v.capacidadeCarga, v.possuiSeguro || 'Não', v.docVeiculoAnexo, v.seguradora, v.apolice,
            v.valorMensalSeguro, v.vencimentoBoletoSeguro, v.inicioContratoSeguro, v.validadeContratoSeguro, v.contratoSeguroAnexo, v.observacoesSeguro,
            v.possuiRastreador || 'Não', v.empresaRastreador, v.modeloRastreador, v.idRastreador, v.imeiRastreador, v.dataInstalacaoRastreador, v.statusRastreador,
            v.valorMensalRastreador, v.inicioContratoRastreador, v.validadeContratoRastreador, v.rastreadorContratoAnexo, v.rastreadorNotaFiscalAnexo,
            v.rastreadorOrdemServicoAnexo, v.rastreadorComprovanteAnexo, v.observacoesRastreador, v.possuiExtintor || 'Não', v.tipoExtintor, v.capacidadeExtintor,
            v.seloExtintor, v.dataFabricacaoExtintor, v.dataRecargaExtintor, v.validadeExtintor, v.proximaRecargaExtintor, v.statusExtintor,
            v.extintorCertificadoAnexo, v.extintorComprovanteAnexo, v.extintorLaudoAnexo, v.extintorNotaFiscalAnexo, v.observacoesExtintor,
            v.possuiTacografo || 'Não', v.marcaTacografo, v.modeloTacografo, v.numSerieTacografo, v.dataInstalacaoTacografo, v.dataUltimaAfericaoTacografo,
            v.validadeAfericaoTacografo, v.empresaAfericaoTacografo, v.anexoComprovanteTacografo, v.observacoesTacografo
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Veículo', `Cadastrou veículo ${v.marca} ${v.modelo} (${v.placa})`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar veículo:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/veiculos/:id', requireAuth, async (req, res) => {
    try {
        const v = req.body;
        const originalRes = await db.query('SELECT * FROM veiculos WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Veículo não encontrado.' });
        }
        const original = originalRes.rows[0];
        const newKM = parseFloat(v.kmAtual) || 0;
        let historicoKM = original.historicoKM || [];
        if (newKM > parseFloat(original.kmAtual)) {
            historicoKM.push({ data: new Date().toISOString().split('T')[0], km: newKM });
        }

        const result = await db.query(`
            UPDATE veiculos SET
                marca = $1, modelo = $2, ano = $3, cor = $4, tipo = $5, renavam = $6, chassi = $7, placa = $8, combustivel = $9, "kmAtual" = $10, "dataAquisicao" = $11, status = $12, observacoes = $13, "historicoKM" = $14,
                "tipoUnidade" = $15, "qtdEixos" = $16, "tipoImplemento" = $17, "qtdPneus" = $18, "capacidadeCarga" = $19, "possuiSeguro" = $20, "docVeiculoAnexo" = $21, seguradora = $22, apolice = $23,
                "valorMensalSeguro" = $24, "vencimentoBoletoSeguro" = $25, "inicioContratoSeguro" = $26, "validadeContratoSeguro" = $27, "contratoSeguroAnexo" = $28, "observacoesSeguro" = $29,
                "possuiRastreador" = $30, "empresaRastreador" = $31, "modeloRastreador" = $32, "idRastreador" = $33, "imeiRastreador" = $34, "dataInstalacaoRastreador" = $35, "statusRastreador" = $36,
                "valorMensalRastreador" = $37, "inicioContratoRastreador" = $38, "validadeContratoRastreador" = $39, "rastreadorContratoAnexo" = $40, "rastreadorNotaFiscalAnexo" = $41,
                "rastreadorOrdemServicoAnexo" = $42, "rastreadorComprovanteAnexo" = $43, "observacoesRastreador" = $44, "possuiExtintor" = $45, "tipoExtintor" = $46, "capacidadeExtintor" = $47,
                "seloExtintor" = $48, "dataFabricacaoExtintor" = $49, "dataRecargaExtintor" = $50, "validadeExtintor" = $51, "proximaRecargaExtintor" = $52, "statusExtintor" = $53,
                "extintorCertificadoAnexo" = $54, "extintorComprovanteAnexo" = $55, "extintorLaudoAnexo" = $56, "extintorNotaFiscalAnexo" = $57, "observacoesExtintor" = $58,
                "possuiTacografo" = $59, "marcaTacografo" = $60, "modeloTacografo" = $61, "numSerieTacografo" = $62, "dataInstalacaoTacografo" = $63, "dataUltimaAfericaoTacografo" = $64,
                "validadeAfericaoTacografo" = $65, "empresaAfericaoTacografo" = $66, "anexoComprovanteTacografo" = $67, "observacoesTacografo" = $68
            WHERE id = $69
            RETURNING *
        `, [
            v.marca, v.modelo, v.ano, v.cor, v.tipo, v.renavam, v.chassi, v.placa, v.combustivel, newKM, v.dataAquisicao, v.status || 'disponivel', v.observacoes, JSON.stringify(historicoKM),
            v.tipoUnidade || 'Veículo Motorizado', v.qtdEixos, v.tipoImplemento, v.qtdPneus, v.capacidadeCarga, v.possuiSeguro || 'Não', v.docVeiculoAnexo, v.seguradora, v.apolice,
            v.valorMensalSeguro, v.vencimentoBoletoSeguro, v.inicioContratoSeguro, v.validadeContratoSeguro, v.contratoSeguroAnexo, v.observacoesSeguro,
            v.possuiRastreador || 'Não', v.empresaRastreador, v.modeloRastreador, v.idRastreador, v.imeiRastreador, v.dataInstalacaoRastreador, v.statusRastreador,
            v.valorMensalRastreador, v.inicioContratoRastreador, v.validadeContratoRastreador, v.rastreadorContratoAnexo, v.rastreadorNotaFiscalAnexo,
            v.rastreadorOrdemServicoAnexo, v.rastreadorComprovanteAnexo, v.observacoesRastreador, v.possuiExtintor || 'Não', v.tipoExtintor, v.capacidadeExtintor,
            v.seloExtintor, v.dataFabricacaoExtintor, v.dataRecargaExtintor, v.validadeExtintor, v.proximaRecargaExtintor, v.statusExtintor,
            v.extintorCertificadoAnexo, v.extintorComprovanteAnexo, v.extintorLaudoAnexo, v.extintorNotaFiscalAnexo, v.observacoesExtintor,
            v.possuiTacografo || 'Não', v.marcaTacografo, v.modeloTacografo, v.numSerieTacografo, v.dataInstalacaoTacografo, v.dataUltimaAfericaoTacografo,
            v.validadeAfericaoTacografo, v.empresaAfericaoTacografo, v.anexoComprovanteTacografo, v.observacoesTacografo,
            req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Veículo', `Editou veículo ${v.placa}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar veículo:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/veiculos/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM veiculos WHERE id = $1 RETURNING placa', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Veículo não encontrado.' });
        }
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Veículo', `Removeu veículo ${result.rows[0].placa}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao remover veículo:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── MOTORISTAS ───────────────────────────────────────────
app.get('/api/motoristas', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM motoristas ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter motoristas:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/motoristas', requireAuth, async (req, res) => {
    try {
        const m = req.body;
        const id = 'MOT-' + uuidv4().substr(0, 8).toUpperCase();
        const foto = m.foto || '/img/avatar-default.png';
        const historico = m.historico || [];

        const result = await db.query(`
            INSERT INTO motoristas (id, nome, cpf, rg, cnh, "categoriaCNH", "dataVencimentoCNH", status, foto, telefone, email, endereco, "cnhAnexo", "comprovanteResidenciaAnexo", observacoes, historico)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `, [
            id, m.nome, m.cpf, m.rg, m.cnh, m.categoriaCNH, m.dataVencimentoCNH, m.status || 'ativo', foto, m.telefone, m.email, m.endereco, m.cnhAnexo, m.comprovanteResidenciaAnexo, m.observacoes, JSON.stringify(historico)
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Motorista', `Cadastrou motorista ${m.nome} (CNH: ${m.cnh})`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar motorista:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/motoristas/:id', requireAuth, async (req, res) => {
    try {
        const m = req.body;
        const originalRes = await db.query('SELECT * FROM motoristas WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Motorista não encontrado.' });
        }
        const original = originalRes.rows[0];
        const foto = m.foto || original.foto;
        const historico = m.historico || original.historico;

        const result = await db.query(`
            UPDATE motoristas SET
                nome = $1, cpf = $2, rg = $3, cnh = $4, "categoriaCNH" = $5, "dataVencimentoCNH" = $6, status = $7, foto = $8, telefone = $9, email = $10, endereco = $11, "cnhAnexo" = $12, "comprovanteResidenciaAnexo" = $13, observacoes = $14, historico = $15
            WHERE id = $16
            RETURNING *
        `, [
            m.nome, m.cpf, m.rg, m.cnh, m.categoriaCNH, m.dataVencimentoCNH, m.status || 'ativo', foto, m.telefone, m.email, m.endereco, m.cnhAnexo, m.comprovanteResidenciaAnexo, m.observacoes, JSON.stringify(historico), req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Motorista', `Editou motorista ${m.nome}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao editar motorista:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/motoristas/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM motoristas WHERE id = $1 RETURNING nome', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Motorista não encontrado.' });
        }
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Motorista', `Removeu motorista ${result.rows[0].nome}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao excluir motorista:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── USUÁRIOS (Admin) ─────────────────────────────────────
app.get('/api/usuarios', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT id, nome, cpf, email, cargo, perfil, status, foto, "dataCadastro" FROM usuarios ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter usuários:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/usuarios', requireAuth, requireAdmin, async (req, res) => {
    const { nome, cpf, email, cargo, perfil, senha, status, foto } = req.body;

    if (!nome || !cpf || !email || !senha) {
        return res.status(400).json({ error: 'Nome, CPF, E-mail e Senha são obrigatórios.' });
    }

    try {
        // Verificar duplicidade de CPF e email
        const cpfClean = cpf.replace(/\D/g, '');
        
        const dupRes = await db.query(
            `SELECT id FROM usuarios WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1 OR LOWER(email) = LOWER($2)`,
            [cpfClean, email]
        );
        if (dupRes.rowCount > 0) {
            return res.status(400).json({ error: 'CPF ou E-mail já cadastrado.' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);
        const id = 'USR-' + uuidv4().substr(0, 8).toUpperCase();
        const dateNow = new Date().toISOString().split('T')[0];

        const result = await db.query(`
            INSERT INTO usuarios (id, nome, cpf, email, cargo, perfil, status, foto, "senhaHash", "dataCadastro")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, nome, cpf, email, cargo, perfil, status, foto, "dataCadastro"
        `, [
            id, nome, cpf, email, cargo, perfil || 'Operacional', status || 'ativo', foto || '/img/avatar-default.png', senhaHash, dateNow
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Usuário', `Criou usuário ${nome} (${perfil})`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar usuário:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const originalRes = await db.query('SELECT * FROM usuarios WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const original = originalRes.rows[0];

        const updates = { ...req.body };
        let senhaHash = original.senhaHash;
        if (updates.senha && updates.senha.length >= 4) {
            senhaHash = bcrypt.hashSync(updates.senha, 10);
        }

        const result = await db.query(`
            UPDATE usuarios SET
                nome = $1, cpf = $2, email = $3, cargo = $4, perfil = $5, status = $6, foto = $7, "senhaHash" = $8
            WHERE id = $9
            RETURNING id, nome, cpf, email, cargo, perfil, status, foto, "dataCadastro"
        `, [
            updates.nome || original.nome,
            updates.cpf || original.cpf,
            updates.email || original.email,
            updates.cargo || original.cargo,
            updates.perfil || original.perfil,
            updates.status || original.status,
            updates.foto || original.foto,
            senhaHash,
            req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Usuário', `Editou usuário ${result.rows[0].nome}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao editar usuário:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        if (req.params.id === req.session.userId) {
            return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário.' });
        }
        const result = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING nome', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Usuário', `Removeu usuário ${result.rows[0].nome}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao excluir usuário:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── EDITAR PERFIL DO USUÁRIO LOGADO ─────────────────────
app.put('/api/perfil', requireAuth, async (req, res) => {
    try {
        const originalRes = await db.query('SELECT * FROM usuarios WHERE id = $1', [req.session.userId]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const original = originalRes.rows[0];

        const { nome, email, cpf, cargo, senha, foto } = req.body;

        if (email && email.toLowerCase() !== original.email.toLowerCase()) {
            const dupRes = await db.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) AND id <> $2', [email, req.session.userId]);
            if (dupRes.rowCount > 0) return res.status(400).json({ error: 'E-mail já cadastrado.' });
        }

        if (cpf) {
            const cpfClean = cpf.replace(/\D/g, '');
            const dupRes = await db.query(
                `SELECT id FROM usuarios WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = $1 AND id <> $2`,
                [cpfClean, req.session.userId]
            );
            if (dupRes.rowCount > 0) return res.status(400).json({ error: 'CPF já cadastrado.' });
        }

        let senhaHash = original.senhaHash;
        if (senha && senha.length >= 4) {
            senhaHash = bcrypt.hashSync(senha, 10);
        }

        const result = await db.query(`
            UPDATE usuarios SET
                nome = $1, email = $2, cpf = $3, cargo = $4, foto = $5, "senhaHash" = $6
            WHERE id = $7
            RETURNING id, nome, cpf, email, cargo, perfil, status, foto, "dataCadastro"
        `, [
            nome || original.nome,
            email || original.email,
            cpf || original.cpf,
            cargo || original.cargo,
            foto || original.foto,
            senhaHash,
            req.session.userId
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Perfil', `Usuário ${result.rows[0].nome} atualizou seu próprio perfil`);

        if (nome) req.session.nome = nome;

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar perfil:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// ─── ABASTECIMENTOS ───────────────────────────────────────
app.get('/api/abastecimentos', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM abastecimentos ORDER BY data DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter abastecimentos:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/abastecimentos', requireAuth, async (req, res) => {
    try {
        const ab = req.body;
        const id = 'ABA-' + uuidv4().substr(0, 8).toUpperCase();
        const litros = parseFloat(ab.litros) || 0;
        const valorTotal = parseFloat(ab.valorTotal) || 0;
        const kmAtual = parseFloat(ab.kmAtual) || 0;
        const valorLitro = parseFloat(ab.valorLitro) || (litros > 0 ? (valorTotal / litros) : 0);

        let kmL = 0;
        let custoKM = 0;

        const veicRes = await db.query('SELECT "kmAtual", placa, "historicoKM" FROM veiculos WHERE id = $1', [ab.veiculoId]);
        const veic = veicRes.rows[0];

        if (veic) {
            const kmAnterior = parseFloat(veic.kmAtual) || 0;
            const kmRodado = kmAtual - kmAnterior;
            kmL = (kmRodado > 0 && litros > 0) ? parseFloat((kmRodado / litros).toFixed(2)) : 0;
            custoKM = kmL > 0 ? parseFloat((valorLitro / kmL).toFixed(2)) : 0;

            if (kmAtual > kmAnterior) {
                let historicoKM = veic.historicoKM || [];
                historicoKM.push({ data: new Date().toISOString().split('T')[0], km: kmAtual });
                await db.query('UPDATE veiculos SET "kmAtual" = $1, "historicoKM" = $2 WHERE id = $3', [kmAtual, JSON.stringify(historicoKM), ab.veiculoId]);
            }
        }

        const result = await db.query(`
            INSERT INTO abastecimentos (id, "veiculoId", "motoristaId", data, combustivel, litros, "valorLitro", "valorTotal", "kmAtual", posto, comprovante, observacoes, "kmL", "custoKM")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `, [
            id, ab.veiculoId, ab.motoristaId, ab.data, ab.combustivel, litros, valorLitro, valorTotal, kmAtual, ab.posto, ab.comprovante, ab.observacoes, kmL, custoKM
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Abastecimento', `Registrou abastecimento R$ ${valorTotal.toFixed(2)} - ${veic ? veic.placa : ''}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar abastecimento:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/abastecimentos/:id', requireAuth, async (req, res) => {
    try {
        const ab = req.body;
        const originalRes = await db.query('SELECT * FROM abastecimentos WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Abastecimento não encontrado.' });
        }
        const original = originalRes.rows[0];

        const litros = parseFloat(ab.litros) || 0;
        const valorTotal = parseFloat(ab.valorTotal) || 0;
        const kmAtual = parseFloat(ab.kmAtual) || 0;
        const valorLitro = parseFloat(ab.valorLitro) || (litros > 0 ? (valorTotal / litros) : 0);

        let kmL = 0;
        let custoKM = 0;

        const veicRes = await db.query('SELECT "kmAtual", placa, "historicoKM" FROM veiculos WHERE id = $1', [ab.veiculoId]);
        const veic = veicRes.rows[0];

        if (veic) {
            // Obter todos os outros abastecimentos deste veículo para ordenar por data/KM e estimar o anterior
            const veicAbsRes = await db.query('SELECT "kmAtual", data FROM abastecimentos WHERE "veiculoId" = $1 AND id <> $2 ORDER BY data ASC, "kmAtual" ASC', [ab.veiculoId, req.params.id]);
            const veicAbs = veicAbsRes.rows;

            let kmAnterior = 0;
            const targetDate = new Date(ab.data);
            for (let i = veicAbs.length - 1; i >= 0; i--) {
                if (new Date(veicAbs[i].data) <= targetDate && parseFloat(veicAbs[i].kmAtual) < kmAtual) {
                    kmAnterior = parseFloat(veicAbs[i].kmAtual);
                    break;
                }
            }

            const kmRodado = kmAtual - kmAnterior;
            kmL = (kmRodado > 0 && litros > 0) ? parseFloat((kmRodado / litros).toFixed(2)) : 0;
            custoKM = kmL > 0 ? parseFloat((valorLitro / kmL).toFixed(2)) : 0;

            if (kmAtual > parseFloat(veic.kmAtual)) {
                let historicoKM = veic.historicoKM || [];
                historicoKM.push({ data: ab.data, km: kmAtual });
                await db.query('UPDATE veiculos SET "kmAtual" = $1, "historicoKM" = $2 WHERE id = $3', [kmAtual, JSON.stringify(historicoKM), ab.veiculoId]);
            }
        }

        const result = await db.query(`
            UPDATE abastecimentos SET
                "veiculoId" = $1, "motoristaId" = $2, data = $3, combustivel = $4, litros = $5, "valorLitro" = $6, "valorTotal" = $7, "kmAtual" = $8, posto = $9, comprovante = $10, observacoes = $11, "kmL" = $12, "custoKM" = $13
            WHERE id = $14
            RETURNING *
        `, [
            ab.veiculoId, ab.motoristaId, ab.data, ab.combustivel, litros, valorLitro, valorTotal, kmAtual, ab.posto, ab.comprovante, ab.observacoes, kmL, custoKM, req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Abastecimento', `Editou abastecimento R$ ${valorTotal.toFixed(2)} - ${veic ? veic.placa : ''}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar abastecimento:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/abastecimentos/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM abastecimentos WHERE id = $1 RETURNING data', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Abastecimento não encontrado.' });
        }
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Abastecimento', `Removeu abastecimento do dia ${result.rows[0].data}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao excluir abastecimento:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── MANUTENÇÕES ──────────────────────────────────────────
app.get('/api/manutencoes', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM manutencoes ORDER BY data DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter manutenções:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/manutencoes', requireAuth, async (req, res) => {
    try {
        const m = req.body;
        const id = 'MAN-' + uuidv4().substr(0, 8).toUpperCase();
        const valor = parseFloat(m.valor) || 0;
        const km = parseFloat(m.km) || 0;

        // Atualizar KM do veículo se necessário
        const veicRes = await db.query('SELECT "kmAtual", "historicoKM" FROM veiculos WHERE id = $1', [m.veiculoId]);
        const veic = veicRes.rows[0];
        if (veic && km > parseFloat(veic.kmAtual)) {
            let historicoKM = veic.historicoKM || [];
            historicoKM.push({ data: new Date().toISOString().split('T')[0], km });
            await db.query('UPDATE veiculos SET "kmAtual" = $1, "historicoKM" = $2 WHERE id = $3', [km, JSON.stringify(historicoKM), m.veiculoId]);
        }

        const result = await db.query(`
            INSERT INTO manutencoes (id, "veiculoId", data, tipo, categoria, descricao, valor, km, oficina, fornecedor, status, comprovante, anexo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            id, m.veiculoId, m.data, m.tipo, m.categoria, m.descricao, valor, km, m.oficina, m.fornecedor, m.status || 'Agendada', m.comprovante || m.anexo, m.anexo || m.comprovante
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Manutenção', `Cadastrou O.S. ${m.tipo} (${m.categoria}) - R$ ${valor.toFixed(2)}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar manutenção:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/manutencoes/:id', requireAuth, async (req, res) => {
    try {
        const m = req.body;
        const originalRes = await db.query('SELECT * FROM manutencoes WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Manutenção não encontrada.' });
        }
        const original = originalRes.rows[0];

        const valor = parseFloat(m.valor) || 0;
        const km = parseFloat(m.km) || 0;

        // Atualizar KM do veículo se necessário
        const veicRes = await db.query('SELECT "kmAtual", "historicoKM" FROM veiculos WHERE id = $1', [m.veiculoId || original.veiculoId]);
        const veic = veicRes.rows[0];
        if (veic && km > parseFloat(veic.kmAtual)) {
            let historicoKM = veic.historicoKM || [];
            historicoKM.push({ data: new Date().toISOString().split('T')[0], km });
            await db.query('UPDATE veiculos SET "kmAtual" = $1, "historicoKM" = $2 WHERE id = $3', [km, JSON.stringify(historicoKM), m.veiculoId || original.veiculoId]);
        }

        const result = await db.query(`
            UPDATE manutencoes SET
                "veiculoId" = $1, data = $2, tipo = $3, categoria = $4, descricao = $5, valor = $6, km = $7, oficina = $8, fornecedor = $9, status = $10, comprovante = $11, anexo = $12
            WHERE id = $13
            RETURNING *
        `, [
            m.veiculoId || original.veiculoId,
            m.data || original.data,
            m.tipo || original.tipo,
            m.categoria || original.categoria,
            m.descricao || original.descricao,
            valor,
            km,
            m.oficina || original.oficina,
            m.fornecedor || original.fornecedor,
            m.status || original.status,
            m.comprovante || m.anexo || original.comprovante,
            m.anexo || m.comprovante || original.anexo,
            req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Manutenção', `Atualizou O.S. ${req.params.id} → Status: ${m.status || original.status}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar manutenção:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/manutencoes/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM manutencoes WHERE id = $1 RETURNING "veiculoId"', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Manutenção não encontrada.' });
        }
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Manutenção', `Removeu O.S. do veículo ID ${result.rows[0].veiculoId}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao excluir manutenção:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── PNEUS ────────────────────────────────────────────────
app.get('/api/pneus', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM pneus ORDER BY codigo ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter pneus:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/pneus', requireAuth, async (req, res) => {
    try {
        const p = req.body;
        const id = 'PNE-' + uuidv4().substr(0, 8).toUpperCase();
        const kmInicial = parseFloat(p.kmInicial) || 0;
        const vidaEstimada = parseFloat(p.vidaEstimada) || 70000;
        const custo = parseFloat(p.custo) || 0;
        const anotacoes = p.anotacoes || [];
        const historico = p.historico || [];

        const result = await db.query(`
            INSERT INTO pneus (id, codigo, marca, modelo, medida, custo, "vidaEstimada", "kmInicial", "veiculoAtual", posicao, status, "dataInstalacao", "comprovanteAnexo", anotacoes, historico)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            id, p.codigo, p.marca, p.modelo, p.medida, custo, vidaEstimada, kmInicial, p.veiculoAtual || null, p.posicao, p.status || 'Regular', p.dataInstalacao, p.comprovanteAnexo, JSON.stringify(anotacoes), JSON.stringify(historico)
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Pneu', `Cadastrou pneu ${p.marca} ${p.modelo} (${p.codigo})`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar pneu:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/pneus/:id', requireAuth, async (req, res) => {
    try {
        const p = req.body;
        const originalRes = await db.query('SELECT * FROM pneus WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Pneu não encontrado.' });
        }
        const original = originalRes.rows[0];

        const kmInicial = parseFloat(p.kmInicial) || 0;
        const vidaEstimada = parseFloat(p.vidaEstimada) || 70000;
        const custo = parseFloat(p.custo) || 0;
        const anotacoes = p.anotacoes || original.anotacoes || [];
        const historico = p.historico || original.historico || [];

        const result = await db.query(`
            UPDATE pneus SET
                codigo = $1, marca = $2, modelo = $3, medida = $4, custo = $5, "vidaEstimada" = $6, "kmInicial" = $7, "veiculoAtual" = $8, posicao = $9, status = $10, "dataInstalacao" = $11, "comprovanteAnexo" = $12, anotacoes = $13, historico = $14
            WHERE id = $15
            RETURNING *
        `, [
            p.codigo || original.codigo,
            p.marca || original.marca,
            p.modelo || original.modelo,
            p.medida || original.medida,
            custo,
            vidaEstimada,
            kmInicial,
            p.veiculoAtual || null,
            p.posicao || original.posicao,
            p.status || original.status || 'Regular',
            p.dataInstalacao || original.dataInstalacao,
            p.comprovanteAnexo || original.comprovanteAnexo,
            JSON.stringify(anotacoes),
            JSON.stringify(historico),
            req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Pneu', `Atualizou posição/rodízio do pneu ${result.rows[0].codigo}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar pneu:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/pneus/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM pneus WHERE id = $1 RETURNING codigo', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pneu não encontrado.' });
        }
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Pneu', `Excluiu pneu ${result.rows[0].codigo}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao excluir pneu:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── ÓLEO ─────────────────────────────────────────────────
app.get('/api/oleos', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM oleos ORDER BY "dataTroca" DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter trocas de óleo:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/oleos', requireAuth, async (req, res) => {
    try {
        const o = req.body;
        const id = 'OLE-' + uuidv4().substr(0, 8).toUpperCase();
        const kmTroca = parseFloat(o.kmTroca) || 0;
        const proximaTrocaKM = parseFloat(o.proximaTrocaKM) || 0;
        const valor = parseFloat(o.valor) || 0;
        const filtroAr = o.filtroAr === 'true' || o.filtroAr === true;
        const filtroOleo = o.filtroOleo === 'true' || o.filtroOleo === true;
        const filtroCombustivel = o.filtroCombustivel === 'true' || o.filtroCombustivel === true;

        // Atualizar KM do veículo
        const veicRes = await db.query('SELECT "kmAtual", placa, "historicoKM" FROM veiculos WHERE id = $1', [o.veiculoId]);
        const veic = veicRes.rows[0];
        if (veic && kmTroca > parseFloat(veic.kmAtual)) {
            let historicoKM = veic.historicoKM || [];
            historicoKM.push({ data: new Date().toISOString().split('T')[0], km: kmTroca });
            await db.query('UPDATE veiculos SET "kmAtual" = $1, "historicoKM" = $2 WHERE id = $3', [kmTroca, JSON.stringify(historicoKM), o.veiculoId]);
        }

        const result = await db.query(`
            INSERT INTO oleos (id, "veiculoId", "dataTroca", "kmTroca", "proximaTrocaKM", "proximaTrocaDias", "tipoOleo", valor, estabelecimento, "filtroAr", "filtroOleo", "filtroCombustivel", observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            id, o.veiculoId, o.dataTroca, kmTroca, proximaTrocaKM, o.proximaTrocaDias, o.tipoOleo, valor, o.estabelecimento, filtroAr, filtroOleo, filtroCombustivel, o.observacoes
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Óleo', `Registrou troca de óleo ${veic ? veic.placa : ''}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar troca de óleo:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/oleos/:id', requireAuth, async (req, res) => {
    try {
        const o = req.body;
        const originalRes = await db.query('SELECT * FROM oleos WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Troca de óleo não encontrada.' });
        }
        const original = originalRes.rows[0];

        const kmTroca = parseFloat(o.kmTroca) || 0;
        const proximaTrocaKM = parseFloat(o.proximaTrocaKM) || 0;
        const valor = parseFloat(o.valor) || 0;
        const filtroAr = o.filtroAr === 'true' || o.filtroAr === true;
        const filtroOleo = o.filtroOleo === 'true' || o.filtroOleo === true;
        const filtroCombustivel = o.filtroCombustivel === 'true' || o.filtroCombustivel === true;

        // Atualizar KM do veículo
        const veicRes = await db.query('SELECT "kmAtual", placa, "historicoKM" FROM veiculos WHERE id = $1', [o.veiculoId || original.veiculoId]);
        const veic = veicRes.rows[0];
        if (veic && kmTroca > parseFloat(veic.kmAtual)) {
            let historicoKM = veic.historicoKM || [];
            historicoKM.push({ data: new Date().toISOString().split('T')[0], km: kmTroca });
            await db.query('UPDATE veiculos SET "kmAtual" = $1, "historicoKM" = $2 WHERE id = $3', [kmTroca, JSON.stringify(historicoKM), o.veiculoId || original.veiculoId]);
        }

        const result = await db.query(`
            UPDATE oleos SET
                "veiculoId" = $1, "dataTroca" = $2, "kmTroca" = $3, "proximaTrocaKM" = $4, "proximaTrocaDias" = $5, "tipoOleo" = $6, valor = $7, estabelecimento = $8, "filtroAr" = $9, "filtroOleo" = $10, "filtroCombustivel" = $11, observacoes = $12
            WHERE id = $13
            RETURNING *
        `, [
            o.veiculoId || original.veiculoId,
            o.dataTroca || original.dataTroca,
            kmTroca,
            proximaTrocaKM,
            o.proximaTrocaDias || original.proximaTrocaDias,
            o.tipoOleo || original.tipoOleo,
            valor,
            o.estabelecimento || original.estabelecimento,
            filtroAr,
            filtroOleo,
            filtroCombustivel,
            o.observacoes || original.observacoes,
            req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Óleo', `Editou troca de óleo do veículo ${veic ? veic.placa : ''}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar troca de óleo:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/oleos/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM oleos WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Troca de óleo não encontrada.' });
        }
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Óleo', `Excluiu troca de óleo ID ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao excluir troca de óleo:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── VIAGENS ──────────────────────────────────────────────
app.get('/api/viagens', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM viagens ORDER BY "dataSaida" DESC, "horaSaida" DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter viagens:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/viagens', requireAuth, async (req, res) => {
    try {
        const v = req.body;
        const id = 'VIA-' + uuidv4().substr(0, 8).toUpperCase();
        const kmInicial = parseFloat(v.kmInicial) || 0;
        const kmFinal = parseFloat(v.kmFinal) || 0;
        const custos = parseFloat(v.custos) || 0;
        const kmRodado = kmFinal > kmInicial ? kmFinal - kmInicial : 0;

        const result = await db.query(`
            INSERT INTO viagens (id, "veiculoId", "motoristaId", "dataSaida", "horaSaida", "dataRetorno", "horaRetorno", "kmInicial", "kmFinal", origem, destino, status, observacoes, "kmRodado", custos)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            id, v.veiculoId, v.motoristaId, v.dataSaida, v.horaSaida, v.dataRetorno, v.horaRetorno, kmInicial, kmFinal, v.origem, v.destino, v.status || 'Em Andamento', v.observacoes, kmRodado, custos
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Viagem', `Registrou viagem ${v.origem} → ${v.destino}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar viagem:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/viagens/:id', requireAuth, async (req, res) => {
    try {
        const updates = req.body;
        const originalRes = await db.query('SELECT * FROM viagens WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Viagem não encontrada.' });
        }
        const original = originalRes.rows[0];

        const kmInicial = updates.kmInicial !== undefined ? parseFloat(updates.kmInicial) || 0 : parseFloat(original.kmInicial) || 0;
        const kmFinal = updates.kmFinal !== undefined ? parseFloat(updates.kmFinal) || 0 : parseFloat(original.kmFinal) || 0;
        const custos = updates.custos !== undefined ? parseFloat(updates.custos) || 0 : parseFloat(original.custos) || 0;

        let kmRodado = 0;
        if (kmFinal > kmInicial) {
            kmRodado = kmFinal - kmInicial;
            // Atualizar KM do veículo
            const veiculoId = updates.veiculoId || original.veiculoId;
            const veicRes = await db.query('SELECT "kmAtual", "historicoKM" FROM veiculos WHERE id = $1', [veiculoId]);
            const veic = veicRes.rows[0];
            if (veic && kmFinal > parseFloat(veic.kmAtual)) {
                let historicoKM = veic.historicoKM || [];
                historicoKM.push({ data: new Date().toISOString().split('T')[0], km: kmFinal });
                await db.query('UPDATE veiculos SET "kmAtual" = $1, "historicoKM" = $2 WHERE id = $3', [kmFinal, JSON.stringify(historicoKM), veiculoId]);
            }
        }

        const result = await db.query(`
            UPDATE viagens SET
                "veiculoId" = $1, "motoristaId" = $2, "dataSaida" = $3, "horaSaida" = $4, "dataRetorno" = $5, "horaRetorno" = $6, "kmInicial" = $7, "kmFinal" = $8, origem = $9, destino = $10, status = $11, observacoes = $12, "kmRodado" = $13, custos = $14
            WHERE id = $15
            RETURNING *
        `, [
            updates.veiculoId || original.veiculoId,
            updates.motoristaId || original.motoristaId,
            updates.dataSaida || original.dataSaida,
            updates.horaSaida || original.horaSaida,
            updates.dataRetorno || original.dataRetorno,
            updates.horaRetorno || original.horaRetorno,
            kmInicial,
            kmFinal,
            updates.origem || original.origem,
            updates.destino || original.destino,
            updates.status || original.status,
            updates.observacoes || original.observacoes,
            kmRodado,
            custos,
            req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Viagem', `Editou/Atualizou viagem ${req.params.id}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar viagem:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/viagens/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM viagens WHERE id = $1 RETURNING origem, destino', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Viagem não encontrada.' });
        }
        const v = result.rows[0];
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Viagem', `Excluiu viagem ${v.origem} → ${v.destino}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao excluir viagem:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── MULTAS ───────────────────────────────────────────────
app.get('/api/multas', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM multas ORDER BY data DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter multas:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/multas', requireAuth, async (req, res) => {
    try {
        const m = req.body;
        const id = 'MUL-' + uuidv4().substr(0, 8).toUpperCase();
        const valor = parseFloat(m.valor) || 0;
        const historico = [
            {
                data: new Date().toISOString(),
                usuario: req.session.nome,
                acao: 'Cadastro Inicial',
                status: m.status || 'Não Pago'
            }
        ];

        const result = await db.query(`
            INSERT INTO multas (id, "veiculoId", "motoristaId", data, hora, horario, codigo, descricao, gravidade, pontos, valor, status, observacoes, anexo, "anexoBoleto", "anexoComprovante", historico, "associacaoTipo", "viagemId")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `, [
            id,
            m.veiculoId && m.veiculoId !== "" ? m.veiculoId : null,
            m.motoristaId && m.motoristaId !== "" ? m.motoristaId : null,
            m.data,
            m.hora || m.horario,
            m.horario || m.hora,
            m.codigo,
            m.descricao,
            m.gravidade,
            parseInt(m.pontos) || 0,
            valor,
            m.status || 'Não Pago',
            m.observacoes,
            m.anexo,
            m.anexoBoleto,
            m.anexoComprovante,
            JSON.stringify(historico),
            m.associacaoTipo || 'sem_motorista',
            m.viagemId && m.viagemId !== "" ? m.viagemId : null
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Cadastro', 'Multa', `Registrou multa no valor de R$ ${valor.toFixed(2)}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao cadastrar multa:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/api/multas/:id', requireAuth, async (req, res) => {
    try {
        const m = req.body;
        const originalRes = await db.query('SELECT * FROM multas WHERE id = $1', [req.params.id]);
        if (originalRes.rowCount === 0) {
            return res.status(404).json({ error: 'Multa não encontrada.' });
        }
        const original = originalRes.rows[0];
        const valor = parseFloat(m.valor) || 0;

        let historico = original.historico || [];
        let actionDesc = 'Dados da multa editados';
        if (original.status !== m.status) {
            actionDesc = `Status alterado de "${original.status}" para "${m.status}"`;
        }

        historico.push({
            data: new Date().toISOString(),
            usuario: req.session.nome,
            acao: actionDesc,
            status: m.status || original.status
        });

        const result = await db.query(`
            UPDATE multas SET
                "veiculoId" = $1, "motoristaId" = $2, data = $3, hora = $4, horario = $5, codigo = $6, descricao = $7, gravidade = $8, pontos = $9, valor = $10, status = $11, observacoes = $12, anexo = $13, "anexoBoleto" = $14, "anexoComprovante" = $15, historico = $16, "associacaoTipo" = $17, "viagemId" = $18
            WHERE id = $19
            RETURNING *
        `, [
            m.veiculoId && m.veiculoId !== "" ? m.veiculoId : original.veiculoId,
            m.motoristaId !== undefined ? (m.motoristaId && m.motoristaId !== "" ? m.motoristaId : null) : original.motoristaId,
            m.data || original.data,
            m.hora || m.horario || original.hora,
            m.horario || m.hora || original.horario,
            m.codigo || original.codigo,
            m.descricao || original.descricao,
            m.gravidade || original.gravidade,
            parseInt(m.pontos) || 0,
            valor,
            m.status || original.status,
            m.observacoes || original.observacoes,
            m.anexo || original.anexo,
            m.anexoBoleto || original.anexoBoleto,
            m.anexoComprovante || original.anexoComprovante,
            JSON.stringify(historico),
            m.associacaoTipo || original.associacaoTipo || 'sem_motorista',
            m.viagemId !== undefined ? (m.viagemId && m.viagemId !== "" ? m.viagemId : null) : (original.viagemId || null),
            req.params.id
        ]);

        await addLog(req.session.nome, req.session.perfil, 'Edição', 'Multa', `Atualizou dados da multa ${req.params.id}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar multa:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/multas/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM multas WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Multa não encontrada.' });
        }
        await addLog(req.session.nome, req.session.perfil, 'Exclusão', 'Multa', `Excluiu multa ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao excluir multa:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// ─── LEGIACY DOCUMENTS FALLBACK (CACHE COMPATIBILITY) ─────
app.get('/api/documentos', requireAuth, (req, res) => {
    res.json([]);
});

// ─── LOGS DE AUDITORIA ────────────────────────────────────
app.get('/api/logs', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM logs ORDER BY data DESC LIMIT 300');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao obter logs:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/api/logs', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM logs');
        const id = 'LOG-RESET';
        await db.query(`
            INSERT INTO logs (id, data, usuario, perfil, acao, entidade, detalhes)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3, 'Limpeza de Logs', 'Banco de Dados', 'Auditoria resetada pelo administrador.')
        `, [id, req.session.nome, req.session.perfil]);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao limpar logs:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── MÉTRICAS PARA DASHBOARD ──────────────────────────────
app.get('/api/metricas', requireAuth, async (req, res) => {
    try {
        const today = new Date();
        const tenDays = new Date(); tenDays.setDate(today.getDate() + 10);

        const [
            veiculosRes,
            motoristasRes,
            abastecimentosRes,
            manutencoesRes,
            oleosRes,
            pneusRes,
            multasRes
        ] = await Promise.all([
            db.query('SELECT "kmAtual", "historicoKM", status FROM veiculos'),
            db.query('SELECT status, "dataVencimentoCNH" FROM motoristas'),
            db.query('SELECT "valorTotal", "kmL" FROM abastecimentos'),
            db.query('SELECT valor, status FROM manutencoes'),
            db.query('SELECT valor FROM oleos'),
            db.query('SELECT custo FROM pneus'),
            db.query('SELECT valor FROM multas')
        ]);

        const veiculos = veiculosRes.rows;
        const motoristas = motoristasRes.rows;
        const abastecimentos = abastecimentosRes.rows;
        const manutencoes = manutencoesRes.rows;
        const oleos = oleosRes.rows;
        const pneus = pneusRes.rows;
        const multas = multasRes.rows;

        let kmTotal = 0;
        veiculos.forEach(v => {
            const hist = Array.isArray(v.historicoKM) ? v.historicoKM : [];
            const first = hist[0] ? parseFloat(hist[0].km) || parseFloat(v.kmAtual) || 0 : parseFloat(v.kmAtual) || 0;
            kmTotal += Math.max(0, (parseFloat(v.kmAtual) || 0) - first);
        });

        const totalCombustivel = abastecimentos.reduce((s, a) => s + (parseFloat(a.valorTotal) || 0), 0);
        const totalManutencao = manutencoes.reduce((s, m) => s + (parseFloat(m.valor) || 0), 0);
        const totalLubrificantes = oleos.reduce((s, o) => s + (parseFloat(o.valor) || 0), 0);
        const totalPneus = pneus.reduce((s, p) => s + (parseFloat(p.custo) || 0), 0);

        const kmlValid = abastecimentos.filter(a => parseFloat(a.kmL) > 0);
        const mediaKML = kmlValid.length > 0 ? kmlValid.reduce((s, a) => s + parseFloat(a.kmL), 0) / kmlValid.length : 0;

        // Alertas rápidos
        const cnhVencidas = motoristas.filter(m => new Date(m.dataVencimentoCNH) < today).length;
        const cnhAVencer = motoristas.filter(m => { const d = new Date(m.dataVencimentoCNH); return d >= today && d <= tenDays; }).length;
        const manutAtrasadas = manutencoes.filter(m => m.status === 'Atrasada').length;

        // Multas metrics
        const totalMultasVal = multas.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
        const totalMultasCount = multas.length;

        res.json({
            kmTotalFrota: kmTotal || 148200,
            totalGastoCombustivel: totalCombustivel,
            totalGastoManutencao: totalManutencao,
            totalGastoLubrificantes: totalLubrificantes,
            totalGastoPneus: totalPneus,
            mediaKMLGeral: parseFloat(mediaKML.toFixed(2)) || 9.8,
            veiculosEmManutencao: veiculos.filter(v => v.status === 'em_manutencao').length,
            totalVeiculos: veiculos.length,
            totalMotoristas: motoristas.filter(m => m.status === 'ativo').length,
            cnhsVencidas: cnhVencidas,
            cnhsAVencer: cnhAVencer,
            manutencaoAtrasada: manutAtrasadas,
            totalMultas: totalMultasCount,
            valorTotalMultas: totalMultasVal
        });
    } catch (err) {
        console.error("Erro ao obter métricas do dashboard:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── ALERTAS DINÂMICOS ────────────────────────────────────
app.get('/api/alertas', requireAuth, async (req, res) => {
    try {
        const alerts = [];
        const today = new Date();
        const tenDays = new Date(); tenDays.setDate(today.getDate() + 10);

        const [
            motoristasRes,
            manutencoesRes,
            multasRes,
            pneusRes
        ] = await Promise.all([
            db.query('SELECT id, nome, "dataVencimentoCNH" FROM motoristas'),
            db.query('SELECT m.id, m.km, m.tipo, m.status, v.placa, m."veiculoId" FROM manutencoes m LEFT JOIN veiculos v ON m."veiculoId" = v.id WHERE m.status = \'Atrasada\''),
            db.query('SELECT m.id, m.data, m.valor, m.status, v.placa, m."veiculoId" FROM multas m LEFT JOIN veiculos v ON m."veiculoId" = v.id WHERE m.status = \'Não Pago\''),
            db.query('SELECT p.id, p.codigo, p."vidaEstimada", p."kmInicial", v.placa, v."kmAtual" FROM pneus p JOIN veiculos v ON p."veiculoAtual" = v.id WHERE p."veiculoAtual" IS NOT NULL')
        ]);

        const motoristas = motoristasRes.rows;
        const manutencoes = manutencoesRes.rows;
        const multas = multasRes.rows;
        const pneus = pneusRes.rows;

        motoristas.forEach(m => {
            const exp = new Date(m.dataVencimentoCNH);
            if (exp < today) alerts.push({ id: `ALT-CNH-EXP-${m.id}`, prioridade: 'Alta', titulo: `CNH Vencida: ${m.nome}`, desc: `Venceu em ${m.dataVencimentoCNH}`, link: 'motoristas', targetId: m.id });
            else if (exp <= tenDays) alerts.push({ id: `ALT-CNH-PRX-${m.id}`, prioridade: 'Média', titulo: `CNH a Vencer: ${m.nome}`, desc: `Vence em ${m.dataVencimentoCNH}`, link: 'motoristas', targetId: m.id });
        });

        manutencoes.forEach(m => {
            alerts.push({ id: `ALT-MAN-${m.id}`, prioridade: 'Alta', titulo: `Manutenção Atrasada: ${m.placa || ''}`, desc: `O.S. ${m.tipo} agendada para ${m.km} KM`, link: 'manutencoes', targetId: m.id });
        });

        multas.forEach(m => {
            const label = m.placa || 'Frota';
            const infraDate = new Date(m.data);
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - 30);
            const formattedVal = parseFloat(m.valor) || 0;
            
            if (infraDate < limitDate) {
                alerts.push({
                    id: `ALT-MUL-EXP-${m.id}`,
                    prioridade: 'Alta',
                    titulo: `Multa Crítica pendente: ${label}`,
                    desc: `Valor de R$ ${formattedVal.toFixed(2)} registrado em ${m.data.split('-').reverse().join('/')}`,
                    link: 'multas',
                    targetId: m.id
                });
            } else {
                alerts.push({
                    id: `ALT-MUL-PRX-${m.id}`,
                    prioridade: 'Média',
                    titulo: `Multa pendente de pagamento: ${label}`,
                    desc: `Valor de R$ ${formattedVal.toFixed(2)} registrado em ${m.data.split('-').reverse().join('/')}`,
                    link: 'multas',
                    targetId: m.id
                });
            }
        });

        pneus.forEach(p => {
            const kmRodado = parseFloat(p.kmAtual) - parseFloat(p.kmInicial);
            const kmLeft = Math.max(0, parseFloat(p.vidaEstimada) - kmRodado);
            const pct = parseFloat(p.vidaEstimada) > 0 ? (kmLeft / parseFloat(p.vidaEstimada)) * 100 : 0;
            if (pct < 10) alerts.push({ id: `ALT-PNE-${p.id}`, prioridade: 'Alta', titulo: `Trocar Pneu: ${p.placa}`, desc: `Pneu [${p.codigo}] com apenas ${Math.round(kmLeft)} KM restantes`, link: 'pneus', targetId: p.id });
            else if (pct < 25) alerts.push({ id: `ALT-PNE-PRX-${p.id}`, prioridade: 'Média', titulo: `Desgaste Pneu: ${p.placa}`, desc: `Pneu [${p.codigo}] com ${Math.round(pct)}% de vida útil`, link: 'pneus', targetId: p.id });
        });

        res.json(alerts);
    } catch (err) {
        console.error("Erro ao obter alertas dinâmicos:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// ─── ROTA PRINCIPAL (SPA) ─────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── SEED DATA ────────────────────────────────────────────
function getSeedData() {
    // Gerar hash da senha padrão "movix@2026"
    const senhaAdmin = bcrypt.hashSync('movix@2026', 10);
    const senhaGestor = bcrypt.hashSync('movix@2026', 10);
    const senhaOp = bcrypt.hashSync('movix@2026', 10);
    const senhaView = bcrypt.hashSync('movix@2026', 10);

    const usuarios = [
        {
            id: 'USR-001', nome: 'Carlos Silveira', cpf: '123.456.789-00', email: 'carlos.admin@movixfrota.com.br',
            cargo: 'Administrador de Frota', perfil: 'Administrador', status: 'ativo',
            foto: '/img/avatar-default.png', senhaHash: senhaAdmin, dataCadastro: '2024-01-01'
        },
        {
            id: 'USR-002', nome: 'Renata Souza', cpf: '234.567.890-11', email: 'renata.gestora@movixfrota.com.br',
            cargo: 'Gerente Operacional', perfil: 'Gestor', status: 'ativo',
            foto: '/img/avatar-default.png', senhaHash: senhaGestor, dataCadastro: '2024-01-01'
        },
        {
            id: 'USR-003', nome: 'Marcos Lima', cpf: '345.678.901-22', email: 'marcos.op@movixfrota.com.br',
            cargo: 'Operador de Pátio', perfil: 'Operacional', status: 'ativo',
            foto: '/img/avatar-default.png', senhaHash: senhaOp, dataCadastro: '2024-01-01'
        },
        {
            id: 'USR-004', nome: 'Juliana Vieira', cpf: '456.789.012-33', email: 'juliana.view@movixfrota.com.br',
            cargo: 'Auditora Financeira', perfil: 'Visualizador', status: 'ativo',
            foto: '/img/avatar-default.png', senhaHash: senhaView, dataCadastro: '2024-01-01'
        }
    ];

    const veiculos = [
        { id: 'V-1', marca: 'Scania', modelo: 'R 450', ano: 2021, cor: 'Azul Metálico', tipo: 'Caminhão', renavam: '98765432101', chassi: '9BWZZZ99Z99999901', placa: 'ABC-1234', combustivel: 'Diesel', kmAtual: 145000, dataAquisicao: '2021-03-10', status: 'disponivel', observacoes: 'Operação interestadual.', historicoKM: [{ data: '2021-03-10', km: 0 }, { data: '2025-05-01', km: 144000 }] },
        { id: 'V-2', marca: 'Ford', modelo: 'Cargo 2429', ano: 2019, cor: 'Branco', tipo: 'Caminhão', renavam: '98765432102', chassi: '9BWZZZ99Z99999902', placa: 'KLY-5678', combustivel: 'Diesel', kmAtual: 284300, dataAquisicao: '2019-06-15', status: 'em_manutencao', observacoes: 'Amortecedores pendentes.', historicoKM: [{ data: '2019-06-15', km: 0 }, { data: '2025-05-01', km: 283000 }] },
        { id: 'V-3', marca: 'Mercedes-Benz', modelo: 'Sprinter 416', ano: 2022, cor: 'Cinza', tipo: 'Van/Furgão', renavam: '98765432103', chassi: '9BWZZZ99Z99999903', placa: 'MXF-9012', combustivel: 'Diesel', kmAtual: 86400, dataAquisicao: '2022-09-20', status: 'disponivel', observacoes: 'Baú refrigerado.', historicoKM: [{ data: '2022-09-20', km: 0 }, { data: '2025-05-01', km: 85100 }] },
        { id: 'V-4', marca: 'Fiat', modelo: 'Fiorino Endurance', ano: 2020, cor: 'Branco', tipo: 'Utilitário', renavam: '98765432104', chassi: '9BWZZZ99Z99999904', placa: 'HJG-4432', combustivel: 'Flex', kmAtual: 112000, dataAquisicao: '2020-01-22', status: 'disponivel', observacoes: 'Entregas urbanas.', historicoKM: [{ data: '2020-01-22', km: 0 }, { data: '2025-05-01', km: 111000 }] },
        { id: 'V-5', marca: 'Chevrolet', modelo: 'Onix 1.0 Turbo', ano: 2023, cor: 'Preto', tipo: 'Passeio', renavam: '98765432105', chassi: '9BWZZZ99Z99999905', placa: 'QWE-7766', combustivel: 'Flex', kmAtual: 34500, dataAquisicao: '2023-05-05', status: 'disponivel', observacoes: 'Uso gerencial.', historicoKM: [{ data: '2023-05-05', km: 0 }, { data: '2025-05-01', km: 33800 }] },
        { id: 'V-6', marca: 'Toyota', modelo: 'Hilux CD 4x4', ano: 2022, cor: 'Prata', tipo: 'Picape', renavam: '98765432106', chassi: '9BWZZZ99Z99999906', placa: 'OIU-8899', combustivel: 'Diesel', kmAtual: 92300, dataAquisicao: '2022-02-18', status: 'disponivel', observacoes: 'Apoio a obras.', historicoKM: [{ data: '2022-02-18', km: 0 }, { data: '2025-05-01', km: 91000 }] }
    ];

    const motoristas = [
        { id: 'M-1', nome: 'Antônio Santos', cpf: '123.456.789-01', rg: '12.345.678-9', cnh: '987654321', categoriaCNH: 'E', dataVencimentoCNH: '2027-11-20', telefone: '(11) 98765-4321', email: 'antonio.santos@movix.com.br', endereco: 'Rua das Flores, 123 - São Paulo/SP', status: 'ativo', observacoes: 'Motorista sênior.', foto: '/img/avatar-default.png' },
        { id: 'M-2', nome: 'Roberto Albuquerque', cpf: '234.567.890-12', rg: '23.456.789-0', cnh: '876543210', categoriaCNH: 'D', dataVencimentoCNH: '2026-05-20', telefone: '(11) 97654-3210', email: 'roberto.albuquerque@movix.com.br', endereco: 'Av. Paulista, 1500 - São Paulo/SP', status: 'ativo', observacoes: 'CNH próxima do vencimento.', foto: '/img/avatar-default.png' },
        { id: 'M-3', nome: 'Julio Cesar Cruz', cpf: '345.678.901-23', rg: '34.567.890-1', cnh: '765432109', categoriaCNH: 'E', dataVencimentoCNH: '2026-04-10', telefone: '(21) 96543-2109', email: 'julio.cruz@movix.com.br', endereco: 'Rua do Ouvidor, 45 - Rio de Janeiro/RJ', status: 'ativo', observacoes: 'CNH VENCIDA.', foto: '/img/avatar-default.png' },
        { id: 'M-4', nome: 'Amanda Silveira', cpf: '456.789.012-34', rg: '45.678.901-2', cnh: '654321098', categoriaCNH: 'B', dataVencimentoCNH: '2029-08-15', telefone: '(11) 95432-1098', email: 'amanda.silveira@movix.com.br', endereco: 'Av. Brasil, 450 - Campinas/SP', status: 'ativo', observacoes: '', foto: '/img/avatar-default.png' },
        { id: 'M-5', nome: 'Douglas Costa', cpf: '567.890.123-45', rg: '56.789.012-3', cnh: '543210987', categoriaCNH: 'C', dataVencimentoCNH: '2028-02-28', telefone: '(19) 94321-0987', email: 'douglas.costa@movix.com.br', endereco: 'Rua Tiradentes, 89 - Santos/SP', status: 'ativo', observacoes: '', foto: '/img/avatar-default.png' }
    ];

    const multas = [
        {
            id: 'MUL-1',
            veiculoId: 'V-1',
            data: '2026-05-10',
            horario: '14:30',
            descricao: 'Excesso de velocidade (acima de 20% do limite)',
            valor: 195.23,
            motoristaId: 'M-1',
            status: 'Não Pago',
            observacoes: 'Autuação na Rodovia Presidente Dutra KM 120.',
            anexo: '',
            historico: [{ data: '2026-05-10T14:30:00Z', usuario: 'Sistema', acao: 'Cadastro Inicial', status: 'Não Pago' }]
        },
        {
            id: 'MUL-2',
            veiculoId: 'V-3',
            data: '2026-05-12',
            horario: '09:15',
            descricao: 'Avanço de sinal vermelho',
            valor: 293.47,
            motoristaId: 'M-2',
            status: 'Pago',
            observacoes: 'Comprovante anexado.',
            anexo: '',
            historico: [
                { data: '2026-05-12T09:15:00Z', usuario: 'Sistema', acao: 'Cadastro Inicial', status: 'Não Pago' },
                { data: '2026-05-13T10:00:00Z', usuario: 'Carlos Silveira', acao: 'Pagamento efetuado', status: 'Pago' }
            ]
        },
        {
            id: 'MUL-3',
            veiculoId: 'V-2',
            data: '2026-04-15',
            horario: '16:45',
            descricao: 'Estacionamento em local proibido',
            valor: 130.16,
            motoristaId: '',
            status: 'Recorrendo',
            observacoes: 'Aguardando parecer da JARI.',
            anexo: '',
            historico: [
                { data: '2026-04-15T16:45:00Z', usuario: 'Sistema', acao: 'Cadastro Inicial', status: 'Não Pago' },
                { data: '2026-04-18T14:20:00Z', usuario: 'Renata Souza', acao: 'Entrada em recurso administrativo', status: 'Recorrendo' }
            ]
        }
    ];

    const abastecimentos = [
        { id: 'A-1', data: '2026-05-20', veiculoId: 'V-1', motoristaId: 'M-1', kmAtual: 145000, litros: 320, valorTotal: 1920.00, valorLitro: 6.00, posto: 'Posto Ipiranga - Rod. Dutra KM 80', combustivel: 'Diesel', kmL: 4.8, custoKM: 1.25 },
        { id: 'A-2', data: '2026-05-18', veiculoId: 'V-3', motoristaId: 'M-2', kmAtual: 86400, litros: 65, valorTotal: 390.00, valorLitro: 6.00, posto: 'Posto Shell - Marginal Pinheiros', combustivel: 'Diesel', kmL: 9.5, custoKM: 0.63 },
        { id: 'A-3', data: '2026-05-15', veiculoId: 'V-4', motoristaId: 'M-4', kmAtual: 112000, litros: 45, valorTotal: 252.00, valorLitro: 5.60, posto: 'Posto Petrobras - Av. Brasil', combustivel: 'Gasolina', kmL: 12.0, custoKM: 0.47 },
        { id: 'A-4', data: '2026-05-12', veiculoId: 'V-5', motoristaId: 'M-4', kmAtual: 34500, litros: 38, valorTotal: 212.80, valorLitro: 5.60, posto: 'Posto BR - Campinas', combustivel: 'Gasolina', kmL: 13.5, custoKM: 0.41 },
        { id: 'A-5', data: '2026-05-10', veiculoId: 'V-2', motoristaId: 'M-5', kmAtual: 284300, litros: 180, valorTotal: 1080.00, valorLitro: 6.00, posto: 'RodoPosto 2000 - Fernão Dias', combustivel: 'Diesel', kmL: 3.9, custoKM: 1.54 },
        { id: 'A-6', data: '2026-04-18', veiculoId: 'V-1', motoristaId: 'M-1', kmAtual: 143460, litros: 310, valorTotal: 1860.00, valorLitro: 6.00, posto: 'Posto Ipiranga', combustivel: 'Diesel', kmL: 4.7, custoKM: 1.28 },
        { id: 'A-7', data: '2026-04-12', veiculoId: 'V-3', motoristaId: 'M-2', kmAtual: 85780, litros: 62, valorTotal: 372.00, valorLitro: 6.00, posto: 'Posto Shell', combustivel: 'Diesel', kmL: 9.7, custoKM: 0.62 },
        { id: 'A-8', data: '2026-03-24', veiculoId: 'V-1', motoristaId: 'M-1', kmAtual: 142000, litros: 330, valorTotal: 1947.00, valorLitro: 5.90, posto: 'Posto Ipiranga', combustivel: 'Diesel', kmL: 4.8, custoKM: 1.23 },
        { id: 'A-9', data: '2026-03-10', veiculoId: 'V-4', motoristaId: 'M-4', kmAtual: 110460, litros: 44, valorTotal: 242.00, valorLitro: 5.50, posto: 'Posto Petrobras', combustivel: 'Gasolina', kmL: 12.3, custoKM: 0.45 },
        { id: 'A-10', data: '2026-02-15', veiculoId: 'V-2', motoristaId: 'M-5', kmAtual: 282400, litros: 200, valorTotal: 1180.00, valorLitro: 5.90, posto: 'RodoPosto 2000', combustivel: 'Diesel', kmL: 4.1, custoKM: 1.44 }
    ];

    const manutencoes = [
        { id: 'MAN-001', veiculoId: 'V-1', tipo: 'Preventiva', categoria: 'Mecânica', data: '2026-05-10', km: 144200, oficina: 'Mecânica Diesel Express', fornecedor: 'Pecas Truck SA', descricao: 'Revisão preventiva e lubrificação.', valor: 2450.00, status: 'Realizada', anexo: '' },
        { id: 'MAN-002', veiculoId: 'V-2', tipo: 'Corretiva', categoria: 'Suspensão', data: '2026-05-22', km: 284300, oficina: 'Bortoloto Amortecedores', fornecedor: 'Bortoloto SA', descricao: 'Substituição das bolsas pneumáticas traseiras.', valor: 4800.00, status: 'Em andamento', anexo: '' },
        { id: 'MAN-003', veiculoId: 'V-3', tipo: 'Preventiva', categoria: 'Elétrica', data: '2026-04-15', km: 85200, oficina: 'Auto Elétrica Central', fornecedor: 'Auto Elétrica Central', descricao: 'Revisão de alternador e fiação.', valor: 850.00, status: 'Realizada', anexo: '' },
        { id: 'MAN-004', veiculoId: 'V-4', tipo: 'Corretiva', categoria: 'Freios', data: '2026-05-01', km: 111500, oficina: 'Freios Campinas', fornecedor: 'Freios Campinas', descricao: 'Substituição de pastilhas e discos de freio.', valor: 1200.00, status: 'Realizada', anexo: '' },
        { id: 'MAN-005', veiculoId: 'V-1', tipo: 'Preventiva', categoria: 'Mecânica', data: '2026-05-05', km: 144000, oficina: 'Scania AutoService', fornecedor: 'Scania', descricao: 'Manutenção programada de 140k KM. Atrasada.', valor: 3500.00, status: 'Atrasada', anexo: '' }
    ];

    const pneus = [
        { id: 'P-1', codigo: 'PN-88771', marca: 'Michelin', modelo: 'X Multi Z', dataInstalacao: '2024-05-10', kmInicial: 120000, vidaEstimada: 80000, custo: 2800.00, posicao: 'Dianteiro Esquerdo', veiculoAtual: 'V-1' },
        { id: 'P-2', codigo: 'PN-88772', marca: 'Michelin', modelo: 'X Multi Z', dataInstalacao: '2024-05-10', kmInicial: 120000, vidaEstimada: 80000, custo: 2800.00, posicao: 'Dianteiro Direito', veiculoAtual: 'V-1' },
        { id: 'P-3', codigo: 'PN-99441', marca: 'Bridgestone', modelo: 'M729', dataInstalacao: '2023-11-20', kmInicial: 240000, vidaEstimada: 60000, custo: 2100.00, posicao: 'Traseiro Esquerdo', veiculoAtual: 'V-2' },
        { id: 'P-4', codigo: 'PN-99442', marca: 'Bridgestone', modelo: 'M729', dataInstalacao: '2023-11-20', kmInicial: 240000, vidaEstimada: 60000, custo: 2100.00, posicao: 'Traseiro Direito', veiculoAtual: 'V-2' }
    ];

    const oleos = [
        { id: 'O-1', dataTroca: '2026-05-01', veiculoId: 'V-1', kmTroca: 144000, estabelecimento: 'Scania AutoService', tipoOleo: 'Lubrax Advento 15W40', filtroAr: true, filtroCombustivel: true, filtroOleo: true, proximaTrocaKM: 154000, proximaTrocaDias: '2026-11-01', valor: 680.00 },
        { id: 'O-2', dataTroca: '2026-05-15', veiculoId: 'V-3', kmTroca: 86000, estabelecimento: 'Mercadão do Óleo', tipoOleo: 'Castrol Magnatec 5W30', filtroAr: true, filtroCombustivel: false, filtroOleo: true, proximaTrocaKM: 96000, proximaTrocaDias: '2026-11-15', valor: 350.00 },
        { id: 'O-3', dataTroca: '2025-10-10', veiculoId: 'V-2', kmTroca: 274000, estabelecimento: 'Beto Lubrificantes', tipoOleo: 'Shell Rimula R4 15W40', filtroAr: true, filtroCombustivel: true, filtroOleo: true, proximaTrocaKM: 284000, proximaTrocaDias: '2026-04-10', valor: 580.00 }
    ];

    const viagens = [
        { id: 'VI-1', veiculoId: 'V-1', motoristaId: 'M-1', origem: 'São Paulo/SP', destino: 'Belo Horizonte/MG', dataSaida: '2026-05-17', dataRetorno: '2026-05-20', kmInicial: 143800, kmFinal: 144980, kmRodado: 1180, custos: 450.00, observacoes: 'Entrega no prazo.', status: 'Realizada' },
        { id: 'VI-2', veiculoId: 'V-3', motoristaId: 'M-2', origem: 'São Paulo/SP', destino: 'São José dos Campos/SP', dataSaida: '2026-05-21', dataRetorno: '2026-05-22', kmInicial: 86100, kmFinal: 86380, kmRodado: 280, custos: 85.00, observacoes: 'Carga de peças automotivas.', status: 'Realizada' },
        { id: 'VI-3', veiculoId: 'V-4', motoristaId: 'M-4', origem: 'Campinas/SP', destino: 'São Paulo/SP', dataSaida: '2026-05-23', dataRetorno: '', kmInicial: 112000, kmFinal: 0, kmRodado: 0, custos: 35.00, observacoes: 'Em rota.', status: 'Em andamento' }
    ];

    const logs = [
        { id: 'LOG-INIT', data: new Date().toISOString(), usuario: 'Sistema', perfil: 'Administrador', acao: 'Inicialização', entidade: 'Banco de Dados', detalhes: 'Base de dados inicializada com dados semente. Senha padrão: movix@2026' }
    ];

    return { usuarios, veiculos, motoristas, multas, abastecimentos, manutencoes, pneus, oleos, viagens, logs };
}

// ─── Inicializar BD se não existir e migrar ───────────────
async function boot() {
    try {
        await db.initDB();
        const migrate = require('./migrate');
        await migrate();
    } catch (err) {
        console.error("Falha crítica ao bootar banco de dados PostgreSQL:", err);
    }
}

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, async () => {
    await boot();
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║       MovixFrota ERP - Servidor Ativo        ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  🌐 URL:   http://localhost:${PORT}              ║`);
    console.log('║  📦 Modo:  Desenvolvimento (Node.js/Express) ║');
    console.log('║  🗄️  DB:    PostgreSQL                        ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Credenciais Padrão:                         ║');
    console.log('║  CPF: 123.456.789-00  (Admin)                ║');
    console.log('║  Senha: movix@2026                           ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
});
