/* =====================================================
   MovixFrota - Servidor Express Node.js
   Porta: 3000 | localhost:3000
   ===================================================== */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

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
function readDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const seed = getSeedData();
            fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
            return seed;
        }
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        console.error('Erro ao ler DB:', e);
        return getSeedData();
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Erro ao escrever DB:', e);
        return false;
    }
}

function addLog(db, usuarioNome, usuarioPerfil, acao, entidade, detalhes) {
    const log = {
        id: 'LOG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        data: new Date().toISOString(),
        usuario: usuarioNome,
        perfil: usuarioPerfil,
        acao,
        entidade,
        detalhes
    };
    if (!db.logs) db.logs = [];
    db.logs.unshift(log);
    if (db.logs.length > 300) db.logs.pop();
    return log;
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
app.post('/api/auth/login', (req, res) => {
    const { identifier, senha, rememberMe } = req.body;
    if (!identifier || !senha) {
        return res.status(400).json({ error: 'Informe CPF/E-mail e senha.' });
    }

    const db = readDB();
    const cleanId = identifier.replace(/\D/g, ''); // Remove pontuação do CPF

    // Buscar usuário por CPF (sem pontuação) ou e-mail
    const user = db.usuarios.find(u => {
        const userCpfClean = (u.cpf || '').replace(/\D/g, '');
        const matchCPF = cleanId.length >= 11 && userCpfClean === cleanId;
        const matchEmail = u.email && u.email.toLowerCase() === identifier.toLowerCase();
        return matchCPF || matchEmail;
    });

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
    addLog(db, user.nome, user.perfil, 'Login', 'Sessão', `Login realizado com sucesso (${identifier})`);
    writeDB(db);

    const { senhaHash, senha: _, ...userSafe } = user;
    res.json({ success: true, user: userSafe });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
    const db = readDB();
    addLog(db, req.session.nome, req.session.perfil, 'Logout', 'Sessão', 'Usuário encerrou a sessão.');
    writeDB(db);
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    const db = readDB();
    const user = db.usuarios.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const { senhaHash, senha: _, ...userSafe } = user;
    res.json(userSafe);
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
app.get('/api/veiculos', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.veiculos);
});

app.post('/api/veiculos', requireAuth, (req, res) => {
    const db = readDB();
    const v = { ...req.body };
    v.id = 'VEI-' + uuidv4().substr(0, 8).toUpperCase();
    v.kmAtual = parseFloat(v.kmAtual) || 0;
    v.historicoKM = [{ data: new Date().toISOString().split('T')[0], km: v.kmAtual }];
    db.veiculos.push(v);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Veículo', `Cadastrou veículo ${v.marca} ${v.modelo} (${v.placa})`);
    writeDB(db);
    res.json(v);
});

app.put('/api/veiculos/:id', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.veiculos.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Veículo não encontrado.' });
    const original = db.veiculos[idx];
    const newKM = parseFloat(req.body.kmAtual) || 0;
    db.veiculos[idx] = { ...original, ...req.body, kmAtual: newKM };
    if (newKM > parseFloat(original.kmAtual)) {
        if (!db.veiculos[idx].historicoKM) db.veiculos[idx].historicoKM = [];
        db.veiculos[idx].historicoKM.push({ data: new Date().toISOString().split('T')[0], km: newKM });
    }
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Veículo', `Editou veículo ${req.body.placa}`);
    writeDB(db);
    res.json(db.veiculos[idx]);
});

app.delete('/api/veiculos/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const v = db.veiculos.find(v => v.id === req.params.id);
    if (!v) return res.status(404).json({ error: 'Veículo não encontrado.' });
    db.veiculos = db.veiculos.filter(v => v.id !== req.params.id);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Veículo', `Removeu veículo ${v.placa}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── MOTORISTAS ───────────────────────────────────────────
app.get('/api/motoristas', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.motoristas);
});

app.post('/api/motoristas', requireAuth, (req, res) => {
    const db = readDB();
    const m = { ...req.body };
    m.id = 'MOT-' + uuidv4().substr(0, 8).toUpperCase();
    if (!m.foto) m.foto = '/img/avatar-default.png';
    db.motoristas.push(m);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Motorista', `Cadastrou motorista ${m.nome} (CNH: ${m.cnh})`);
    writeDB(db);
    res.json(m);
});

