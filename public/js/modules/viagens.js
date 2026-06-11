/* MovixFrota - Viagens Module */

(function() {
    let activeTabStatus = 'Em andamento';
    
    function renderViagens(container) {
        const trips = window.movixStore.getViagens();
        const vehicles = window.movixStore.getVeiculos();
        const drivers = window.movixStore.getMotoristas();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';

        let state = window.movixApp.getListState('viagens');
        if (!state) {
            state = {
                currentPage: 1,
                activeTabStatus: 'Em andamento',
                filters: {
                    busca: '',
                    veiculoId: '',
                    motoristaId: '',
                    periodo: 'tudo',
                    de: '',
                    ate: ''
                },
                scroll: 0
            };
            window.movixApp.saveListState('viagens', state);
        }

        activeTabStatus = state.activeTabStatus;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Controle de Viagens</h1>
                    <p class="page-subtitle">Monitore rotas, escalas de motoristas e odômetros de partida e retorno</p>
                </div>
                <div class="page-actions">
                    ${!isVisualizador ? `
                        <button class="btn btn-primary" id="btn-nova-viagem">
                            <i class="fa-solid fa-map-pin"></i> Registrar Saída Viagem
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- TAB SELECTION -->
            <div class="detail-tab-menu" style="margin-bottom: 16px;">
                <button class="detail-tab-btn ${activeTabStatus === 'Em andamento' ? 'active' : ''}" id="tab-btn-em-andamento">
                    <i class="fa-solid fa-truck-fast"></i> Viagens em Andamento
                </button>
                <button class="detail-tab-btn ${activeTabStatus === 'Realizada' ? 'active' : ''}" id="tab-btn-realizadas">
                    <i class="fa-solid fa-clock-rotate-left"></i> Histórico de Viagens Finalizadas
                </button>
            </div>

            <!-- FILTROS -->
            <div class="filters-card" style="margin-bottom: 20px;">
                <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; width: 100%;">
                    <div class="filter-group" style="flex: 2; min-width: 200px;">
                        <label>Busca Geral</label>
                        <input type="text" class="filter-input" id="filter-busca-viagem" placeholder="Busca por placa, motorista, rota ou obs..." value="${state.filters.busca || ''}">
                    </div>
                    <div class="filter-group" style="flex: 1; min-width: 130px;">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo-viagem">
                            <option value="">Todos</option>
                            ${vehicles.map(v => `<option value="${v.id}" ${state.filters.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group" style="flex: 1; min-width: 130px;">
                        <label>Motorista</label>
                        <select class="filter-input" id="filter-motorista-viagem">
                            <option value="">Todos</option>
                            ${drivers.map(m => `<option value="${m.id}" ${state.filters.motoristaId === m.id ? 'selected' : ''}>${m.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group" style="flex: 1; min-width: 130px;">
                        <label>Período</label>
                        <select class="filter-input" id="filter-periodo-viagem">
                            <option value="tudo" ${state.filters.periodo === 'tudo' ? 'selected' : ''}>Todo o histórico</option>
                            <option value="hoje" ${state.filters.periodo === 'hoje' ? 'selected' : ''}>Hoje</option>
                            <option value="ontem" ${state.filters.periodo === 'ontem' ? 'selected' : ''}>Ontem</option>
                            <option value="7dias" ${state.filters.periodo === '7dias' ? 'selected' : ''}>Últimos 7 dias</option>
                            <option value="30dias" ${state.filters.periodo === '30dias' ? 'selected' : ''}>Últimos 30 dias</option>
                            <option value="este_mes" ${state.filters.periodo === 'este_mes' ? 'selected' : ''}>Este mês</option>
                            <option value="mes_anterior" ${state.filters.periodo === 'mes_anterior' ? 'selected' : ''}>Mês anterior</option>
                            <option value="personalizado" ${state.filters.periodo === 'personalizado' ? 'selected' : ''}>Personalizado...</option>
                        </select>
                    </div>
                    <div id="custom-date-container-viagem" style="display: ${state.filters.periodo === 'personalizado' ? 'flex' : 'none'}; gap: 16px; align-items: flex-end;">
                        <div class="filter-group" style="width: 140px;">
                            <label>De</label>
                            <input type="date" class="filter-input" id="filter-viagem-de" value="${state.filters.de || ''}">
                        </div>
                        <div class="filter-group" style="width: 140px;">
                            <label>Até</label>
                            <input type="date" class="filter-input" id="filter-viagem-ate" value="${state.filters.ate || ''}">
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABLE -->
            <div class="table-responsive">
                <table class="smart-table" id="table-viagens">
                    <thead>
                        <tr>
                            <th>Veículo</th>
                            <th>Motorista Conduzindo</th>
                            <th>Rota / Trajeto</th>
                            <th>Saída / Retorno</th>
                            <th>KM Inicial / Final</th>
                            <th>Custo</th>
                            <th>Situação</th>
                            <th style="width: 80px; text-align: center;">Retorno</th>
                            <th style="width: 120px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-viagens">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
                <div class="table-pagination" id="pagination-viagens"></div>
            </div>
        `;

        let currentPage = state.currentPage;
        const itemsPerPage = 8;

        function updateTable() {
            const tbody = document.getElementById('tbody-viagens');
            if (!tbody) return;

            const currentTrips = window.movixStore.getViagens();
            
            const queryVal = document.getElementById('filter-busca-viagem') ? document.getElementById('filter-busca-viagem').value.toLowerCase().trim() : '';
            const veiculoVal = document.getElementById('filter-veiculo-viagem') ? document.getElementById('filter-veiculo-viagem').value : '';
            const motoristaVal = document.getElementById('filter-motorista-viagem') ? document.getElementById('filter-motorista-viagem').value : '';
            const periodVal = document.getElementById('filter-periodo-viagem') ? document.getElementById('filter-periodo-viagem').value : 'tudo';
            const deVal = document.getElementById('filter-viagem-de') ? document.getElementById('filter-viagem-de').value : '';
            const ateVal = document.getElementById('filter-viagem-ate') ? document.getElementById('filter-viagem-ate').value : '';

            // Save filter state
            state.filters = {
                busca: document.getElementById('filter-busca-viagem') ? document.getElementById('filter-busca-viagem').value : '',
                veiculoId: veiculoVal,
                motoristaId: motoristaVal,
                periodo: periodVal,
                de: deVal,
                ate: ateVal
            };
            state.currentPage = currentPage;
            state.activeTabStatus = activeTabStatus;
            window.movixApp.saveListState('viagens', state);

            const filteredData = currentTrips.filter(t => {
                // 1. Status/Tab Filter
                if (activeTabStatus === 'Em andamento') {
                    if (!t.status || t.status.toLowerCase() !== 'em andamento') return false;
                } else {
                    if (t.status !== activeTabStatus) return false;
                }

                // 2. Busca Geral Query (placa, motorista, origem, destino, observacoes)
                if (queryVal) {
                    const v = vehicles.find(item => item.id === t.veiculoId);
                    const m = drivers.find(item => item.id === t.motoristaId);

                    const matchPlaca = v && v.placa && v.placa.toLowerCase().includes(queryVal);
                    const matchMotorista = m && m.nome && m.nome.toLowerCase().includes(queryVal);
                    const matchOrigem = t.origem && t.origem.toLowerCase().includes(queryVal);
                    const matchDestino = t.destino && t.destino.toLowerCase().includes(queryVal);
                    const matchObs = t.observacoes && t.observacoes.toLowerCase().includes(queryVal);

                    if (!matchPlaca && !matchMotorista && !matchOrigem && !matchDestino && !matchObs) return false;
                }

                // 3. Vehicle Filter
                if (veiculoVal && t.veiculoId !== veiculoVal) return false;

                // 4. Driver Filter
                if (motoristaVal && t.motoristaId !== motoristaVal) return false;

                // 5. Period Filter
                if (periodVal !== 'tudo') {
                    const tripDateStr = t.dataSaida; // YYYY-MM-DD
                    const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
                    const todayStr = localNow.toISOString().split('T')[0];

                    if (periodVal === 'hoje') {
                        if (tripDateStr !== todayStr) return false;
                    } else if (periodVal === 'ontem') {
                        const yesterday = new Date(localNow);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toISOString().split('T')[0];
                        if (tripDateStr !== yesterdayStr) return false;
                    } else if (periodVal === '7dias') {
                        const limit = new Date(localNow);
                        limit.setDate(limit.getDate() - 7);
                        const limitStr = limit.toISOString().split('T')[0];
                        if (tripDateStr < limitStr || tripDateStr > todayStr) return false;
                    } else if (periodVal === '30dias') {
                        const limit = new Date(localNow);
                        limit.setDate(limit.getDate() - 30);
                        const limitStr = limit.toISOString().split('T')[0];
                        if (tripDateStr < limitStr || tripDateStr > todayStr) return false;
                    } else if (periodVal === 'este_mes') {
                        const yearMonth = todayStr.substring(0, 7); // "YYYY-MM"
                        if (!tripDateStr.startsWith(yearMonth)) return false;
                    } else if (periodVal === 'mes_anterior') {
                        const prevMonthDate = new Date(localNow);
                        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
                        const prevYearMonth = prevMonthDate.toISOString().split('T')[0].substring(0, 7);
                        if (!tripDateStr.startsWith(prevYearMonth)) return false;
                    } else if (periodVal === 'personalizado') {
                        if (deVal && tripDateStr < deVal) return false;
                        if (ateVal && tripDateStr > ateVal) return false;
                    }
                }

                return true;
            });

            const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPage);

            tbody.innerHTML = '';
            if (paginatedItems.length === 0) {
                const emptyMsg = activeTabStatus === 'Em andamento'
                    ? 'Nenhuma viagem em andamento registrada no momento.'
                    : 'Nenhuma viagem finalizada registrada no histórico.';
                tbody.innerHTML = `<tr><td colspan="9" class="search-no-results" style="text-align: center;">${emptyMsg}</td></tr>`;
                document.getElementById('pagination-viagens').innerHTML = '';
                return;
            }

            paginatedItems.forEach(t => {
                const v = vehicles.find(item => item.id === t.veiculoId);
                const m = drivers.find(item => item.id === t.motoristaId);
                
                const statusClass = (t.status && t.status.toLowerCase() === 'realizada') ? 'realizada' : 'em_andamento';

                const actionsHTML = `
                    <td style="text-align: center;">
                        <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                            <button class="btn-icon-only btn-view-viagem" data-id="${t.id}" title="Visualizar Detalhes & Auditoria">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            ${!isVisualizador ? `
                                <button class="btn-icon-only btn-edit-viagem" data-id="${t.id}" title="Editar Viagem">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                ${activeUser.perfil === 'Administrador' ? `
                                    <button class="btn-icon-only danger btn-delete-viagem" data-id="${t.id}" title="Excluir Viagem" style="background-color: var(--danger-light); color: var(--danger);">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            ` : ''}
                        </div>
                    </td>
                `;

                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="window.movixRouter.navigateTo('veiculos', '${t.veiculoId}')">
                            ${v ? v.placa : 'Deletado'}
                        </td>
                        <td style="font-weight:600;">${m ? m.nome : 'Deletado'}</td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-size:0.85rem;">${t.origem} → ${t.destino}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted); white-space:normal;">${t.observacoes || ''}</span>
                            </div>
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column; font-size:0.8rem;">
                                <span>Partida: ${t.dataSaida.split('-').reverse().join('/')}${t.horaSaida ? ` às ${t.horaSaida}` : ''}</span>
                                <span>Retorno: ${t.dataRetorno ? `${t.dataRetorno.split('-').reverse().join('/')}${t.horaRetorno ? ` às ${t.horaRetorno}` : ''}` : '<strong class="text-warning">Em trânsito</strong>'}</span>
                            </div>
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column; font-size:0.8rem;">
                                <span>Saída: ${parseFloat(t.kmInicial).toLocaleString('pt-BR')} km</span>
                                <span>Retorno: ${t.kmFinal > 0 ? `${parseFloat(t.kmFinal).toLocaleString('pt-BR')} km` : '-'}</span>
                            </div>
                        </td>
                        <td style="font-weight:700;">R$ ${parseFloat(t.custos || 0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td><span class="status-pill ${statusClass}">${t.status}</span></td>
                        <td style="text-align: center;">
                            ${t.status && t.status.toLowerCase() === 'em andamento' && !isVisualizador ? `
                                <button class="btn-icon-only btn-conclude" data-id="${t.id}" title="Registrar Retorno da Viagem">
                                    <i class="fa-solid fa-flag-checkered text-success"></i>
                                </button>
                            ` : '<span style="color:var(--text-muted); font-size:0.8rem;">-</span>'}
                        </td>
                        ${actionsHTML}
                    </tr>
                `;
            });

            // Pagination Render
            let pagHTML = `<span>Mostrando ${startIdx + 1} a ${Math.min(startIdx + itemsPerPage, filteredData.length)} de ${filteredData.length} escalas</span>`;
            pagHTML += `<div class="pagination-pages">`;
            pagHTML += `<button class="page-number-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            for (let i = 1; i <= totalPages; i++) {
                pagHTML += `<button class="page-number-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            pagHTML += `<button class="page-number-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
            pagHTML += `</div>`;
            document.getElementById('pagination-viagens').innerHTML = pagHTML;

            // Restore scroll position
            setTimeout(() => {
                window.scrollTo(0, state.scroll || 0);
            }, 0);
        }

        // Pagination Triggers
        document.getElementById('pagination-viagens').addEventListener('click', (e) => {
            const btn = e.target.closest('.page-number-btn');
            if (!btn || btn.disabled) return;
            if (btn.id === 'prev-page') currentPage--;
            else if (btn.id === 'next-page') currentPage++;
            else currentPage = parseInt(btn.getAttribute('data-page'));
            updateTable();
        });

        // Tab Clicks Bindings
        const tabEmAndamento = document.getElementById('tab-btn-em-andamento');
        const tabRealizadas = document.getElementById('tab-btn-realizadas');

        if (tabEmAndamento && tabRealizadas) {
            tabEmAndamento.addEventListener('click', () => {
                if (activeTabStatus === 'Em andamento') return;
                activeTabStatus = 'Em andamento';
                state.activeTabStatus = 'Em andamento';
                tabEmAndamento.classList.add('active');
                tabRealizadas.classList.remove('active');
                currentPage = 1;
                state.currentPage = 1;
                window.movixApp.saveListState('viagens', state);
                updateTable();
            });

            tabRealizadas.addEventListener('click', () => {
                if (activeTabStatus === 'Realizada') return;
                activeTabStatus = 'Realizada';
                state.activeTabStatus = 'Realizada';
                tabRealizadas.classList.add('active');
                tabEmAndamento.classList.remove('active');
                currentPage = 1;
                state.currentPage = 1;
                window.movixApp.saveListState('viagens', state);
                updateTable();
            });
        }

        // Setup Filter Event Listeners and Period Toggle
        const filterBusca = document.getElementById('filter-busca-viagem');
        const filterVeiculo = document.getElementById('filter-veiculo-viagem');
        const filterMotorista = document.getElementById('filter-motorista-viagem');
        const filterPeriodo = document.getElementById('filter-periodo-viagem');
        const customDateContainer = document.getElementById('custom-date-container-viagem');
        const filterDe = document.getElementById('filter-viagem-de');
        const filterAte = document.getElementById('filter-viagem-ate');

        if (filterBusca) filterBusca.addEventListener('input', () => { currentPage = 1; updateTable(); });
        if (filterVeiculo) filterVeiculo.addEventListener('change', () => { currentPage = 1; updateTable(); });
        if (filterMotorista) filterMotorista.addEventListener('change', () => { currentPage = 1; updateTable(); });
        if (filterDe) filterDe.addEventListener('change', () => { currentPage = 1; updateTable(); });
        if (filterAte) filterAte.addEventListener('change', () => { currentPage = 1; updateTable(); });

        if (filterPeriodo && customDateContainer) {
            filterPeriodo.addEventListener('change', () => {
                if (filterPeriodo.value === 'personalizado') {
                    customDateContainer.style.display = 'flex';
                } else {
                    customDateContainer.style.display = 'none';
                    if (filterDe) filterDe.value = '';
                    if (filterAte) filterAte.value = '';
                }
                currentPage = 1;
                updateTable();
            });
        }

        // Add Trip Trigger
        if (document.getElementById('btn-nova-viagem')) {
            document.getElementById('btn-nova-viagem').addEventListener('click', () => openViagemModal());
        }

        // Table actions triggers
        document.querySelector('.table-responsive').addEventListener('click', (e) => {
            const viewDetailBtn = e.target.closest('.btn-view-viagem');
            const conclBtn = e.target.closest('.btn-conclude');
            const editBtn = e.target.closest('.btn-edit-viagem');
            const deleteBtn = e.target.closest('.btn-delete-viagem');
            
            if (viewDetailBtn) {
                openViagemDetailModal(viewDetailBtn.getAttribute('data-id'));
            } else if (conclBtn) {
                openConcluirModal(conclBtn.getAttribute('data-id'));
            } else if (editBtn) {
                openViagemModal(editBtn.getAttribute('data-id'));
            } else if (deleteBtn) {
                confirmDeleteViagem(deleteBtn.getAttribute('data-id'));
            }
        });

        // Detailed View & Audit Timeline Modal
        function openViagemDetailModal(tripId) {
            const currentTrips = window.movixStore.getViagens();
            const t = currentTrips.find(item => item.id === tripId);
            if (!t) return;

            const v = vehicles.find(item => item.id === t.veiculoId);
            const m = drivers.find(item => item.id === t.motoristaId);

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = `Detalhes da Viagem: ${t.id}`;

            // Filter audit logs from state
            const tripLogs = (window.movixStore.state.logs || []).filter(log => 
                log.entidade === 'Viagem' && 
                (log.detalhes.includes(t.id) || 
                 (log.acao === 'Cadastro' && log.detalhes.includes(t.origem) && log.detalhes.includes(t.destino)))
            );

            let historyTimelineHTML = '';
            if (tripLogs.length > 0) {
                historyTimelineHTML = tripLogs.map(h => `
                    <div style="display:flex; gap:16px; border-left:2px solid var(--border-color); padding-left:16px; margin-left:8px; position:relative; padding-bottom:12px;">
                        <span style="position:absolute; left:-6px; top:4px; width:10px; height:10px; border-radius:50%; background-color:var(--primary);"></span>
                        <div style="display:flex; flex-direction:column; gap:2px; font-size:0.8rem;">
                            <div style="display:flex; gap:8px; align-items:center;">
                                <strong style="color:var(--text-main); font-weight:700;">${h.usuario}</strong>
                                <span style="font-size:0.7rem; color:var(--text-muted);">${new Date(h.data).toLocaleString('pt-BR')}</span>
                            </div>
                            <span style="color:var(--text-muted); font-size:0.75rem;">Ação: ${h.acao}</span>
                            <span style="color:var(--text-muted); font-size:0.72rem;">Detalhes: ${h.detalhes}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                historyTimelineHTML = '<p style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Nenhum log de auditoria encontrado para esta viagem.</p>';
            }

            modalBody.innerHTML = `
                <div class="grid-1-1" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
                    <div>
                        <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i> Informações Gerais</h4>
                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Veículo</span><strong style="color:var(--primary);">${v ? `${v.placa} (${v.marca} ${v.modelo})` : 'Deletado'}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Motorista</span><strong>${m ? m.nome : 'Deletado'}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Origem</span><strong>${t.origem}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Destino</span><strong>${t.destino}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Partida</span><strong>${t.dataSaida.split('-').reverse().join('/')} às ${t.horaSaida || '-'}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Retorno</span><strong>${t.dataRetorno ? `${t.dataRetorno.split('-').reverse().join('/')} às ${t.horaRetorno || '-'}` : '<span class="text-warning">Em trânsito</span>'}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>KM Inicial</span><strong>${parseFloat(t.kmInicial).toLocaleString('pt-BR')} km</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>KM Final</span><strong>${t.kmFinal > 0 ? `${parseFloat(t.kmFinal).toLocaleString('pt-BR')} km` : '-'}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>KM Rodados</span><strong>${t.kmRodado > 0 ? `${parseFloat(t.kmRodado).toLocaleString('pt-BR')} km` : '-'}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Custos de Viagem</span><strong>R$ ${(parseFloat(t.custos) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Situação</span>
                                <span class="status-pill ${t.status && t.status.toLowerCase() === 'realizada' ? 'realizada' : 'em_andamento'}">${t.status}</span>
                            </li>
                        </ul>

                        ${t.observacoes ? `
                        <div style="margin-top:20px;">
                            <h5 style="font-weight:700; margin-bottom:6px; font-size:0.85rem;">Instruções e Observações:</h5>
                            <p style="font-size:0.8rem; line-height:1.5; color:var(--text-muted); background:var(--bg-surface-hover); padding:10px; border-radius:6px; border-left:3px solid var(--primary); white-space:pre-wrap;">${t.observacoes}</p>
                        </div>` : ''}
                    </div>

                    <div style="border-left:1px solid var(--border-color); padding-left:20px;">
                        <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:16px;"><i class="fa-solid fa-clock-rotate-left"></i> Histórico de Alterações (Auditoria)</h4>
                        <div style="max-height: 380px; overflow-y:auto; padding-right:8px;">
                            ${historyTimelineHTML}
                        </div>
                    </div>
                </div>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-fechar-detalhe">Fechar</button>
            `;

            modal.classList.add('active');

            document.getElementById('btn-fechar-detalhe').addEventListener('click', () => modal.classList.remove('active'));
        }

        // CRUD Modal Dialog
        function openViagemModal(tripId = null) {
            const isEdit = tripId !== null;
            const t = isEdit ? window.movixStore.getViagens().find(item => item.id === tripId) : null;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = isEdit ? 'Editar Detalhes de Viagem' : 'Agendar Partida de Viagem';

            modalBody.innerHTML = `
                <form id="form-viagem" class="form-grid">
                    <div class="form-group">
                        <label>Data de Saída <span class="required">*</span></label>
                        <input type="date" class="form-control" name="dataSaida" required value="${isEdit ? t.dataSaida : ''}">
                    </div>

                    <div class="form-group">
                        <label>Hora de Partida <span class="required">*</span></label>
                        <input type="time" class="form-control" name="horaSaida" required value="${isEdit && t.horaSaida ? t.horaSaida : ''}">
                    </div>

                    <div class="form-group">
                        <label>Selecione o Veículo <span class="required">*</span></label>
                        <select class="form-control" name="veiculoId" id="via-veic-sel" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione um veículo</option>
                            ${isEdit 
                                ? vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual}" ${t.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})</option>`).join('')
                                : vehicles.filter(v => v.status === 'disponivel').map(v => `<option value="${v.id}" data-km="${v.kmAtual}">${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Selecione o Motorista Escalo <span class="required">*</span></label>
                        <select class="form-control" name="motoristaId" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione um motorista</option>
                            ${isEdit
                                ? drivers.map(m => `<option value="${m.id}" ${t.motoristaId === m.id ? 'selected' : ''}>${m.nome}</option>`).join('')
                                : drivers.filter(m => m.status === 'ativo').map(m => `<option value="${m.id}">${m.nome}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>KM de Saída (Odômetro) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmInicial" id="via-km-input" required placeholder="Ex: 145000" min="0" value="${isEdit ? t.kmInicial : ''}">
                    </div>

                    <div class="form-group">
                        <label>Local de Origem <span class="required">*</span></label>
                        <input type="text" class="form-control" name="origem" required placeholder="Ex: Empresa, Galpão, Cliente, Cidade/UF" value="${isEdit ? t.origem : ''}">
                    </div>

                    <div class="form-group">
                        <label>Local de Destino <span class="required">*</span></label>
                        <input type="text" class="form-control" name="destino" required placeholder="Ex: Galpão B, Cliente X, Evento Y, Cidade/UF" value="${isEdit ? t.destino : ''}">
                    </div>

                    <div class="form-group">
                        <label>Custos da Viagem (R$)</label>
                        <input type="text" class="form-control" name="custos" placeholder="Ex: R$ 150,00" value="${isEdit && t.custos ? window.movixApp.formatCurrency(t.custos) : ''}">
                    </div>

                    ${isEdit && t.status === 'Realizada' ? `
                        <div class="form-group">
                            <label>Data de Retorno <span class="required">*</span></label>
                            <input type="date" class="form-control" name="dataRetorno" required value="${t.dataRetorno || ''}">
                        </div>

                        <div class="form-group">
                            <label>Hora de Chegada <span class="required">*</span></label>
                            <input type="time" class="form-control" name="horaRetorno" required value="${t.horaRetorno || ''}">
                        </div>

                        <div class="form-group">
                            <label>KM de Retorno (Odômetro Final) <span class="required">*</span></label>
                            <input type="number" class="form-control" name="kmFinal" required placeholder="Odômetro de chegada" min="${t.kmInicial}" value="${t.kmFinal || ''}">
                        </div>
                    ` : ''}

                    <div class="form-group full-width">
                        <label>Instruções / Detalhes de Viagem</label>
                        <textarea class="form-control" name="observacoes" placeholder="Ex: Rota via Fernão Dias. Carga de eletrônicos...">${isEdit ? t.observacoes || '' : ''}</textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">${isEdit ? 'Salvar Alterações' : 'Registrar Saída'}</button>
            `;

            modal.classList.add('active');

            const veicSel = document.getElementById('via-veic-sel');
            const kmInput = document.getElementById('via-km-input');

            function syncKM() {
                if (veicSel.options.length > 0) {
                    const opt = veicSel.options[veicSel.selectedIndex];
                    if (!opt || opt.value === "") {
                        kmInput.value = "";
                        kmInput.removeAttribute('min');
                        return;
                    }
                    if (!isEdit) {
                        kmInput.value = opt.getAttribute('data-km');
                        kmInput.setAttribute('min', opt.getAttribute('data-km'));
                    } else {
                        if (opt.value === t.veiculoId) {
                            kmInput.value = t.kmInicial;
                            kmInput.setAttribute('min', '0');
                        } else {
                            kmInput.value = opt.getAttribute('data-km');
                            kmInput.setAttribute('min', opt.getAttribute('data-km'));
                        }
                    }
                }
            }

            veicSel.addEventListener('change', syncKM);
            if (!isEdit) syncKM();

            // Validation for vehicle and driver in use (only when creating a new trip)
            if (!isEdit) {
                veicSel.addEventListener('change', () => {
                    const veiculoId = veicSel.value;
                    if (!veiculoId) return;

                    const activeTrips = window.movixStore.getViagens().filter(t => t.status && t.status.toLowerCase() === 'em andamento');
                    const conflictTrip = activeTrips.find(t => t.veiculoId === veiculoId);

                    if (conflictTrip) {
                        const vehicle = vehicles.find(v => v.id === veiculoId);
                        const placa = vehicle ? vehicle.placa : 'N/A';
                        window.movixApp.showConfirmModal(
                            `O veículo de placa ${placa} já está vinculado à viagem em andamento de ${conflictTrip.origem} para ${conflictTrip.destino}. Deseja utilizar este veículo mesmo assim?`,
                            () => {
                                // keep selection
                            },
                            () => {
                                veicSel.value = "";
                                syncKM();
                            }
                        );
                    }
                });

                const driverSel = modalBody.querySelector('select[name="motoristaId"]');
                if (driverSel) {
                    driverSel.addEventListener('change', () => {
                        const motoristaId = driverSel.value;
                        if (!motoristaId) return;

                        const activeTrips = window.movixStore.getViagens().filter(t => t.status && t.status.toLowerCase() === 'em andamento');
                        const conflictTrip = activeTrips.find(t => t.motoristaId === motoristaId);

                        if (conflictTrip) {
                            const driver = drivers.find(d => d.id === motoristaId);
                            const driverName = driver ? driver.nome : 'N/A';
                            window.movixApp.showConfirmModal(
                                `O motorista ${driverName} já está vinculado à viagem em andamento de ${conflictTrip.origem} para ${conflictTrip.destino}. Deseja escalar este motorista mesmo assim?`,
                                () => {
                                    // keep selection
                                },
                                () => {
                                    driverSel.value = "";
                                }
                            );
                        }
                    });
                }
            }

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const form = document.getElementById('form-viagem');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => data[key] = value);

                const veiculoId = veicSel.value;
                const enteredKMInicial = parseFloat(data.kmInicial) || 0;
                const originalKMInicial = isEdit ? parseFloat(t.kmInicial) || 0 : 0;

                const saveAction = async (justificativaInicial) => {
                    if (justificativaInicial) {
                        data.observacoes = (data.observacoes || '') + (data.observacoes ? '\n' : '') + `Motivo da divergência de KM Inicial: ${justificativaInicial}`;
                    }

                    const saveBtn = document.getElementById('btn-salvar-modal');
                    const loader = window.movixApp.startLoading(saveBtn, isEdit ? "Atualizando..." : "Salvando...");

                    try {
                        if (isEdit) {
                            await window.movixStore.updateViagem(tripId, data);
                            window.movixApp.showToast('Viagem atualizada com sucesso!', 'success');
                        } else {
                            data.status = 'Em andamento';
                            data.custos = parseFloat(data.custos) || 0;
                            await window.movixStore.addViagem(data);
                            window.movixApp.showToast('Escala de viagem registrada!', 'success');
                        }
                        modal.classList.remove('active');
                        renderViagens(container);
                        window.movixApp.refreshAlertsCount();
                        window.movixApp.refreshNotificationsPanel();
                    } catch (e) {
                        console.error(e);
                        window.movixApp.showToast(e.message || 'Erro ao salvar viagem.', 'danger');
                    } finally {
                        loader.stop();
                    }
                };

                // Validate kmInicial first
                window.movixApp.validateKM(veiculoId, enteredKMInicial, (justificativaInicial) => {
                    // If isEdit and it is 'Realizada', we must also validate kmFinal
                    if (isEdit && t.status === 'Realizada' && data.kmFinal) {
                        const enteredKMFinal = parseFloat(data.kmFinal) || 0;
                        const originalKMFinal = parseFloat(t.kmFinal) || 0;
                        window.movixApp.validateKM(veiculoId, enteredKMFinal, (justificativaFinal) => {
                            if (justificativaFinal) {
                                data.observacoes = (data.observacoes || '') + (data.observacoes ? '\n' : '') + `Motivo da divergência de KM Final: ${justificativaFinal}`;
                            }
                            saveAction(justificativaInicial);
                        }, true, originalKMFinal);
                    } else {
                        saveAction(justificativaInicial);
                    }
                }, isEdit, originalKMInicial);
            });
        }

        // Conclude (Partida de Retorno) Dialog
        function openConcluirModal(tripId) {
            const currentTrips = window.movixStore.getViagens();
            const t = currentTrips.find(item => item.id === tripId);
            if (!t) return;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = `Finalizar Viagem: ${t.origem} → ${t.destino}`;

            modalBody.innerHTML = `
                <form id="form-concluir-viagem" class="form-grid">
                    <div style="grid-column: span 2; background-color:var(--bg-surface-hover); padding:12px; border-radius:6px; border:1px solid var(--border-color); font-size:0.85rem;">
                        <p><strong>Motorista:</strong> ${drivers.find(item => item.id === t.motoristaId)?.nome || ''}</p>
                        <p><strong>KM de Partida:</strong> ${parseFloat(t.kmInicial).toLocaleString('pt-BR')} km</p>
                    </div>

                    <div class="form-group">
                        <label>Data de Retorno <span class="required">*</span></label>
                        <input type="date" class="form-control" name="dataRetorno" required value="">
                    </div>

                    <div class="form-group">
                        <label>Hora de Chegada <span class="required">*</span></label>
                        <input type="time" class="form-control" name="horaRetorno" required>
                    </div>

                    <div class="form-group">
                        <label>KM de Retorno (Odômetro Final) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmFinal" required placeholder="Odômetro de chegada" min="${t.kmInicial}">
                    </div>

                    <div class="form-group">
                        <label>Custos Operacionais da Viagem (R$)</label>
                        <input type="text" class="form-control" name="custos" placeholder="Ex: R$ 150,00" value="${t.custos ? window.movixApp.formatCurrency(t.custos) : ''}">
                    </div>

                    <div class="form-group full-width">
                        <label>Relato / Observações de Chegada</label>
                        <textarea class="form-control" id="viagem-chegada-obs" placeholder="Ex: Viagem finalizada sem intercorrências. Carga entregue integralmente."></textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">Concluir Viagem</button>
            `;

            modal.classList.add('active');

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const form = document.getElementById('form-concluir-viagem');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const data = {
                    status: 'Realizada',
                    observacoes: `${t.observacoes || ''} Chegada: ${document.getElementById('viagem-chegada-obs').value}`
                };
                formData.forEach((value, key) => data[key] = value);

                const veiculoId = t.veiculoId;
                const enteredKMFinal = parseFloat(data.kmFinal) || 0;
                
                const saveAction = async (justificativa) => {
                    if (justificativa) {
                        data.observacoes = (data.observacoes || '') + (data.observacoes ? '\n' : '') + `Motivo da divergência de KM Final: ${justificativa}`;
                    }
                    
                    const saveBtn = document.getElementById('btn-salvar-modal');
                    const loader = window.movixApp.startLoading(saveBtn, "Finalizando...");

                    try {
                        await window.movixStore.updateViagem(tripId, data);
                        window.movixApp.showToast('Viagem concluída e odômetro do veículo atualizado!', 'success');
                        modal.classList.remove('active');
                        renderViagens(container);
                        window.movixApp.refreshAlertsCount();
                        window.movixApp.refreshNotificationsPanel();
                    } catch (e) {
                        console.error(e);
                        window.movixApp.showToast(e.message || 'Erro ao concluir viagem.', 'danger');
                    } finally {
                        loader.stop();
                    }
                };

                window.movixApp.validateKM(veiculoId, enteredKMFinal, saveAction, false, 0);
            });
        }

        function confirmDeleteViagem(tripId) {
            const currentTrips = window.movixStore.getViagens();
            const t = currentTrips.find(item => item.id === tripId);
            if (!t) return;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Excluir Viagem';
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <i class="fa-solid fa-trash text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Deseja realmente excluir a viagem de <strong>${t.origem} → ${t.destino}</strong>?</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Esta ação removerá permanentemente o registro de escala e o histórico da frota.</p>
                </div>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-del">Cancelar</button>
                <button class="btn btn-danger" id="btn-confirmar-del">Confirmar Exclusão</button>
            `;

            modal.classList.add('active');

            document.getElementById('btn-cancelar-del').addEventListener('click', () => modal.classList.remove('active'));
            document.getElementById('btn-confirmar-del').addEventListener('click', async () => {
                const delBtn = document.getElementById('btn-confirmar-del');
                const loader = window.movixApp.startLoading(delBtn, "Excluindo...");
                
                try {
                    await window.movixStore.deleteViagem(tripId);
                    window.movixApp.showToast('Viagem excluída com sucesso.', 'danger');
                    modal.classList.remove('active');
                    renderViagens(container);
                    window.movixApp.refreshAlertsCount();
                    window.movixApp.refreshNotificationsPanel();
                } catch (err) {
                    window.movixApp.showToast(err.message || 'Erro ao excluir viagem.', 'danger');
                } finally {
                    loader.stop();
                }
            });
        }

        updateTable();
    }

    window.movixRouter.register('viagens', renderViagens);
})();
