// =======================================================================
// MÓDULO: NOTIFICAÇÕES
// Exibe todos os alertas dinâmicos gerados pelo sistema em tempo real
// =======================================================================

window.notificacoesModule = {

    render() {
        const wrapper = document.getElementById('view-content-wrapper');

        // Renderizar a casca da página com padrão do sistema
        wrapper.innerHTML = `
            <div class="page-header" style="margin-bottom: 24px;">
                <div>
                    <h1 class="page-title">Notificações</h1>
                    <p class="page-subtitle">Centralize e gerencie todos os alertas do sistema em um único lugar.</p>
                </div>
            </div>

            <!-- FILTERS -->
            <div class="filters-card" style="margin-bottom: 20px;">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Buscar Notificação</label>
                        <div style="position:relative; width: 100%;">
                            <input type="text" class="filter-input" id="notif-search" placeholder="Pesquisar..." style="padding-left:34px;">
                            <i class="fa-solid fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.8rem;"></i>
                        </div>
                    </div>
                    <div class="filter-group">
                        <label>Prioridade</label>
                        <select class="filter-input" id="notif-prioridade-filter">
                            <option value="">Todas</option>
                            <option value="Crítica">Crítica</option>
                            <option value="Alta">Alta</option>
                            <option value="Média">Média</option>
                            <option value="Informativa">Informativa</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Categoria</label>
                        <select class="filter-input" id="notif-categoria-filter">
                            <option value="">Todas</option>
                            <option value="Veículos">Veículos</option>
                            <option value="Motoristas">Motoristas</option>
                            <option value="Manutenções">Manutenções</option>
                            <option value="Troca de Óleo">Troca de Óleo</option>
                            <option value="Pneus">Pneus</option>
                            <option value="Multas">Multas</option>
                            <option value="Viagens">Viagens</option>
                        </select>
                    </div>
                    <div class="filter-group" style="justify-content: flex-end;">
                        <button class="btn btn-secondary" id="btn-limpar-filtros" style="height: 38px; width: 100%; white-space: nowrap; justify-content: center;">
                            <i class="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
                        </button>
                    </div>
                </div>
            </div>

            <!-- SUMÁRIO DE CONTADORES -->
            <div id="notif-stats-row" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-bottom:24px; width:100%;"></div>

            <!-- LISTAGEM DE ALERTAS -->
            <div class="card" style="padding:0; overflow:hidden;">
                <div id="notif-list-container">
                    <div style="padding:40px; text-align:center; color:var(--text-muted);">
                        <i class="fa-solid fa-arrows-rotate fa-spin" style="font-size:2rem; margin-bottom:12px;"></i>
                        <p>Carregando notificações...</p>
                    </div>
                </div>
            </div>
        `;

        // Carregamento de dados assíncrono padrão
        window.movixStore.loadData().then(() => {
            const alerts = window.movixStore.getAlerts();
            const listContainer = document.getElementById('notif-list-container');
            if (listContainer) {
                listContainer.innerHTML = this._renderAlertList(alerts);
            }
            this._renderStats(alerts);
            this._bindEvents();
        });
    },

    _getCategoryIcon(cat) {
        const icons = {
            'Veículos': 'fa-truck',
            'Motoristas': 'fa-id-card-clip',
            'Manutenções': 'fa-screwdriver-wrench',
            'Troca de Óleo': 'fa-oil-can',
            'Pneus': 'fa-circle-notch',
            'Multas': 'fa-ticket',
            'Viagens': 'fa-route',
        };
        return icons[cat] || 'fa-circle-info';
    },

    _getPriorityColor(prioridade) {
        if (prioridade === 'Crítica') return '#ef4444'; // Vermelho
        if (prioridade === 'Alta') return '#f59e0b';    // Laranja
        if (prioridade === 'Média') return '#3b82f6';   // Azul
        return '#10b981';                               // Verde para Informativa
    },

    _getPriorityBg(prioridade) {
        if (prioridade === 'Crítica') return 'rgba(239, 68, 68, 0.15)';
        if (prioridade === 'Alta') return 'rgba(245, 158, 11, 0.15)';
        if (prioridade === 'Média') return 'rgba(59, 130, 246, 0.15)';
        return 'rgba(16, 185, 129, 0.15)';
    },

    _renderAlertList(alerts) {
        if (!alerts || alerts.length === 0) {
            return `
                <div style="padding:60px 20px; text-align:center; color:var(--text-muted);">
                    <i class="fa-solid fa-bell-slash" style="font-size:3rem; margin-bottom:16px; opacity:0.4; display:block;"></i>
                    <h3 style="font-family:var(--font-heading); margin-bottom:8px;">Nenhuma notificação pendente!</h3>
                    <p style="font-size:0.85rem;">Todos os sistemas estão operando normalmente.</p>
                </div>
            `;
        }

        return alerts.map(a => {
            const color = this._getPriorityColor(a.prioridade);
            const bg = this._getPriorityBg(a.prioridade);
            const icon = this._getCategoryIcon(a.categoria);
            return `
                <div class="notif-item" data-id="${a.id}" data-prioridade="${a.prioridade}" data-categoria="${a.categoria || ''}" data-link="${a.link || ''}" data-target="${a.targetId || ''}"
                    style="display:flex; align-items:center; gap:14px; padding:14px 20px; border-bottom:1px solid var(--border-color); cursor:pointer; transition:background 0.15s; ${a.status === 'Não lida' ? 'background: var(--bg-surface-hover);' : ''}">
                    <div style="width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:${bg}; flex-shrink:0;">
                        <i class="fa-solid ${icon}" style="color:${color}; font-size:1rem;"></i>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:3px;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-main);">${a.titulo}</span>
                            <span style="padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700; background:${bg}; color:${color}; white-space:nowrap;">${a.prioridade}</span>
                            <span style="padding:2px 8px; border-radius:12px; font-size:0.7rem; background:var(--bg-surface-hover); color:var(--text-muted); white-space:nowrap;">${a.categoria || 'Geral'}</span>
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.descricao || a.desc || ''}</div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:8px;">
                        <button class="btn-go-to" data-link="${a.link || ''}" data-target="${a.targetId || ''}" style="background:transparent; border:1px solid var(--border-color); border-radius:8px; padding:6px 10px; font-size:0.75rem; color:var(--primary); cursor:pointer; display:flex; align-items:center; gap:5px; transition:all 0.15s;">
                            <i class="fa-solid fa-arrow-right"></i> Ver
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    _renderStats(alerts) {
        const statsRow = document.getElementById('notif-stats-row');
        if (!statsRow) return;

        const total = alerts.length;
        const criticas = alerts.filter(a => a.prioridade === 'Crítica').length;
        const altas = alerts.filter(a => a.prioridade === 'Alta').length;
        const categorias = [...new Set(alerts.map(a => a.categoria))].filter(Boolean);

        const stats = [
            { label: 'Total de Alertas', value: total, icon: 'fa-bell', bg: 'var(--primary-light)', color: 'var(--primary)' },
            { label: 'Prioridade Crítica', value: criticas, icon: 'fa-circle-exclamation', bg: 'var(--danger-light)', color: 'var(--danger)' },
            { label: 'Prioridade Alta', value: altas, icon: 'fa-triangle-exclamation', bg: 'var(--warning-light)', color: 'var(--warning)' },
            { label: 'Categorias Afetadas', value: categorias.length, icon: 'fa-layer-group', bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
        ];

        statsRow.innerHTML = stats.map(s => `
            <div class="card" style="padding: 16px; display: flex; flex-direction: row !important; align-items: center; gap: 14px; margin-bottom:0; box-shadow: var(--shadow-sm);">
                <div style="width: 48px; height: 48px; border-radius: 8px; background-color: ${s.bg}; color: ${s.color}; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink:0;">
                    <i class="fa-solid ${s.icon}"></i>
                </div>
                <div>
                    <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display:block;">${s.label}</span>
                    <strong style="font-size: 1.25rem; color: var(--text-main); font-family: var(--font-heading);">${s.value}</strong>
                </div>
            </div>
        `).join('');
    },

    _applyFilters() {
        const searchVal = (document.getElementById('notif-search')?.value || '').toLowerCase();
        const categoriaVal = document.getElementById('notif-categoria-filter')?.value || '';
        const prioridadeVal = document.getElementById('notif-prioridade-filter')?.value || '';

        const items = document.querySelectorAll('.notif-item');
        items.forEach(item => {
            const prioridade = item.getAttribute('data-prioridade') || '';
            const categoria = item.getAttribute('data-categoria') || '';
            const text = item.textContent.toLowerCase();

            const matchesPrioridade = !prioridadeVal || prioridade === prioridadeVal;
            const matchesCategoria = !categoriaVal || categoria === categoriaVal;
            const matchesSearch = !searchVal || text.includes(searchVal);

            item.style.display = (matchesPrioridade && matchesCategoria && matchesSearch) ? 'flex' : 'none';
        });
    },

    _bindEvents() {
        // Eventos de alteração dos inputs de filtros
        document.getElementById('notif-search')?.addEventListener('input', () => this._applyFilters());
        document.getElementById('notif-categoria-filter')?.addEventListener('change', () => this._applyFilters());
        document.getElementById('notif-prioridade-filter')?.addEventListener('change', () => this._applyFilters());

        // Botão de Limpar Filtros
        document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
            const search = document.getElementById('notif-search');
            const cat = document.getElementById('notif-categoria-filter');
            const prio = document.getElementById('notif-prioridade-filter');

            if (search) search.value = '';
            if (cat) cat.value = '';
            if (prio) prio.value = '';

            this._applyFilters();
        });

        // Clique em cada item para navegar
        document.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-go-to')) return; // handled separately
                const link = item.getAttribute('data-link');
                if (link) window.movixRouter?.navigateTo(link);
            });

            item.addEventListener('mouseover', () => { item.style.background = 'var(--bg-surface-hover)'; });
            item.addEventListener('mouseout', () => { item.style.background = item.getAttribute('data-read') === 'true' ? '' : 'var(--bg-surface-hover)'; });
        });

        // Botão "Ver" em cada item
        document.querySelectorAll('.btn-go-to').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const link = btn.getAttribute('data-link');
                if (link) window.movixRouter?.navigateTo(link);
            });

            btn.addEventListener('mouseover', () => { btn.style.background = 'var(--primary)'; btn.style.color = '#fff'; });
            btn.addEventListener('mouseout', () => { btn.style.background = 'transparent'; btn.style.color = 'var(--primary)'; });
        });
    }
};

// Registrar rota no router
function renderNotificacoes() {
    window.notificacoesModule.render();
}
window.movixRouter.register('notificacoes', renderNotificacoes);