app.put('/api/motoristas/:id', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.motoristas.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Motorista não encontrado.' });
    db.motoristas[idx] = { ...db.motoristas[idx], ...req.body };
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Motorista', `Editou motorista ${req.body.nome}`);
    writeDB(db);
    res.json(db.motoristas[idx]);
});

app.delete('/api/motoristas/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const m = db.motoristas.find(m => m.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Motorista não encontrado.' });
    db.motoristas = db.motoristas.filter(m => m.id !== req.params.id);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Motorista', `Removeu motorista ${m.nome}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── USUÁRIOS (Admin) ─────────────────────────────────────
app.get('/api/usuarios', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const safe = db.usuarios.map(({ senhaHash, senha, ...u }) => u);
    res.json(safe);
});

app.post('/api/usuarios', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const { nome, cpf, email, cargo, perfil, senha, status, foto } = req.body;

    if (!nome || !cpf || !email || !senha) {
        return res.status(400).json({ error: 'Nome, CPF, E-mail e Senha são obrigatórios.' });
    }

    // Verificar duplicidade de CPF e email
    const cpfClean = cpf.replace(/\D/g, '');
    const dupCPF = db.usuarios.find(u => u.cpf && u.cpf.replace(/\D/g, '') === cpfClean);
    const dupEmail = db.usuarios.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (dupCPF) return res.status(400).json({ error: 'CPF já cadastrado.' });
    if (dupEmail) return res.status(400).json({ error: 'E-mail já cadastrado.' });

    const senhaHash = bcrypt.hashSync(senha, 10);
    const newUser = {
        id: 'USR-' + uuidv4().substr(0, 8).toUpperCase(),
        nome, cpf, email, cargo,
        perfil: perfil || 'Operacional',
        status: status || 'ativo',
        foto: foto || '/img/avatar-default.png',
        senhaHash,
        dataCadastro: new Date().toISOString().split('T')[0]
    };

    db.usuarios.push(newUser);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Usuário', `Criou usuário ${nome} (${perfil})`);
    writeDB(db);

    const { senhaHash: _, ...safe } = newUser;
    res.json(safe);
});

app.put('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const idx = db.usuarios.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const updates = { ...req.body };
    // Se senha for enviada, gerar novo hash
    if (updates.senha && updates.senha.length >= 4) {
        updates.senhaHash = bcrypt.hashSync(updates.senha, 10);
    }
    delete updates.senha;

    db.usuarios[idx] = { ...db.usuarios[idx], ...updates };
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Usuário', `Editou usuário ${db.usuarios[idx].nome}`);
    writeDB(db);

    const { senhaHash, ...safe } = db.usuarios[idx];
    res.json(safe);
});

app.delete('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const u = db.usuarios.find(u => u.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (u.id === req.session.userId) return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário.' });
    db.usuarios = db.usuarios.filter(u => u.id !== req.params.id);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Usuário', `Removeu usuário ${u.nome}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── EDITAR PERFIL DO USUÁRIO LOGADO ─────────────────────
app.put('/api/perfil', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.usuarios.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const { nome, email, cpf, cargo, senha, foto } = req.body;

    if (nome) db.usuarios[idx].nome = nome;
    if (email) {
        const dupEmail = db.usuarios.find(u => u.id !== req.session.userId && u.email && u.email.toLowerCase() === email.toLowerCase());
        if (dupEmail) return res.status(400).json({ error: 'E-mail já cadastrado.' });
        db.usuarios[idx].email = email;
    }
    if (cpf) {
        const cpfClean = cpf.replace(/\D/g, '');
        const dupCPF = db.usuarios.find(u => u.id !== req.session.userId && u.cpf && u.cpf.replace(/\D/g, '') === cpfClean);
        if (dupCPF) return res.status(400).json({ error: 'CPF já cadastrado.' });
        db.usuarios[idx].cpf = cpf;
    }
    if (cargo) db.usuarios[idx].cargo = cargo;
    if (foto) db.usuarios[idx].foto = foto;

    if (senha && senha.length >= 4) {
        db.usuarios[idx].senhaHash = bcrypt.hashSync(senha, 10);
        delete db.usuarios[idx].senha;
    }

    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Perfil', `Usuário ${db.usuarios[idx].nome} atualizou seu próprio perfil`);
    writeDB(db);

    if (nome) req.session.nome = nome;

    const { senhaHash, senha: _, ...safe } = db.usuarios[idx];
    res.json(safe);
});


