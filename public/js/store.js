/* MovixFrota - Central State Store and Node.js REST API Sync Engine */

class MovixStore {
    constructor() {
        this.state = {
            activeProfile: 'Visualizador',
            usuarios: [],
            veiculos: [],
            motoristas: [],
            multas: [],
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
            console.error("Erro na autenticaÃ§Ã£o de sessÃ£o inicial:", e);
            if (this.onSessionChange) this.onSessionChange(false);
        }
    }

    // Load all data collections from REST API
    async loadData() {
        try {
            const [veiculos, motoristas, multas, abastecimentos, manutencoes, pneus, oleos, viagens, logs, alertas] = await Promise.all([
                fetch('/api/veiculos').then(r => r.json()),
                fetch('/api/motoristas').then(r => r.json()),
                fetch('/api/multas').then(r => r.json()),
                fetch('/api/abastecimentos').then(r => r.json()),
                fetch('/api/manutencoes').then(r => r.json()),
                fetch('/api/pneus').then(r => r.json()),
                fetch('/api/oleos').then(r => r.json()),
                fetch('/api/viagens').then(r => r.json()),
                fetch('/api/logs').then(r => r.json()),
                fetch('/api/alertas').then(r => r.json()).catch(() => [])
            ]);

            this.state.veiculos = (Array.isArray(veiculos) ? veiculos : []).map(v => ({
                ...v,
                kmAtual: parseFloat(v.kmAtual) || 0,
                valorMensalSeguro: parseFloat(v.valorMensalSeguro) || 0,
                valorMensalRastreador: parseFloat(v.valorMensalRastreador) || 0,
                configRodagem: v.configRodagem || 'Personalizado',
                configEixos: typeof v.configEixos === 'string' ? JSON.parse(v.configEixos) : (v.configEixos || [])
            }));
            this.state.motoristas = (Array.isArray(motoristas) ? motoristas : []).map(m => ({
                ...m,
                categoria: m.categoria || 'Motorista Efetivo'
            }));
            this.state.multas = (Array.isArray(multas) ? multas : []).map(mu => ({
                ...mu,
                pontos: parseInt(mu.pontos) || 0,
                valor: parseFloat(mu.valor) || 0,
                associacaoTipo: mu.associacaoTipo || 'sem_motorista',
                viagemId: mu.viagemId || null,
                motoristaCategoria: mu.motoristaCategoria || null
            }));
            this.state.abastecimentos = (Array.isArray(abastecimentos) ? abastecimentos : []).map(a => ({
                ...a,
                litros: parseFloat(a.litros) || 0,
                valorLitro: parseFloat(a.valorLitro) || 0,
                valorTotal: parseFloat(a.valorTotal) || 0,
                kmAtual: parseFloat(a.kmAtual) || 0,
                kmL: parseFloat(a.kmL) || 0,
                custoKM: parseFloat(a.custoKM) || 0,
                motoristaCategoria: a.motoristaCategoria || null
            }));
            this.state.manutencoes = (Array.isArray(manutencoes) ? manutencoes : []).map(m => ({
                ...m,
                valor: parseFloat(m.valor) || 0,
                km: parseFloat(m.km) || 0
            }));
            this.state.pneus = (Array.isArray(pneus) ? pneus : []).map(p => ({
                ...p,
                custo: parseFloat(p.custo) || 0,
                vidaEstimada: parseFloat(p.vidaEstimada) || 0,
                kmInicial: parseFloat(p.kmInicial) || 0,
                recapado: !!p.recapado
            }));
            this.state.oleos = (Array.isArray(oleos) ? oleos : []).map(o => ({
                ...o,
                kmTroca: parseFloat(o.kmTroca) || 0,
                proximaTrocaKM: parseFloat(o.proximaTrocaKM) || 0,
                valor: parseFloat(o.valor) || 0
            }));
            this.state.viagens = (Array.isArray(viagens) ? viagens : []).map(vi => ({
                ...vi,
                kmInicial: parseFloat(vi.kmInicial) || 0,
                kmFinal: parseFloat(vi.kmFinal) || 0,
                kmRodado: parseFloat(vi.kmRodado) || 0,
                custos: parseFloat(vi.custos) || 0,
                motoristaCategoria: vi.motoristaCategoria || null
            }));
            this.state.logs = Array.isArray(logs) ? logs : [];
            this.state.alertas = Array.isArray(alertas) ? alertas : [];

            // Load users list if logged user is Admin
            if (this.activeUser && this.activeUser.perfil === 'Administrador') {
                const fetchedUsers = await fetch('/api/usuarios').then(r => r.json());
                this.state.usuarios = Array.isArray(fetchedUsers) ? fetchedUsers : [this.activeUser];
            } else {
                this.state.usuarios = [this.activeUser]; // Fallback for list display
            }
        } catch (e) {
            console.error("Erro ao carregar dados do servidor:", e);
        }
    }

