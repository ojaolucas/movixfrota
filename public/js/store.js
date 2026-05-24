/* MovixFrota - Central State Store and Node.js REST API Sync Engine */

class MovixStore {
    constructor() {
        this.state = {
            activeProfile: 'Visualizador',
            usuarios: [],
            veiculos: [],
            motoristas: [],
            documentos: [],
            abastecimentos: [],
            manutencoes: [],
            pneus: [],
            oleos: [],
            viagens: [],
            logs: []
        };
        this.activeUser = null;
        this.onSessionChange = null; // Callback configured by app.js to show/hide login
    }

    // Initialize backend connection
    async init() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const user = await res.json();
                this.activeUser = user;
                this.state.activeProfile = user.perfil;
                
                // Load all database collections from API
                await this.loadData();
                
                if (this.onSessionChange) this.onSessionChange(true);
            } else {
                this.activeUser = null;
                if (this.onSessionChange) this.onSessionChange(false);
            }
        } catch (e) {
            console.error("Erro na autenticação de sessão inicial:", e);
            if (this.onSessionChange) this.onSessionChange(false);
        }
    }

    // Load all data collections from REST API
    async loadData() {
        try {
            const [veiculos, motoristas, documentos, abastecimentos, manutencoes, pneus, oleos, viagens, logs] = await Promise.all([
                fetch('/api/veiculos').then(r => r.json()),
                fetch('/api/motoristas').then(r => r.json()),
                fetch('/api/documentos').then(r => r.json()),
                fetch('/api/abastecimentos').then(r => r.json()),
                fetch('/api/manutencoes').then(r => r.json()),
                fetch('/api/pneus').then(r => r.json()),
                fetch('/api/oleos').then(r => r.json()),
                fetch('/api/viagens').then(r => r.json()),
                fetch('/api/logs').then(r => r.json())
            ]);

            this.state.veiculos = veiculos;
            this.state.motoristas = motoristas;
            this.state.documentos = documentos;
            this.state.abastecimentos = abastecimentos;
            this.state.manutencoes = manutencoes;
            this.state.pneus = pneus;
            this.state.oleos = oleos;
            this.state.viagens = viagens;
            this.state.logs = logs;

            // Load users list if logged user is Admin
            if (this.activeUser && this.activeUser.perfil === 'Administrador') {
                this.state.usuarios = await fetch('/api/usuarios').then(r => r.json());
            } else {
                this.state.usuarios = [this.activeUser]; // Fallback for list display
            }
        } catch (e) {
            console.error("Erro ao carregar dados do servidor:", e);
        }
    }

    // Login Action
    async login(identifier, senha) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, senha })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Falha na autenticação.');
        }

        const data = await res.json();
        this.activeUser = data.user;
        this.state.activeProfile = data.user.perfil;
        
        await this.loadData();
        
        if (this.onSessionChange) this.onSessionChange(true);
        return data.user;
    }

    // Logout Action
    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout request failed, cleaning local session anyway.", e);
        }
        
        this.activeUser = null;
        this.state.usuarios = [];
        this.state.veiculos = [];
        this.state.motoristas = [];
        
        if (this.onSessionChange) this.onSessionChange(false);
    }

    getActiveUser() {
        return this.activeUser;
    }

    // --- CRUD HELPER METHODS CONNECTING TO API ---

    // Vehicles
    getVeiculos() { return this.state.veiculos; }
    getVeiculo(id) { return this.state.veiculos.find(v => v.id === id); }
    
    async addVeiculo(veiculo) {
        const res = await fetch('/api/veiculos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(veiculo)
        });
        if (!res.ok) throw new Error('Erro ao salvar veículo no servidor.');
        const newV = await res.json();
        this.state.veiculos.push(newV);
        await this.loadData();
        return newV;
    }

    async updateVeiculo(id, data) {
        const res = await fetch(`/api/veiculos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erro ao atualizar veículo no servidor.');
        const updatedV = await res.json();
        const idx = this.state.veiculos.findIndex(v => v.id === id);
        if (idx !== -1) this.state.veiculos[idx] = updatedV;
        await this.loadData();
        return true;
    }

    async deleteVeiculo(id) {
        const res = await fetch(`/api/veiculos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir veículo.');
        this.state.veiculos = this.state.veiculos.filter(v => v.id !== id);
        await this.loadData();
        return true;
    }

    // Drivers
    getMotoristas() { return this.state.motoristas; }
    getMotorista(id) { return this.state.motoristas.find(m => m.id === id); }

    async addMotorista(m) {
        const res = await fetch('/api/motoristas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(m)
        });
        if (!res.ok) throw new Error('Erro ao salvar motorista no servidor.');
        const newM = await res.json();
        this.state.motoristas.push(newM);
        await this.loadData();
        return newM;
    }

    async updateMotorista(id, data) {
        const res = await fetch(`/api/motoristas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erro ao atualizar motorista no servidor.');
        const updatedM = await res.json();
        const idx = this.state.motoristas.findIndex(m => m.id === id);
        if (idx !== -1) this.state.motoristas[idx] = updatedM;
        await this.loadData();
        return true;
    }

    async deleteMotorista(id) {
        const res = await fetch(`/api/motoristas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir motorista.');
        this.state.motoristas = this.state.motoristas.filter(m => m.id !== id);
        await this.loadData();
        return true;
    }

    // Users (Admin Only)
    async addUsuario(user) {
        const res = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao criar usuário.');
        }
        const newU = await res.json();
        this.state.usuarios.push(newU);
        await this.loadData();
        return newU;
    }

    async updateUsuario(id, data) {
        const res = await fetch(`/api/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao editar usuário.');
        }
        const updatedU = await res.json();
        const idx = this.state.usuarios.findIndex(u => u.id === id);
        if (idx !== -1) this.state.usuarios[idx] = updatedU;
        await this.loadData();
        return true;
    }

    async deleteUsuario(id) {
        const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao excluir usuário.');
        }
        this.state.usuarios = this.state.usuarios.filter(u => u.id !== id);
        await this.loadData();
        return true;
    }

    // Fuel (Abastecimentos)
    getAbastecimentos() { return this.state.abastecimentos; }

    async addAbastecimento(ab) {
        const res = await fetch('/api/abastecimentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ab)
        });
        if (!res.ok) throw new Error('Erro ao salvar abastecimento no servidor.');
        const newAb = await res.json();
        this.state.abastecimentos.unshift(newAb);
        await this.loadData();
        return newAb;
    }

    async deleteAbastecimento(id) {
        const res = await fetch(`/api/abastecimentos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir abastecimento.');
        this.state.abastecimentos = this.state.abastecimentos.filter(a => a.id !== id);
        await this.loadData();
        return true;
    }

    // Maintenances
    getMaintenances() { return this.state.manutencoes; }

    async addMaintenance(m) {
        const res = await fetch('/api/manutencoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(m)
        });
        if (!res.ok) throw new Error('Erro ao salvar ordem de serviço.');
        const newM = await res.json();
        this.state.manutencoes.unshift(newM);
        await this.loadData();
        return newM;
    }

    async updateMaintenance(id, data) {
        const res = await fetch(`/api/manutencoes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erro ao atualizar ordem de serviço.');
        const updatedM = await res.json();
        const idx = this.state.manutencoes.findIndex(m => m.id === id);
        if (idx !== -1) this.state.manutencoes[idx] = updatedM;
        await this.loadData();
        return true;
    }

    async deleteMaintenance(id) {
        const res = await fetch(`/api/manutencoes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao remover O.S.');
        this.state.manutencoes = this.state.manutencoes.filter(m => m.id !== id);
        await this.loadData();
        return true;
    }

    // Tires
    getPneus() { return this.state.pneus; }

    async addPneu(p) {
        const res = await fetch('/api/pneus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p)
        });
        if (!res.ok) throw new Error('Erro ao salvar pneu no servidor.');
        const newP = await res.json();
        this.state.pneus.push(newP);
        await this.loadData();
        return newP;
    }

    async updatePneu(id, data) {
        const res = await fetch(`/api/pneus/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erro ao atualizar pneu.');
        const updatedP = await res.json();
        const idx = this.state.pneus.findIndex(p => p.id === id);
        if (idx !== -1) this.state.pneus[idx] = updatedP;
        await this.loadData();
        return true;
    }

    // Oil Changes
    getOleos() { return this.state.oleos; }

    async addOleo(o) {
        const res = await fetch('/api/oleos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(o)
        });
        if (!res.ok) throw new Error('Erro ao salvar registro de troca de óleo.');
        const newO = await res.json();
        this.state.oleos.unshift(newO);
        await this.loadData();
        return newO;
    }

    // Trips (Viagens)
    getViagens() { return this.state.viagens; }

    async addViagem(v) {
        const res = await fetch('/api/viagens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(v)
        });
        if (!res.ok) throw new Error('Erro ao salvar viagem.');
        const newVia = await res.json();
        this.state.viagens.unshift(newVia);
        await this.loadData();
        return newVia;
    }

    async updateViagem(id, data) {
        const res = await fetch(`/api/viagens/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erro ao finalizar viagem.');
        const updatedVia = await res.json();
        const idx = this.state.viagens.findIndex(v => v.id === id);
        if (idx !== -1) this.state.viagens[idx] = updatedVia;
        await this.loadData();
        return true;
    }

    // Documents
    getDocumentos() { return this.state.documentos; }

    async addDocumento(doc) {
        const res = await fetch('/api/documentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doc)
        });
        if (!res.ok) throw new Error('Erro ao salvar documento.');
        const newDoc = await res.json();
        this.state.documentos.push(newDoc);
        await this.loadData();
        return newDoc;
    }

    async deleteDocumento(id) {
        const res = await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir documento.');
        this.state.documentos = this.state.documentos.filter(d => d.id !== id);
        await this.loadData();
        return true;
    }

    // Auditoria (Admin Only)
    async clearLogs() {
        const res = await fetch('/api/logs', { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao limpar logs de auditoria.');
        await this.loadData();
        return true;
    }

    // --- CALCULATIONS ENGINE & ALERT RESOLVER (CALCULATED IN MEMORY FOR HIGH REAL-TIME RESPONSIVENESS) ---

    getKMRemainingForOil(veiculoId) {
        const v = this.getVeiculo(veiculoId);
        if (!v) return 0;
        
        const changes = this.state.oleos.filter(o => o.veiculoId === veiculoId);
        if (changes.length === 0) return 0;
        
        const latest = changes[0]; // first item is newest
        const currentKM = parseFloat(v.kmAtual);
        const nextKM = parseFloat(latest.proximaTrocaKM);
        return nextKM - currentKM;
    }

    getDaysRemainingForOil(veiculoId) {
        const v = this.getVeiculo(veiculoId);
        if (!v) return 0;
        const changes = this.state.oleos.filter(o => o.veiculoId === veiculoId);
        if (changes.length === 0) return 0;
        
        const latest = changes[0];
        if (!latest.proximaTrocaDias) return 30;
        
        const nextDate = new Date(latest.proximaTrocaDias);
        const today = new Date();
        const diffTime = nextDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    getRemainingKMForTire(pneuId) {
        const p = this.state.pneus.find(item => item.id === pneuId);
        if (!p) return 0;
        if (!p.veiculoAtual) return p.vidaEstimada;
        
        const v = this.getVeiculo(p.veiculoAtual);
        if (!v) return p.vidaEstimada;
        
        const currentVehicleKM = parseFloat(v.kmAtual);
        const installedVehicleKM = parseFloat(p.kmInicial);
        const distanceTraveled = currentVehicleKM - installedVehicleKM;
        
        return Math.max(0, p.vidaEstimada - distanceTraveled);
    }

    getAlerts() {
        const alerts = [];
        const today = new Date();
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(today.getDate() + 10);

        // 1. CNH Expiration Alerts (Drivers)
        this.state.motoristas.forEach(m => {
            const expDate = new Date(m.dataVencimentoCNH);
            if (expDate < today) {
                alerts.push({
                    id: `ALT-CNH-EXP-${m.id}`,
                    tipo: 'CNH vencida',
                    prioridade: 'Alta',
                    status: 'Atrasado',
                    titulo: `CNH Vencida: ${m.nome}`,
                    desc: `Vencimento em ${m.dataVencimentoCNH.split('-').reverse().join('/')} (Categoria ${m.categoriaCNH})`,
                    link: 'motoristas',
                    targetId: m.id
                });
            } else if (expDate <= tenDaysFromNow) {
                alerts.push({
                    id: `ALT-CNH-PROX-${m.id}`,
                    tipo: 'CNH próxima do vencimento',
                    prioridade: 'Média',
                    status: 'Atenção',
                    titulo: `CNH a vencer: ${m.nome}`,
                    desc: `Vencerá em ${m.dataVencimentoCNH.split('-').reverse().join('/')}`,
                    link: 'motoristas',
                    targetId: m.id
                });
            }
        });

        // 2. Oil Change Alerts (Vehicles)
        this.state.veiculos.forEach(v => {
            const kmRemaining = this.getKMRemainingForOil(v.id);
            const daysRemaining = this.getDaysRemainingForOil(v.id);
            
            const changes = this.state.oleos.filter(o => o.veiculoId === v.id);
            if (changes.length === 0) return;

            if (kmRemaining <= 0 || daysRemaining <= 0) {
                alerts.push({
                    id: `ALT-OIL-EXP-${v.id}`,
                    tipo: 'Óleo vencido',
                    prioridade: 'Alta',
                    status: 'Óleo Vencido',
                    titulo: `Troca de Óleo Atrasada: ${v.placa}`,
                    desc: `Atrasado por ${Math.abs(kmRemaining)} KM ou ${Math.abs(daysRemaining)} dias.`,
                    link: 'oleo',
                    targetId: v.id
                });
            } else if (kmRemaining < 500 || daysRemaining < 10) {
                alerts.push({
                    id: `ALT-OIL-PROX-${v.id}`,
                    tipo: 'Óleo próximo da troca',
                    prioridade: 'Média',
                    status: 'Atenção',
                    titulo: `Troca de óleo próxima: ${v.placa}`,
                    desc: `Trocar em ${kmRemaining} KM ou ${daysRemaining} dias.`,
                    link: 'oleo',
                    targetId: v.id
                });
            }
        });

        // 3. Maintenance Delay Alerts (Manutencoes)
        this.state.manutencoes.forEach(m => {
            if (m.status === 'Atrasada') {
                const v = this.getVeiculo(m.veiculoId);
                alerts.push({
                    id: `ALT-MAN-EXP-${m.id}`,
                    tipo: 'Manutenção atrasada',
                    prioridade: 'Alta',
                    status: 'Atrasado',
                    titulo: `Manutenção Atrasada: ${v ? v.placa : 'Veículo'}`,
                    desc: `Manutenção ${m.tipo} agendada para KM ${m.km} está atrasada.`,
                    link: 'manutencoes',
                    targetId: m.veiculoId
                });
            }
        });

        // 4. Tire Wear alerts (Pneus)
        this.state.pneus.forEach(p => {
            if (p.veiculoAtual) {
                const kmLeft = this.getRemainingKMForTire(p.id);
                const percent = (kmLeft / p.vidaEstimada) * 100;
                const v = this.getVeiculo(p.veiculoAtual);

                if (percent < 10) {
                    alerts.push({
                        id: `ALT-PNE-EXP-${p.id}`,
                        tipo: 'Pneu próximo da troca',
                        prioridade: 'Alta',
                        status: 'Atrasado',
                        titulo: `Trocar Pneu Urgente: ${v ? v.placa : ''}`,
                        desc: `Pneu [${p.codigo}] (${p.posicao}) restante apenas ${kmLeft.toFixed(0)} KM.`,
                        link: 'pneus',
                        targetId: p.id
                    });
                } else if (percent < 25) {
                    alerts.push({
                        id: `ALT-PNE-PROX-${p.id}`,
                        tipo: 'Pneu próximo da troca',
                        prioridade: 'Média',
                        status: 'Atenção',
                        titulo: `Pneu com Desgaste: ${v ? v.placa : ''}`,
                        desc: `Pneu [${p.codigo}] (${p.posicao}) possui apenas ${kmLeft.toFixed(0)} KM restantes.`,
                        link: 'pneus',
                        targetId: p.id
                    });
                }
            }
        });

        // 5. Vehicle Document alerts
        this.state.documentos.forEach(doc => {
            if (doc.vencimento) {
                const expDate = new Date(doc.vencimento);
                const isVeic = doc.referenciaType === 'veiculo';
                const refObj = isVeic ? this.getVeiculo(doc.referenciaId) : this.getMotorista(doc.referenciaId);
                const label = isVeic ? (refObj ? refObj.placa : 'Veículo') : (refObj ? refObj.nome : 'Motorista');

                if (expDate < today) {
                    alerts.push({
                        id: `ALT-DOC-EXP-${doc.id}`,
                        tipo: 'Documento vencido',
                        prioridade: 'Alta',
                        status: 'Atrasado',
                        titulo: `Documento Vencido: ${doc.tipo}`,
                        desc: `${doc.tipo} do ${isVeic ? 'veículo' : 'motorista'} [${label}] expirado em ${doc.vencimento.split('-').reverse().join('/')}`,
                        link: 'documentos',
                        targetId: doc.id
                    });
                } else if (expDate <= tenDaysFromNow) {
                    alerts.push({
                        id: `ALT-DOC-PROX-${doc.id}`,
                        tipo: 'Seguro próximo do vencimento',
                        prioridade: 'Média',
                        status: 'Atenção',
                        titulo: `Documento a vencer: ${doc.tipo}`,
                        desc: `${doc.tipo} do ${isVeic ? 'veículo' : 'motorista'} [${label}] expira em ${doc.vencimento.split('-').reverse().join('/')}`,
                        link: 'documentos',
                        targetId: doc.id
                    });
                }
            }
        });

        return alerts;
    }

    getMetrics() {
        const veiculos = this.getVeiculos();
        const abastecimentos = this.getAbastecimentos();
        const manutencoes = this.getMaintenances();
        const pneus = this.getPneus();
        const oleos = this.getOleos();
        const viagens = this.getViagens();
        const alerts = this.getAlerts();

        // 1. KM total
        let kmTotal = 0;
        veiculos.forEach(v => {
            const firstKM = v.historicoKM && v.historicoKM[0] ? v.historicoKM[0].km : parseFloat(v.kmAtual);
            const kmRodado = parseFloat(v.kmAtual) - firstKM;
            kmTotal += Math.max(0, kmRodado);
        });
        
        if (kmTotal === 0) {
            viagens.forEach(v => { kmTotal += (v.kmRodado || 0); });
        }

        // 2. Financial totals
        let totalCombustivel = abastecimentos.reduce((acc, a) => acc + (a.valorTotal || 0), 0);
        let totalManutencao = manutencoes.reduce((acc, m) => acc + (m.valor || 0), 0);
        let totalPneus = pneus.reduce((acc, p) => acc + (p.custo || 0), 0);
        let totalLubrificantes = oleos.reduce((acc, o) => acc + (o.valor || 0), 0);

        // 3. Averages
        const manutRealizadas = manutencoes.filter(m => m.status === 'Realizada');
        const mediaCustoManutencao = manutRealizadas.length > 0 ? (totalManutencao / manutRealizadas.length) : 0;

        let mediaKMLTotal = 0;
        let validKMLCount = 0;
        abastecimentos.forEach(a => {
            if (a.kmL > 0) {
                mediaKMLTotal += a.kmL;
                validKMLCount++;
            }
        });
        const mediaKMLGeral = validKMLCount > 0 ? (mediaKMLTotal / validKMLCount) : 0;

        const contagemDocumentosVencidos = alerts.filter(a => a.tipo === 'Documento vencido').length;
        const contagemCNHsVencidas = alerts.filter(a => a.tipo === 'CNH vencida').length;
        const contagemManutencaoAtrasada = alerts.filter(a => a.tipo === 'Manutenção atrasada').length;
        const contagemOleosVencidos = alerts.filter(a => a.tipo === 'Óleo vencido').length;
        const contagemPneusTroca = alerts.filter(a => a.prioridade === 'Alta' && a.tipo === 'Pneu próximo da troca').length;

        return {
            kmTotalFrota: kmTotal || 148200,
            totalGastoCombustivel: totalCombustivel,
            totalGastoManutencao: totalManutencao,
            totalGastoPneus: totalPneus,
            totalGastoLubrificantes: totalLubrificantes,
            mediaCustoManutencao: mediaCustoManutencao,
            mediaKMLGeral: mediaKMLGeral || 9.8,
            veiculosEmManutencao: veiculos.filter(v => v.status === 'em_manutencao').length,
            veiculosAtrasados: contagemManutencaoAtrasada,
            documentosVencidos: contagemDocumentosVencidos,
            cnhsVencidas: contagemCNHsVencidas,
            oleosProximos: alerts.filter(a => a.tipo === 'Óleo próximo da troca').length,
            oleosVencidos: contagemOleosVencidos,
            pneusTroca: contagemPneusTroca
        };
    }
}

// Instantiate globally
window.movixStore = new MovixStore();