// ─── ABASTECIMENTOS ───────────────────────────────────────
app.get('/api/abastecimentos', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.abastecimentos);
});

app.post('/api/abastecimentos', requireAuth, (req, res) => {
    const db = readDB();
    const ab = { ...req.body };
    ab.id = 'ABA-' + uuidv4().substr(0, 8).toUpperCase();
    ab.litros = parseFloat(ab.litros) || 0;
    ab.valorTotal = parseFloat(ab.valorTotal) || 0;
    ab.kmAtual = parseFloat(ab.kmAtual) || 0;
    ab.valorLitro = parseFloat(ab.valorLitro) || (ab.valorTotal / ab.litros);

    // Calcular KM/L com base na KM atual do veículo
    const veic = db.veiculos.find(v => v.id === ab.veiculoId);
    if (veic) {
        const kmAnterior = parseFloat(veic.kmAtual) || 0;
        const kmRodado = ab.kmAtual - kmAnterior;
        ab.kmL = (kmRodado > 0 && ab.litros > 0) ? parseFloat((kmRodado / ab.litros).toFixed(2)) : 0;
        ab.custoKM = ab.kmL > 0 ? parseFloat((ab.valorLitro / ab.kmL).toFixed(2)) : 0;
        // Atualizar odômetro do veículo
        if (ab.kmAtual > kmAnterior) {
            const vidx = db.veiculos.findIndex(v => v.id === ab.veiculoId);
            if (!db.veiculos[vidx].historicoKM) db.veiculos[vidx].historicoKM = [];
            db.veiculos[vidx].kmAtual = ab.kmAtual;
            db.veiculos[vidx].historicoKM.push({ data: new Date().toISOString().split('T')[0], km: ab.kmAtual });
        }
    } else {
        ab.kmL = 0; ab.custoKM = 0;
    }

    db.abastecimentos.unshift(ab);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Abastecimento', `Registrou abastecimento R$ ${ab.valorTotal.toFixed(2)} - ${veic ? veic.placa : ''}`);
    writeDB(db);
    res.json(ab);
});

app.put('/api/abastecimentos/:id', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.abastecimentos.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Abastecimento não encontrado.' });

    const original = db.abastecimentos[idx];
    const ab = { ...original, ...req.body };
    
    ab.litros = parseFloat(ab.litros) || 0;
    ab.valorTotal = parseFloat(ab.valorTotal) || 0;
    ab.kmAtual = parseFloat(ab.kmAtual) || 0;
    ab.valorLitro = parseFloat(ab.valorLitro) || (ab.litros > 0 ? (ab.valorTotal / ab.litros) : 0);

    const veic = db.veiculos.find(v => v.id === ab.veiculoId);
    if (veic) {
        const veicAbs = db.abastecimentos
            .filter(a => a.veiculoId === ab.veiculoId && a.id !== req.params.id)
            .sort((a, b) => new Date(a.data) - new Date(b.data));
            
        let kmAnterior = 0;
        for (let i = veicAbs.length - 1; i >= 0; i--) {
            if (new Date(veicAbs[i].data) <= new Date(ab.data) && veicAbs[i].kmAtual < ab.kmAtual) {
                kmAnterior = veicAbs[i].kmAtual;
                break;
            }
        }
        
        const kmRodado = ab.kmAtual - kmAnterior;
        ab.kmL = (kmRodado > 0 && ab.litros > 0) ? parseFloat((kmRodado / ab.litros).toFixed(2)) : 0;
        ab.custoKM = ab.kmL > 0 ? parseFloat((ab.valorLitro / ab.kmL).toFixed(2)) : 0;

        if (ab.kmAtual > veic.kmAtual) {
            const vidx = db.veiculos.findIndex(v => v.id === ab.veiculoId);
            db.veiculos[vidx].kmAtual = ab.kmAtual;
            if (!db.veiculos[vidx].historicoKM) db.veiculos[vidx].historicoKM = [];
            db.veiculos[vidx].historicoKM.push({ data: ab.data, km: ab.kmAtual });
        }
    } else {
        ab.kmL = 0; ab.custoKM = 0;
    }

    db.abastecimentos[idx] = ab;
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Abastecimento', `Editou abastecimento R$ ${ab.valorTotal.toFixed(2)} - ${veic ? veic.placa : ''}`);
    writeDB(db);
    res.json(ab);
});

