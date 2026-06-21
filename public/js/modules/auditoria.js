/* MovixFrota - Auditoria & Logs Module */

(function() {
    
    function renderAuditoria(container) {
        const activeUser = window.movixStore.getActiveUser();
        
        // Block access to non-administrators
        if (!activeUser || activeUser.perfil !== 'Administrador') {
            container.innerHTML = `
                <div class="search-no-results" style="padding: 64px;">
                    <i class="fa-solid fa-shield-halved text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <h2 style="color:var(--text-main);">Acesso Restrito</h2>
                    <p style="color:var(--text-muted); margin-top:8px;">Este módulo é exclusivo para Administradores do sistema.</p>
                    <button class="btn btn-primary" style="margin-top:16px;" onclick="window.movixRouter.navigateTo('dashboard')">
                        Voltar ao Dashboard
                    </button>
                </div>
            `;
            return;
        }

        const logs = window.movixStore.state.logs;
        const users = window.movixStore.state.usuarios;
        const isAdmin = activeUser.perfil === 'Administrador';

        let state = window.movixApp.getListState('auditoria');
        if (!state) {
            state = {
                currentPage: 1,
                filters: {
                    busca: '',
                    acao: '',
                    periodo: 'tudo',
                    de: '',
                    ate: ''
                },
                itemsPerPage: 10
            };
            window.movixApp.saveListState('auditoria', state);
        } else if (state.itemsPerPage === undefined) {
            state.itemsPerPage = 10;
            window.movixApp.saveListState('auditoria', state);
        }

        let currentPage = state.currentPage || 1;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Logs & Auditoria</h1>
                    <p class="page-subtitle">Rastreamento de auditoria e registro de atividades de usuários em conformidade com a segurança da informação</p>
                </div>
                <div class="page-actions">
                    ${isAdmin ? `
                        <button class="btn btn-danger" id="btn-limpar-logs">
                            <i class="fa-solid fa-eraser"></i> Limpar Registros
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="grid-2-1">
                
                <!-- SECURITY LOGS TABLE -->
                <div class="card" style="min-height: 480px; display:flex; flex-direction:column;">
                    <div class="card-header-simple">
                        <h3>Registro Histórico de Transações</h3>
                        <i class="fa-solid fa-clock-rotate-left text-muted"></i>
                    </div>

                    <!-- SEARCH/FILTER BAR -->
                    <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
                        <div style="display:flex; gap:12px; align-items:center;">
                            <input type="text" class="filter-input" id="search-logs" placeholder="Filtrar logs..." value="${state.filters.busca || ''}" style="flex-grow:1;">
                            <select class="filter-input" id="filter-log-action" style="width:160px;">
                                <option value="">Todas Ações</option>
                                <option value="Cadastro" ${state.filters.acao === 'Cadastro' ? 'selected' : ''}>Cadastro</option>
                                <option value="Edição" ${state.filters.acao === 'Edição' ? 'selected' : ''}>Edição</option>
                                <option value="Exclusão" ${state.filters.acao === 'Exclusão' ? 'selected' : ''}>Exclusão</option>
                                <option value="Aprovação" ${state.filters.acao === 'Aprovação' ? 'selected' : ''}>Aprovação</option>
                                <option value="Sessão" ${state.filters.acao === 'Sessão' ? 'selected' : ''}>Sessão</option>
                            </select>
                        </div>
                        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                            <select class="filter-input" id="filter-log-periodo" style="width:180px;">
                                <option value="tudo" ${state.filters.periodo === 'tudo' ? 'selected' : ''}>Todo o histórico</option>
                                <option value="hoje" ${state.filters.periodo === 'hoje' ? 'selected' : ''}>Hoje</option>
                                <option value="ontem" ${state.filters.periodo === 'ontem' ? 'selected' : ''}>Ontem</option>
                                <option value="7dias" ${state.filters.periodo === '7dias' ? 'selected' : ''}>Últimos 7 dias</option>
                                <option value="30dias" ${state.filters.periodo === '30dias' ? 'selected' : ''}>Últimos 30 dias</option>
                                <option value="este_mes" ${state.filters.periodo === 'este_mes' ? 'selected' : ''}>Este mês</option>
                                <option value="mes_anterior" ${state.filters.periodo === 'mes_anterior' ? 'selected' : ''}>Mês anterior</option>
                                <option value="personalizado" ${state.filters.periodo === 'personalizado' ? 'selected' : ''}>Personalizado...</option>
                            </select>
                            
                            <div id="custom-date-container-log" style="display: ${state.filters.periodo === 'personalizado' ? 'flex' : 'none'}; gap: 12px; align-items: center;">
                                <input type="date" class="filter-input" id="filter-log-de" value="${state.filters.de || ''}" placeholder="De" style="width:140px;">
                                <span style="color:var(--text-muted); font-size:0.85rem;">até</span>
                                <input type="date" class="filter-input" id="filter-log-ate" value="${state.filters.ate || ''}" placeholder="Até" style="width:140px;">
                            </div>
                            
                            <div style="margin-left: auto; display: flex; align-items: center; justify-content: flex-end;">
                                <button class="btn btn-secondary" id="btn-limpar-filtros" style="height: 38px; white-space: nowrap; justify-content: center;">
                                    <i class="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="table-responsive" style="border:none; box-shadow:none; flex-grow:1; margin-top:12px;">
                        <table class="smart-table">
                            <thead>
                                <tr>
                                    <th>Horário</th>
                                    <th>Usuário (Perfil)</th>
                                    <th>Ação</th>
                                    <th>Entidade</th>
                                    <th>Detalhes do Evento</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-logs">
                                <!-- Dynamic -->
                            </tbody>
                        </table>
                        <div class="table-pagination" id="pagination-auditoria"></div>
                    </div>
                </div>

                <!-- SIMULATED USERS MANAGER PANEL -->
                <div class="card">
                    <div class="card-header-simple">
                        <h3>Usuários do Sistema</h3>
                        <span class="status-pill ok" style="font-size:0.75rem;">${users.length} ativos</span>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:16px; margin-top:12px;">
                        <p style="font-size:0.8rem; color:var(--text-muted);">Usuários corporativos simulados com níveis de privilégio no MovixFrota ERP.</p>
                        
                        <div style="display:flex; flex-direction:column; gap:12px; max-height:360px; overflow-y:auto;" id="users-list-container">
                            <!-- Dynamic -->
                        </div>
                    </div>
                </div>

            </div>
        `;

        function updateLogsTable() {
            const tbody = document.getElementById('tbody-logs');
            if (!tbody) return;

            const searchVal = document.getElementById('search-logs').value.toLowerCase();
            const actionVal = document.getElementById('filter-log-action').value;
            const periodVal = document.getElementById('filter-log-periodo').value;
            const deVal = document.getElementById('filter-log-de').value;
            const ateVal = document.getElementById('filter-log-ate').value;

            // Save list state
            state.filters = {
                busca: searchVal,
                acao: actionVal,
                periodo: periodVal,
                de: deVal,
                ate: ateVal
            };
            state.currentPage = currentPage;
            window.movixApp.saveListState('auditoria', state);

            const filteredLogs = logs.filter(l => {
                const matchSearch = l.usuario.toLowerCase().includes(searchVal) || 
                                    l.detalhes.toLowerCase().includes(searchVal) ||
                                    l.entidade.toLowerCase().includes(searchVal);
                
                let matchAction = true;
                if (actionVal) {
                    if (actionVal === 'Sessão') {
                        matchAction = (l.entidade === 'Sessão' || l.acao === 'Login' || l.acao === 'Logout');
                    } else {
                        matchAction = l.acao === actionVal;
                    }
                }

                let matchPeriod = true;
                if (periodVal !== 'tudo') {
                    // Extract local date string YYYY-MM-DD
                    const logTime = new Date(l.data);
                    const localOffset = logTime.getTimezoneOffset() * 60000;
                    const logDateStr = new Date(logTime.getTime() - localOffset).toISOString().split('T')[0];

                    const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
                    const todayStr = localNow.toISOString().split('T')[0];

                    if (periodVal === 'hoje') {
                        matchPeriod = logDateStr === todayStr;
                    } else if (periodVal === 'ontem') {
                        const yesterday = new Date(localNow);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toISOString().split('T')[0];
                        matchPeriod = logDateStr === yesterdayStr;
                    } else if (periodVal === '7dias') {
                        const limit = new Date(localNow);
                        limit.setDate(limit.getDate() - 7);
                        const limitStr = limit.toISOString().split('T')[0];
                        matchPeriod = logDateStr >= limitStr && logDateStr <= todayStr;
                    } else if (periodVal === '30dias') {
                        const limit = new Date(localNow);
                        limit.setDate(limit.getDate() - 30);
                        const limitStr = limit.toISOString().split('T')[0];
                        matchPeriod = logDateStr >= limitStr && logDateStr <= todayStr;
                    } else if (periodVal === 'este_mes') {
                        const yearMonth = todayStr.substring(0, 7);
                        matchPeriod = logDateStr.startsWith(yearMonth);
                    } else if (periodVal === 'mes_anterior') {
                        const prevMonthDate = new Date(localNow);
                        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
                        const prevYearMonth = prevMonthDate.toISOString().split('T')[0].substring(0, 7);
                        matchPeriod = logDateStr.startsWith(prevYearMonth);
                    } else if (periodVal === 'personalizado') {
                        if (deVal && logDateStr < deVal) matchPeriod = false;
                        if (ateVal && logDateStr > ateVal) matchPeriod = false;
                    }
                }

                return matchSearch && matchAction && matchPeriod;
            });

            const itemsPerPageVal = state.itemsPerPage === 'Todos' ? Infinity : (parseInt(state.itemsPerPage) || 10);
            const totalPages = Math.ceil(filteredLogs.length / itemsPerPageVal) || 1;
            if (currentPage > totalPages) {
                currentPage = totalPages;
                state.currentPage = currentPage;
                window.movixApp.saveListState('auditoria', state);
            }
            const startIdx = itemsPerPageVal === Infinity ? 0 : (currentPage - 1) * itemsPerPageVal;
            const paginatedItems = filteredLogs.slice(startIdx, startIdx + itemsPerPageVal);

            const paginationEl = document.getElementById('pagination-auditoria');

            if (paginatedItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="search-no-results">Nenhum evento registrado</td></tr>`;
                if (paginationEl) paginationEl.innerHTML = '';
                return;
            }

            let html = '';
            paginatedItems.forEach(l => {
                const date = new Date(l.data);
                const timeStr = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
                
                // Color badges for actions
                let actionBadge = '';
                if (l.acao === 'Cadastro') actionBadge = '<span class="status-pill ok" style="font-size:0.7rem;">CADASTRO</span>';
                else if (l.acao === 'Edição') actionBadge = '<span class="status-pill em_manutencao" style="font-size:0.7rem;">EDIÇÃO</span>';
                else if (l.acao === 'Exclusão') actionBadge = '<span class="status-pill vencido" style="font-size:0.7rem;">EXCLUSÃO</span>';
                else actionBadge = `<span class="status-pill ok" style="font-size:0.7rem; background-color:var(--info-light); color:var(--info);">${l.acao.toUpperCase()}</span>`;

                html += `
                    <tr>
                        <td style="font-size:0.8rem; color:var(--text-muted);">${timeStr}</td>
                        <td>
                            <strong style="font-weight:600;">${l.usuario}</strong><br>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${l.perfil}</span>
                        </td>
                        <td>${actionBadge}</td>
                        <td style="font-weight:600;">${l.entidade}</td>
                        <td><span style="font-size:0.8rem; white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${l.detalhes}</span></td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            // Render pagination footer
            window.movixApp.renderPagination({
                containerId: 'pagination-auditoria',
                currentPage: currentPage,
                totalItems: filteredLogs.length,
                itemsPerPage: state.itemsPerPage || 10,
                noun: 'registros de auditoria',
                onPageChange: (newPage) => {
                    currentPage = newPage;
                    state.currentPage = newPage;
                    window.movixApp.saveListState('auditoria', state);
                    updateLogsTable();
                },
                onItemsPerPageChange: (newLimit) => {
                    state.itemsPerPage = newLimit;
                    currentPage = 1;
                    state.currentPage = 1;
                    window.movixApp.saveListState('auditoria', state);
                    updateLogsTable();
                }
            });
        }

        function renderUsers() {
            const container = document.getElementById('users-list-container');
            if (!container) return;

            let html = '';
            users.forEach(u => {
                const isSelected = activeUser.id === u.id;
                
                html += `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:8px; border:1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}; background-color:${isSelected ? 'var(--primary-light)' : 'var(--bg-surface-hover)'}; transition:all var(--transition-fast);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${u.foto || '/img/avatar-default.png'}" onerror="this.src='/img/avatar-default.png'" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-size:0.85rem; color:var(--text-main);">${u.nome}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${u.cargo}</span>
                            </div>
                        </div>
                        <span class="role-badge ${u.perfil.toLowerCase()}" style="font-size:0.65rem; padding:4px 8px;">${u.perfil}</span>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        // Filters events hooks
        document.getElementById('search-logs').addEventListener('input', () => { currentPage = 1; updateLogsTable(); });
        document.getElementById('filter-log-action').addEventListener('change', () => { currentPage = 1; updateLogsTable(); });
        
        const periodSelect = document.getElementById('filter-log-periodo');
        const customDateContainer = document.getElementById('custom-date-container-log');
        
        periodSelect.addEventListener('change', () => {
            currentPage = 1;
            const isPersonalizado = periodSelect.value === 'personalizado';
            customDateContainer.style.display = isPersonalizado ? 'flex' : 'none';
            if (!isPersonalizado) {
                document.getElementById('filter-log-de').value = '';
                document.getElementById('filter-log-ate').value = '';
            }
            updateLogsTable();
        });

        document.getElementById('filter-log-de').addEventListener('change', () => { currentPage = 1; updateLogsTable(); });
        document.getElementById('filter-log-ate').addEventListener('change', () => { currentPage = 1; updateLogsTable(); });

        document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
            document.getElementById('search-logs').value = '';
            document.getElementById('filter-log-action').value = '';
            document.getElementById('filter-log-periodo').value = 'tudo';
            document.getElementById('filter-log-de').value = '';
            document.getElementById('filter-log-ate').value = '';
            customDateContainer.style.display = 'none';
            currentPage = 1;
            updateLogsTable();
        });

        // Erase logs trigger (Admin only)
        if (document.getElementById('btn-limpar-logs')) {
            document.getElementById('btn-limpar-logs').addEventListener('click', async () => {
                if (confirm('Atenção: Limpar todos os registros de auditoria da base de dados? Esta ação não pode ser desfeita.')) {
                    try {
                        await window.movixStore.clearLogs();
                        window.movixApp.showToast('Auditoria resetada!', 'danger');
                        window.movixRouter.navigateTo('auditoria');
                    } catch (err) {
                        window.movixApp.showToast('Erro ao limpar logs: ' + err.message, 'danger');
                    }
                }
            });
        }

        updateLogsTable();
        renderUsers();
    }

    window.movixRouter.register('auditoria', renderAuditoria);
})();
