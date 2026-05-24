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

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                
                <!-- SECURITY LOGS TABLE -->
                <div class="card" style="min-height: 480px; display:flex; flex-direction:column;">
                    <div class="card-header-simple">
                        <h3>Registro Histórico de Transações</h3>
                        <i class="fa-solid fa-clock-rotate-left text-muted"></i>
                    </div>

                    <!-- SEARCH/FILTER BAR -->
                    <div style="display:flex; gap:12px; margin-top:12px;">
                        <input type="text" class="filter-input" id="search-logs" placeholder="Filtrar logs..." style="flex-grow:1;">
                        <select class="filter-input" id="filter-log-action" style="width:160px;">
                            <option value="">Todas Ações</option>
                            <option value="Cadastro">Cadastro</option>
                            <option value="Edição">Edição</option>
                            <option value="Exclusão">Exclusão</option>
                            <option value="Aprovação">Aprovação</option>
                            <option value="Ação de Sessão">Sessão</option>
                        </select>
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

            const filteredLogs = logs.filter(l => {
                const matchSearch = l.usuario.toLowerCase().includes(searchVal) || 
                                    l.detalhes.toLowerCase().includes(searchVal) ||
                                    l.entidade.toLowerCase().includes(searchVal);
                const matchAction = !actionVal || l.acao === actionVal;
                return matchSearch && matchAction;
            });

            tbody.innerHTML = '';
            if (filteredLogs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="search-no-results">Nenhum evento registrado</td></tr>`;
                return;
            }

            filteredLogs.forEach(l => {
                const date = new Date(l.data);
                const timeStr = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
                
                // Color badges for actions
                let actionBadge = '';
                if (l.acao === 'Cadastro') actionBadge = '<span class="status-pill ok" style="font-size:0.7rem;">CADASTRO</span>';
                else if (l.acao === 'Edição') actionBadge = '<span class="status-pill em_manutencao" style="font-size:0.7rem;">EDIÇÃO</span>';
                else if (l.acao === 'Exclusão') actionBadge = '<span class="status-pill vencido" style="font-size:0.7rem;">EXCLUSÃO</span>';
                else actionBadge = `<span class="status-pill ok" style="font-size:0.7rem; background-color:var(--info-light); color:var(--info);">${l.acao.toUpperCase()}</span>`;

                tbody.innerHTML += `
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
        }

        function renderUsers() {
            const container = document.getElementById('users-list-container');
            if (!container) return;

            container.innerHTML = '';
            users.forEach(u => {
                const isSelected = activeUser.id === u.id;
                
                container.innerHTML += `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:8px; border:1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}; background-color:${isSelected ? 'var(--primary-light)' : 'var(--bg-surface-hover)'}; transition:all var(--transition-fast);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${u.foto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-size:0.85rem; color:var(--text-main);">${u.nome}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${u.cargo}</span>
                            </div>
                        </div>
                        <span class="role-badge ${u.perfil.toLowerCase()}" style="font-size:0.65rem; padding:4px 8px;">${u.perfil}</span>
                    </div>
                `;
            });
        }

        // Filters events hooks
        document.getElementById('search-logs').addEventListener('input', updateLogsTable);
        document.getElementById('filter-log-action').addEventListener('change', updateLogsTable);

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