app.delete('/api/abastecimentos/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const ab = db.abastecimentos.find(a => a.id === req.params.id);
    if (!ab) return res.status(404).json({ error: 'Abastecimento não encontrado.' });
    db.abastecimentos = db.abastecimentos.filter(a => a.id !== req.params.id);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Abastecimento', `Removeu abastecimento do dia ${ab.data}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── MANUTENÇÕES ──────────────────────────────────────────
app.get('/api/manutencoes', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.manutencoes);
});

app.post('/api/manutencoes', requireAuth, (req, res) => {
    const db = readDB();
    const m = { ...req.body };
    m.id = 'MAN-' + uuidv4().substr(0, 8).toUpperCase();
    m.valor = parseFloat(m.valor) || 0;
    m.km = parseFloat(m.km) || 0;
    // Atualizar KM do veículo se necessário
    const vidx = db.veiculos.findIndex(v => v.id === m.veiculoId);
    if (vidx !== -1 && m.km > parseFloat(db.veiculos[vidx].kmAtual)) {
        db.veiculos[vidx].kmAtual = m.km;
        if (!db.veiculos[vidx].historicoKM) db.veiculos[vidx].historicoKM = [];
        db.veiculos[vidx].historicoKM.push({ data: new Date().toISOString().split('T')[0], km: m.km });
    }
    db.manutencoes.unshift(m);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Manutenção', `Cadastrou O.S. ${m.tipo} (${m.categoria}) - R$ ${m.valor.toFixed(2)}`);
    writeDB(db);
    res.json(m);
});

app.put('/api/manutencoes/:id', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.manutencoes.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Manutenção não encontrada.' });
    const updates = { ...req.body };
    // CRÍTICO: garantir tipos numéricos na edição
    updates.valor = parseFloat(updates.valor) || 0;
    updates.km = parseFloat(updates.km) || 0;
    db.manutencoes[idx] = { ...db.manutencoes[idx], ...updates };
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Manutenção', `Atualizou O.S. ${req.params.id} → Status: ${updates.status}`);
    writeDB(db);
    res.json(db.manutencoes[idx]);
});

app.delete('/api/manutencoes/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const idx = db.manutencoes.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Manutenção não encontrada.' });
    const m = db.manutencoes[idx];
    db.manutencoes.splice(idx, 1);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Manutenção', `Removeu O.S. do veículo ID ${m.veiculoId}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── PNEUS ────────────────────────────────────────────────
app.get('/api/pneus', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.pneus);
});

app.post('/api/pneus', requireAuth, (req, res) => {
    const db = readDB();
    const p = { ...req.body };
    p.id = 'PNE-' + uuidv4().substr(0, 8).toUpperCase();
    p.kmInicial = parseFloat(p.kmInicial) || 0;
    p.vidaEstimada = parseFloat(p.vidaEstimada) || 70000;
    p.custo = parseFloat(p.custo) || 0;
    db.pneus.push(p);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Pneu', `Cadastrou pneu ${p.marca} ${p.modelo} (${p.codigo})`);
    writeDB(db);
    res.json(p);
});