    // Login Action
    async login(identifier, senha, rememberMe = false) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, senha, rememberMe })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Falha na autenticaÃ§Ã£o.');
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

    cleanPayload(data) {
        if (!data || typeof data !== 'object') return data;
        const clean = { ...data };
        const currencyFields = [
            'valor',
            'custo',
            'custos',
            'valorMensalSeguro',
            'valorMensalRastreador',
            'valorTotal',
            'valorLitro'
        ];
        currencyFields.forEach(field => {
            if (field in clean) {
                if (typeof clean[field] === 'string') {
                    const val = clean[field].trim();
                    if (val === '') {
                        clean[field] = null;
                    } else {
                        let cleaned = val.replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
                        const num = parseFloat(cleaned);
                        clean[field] = isNaN(num) ? 0 : num;
                    }
                }
            }
        });
        
        if ('litros' in clean) {
            if (typeof clean.litros === 'string') {
                const val = clean.litros.trim();
                if (val === '') {
                    clean.litros = null;
                } else {
                    const cleaned = val.replace(',', '.');
                    const num = parseFloat(cleaned);
                    clean.litros = isNaN(num) ? 0 : num;
                }
            }
        }

        return clean;
    }

    // --- CRUD HELPER METHODS CONNECTING TO API ---

    // Vehicles
    getVeiculos() { return this.state.veiculos; }
    getVeiculo(id) { return this.state.veiculos.find(v => v.id === id); }
    
    async addVeiculo(veiculo) {
        const res = await fetch('/api/veiculos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(veiculo))
        });
        if (!res.ok) throw new Error('Erro ao salvar veÃ­culo no servidor.');
        const newV = await res.json();
        this.state.veiculos.push(newV);
        await this.loadData();
        return newV;
    }

    async updateVeiculo(id, data) {
        const res = await fetch(`/api/veiculos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(data))
        });
        if (!res.ok) throw new Error('Erro ao atualizar veÃ­culo no servidor.');
        const updatedV = await res.json();
        const idx = this.state.veiculos.findIndex(v => v.id === id);
        if (idx !== -1) this.state.veiculos[idx] = updatedV;
        await this.loadData();
        return true;
    }

    async deleteVeiculo(id) {
        const res = await fetch(`/api/veiculos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir veÃ­culo.');
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
            throw new Error(err.error || 'Erro ao criar usuÃ¡rio.');
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
            throw new Error(err.error || 'Erro ao editar usuÃ¡rio.');
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
            throw new Error(err.error || 'Erro ao excluir usuÃ¡rio.');
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
            body: JSON.stringify(this.cleanPayload(ab))
        });
        if (!res.ok) throw new Error('Erro ao salvar abastecimento no servidor.');
        const newAb = await res.json();
        this.state.abastecimentos.unshift(newAb);
        await this.loadData();
        return newAb;
    }

    async updateAbastecimento(id, data) {
        const res = await fetch(`/api/abastecimentos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(data))
        });
        if (!res.ok) throw new Error('Erro ao atualizar abastecimento no servidor.');
        const updatedAb = await res.json();
        const idx = this.state.abastecimentos.findIndex(a => a.id === id);
        if (idx !== -1) this.state.abastecimentos[idx] = updatedAb;
        await this.loadData();
        return true;
    }

    async deleteAbastecimento(id) {
        const res = await fetch(`/api/abastecimentos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir abastecimento.');
        this.state.abastecimentos = this.state.abastecimentos.filter(a => a.id !== id);
        await this.loadData();
        return true;
    }

    async updatePerfil(data) {
        const res = await fetch('/api/perfil', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao atualizar perfil.');
        }
        const updatedUser = await res.json();
        this.activeUser = updatedUser;
        const idx = this.state.usuarios.findIndex(u => u.id === updatedUser.id);
        if (idx !== -1) {
            this.state.usuarios[idx] = updatedUser;
        }
        if (this.onSessionChange) {
            this.onSessionChange(true);
        }
        return updatedUser;
    }

    // Maintenances
    getMaintenances() { return this.state.manutencoes; }

    async addMaintenance(m) {
        const res = await fetch('/api/manutencoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(m))
        });
        if (!res.ok) throw new Error('Erro ao salvar ordem de serviÃ§o.');
        const newM = await res.json();
        this.state.manutencoes.unshift(newM);
        await this.loadData();
        return newM;
    }

    async updateMaintenance(id, data) {
        const res = await fetch(`/api/manutencoes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(data))
        });
        if (!res.ok) throw new Error('Erro ao atualizar ordem de serviÃ§o.');
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
            body: JSON.stringify(this.cleanPayload(p))
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
            body: JSON.stringify(this.cleanPayload(data))
        });
        if (!res.ok) throw new Error('Erro ao atualizar pneu.');
        const updatedP = await res.json();
        const idx = this.state.pneus.findIndex(p => p.id === id);
        if (idx !== -1) this.state.pneus[idx] = updatedP;
        await this.loadData();
        return true;
    }

    async deletePneu(id) {
        const res = await fetch(`/api/pneus/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir pneu.');
        this.state.pneus = this.state.pneus.filter(p => p.id !== id);
        await this.loadData();
        return true;
    }

    // Oil Changes
    getOleos() { return this.state.oleos; }

    async addOleo(o) {
        const res = await fetch('/api/oleos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(o))
        });
        if (!res.ok) throw new Error('Erro ao salvar registro de troca de Ã³leo.');
        const newO = await res.json();
        this.state.oleos.unshift(newO);
        await this.loadData();
        return newO;
    }

    async updateOleo(id, data) {
        const res = await fetch(`/api/oleos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(data))
        });
        if (!res.ok) throw new Error('Erro ao atualizar registro de troca de Ã³leo.');
        const updatedO = await res.json();
        const idx = this.state.oleos.findIndex(o => o.id === id);
        if (idx !== -1) this.state.oleos[idx] = updatedO;
        await this.loadData();
        return true;
    }

    async deleteOleo(id) {
        const res = await fetch(`/api/oleos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir registro de troca de Ã³leo.');
        this.state.oleos = this.state.oleos.filter(o => o.id !== id);
        await this.loadData();
        return true;
    }

    // Trips (Viagens)
    getViagens() { return this.state.viagens; }

    async addViagem(v) {
        const res = await fetch('/api/viagens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(v))
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
            body: JSON.stringify(this.cleanPayload(data))
        });
        if (!res.ok) throw new Error('Erro ao finalizar viagem.');
        const updatedVia = await res.json();
        const idx = this.state.viagens.findIndex(v => v.id === id);
        if (idx !== -1) this.state.viagens[idx] = updatedVia;
        await this.loadData();
        return true;
    }

    async deleteViagem(id) {
        const res = await fetch(`/api/viagens/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Erro ao excluir viagem.');
        }
        this.state.viagens = this.state.viagens.filter(v => v.id !== id);
        await this.loadData();
        return true;
    }

    // Multas
    getMultas() { return this.state.multas || []; }
    getMulta(id) { return (this.state.multas || []).find(m => m.id === id); }

    async addMulta(multa) {
        const res = await fetch('/api/multas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(multa))
        });
        if (!res.ok) throw new Error('Erro ao registrar multa.');
        const newMulta = await res.json();
        if (!this.state.multas) this.state.multas = [];
        this.state.multas.push(newMulta);
        await this.loadData();
        return newMulta;
    }

    async updateMulta(id, data) {
        const res = await fetch(`/api/multas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.cleanPayload(data))
        });
        if (!res.ok) throw new Error('Erro ao atualizar dados da multa.');
        const updatedMulta = await res.json();
        const idx = this.state.multas.findIndex(m => m.id === id);
        if (idx !== -1) this.state.multas[idx] = updatedMulta;
        await this.loadData();
        return true;
    }

    async deleteMulta(id) {
        const res = await fetch(`/api/multas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir multa.');
        this.state.multas = this.state.multas.filter(m => m.id !== id);
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
        if (p.posicao && p.posicao.startsWith('Estepe')) {
            return p.vidaEstimada;
        }
        
        const v = this.getVeiculo(p.veiculoAtual);
        if (!v) return p.vidaEstimada;
        
        const currentVehicleKM = parseFloat(v.kmAtual);
        const installedVehicleKM = parseFloat(p.kmInicial);
        const distanceTraveled = currentVehicleKM - installedVehicleKM;
        
        return Math.max(0, p.vidaEstimada - distanceTraveled);
    }

    getTacografoStatus(v) {
        if (!v || v.possuiTacografo !== 'Sim') return '-';
        if (v.statusTacografo === 'Em manutenÃ§Ã£o') return 'Em manutenÃ§Ã£o';
        if (!v.validadeAfericaoTacografo) return 'Regular';

        const today = new Date();
        today.setHours(0,0,0,0);
        const valDate = new Date(v.validadeAfericaoTacografo + 'T23:59:59');
        valDate.setHours(0,0,0,0);
        const diffTime = valDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Vencido';
        if (diffDays <= 30) return 'PrÃ³ximo do vencimento';
        return 'Regular';
    }

    getAlerts() {
        return this.state.alertas || [];
    }

    getMetrics() {
        const veiculos = this.getVeiculos();
        const abastecimentos = this.getAbastecimentos();
        const manutencoes = this.getMaintenances();
        const pneus = this.getPneus();
        const oleos = this.getOleos();
        const viagens = this.getViagens();
        const alerts = this.getAlerts();
        const today = new Date();

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
        let totalCombustivel = abastecimentos.reduce((acc, a) => acc + (parseFloat(a.valorTotal) || 0), 0);
        let totalManutencao = manutencoes.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
        let totalPneus = pneus.reduce((acc, p) => acc + (parseFloat(p.custo) || 0), 0);
        let totalLubrificantes = 0;

        // Calculate dynamic Insurance Cost
        let totalSeguroMensal = 0;
        let totalSeguroGeral = 0;
        veiculos.forEach(v => {
            if (v.possuiSeguro === 'Sim' && v.valorMensalSeguro) {
                const monthly = parseFloat(v.valorMensalSeguro) || 0;
                totalSeguroMensal += monthly;
                
                let months = 6; // default historical months
                if (v.inicioContratoSeguro) {
                    const start = new Date(v.inicioContratoSeguro + 'T00:00:00');
                    const elapsedMs = today - start;
                    const elapsedMonths = Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 30.4));
                    months = Math.max(1, elapsedMonths);
                }
                totalSeguroGeral += monthly * months;
            }
        });

        // Calculate Tracker Costs
        let totalRastreamentoMensal = 0;
        let totalGastoRastreamento = 0;
        veiculos.forEach(v => {
            if (v.possuiRastreador === 'Sim' && v.valorMensalRastreador) {
                const monthly = parseFloat(v.valorMensalRastreador) || 0;
                totalRastreamentoMensal += monthly;
                
                let months = 6; // default historical months
                if (v.inicioContratoRastreador) {
                    const start = new Date(v.inicioContratoRastreador + 'T00:00:00');
                    const elapsedMs = today - start;
                    const elapsedMonths = Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 30.4));
                    months = Math.max(1, elapsedMonths);
                }
                totalGastoRastreamento += monthly * months;
            }
        });

        // 3. Averages and active statuses
        const veiculosAtivos = veiculos.filter(v => v.status !== 'inativo' && (v.tipoUnidade === 'Veículo Motorizado' || !v.tipoUnidade)).length;
        const implementosCadastrados = veiculos.filter(v => v.tipoUnidade === 'Implemento/Reboque').length;
        const veiculosEmManutencaoCount = veiculos.filter(v => v.status === 'em_manutencao' && (v.tipoUnidade === 'Veículo Motorizado' || !v.tipoUnidade)).length;
        const implementosEmManutencaoCount = veiculos.filter(v => v.status === 'em_manutencao' && v.tipoUnidade === 'Implemento/Reboque').length;

        const totalCustoOperacional = totalCombustivel + totalManutencao + totalPneus + totalSeguroGeral + totalGastoRastreamento;
        const mediaCustoOperacional = veiculosAtivos > 0 ? (totalCustoOperacional / veiculosAtivos) : 0;

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

        const contagemCNHsVencidas = alerts.filter(a => a.categoria === 'Motoristas' && a.prioridade === 'Crítica').length;
        const contagemManutencaoAtrasada = alerts.filter(a => a.categoria === 'Manutenções').length;
        const contagemOleosVencidos = alerts.filter(a => a.categoria === 'Troca de Óleo' && a.prioridade === 'Crítica').length;
        const contagemPneusTroca = alerts.filter(a => a.categoria === 'Pneus').length;

        const totalMultasVal = (this.state.multas || []).reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
        const totalMultasCount = (this.state.multas || []).length;

        return {
            kmTotalFrota: kmTotal || 148200,
            totalGastoCombustivel: totalCombustivel,
            totalGastoManutencao: totalManutencao,
            totalGastoPneus: totalPneus,
            totalGastoLubrificantes: totalLubrificantes,
            mediaCustoManutencao: mediaCustoManutencao,
            mediaKMLGeral: mediaKMLGeral || 9.8,
            veiculosEmManutencao: veiculosEmManutencaoCount,
            implementosEmManutencao: implementosEmManutencaoCount,
            veiculosAtivosCount: veiculosAtivos,
            implementosCount: implementosCadastrados,
            totalGastoSeguros: totalSeguroGeral,
            totalSeguroMensal: totalSeguroMensal,
            totalGastoRastreamento: totalGastoRastreamento,
            totalRastreamentoMensal: totalRastreamentoMensal,
            totalCustoOperacional: totalCustoOperacional,
            mediaCustoOperacional: mediaCustoOperacional,
            veiculosAtrasados: contagemManutencaoAtrasada,
            documentosVencidos: 0,
            cnhsVencidas: contagemCNHsVencidas,
            oleosProximos: alerts.filter(a => a.categoria === 'Troca de Óleo' && a.prioridade === 'Alta').length,
            oleosVencidos: contagemOleosVencidos,
            pneusTroca: contagemPneusTroca,
            totalMultas: totalMultasCount,
            valorTotalMultas: totalMultasVal
        };
    }
}

// Instantiate globally
window.movixStore = new MovixStore();