app.put('/api/pneus/:id', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.pneus.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Pneu não encontrado.' });
    const p = { ...db.pneus[idx], ...req.body };
    p.kmInicial = parseFloat(p.kmInicial) || 0;
    p.vidaEstimada = parseFloat(p.vidaEstimada) || 70000;
    p.custo = parseFloat(p.custo) || 0;
    db.pneus[idx] = p;
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Pneu', `Atualizou posição/rodízio do pneu ${p.codigo}`);
    writeDB(db);
    res.json(p);
});

app.delete('/api/pneus/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const idx = db.pneus.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Pneu não encontrado.' });
    const p = db.pneus[idx];
    db.pneus.splice(idx, 1);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Pneu', `Excluiu pneu ${p.codigo}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── ÓLEO ─────────────────────────────────────────────────
app.get('/api/oleos', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.oleos);
});

app.post('/api/oleos', requireAuth, (req, res) => {
    const db = readDB();
    const o = { ...req.body };
    o.id = 'OLE-' + uuidv4().substr(0, 8).toUpperCase();
    o.kmTroca = parseFloat(o.kmTroca) || 0;
    o.proximaTrocaKM = parseFloat(o.proximaTrocaKM) || 0;
    o.valor = parseFloat(o.valor) || 0;
    o.filtroAr = o.filtroAr === 'true' || o.filtroAr === true;
    o.filtroOleo = o.filtroOleo === 'true' || o.filtroOleo === true;
    o.filtroCombustivel = o.filtroCombustivel === 'true' || o.filtroCombustivel === true;
    // Atualizar KM do veículo
    const vidx = db.veiculos.findIndex(v => v.id === o.veiculoId);
    if (vidx !== -1 && o.kmTroca > parseFloat(db.veiculos[vidx].kmAtual)) {
        db.veiculos[vidx].kmAtual = o.kmTroca;
        if (!db.veiculos[vidx].historicoKM) db.veiculos[vidx].historicoKM = [];
        db.veiculos[vidx].historicoKM.push({ data: new Date().toISOString().split('T')[0], km: o.kmTroca });
    }
    db.oleos.unshift(o);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Óleo', `Registrou troca de óleo ${db.veiculos[vidx]?.placa || ''}`);
    writeDB(db);
    res.json(o);
});

app.put('/api/oleos/:id', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.oleos.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Troca de óleo não encontrada.' });
    
    const o = { ...db.oleos[idx], ...req.body };
    o.kmTroca = parseFloat(o.kmTroca) || 0;
    o.proximaTrocaKM = parseFloat(o.proximaTrocaKM) || 0;
    o.valor = parseFloat(o.valor) || 0;
    o.filtroAr = o.filtroAr === 'true' || o.filtroAr === true;
    o.filtroOleo = o.filtroOleo === 'true' || o.filtroOleo === true;
    o.filtroCombustivel = o.filtroCombustivel === 'true' || o.filtroCombustivel === true;

    // Atualizar KM do veículo se aplicável
    const vidx = db.veiculos.findIndex(v => v.id === o.veiculoId);
    if (vidx !== -1 && o.kmTroca > parseFloat(db.veiculos[vidx].kmAtual)) {
        db.veiculos[vidx].kmAtual = o.kmTroca;
        if (!db.veiculos[vidx].historicoKM) db.veiculos[vidx].historicoKM = [];
        db.veiculos[vidx].historicoKM.push({ data: new Date().toISOString().split('T')[0], km: o.kmTroca });
    }
    
    db.oleos[idx] = o;
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Óleo', `Editou troca de óleo do veículo ${db.veiculos[vidx]?.placa || ''}`);
    writeDB(db);
    res.json(o);
});

app.delete('/api/oleos/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const idx = db.oleos.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Troca de óleo não encontrada.' });
    const o = db.oleos[idx];
    db.oleos.splice(idx, 1);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Óleo', `Excluiu troca de óleo ID ${req.params.id}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── VIAGENS ──────────────────────────────────────────────
app.get('/api/viagens', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.viagens);
});

app.post('/api/viagens', requireAuth, (req, res) => {
    const db = readDB();
    const v = { ...req.body };
    v.id = 'VIA-' + uuidv4().substr(0, 8).toUpperCase();
    v.kmInicial = parseFloat(v.kmInicial) || 0;
    v.kmFinal = parseFloat(v.kmFinal) || 0;
    v.custos = parseFloat(v.custos) || 0;
    v.kmRodado = v.kmFinal > v.kmInicial ? v.kmFinal - v.kmInicial : 0;
    db.viagens.unshift(v);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Viagem', `Registrou viagem ${v.origem} → ${v.destino}`);
    writeDB(db);
    res.json(v);
});

app.put('/api/viagens/:id', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.viagens.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Viagem não encontrada.' });
    
    const updates = { ...req.body };
    if (updates.kmInicial !== undefined) {
        updates.kmInicial = parseFloat(updates.kmInicial) || 0;
    }
    if (updates.kmFinal !== undefined) {
        updates.kmFinal = parseFloat(updates.kmFinal) || 0;
    }
    updates.custos = parseFloat(updates.custos) || 0;

    const kmInicial = updates.kmInicial !== undefined ? updates.kmInicial : db.viagens[idx].kmInicial;
    const kmFinal = updates.kmFinal !== undefined ? updates.kmFinal : db.viagens[idx].kmFinal;

    if (kmFinal > kmInicial) {
        updates.kmRodado = kmFinal - kmInicial;
        // Atualizar KM do veículo
        const veiculoId = updates.veiculoId || db.viagens[idx].veiculoId;
        const vidx = db.veiculos.findIndex(v => v.id === veiculoId);
        if (vidx !== -1 && kmFinal > parseFloat(db.veiculos[vidx].kmAtual)) {
            db.veiculos[vidx].kmAtual = kmFinal;
            if (!db.veiculos[vidx].historicoKM) db.veiculos[vidx].historicoKM = [];
            db.veiculos[vidx].historicoKM.push({ data: new Date().toISOString().split('T')[0], km: kmFinal });
        }
    } else {
        updates.kmRodado = 0;
    }

    db.viagens[idx] = { ...db.viagens[idx], ...updates };
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Viagem', `Editou/Atualizou viagem ${req.params.id}`);
    writeDB(db);
    res.json(db.viagens[idx]);
});

app.delete('/api/viagens/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const idx = db.viagens.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Viagem não encontrada.' });
    const v = db.viagens[idx];
    db.viagens.splice(idx, 1);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Viagem', `Excluiu viagem ${v.origem} → ${v.destino}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── MULTAS ───────────────────────────────────────────────
app.get('/api/multas', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.multas || []);
});

app.post('/api/multas', requireAuth, (req, res) => {
    const db = readDB();
    if (!db.multas) db.multas = [];
    const m = { ...req.body };
    m.id = 'MUL-' + uuidv4().substr(0, 8).toUpperCase();
    m.valor = parseFloat(m.valor) || 0;
    m.historico = [
        {
            data: new Date().toISOString(),
            usuario: req.session.nome,
            acao: 'Cadastro Inicial',
            status: m.status || 'Não Pago'
        }
    ];
    db.multas.push(m);
    addLog(db, req.session.nome, req.session.perfil, 'Cadastro', 'Multa', `Registrou multa no valor de R$ ${m.valor.toFixed(2)}`);
    writeDB(db);
    res.json(m);
});

app.put('/api/multas/:id', requireAuth, (req, res) => {
    const db = readDB();
    const idx = db.multas.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Multa não encontrada.' });
    const original = db.multas[idx];
    const updated = { ...original, ...req.body };
    updated.valor = parseFloat(updated.valor) || 0;
    
    if (!updated.historico) updated.historico = [];
    
    let actionDesc = 'Dados da multa editados';
    if (original.status !== updated.status) {
        actionDesc = `Status alterado de "${original.status}" para "${updated.status}"`;
    }
    
    updated.historico.push({
        data: new Date().toISOString(),
        usuario: req.session.nome,
        acao: actionDesc,
        status: updated.status
    });

    db.multas[idx] = updated;
    addLog(db, req.session.nome, req.session.perfil, 'Edição', 'Multa', `Atualizou dados da multa ${req.params.id}`);
    writeDB(db);
    res.json(updated);
});

app.delete('/api/multas/:id', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    const idx = db.multas.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Multa não encontrada.' });
    const original = db.multas[idx];
    db.multas = db.multas.filter(m => m.id !== req.params.id);
    addLog(db, req.session.nome, req.session.perfil, 'Exclusão', 'Multa', `Excluiu multa ${req.params.id}`);
    writeDB(db);
    res.json({ success: true });
});

// ─── LEGIACY DOCUMENTS FALLBACK (CACHE COMPATIBILITY) ─────
app.get('/api/documentos', requireAuth, (req, res) => {
    res.json([]);
});

// ─── LOGS DE AUDITORIA ────────────────────────────────────
app.get('/api/logs', requireAuth, (req, res) => {
    const db = readDB();
    res.json(db.logs);
});

app.delete('/api/logs', requireAuth, requireAdmin, (req, res) => {
    const db = readDB();
    db.logs = [{
        id: 'LOG-RESET',
        data: new Date().toISOString(),
        usuario: req.session.nome,
        perfil: req.session.perfil,
        acao: 'Limpeza de Logs',
        entidade: 'Banco de Dados',
        detalhes: 'Auditoria resetada pelo administrador.'
    }];
    writeDB(db);
    res.json({ success: true });
});

// ─── MÉTRICAS PARA DASHBOARD ──────────────────────────────
app.get('/api/metricas', requireAuth, (req, res) => {
    const db = readDB();
    const today = new Date();
    const tenDays = new Date(); tenDays.setDate(today.getDate() + 10);

    let kmTotal = 0;
    db.veiculos.forEach(v => {
        const first = v.historicoKM && v.historicoKM[0] ? v.historicoKM[0].km : parseFloat(v.kmAtual);
        kmTotal += Math.max(0, parseFloat(v.kmAtual) - first);
    });

    const totalCombustivel = db.abastecimentos.reduce((s, a) => s + (parseFloat(a.valorTotal) || 0), 0);
    const totalManutencao = db.manutencoes.reduce((s, m) => s + (parseFloat(m.valor) || 0), 0);
    const totalLubrificantes = db.oleos.reduce((s, o) => s + (parseFloat(o.valor) || 0), 0);
    const totalPneus = db.pneus.reduce((s, p) => s + (parseFloat(p.custo) || 0), 0);

    const kmlValid = db.abastecimentos.filter(a => a.kmL > 0);
    const mediaKML = kmlValid.length > 0 ? kmlValid.reduce((s, a) => s + a.kmL, 0) / kmlValid.length : 0;

    // Alertas rápidos
    const cnhVencidas = db.motoristas.filter(m => new Date(m.dataVencimentoCNH) < today).length;
    const cnhAVencer = db.motoristas.filter(m => { const d = new Date(m.dataVencimentoCNH); return d >= today && d <= tenDays; }).length;
    const manutAtrasadas = db.manutencoes.filter(m => m.status === 'Atrasada').length;

    // Multas metrics
    const totalMultasVal = (db.multas || []).reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
    const totalMultasCount = (db.multas || []).length;

    res.json({
        kmTotalFrota: kmTotal || 148200,
        totalGastoCombustivel: totalCombustivel,
        totalGastoManutencao: totalManutencao,
        totalGastoLubrificantes: totalLubrificantes,
        totalGastoPneus: totalPneus,
        mediaKMLGeral: parseFloat(mediaKML.toFixed(2)) || 9.8,
        veiculosEmManutencao: db.veiculos.filter(v => v.status === 'em_manutencao').length,
        totalVeiculos: db.veiculos.length,
        totalMotoristas: db.motoristas.filter(m => m.status === 'ativo').length,
        cnhsVencidas: cnhVencidas,
        cnhsAVencer: cnhAVencer,
        manutencaoAtrasada: manutAtrasadas,
        totalMultas: totalMultasCount,
        valorTotalMultas: totalMultasVal
    });
});

// ─── ALERTAS DINÂMICOS ────────────────────────────────────
app.get('/api/alertas', requireAuth, (req, res) => {
    const db = readDB();
    const alerts = [];
    const today = new Date();
    const tenDays = new Date(); tenDays.setDate(today.getDate() + 10);

    db.motoristas.forEach(m => {
        const exp = new Date(m.dataVencimentoCNH);
        if (exp < today) alerts.push({ id: `ALT-CNH-EXP-${m.id}`, prioridade: 'Alta', titulo: `CNH Vencida: ${m.nome}`, desc: `Venceu em ${m.dataVencimentoCNH}`, link: 'motoristas', targetId: m.id });
        else if (exp <= tenDays) alerts.push({ id: `ALT-CNH-PRX-${m.id}`, prioridade: 'Média', titulo: `CNH a Vencer: ${m.nome}`, desc: `Vence em ${m.dataVencimentoCNH}`, link: 'motoristas', targetId: m.id });
    });

    db.manutencoes.filter(m => m.status === 'Atrasada').forEach(m => {
        const v = db.veiculos.find(v => v.id === m.veiculoId);
        alerts.push({ id: `ALT-MAN-${m.id}`, prioridade: 'Alta', titulo: `Manutenção Atrasada: ${v ? v.placa : ''}`, desc: `O.S. ${m.tipo} agendada para ${m.km} KM`, link: 'manutencoes', targetId: m.id });
    });

    // Multas alertas pendentes
    (db.multas || []).forEach(m => {
        if (m.status === 'Não Pago') {
            const v = db.veiculos.find(veh => veh.id === m.veiculoId);
            const label = v ? v.placa : 'Frota';
            
            const infraDate = new Date(m.data);
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - 30);
            
            if (infraDate < limitDate) {
                alerts.push({
                    id: `ALT-MUL-EXP-${m.id}`,
                    prioridade: 'Alta',
                    titulo: `Multa Crítica pendente: ${label}`,
                    desc: `Valor de R$ ${m.valor.toFixed(2)} registrado em ${m.data.split('-').reverse().join('/')}`,
                    link: 'multas',
                    targetId: m.id
                });
            } else {
                alerts.push({
                    id: `ALT-MUL-PRX-${m.id}`,
                    prioridade: 'Média',
                    titulo: `Multa pendente de pagamento: ${label}`,
                    desc: `Valor de R$ ${m.valor.toFixed(2)} registrado em ${m.data.split('-').reverse().join('/')}`,
                    link: 'multas',
                    targetId: m.id
                });
            }
        }
    });

    db.pneus.filter(p => p.veiculoAtual).forEach(p => {
        const v = db.veiculos.find(v => v.id === p.veiculoAtual);
        if (!v) return;
        const kmRodado = parseFloat(v.kmAtual) - parseFloat(p.kmInicial);
        const kmLeft = Math.max(0, p.vidaEstimada - kmRodado);
        const pct = (kmLeft / p.vidaEstimada) * 100;
        if (pct < 10) alerts.push({ id: `ALT-PNE-${p.id}`, prioridade: 'Alta', titulo: `Trocar Pneu: ${v.placa}`, desc: `Pneu [${p.codigo}] com apenas ${Math.round(kmLeft)} KM restantes`, link: 'pneus', targetId: p.id });
        else if (pct < 25) alerts.push({ id: `ALT-PNE-PRX-${p.id}`, prioridade: 'Média', titulo: `Desgaste Pneu: ${v.placa}`, desc: `Pneu [${p.codigo}] com ${Math.round(pct)}% de vida útil`, link: 'pneus', targetId: p.id });
    });

    res.json(alerts);
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

// ─── Inicializar BD se não existir ───────────────────────
if (!fs.existsSync(DB_PATH)) {
    const seed = getSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
    console.log('✅ Banco de dados inicializado com dados semente.');
}

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║       MovixFrota ERP - Servidor Ativo        ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  🌐 URL:   http://localhost:${PORT}              ║`);
    console.log('║  📦 Modo:  Desenvolvimento (Node.js/Express) ║');
    console.log('║  🗄️  DB:    data/db.json                      ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Credenciais Padrão:                         ║');
    console.log('║  CPF: 123.456.789-00  (Admin)                ║');
    console.log('║  Senha: movix@2026                           ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
});
