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
                itemsPerPage: 10,
                scroll: 0
            };
            window.movixApp.saveListState('viagens', state);
        } else if (state.itemsPerPage === undefined) {
            state.itemsPerPage = 10;
            window.movixApp.saveListState('viagens', state);
        }

        activeTabStatus = state.activeTabStatus;

        // KPI Calculations
        const activeTrips = trips.filter(t => t.status && t.status.toLowerCase() === 'em andamento');
        const activeTripsCount = activeTrips.length;

        const completedTrips = trips.filter(t => t.status && t.status.toLowerCase() === 'realizada');
        const totalKm = completedTrips.reduce((sum, t) => sum + (t.kmRodado || 0), 0);
        const avgKm = completedTrips.length > 0 ? (totalKm / completedTrips.length) : 0;

        const vehiclesInUseIds = new Set(activeTrips.map(t => t.veiculoId));
        const availVehiclesCount = vehicles.filter(v => v.status === 'disponivel' && v.tipoUnidade !== 'Implemento/Reboque' && !vehiclesInUseIds.has(v.id)).length;

        const driversInUseIds = new Set(activeTrips.map(t => t.motoristaId));
        const availDriversCount = drivers.filter(m => m.status === 'ativo' && !driversInUseIds.has(m.id)).length;

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
                    <div id="custom-date-container-viagem" style="display: ${state.filters.periodo === 'personalizado' ? 'flex' : 'none'}; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
                        <div class="filter-group" style="width: 140px; flex: 1 1 120px;">
                            <label>De</label>
                            <input type="date" class="filter-input" id="filter-viagem-de" value="${state.filters.de || ''}">
                        </div>
                        <div class="filter-group" style="width: 140px; flex: 1 1 120px;">
                            <label>Até</label>
                            <input type="date" class="filter-input" id="filter-viagem-ate" value="${state.filters.ate || ''}">
                        </div>
                    </div>
                    <div class="filter-group" style="display: flex; align-items: flex-end; flex-shrink: 0;">
                        <button class="btn btn-secondary" id="btn-limpar-filtros" style="height: 38px; white-space: nowrap;">
                            <i class="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
                        </button>
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

                // 5. Period Filter (Sobreposição Total)
                if (periodVal !== 'tudo') {
                    const tripStart = t.dataSaida; // YYYY-MM-DD
                    const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
                    const todayStr = localNow.toISOString().split('T')[0];
                    const tripEnd = t.dataRetorno || todayStr; // Se em andamento, assume hoje

                    let filterStart = '';
                    let filterEnd = '';

                    if (periodVal === 'hoje') {
                        filterStart = todayStr;
                        filterEnd = todayStr;
                    } else if (periodVal === 'ontem') {
                        const yesterday = new Date(localNow);
                        yesterday.setDate(yesterday.getDate() - 1);
                        filterStart = yesterday.toISOString().split('T')[0];
                        filterEnd = filterStart;
                    } else if (periodVal === '7dias') {
                        const limit = new Date(localNow);
                        limit.setDate(limit.getDate() - 7);
                        filterStart = limit.toISOString().split('T')[0];
                        filterEnd = todayStr;
                    } else if (periodVal === '30dias') {
                        const limit = new Date(localNow);
                        limit.setDate(limit.getDate() - 30);
                        filterStart = limit.toISOString().split('T')[0];
                        filterEnd = todayStr;
                    } else if (periodVal === 'este_mes') {
                        // Início e fim do mês atual de forma segura
                        const year = localNow.getFullYear();
                        const month = localNow.getMonth();
                        const start = new Date(year, month, 1, 12, 0, 0);
                        const end = new Date(year, month + 1, 0, 12, 0, 0);
                        filterStart = start.toISOString().split('T')[0];
                        filterEnd = end.toISOString().split('T')[0];
                    } else if (periodVal === 'mes_anterior') {
                        // Início e fim do mês anterior de forma segura
                        const year = localNow.getFullYear();
                        const month = localNow.getMonth() - 1;
                        const start = new Date(year, month, 1, 12, 0, 0);
                        const end = new Date(year, month + 1, 0, 12, 0, 0);
                        filterStart = start.toISOString().split('T')[0];
                        filterEnd = end.toISOString().split('T')[0];
                    } else if (periodVal === 'personalizado') {
                        filterStart = deVal || '';
                        filterEnd = ateVal || '';
                    }

                    // Regra de Sobreposição:
                    // A viagem se sobrepõe ao filtro se ela começou antes ou durante o filtro (tripStart <= filterEnd)
                    // E se ela terminou depois ou durante o início do filtro (tripEnd >= filterStart).
                    if (filterEnd && tripStart > filterEnd) return false;
                    if (filterStart && tripEnd < filterStart) return false;
                }

                return true;
            });

            const itemsPerPageVal = state.itemsPerPage === 'Todos' ? Infinity : (parseInt(state.itemsPerPage) || 10);
            const totalPages = Math.ceil(filteredData.length / itemsPerPageVal) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            const startIdx = itemsPerPageVal === Infinity ? 0 : (currentPage - 1) * itemsPerPageVal;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPageVal);

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
                        <td style="font-weight:600;">
                            ${m ? `${m.nome} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal; display:block; margin-top:2px;">(${t.motoristaCategoria || m.categoria || 'Motorista Efetivo'})</span>` : 'Deletado'}
                        </td>
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
                        <td style="font-weight:700;">${window.movixApp.formatCurrency(t.custos)}</td>
                        <td><span class="status-pill ${statusClass}">${t.status}</span></td>
                        <td style="text-align: center;">
                            ${t.status && t.status.toLowerCase() === 'em andamento' && !isVisualizador ? `
                                <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                                    <button class="btn-icon-only btn-conclude" data-id="${t.id}" title="Registrar Retorno da Viagem">
                                        <i class="fa-solid fa-flag-checkered text-success"></i>
                                    </button>
                                    <button class="btn-icon-only btn-troca-motorista" data-id="${t.id}" title="Registrar Troca de Motorista" style="background-color: var(--primary-light); color: var(--primary);">
                                        <i class="fa-solid fa-arrows-spin"></i>
                                    </button>
                                </div>
                            ` : '<span style="color:var(--text-muted); font-size:0.8rem;">-</span>'}
                        </td>
                        ${actionsHTML}
                    </tr>
                `;
            });

            // Pagination Render using helper
            window.movixApp.renderPagination({
                containerId: 'pagination-viagens',
                currentPage: currentPage,
                totalItems: filteredData.length,
                itemsPerPage: state.itemsPerPage || 10,
                noun: 'viagens',
                onPageChange: (newPage) => {
                    currentPage = newPage;
                    state.currentPage = newPage;
                    window.movixApp.saveListState('viagens', state);
                    updateTable();
                },
                onItemsPerPageChange: (newLimit) => {
                    state.itemsPerPage = newLimit;
                    currentPage = 1;
                    state.currentPage = 1;
                    window.movixApp.saveListState('viagens', state);
                    updateTable();
                }
            });

            // Restore scroll position
            setTimeout(() => {
                window.scrollTo(0, state.scroll || 0);
            }, 0);
        }

        // Pagination handled by MovixApp.renderPagination helper

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

        if (filterVeiculo) window.movixApp.initAutocomplete(filterVeiculo, 'Filtrar veículo...');
        if (filterMotorista) window.movixApp.initAutocomplete(filterMotorista, 'Filtrar motorista...');

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
        document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
            if (filterBusca) filterBusca.value = '';
            if (filterVeiculo) {
                filterVeiculo.value = '';
                filterVeiculo.dispatchEvent(new Event('change'));
            }
            if (filterMotorista) {
                filterMotorista.value = '';
                filterMotorista.dispatchEvent(new Event('change'));
            }
            if (filterPeriodo) filterPeriodo.value = 'tudo';
            if (filterDe) filterDe.value = '';
            if (filterAte) filterAte.value = '';
            if (customDateContainer) customDateContainer.style.display = 'none';
            currentPage = 1;
            updateTable();
        });

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
            const swapBtn = e.target.closest('.btn-troca-motorista');
            
            if (viewDetailBtn) {
                openViagemDetailModal(viewDetailBtn.getAttribute('data-id'));
            } else if (conclBtn) {
                openConcluirModal(conclBtn.getAttribute('data-id'));
            } else if (editBtn) {
                openViagemModal(editBtn.getAttribute('data-id'));
            } else if (deleteBtn) {
                confirmDeleteViagem(deleteBtn.getAttribute('data-id'));
            } else if (swapBtn) {
                openTrocaMotoristaModal(swapBtn.getAttribute('data-id'));
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

            // Build driver history rows
            let historicoCondutores = t.historicoCondutores || [];
            if (typeof historicoCondutores === 'string') {
                historicoCondutores = JSON.parse(historicoCondutores);
            }

            let historyDriversHTML = '';
            if (historicoCondutores.length > 0) {
                historyDriversHTML = `
                    <div style="border-top:1px solid var(--border-color); padding-top:20px; margin-top:20px;">
                        <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-people-carry-box"></i> Histórico de Condutores</h4>
                        <div class="table-responsive" style="margin-top:10px; border:none; box-shadow:none;">
                            <table class="smart-table" style="font-size:0.85rem;">
                                <thead>
                                    <tr>
                                        <th>Motorista</th>
                                        <th>Início</th>
                                        <th>Fim</th>
                                        <th style="text-align:right;">KM Inicial</th>
                                        <th style="text-align:right;">KM Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${historicoCondutores.map(h => {
                                        const startStr = `${h.dataInicio.split('-').reverse().join('/')} às ${h.horaInicio}`;
                                        const endStr = h.dataFim 
                                            ? `${h.dataFim.split('-').reverse().join('/')} às ${h.horaFim}`
                                            : (t.status === 'Realizada' ? '-' : '<span class="status-pill ok" style="font-size:0.65rem; padding:1px 6px;">Conduzindo</span>');
                                        return `
                                            <tr>
                                                <td style="font-weight:600;">${h.motoristaNome || 'Desconhecido'}</td>
                                                <td>${startStr}</td>
                                                <td>${endStr}</td>
                                                <td style="text-align:right;">${parseFloat(h.kmInicial).toLocaleString('pt-BR')} km</td>
                                                <td style="text-align:right;">${h.kmFinal ? `${parseFloat(h.kmFinal).toLocaleString('pt-BR')} km` : '-'}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            modalBody.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div class="grid-1-1" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
                        <div>
                            <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i> Informações Gerais</h4>
                            <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Veículo</span><strong style="color:var(--primary);">${v ? `${v.placa} (${v.marca} ${v.modelo})` : 'Deletado'}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Motorista Atual</span><strong>${m ? m.nome : 'Deletado'}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Categoria do Condutor</span><strong>${t.motoristaCategoria || (m ? m.categoria : 'Motorista Efetivo')}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Origem</span><strong>${t.origem}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Destino</span><strong>${t.destino}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Partida</span><strong>${t.dataSaida.split('-').reverse().join('/')} às ${t.horaSaida || '-'}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Retorno</span><strong>${t.dataRetorno ? `${t.dataRetorno.split('-').reverse().join('/')} às ${t.horaRetorno || '-'}` : '<span class="text-warning">Em trânsito</span>'}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>KM Inicial</span><strong>${parseFloat(t.kmInicial).toLocaleString('pt-BR')} km</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>KM Final</span><strong>${t.kmFinal > 0 ? `${parseFloat(t.kmFinal).toLocaleString('pt-BR')} km` : '-'}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>KM Rodados</span><strong>${t.kmRodado > 0 ? `${parseFloat(t.kmRodado).toLocaleString('pt-BR')} km` : '-'}</strong></li>
                                <li class="detail-sidebar-info-item" style="padding:4px 0; display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light);"><span>Custos de Viagem</span><strong>${window.movixApp.formatCurrency(t.custos)}</strong></li>
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
                    ${historyDriversHTML}
                </div>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-fechar-detalhe">Fechar</button>
            `;

            modal.classList.add('active');

            document.getElementById('btn-fechar-detalhe').addEventListener('click', () => modal.classList.remove('active'));
        }

        function openTrocaMotoristaModal(tripId) {
            const currentTrips = window.movixStore.getViagens();
            const t = currentTrips.find(item => item.id === tripId);
            if (!t) return;

            const freshVehicles = window.movixStore.getVeiculos();
            const freshDrivers = window.movixStore.getMotoristas();

            const vehicle = freshVehicles.find(v => v.id === t.veiculoId);
            const currentDriver = freshDrivers.find(d => d.id === t.motoristaId);
            const currentDriverName = currentDriver ? currentDriver.nome : 'Desconhecido';

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerHTML = `<i class="fa-solid fa-arrows-spin"></i> Registrar Troca de Motorista: ${t.id}`;

            // Filter active drivers and exclude current driver
            const activeDrivers = freshDrivers.filter(d => d.status === 'ativo' && d.id !== t.motoristaId);

            modalBody.innerHTML = `
                <form id="form-troca-motorista" style="display:flex; flex-direction:column; gap:16px;">
                    <div style="background-color:var(--bg-surface-hover); padding:12px; border-radius:6px; border:1px solid var(--border-color); font-size:0.85rem; display:flex; flex-direction:column; gap:6px;">
                        <div><strong>Motorista Atual:</strong> ${currentDriverName}</div>
                        <div><strong>KM de Partida:</strong> ${parseFloat(t.kmInicial).toLocaleString('pt-BR')} km</div>
                        <div><strong>Data/Hora de Saída:</strong> ${t.dataSaida.split('-').reverse().join('/')} às ${t.horaSaida || '-'}</div>
                    </div>

                    <div class="form-group">
                        <label>Novo Motorista <span class="text-danger">*</span></label>
                        <select name="novoMotoristaId" class="form-control" required style="width:100%;">
                            <option value="">Selecione o novo motorista...</option>
                            ${activeDrivers.map(d => `<option value="${d.id}">${d.nome} (${d.categoria || 'Motorista Efetivo'})</option>`).join('')}
                        </select>
                    </div>

                    <div class="grid-2" style="gap:16px;">
                        <div class="form-group">
                            <label>Data da Troca <span class="text-danger">*</span></label>
                            <input type="date" name="dataTroca" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Hora da Troca <span class="text-danger">*</span></label>
                            <input type="time" name="horaTroca" class="form-control" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>KM do Veículo no Momento da Troca <span class="text-danger">*</span></label>
                        <input type="number" name="kmTroca" class="form-control" min="${t.kmInicial}" required placeholder="Odômetro no momento da troca">
                        <small style="color:var(--text-muted); display:block; margin-top:4px;">KM inicial da viagem: <strong>${parseFloat(t.kmInicial).toLocaleString('pt-BR')} km</strong>. KM atual do veículo: <strong>${vehicle ? parseFloat(vehicle.kmAtual).toLocaleString('pt-BR') : '-'} km</strong>.</small>
                    </div>
                    <div class="form-group">
                        <label>Local da Troca (Opcional)</label>
                        <input type="text" name="localTroca" class="form-control" placeholder="Ex: Posto Graal KM 120, Rodovia Dutra">
                    </div>
                    <div class="form-group">
                        <label>Observações / Motivo (Opcional)</label>
                        <textarea name="observacoes" class="form-control" rows="2" placeholder="Descreva observações adicionais ou motivo da troca..."></textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-troca">Cancelar</button>
                <button class="btn btn-primary" id="btn-confirmar-troca">Confirmar Troca</button>
            `;

            modal.classList.add('active');

            // Autocomplete for new driver select
            const newDriverSel = modalBody.querySelector('select[name="novoMotoristaId"]');
            window.movixApp.initAutocomplete(newDriverSel, 'Selecione o novo motorista...');

            // Listen for change to trigger conflict suggestion warning
            newDriverSel.addEventListener('change', () => {
                const motoristaId = newDriverSel.value;
                if (!motoristaId) return;

                const activeTrips = window.movixStore.getViagens().filter(vi => vi.status && vi.status.toLowerCase() === 'em andamento');
                const conflictTrip = activeTrips.find(vi => vi.motoristaId === motoristaId && vi.id !== t.id);

                if (conflictTrip) {
                    const driver = freshDrivers.find(d => d.id === motoristaId);
                    const driverName = driver ? driver.nome : 'N/A';
                    const dateFormatted = conflictTrip.dataSaida.split('-').reverse().join('/');
                    const timeFormatted = conflictTrip.horaSaida || 'N/A';
                    window.movixApp.showConfirmModal(
                        `O motorista ${driverName} já está vinculado à viagem em andamento de ${conflictTrip.origem} para ${conflictTrip.destino}, iniciada em ${dateFormatted} às ${timeFormatted}. Deseja escalar este motorista mesmo assim?`,
                        () => {
                            // keep selection
                        },
                        () => {
                            // reset selection
                            newDriverSel.value = "";
                            newDriverSel.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    );
                }
            });

            document.getElementById('btn-cancelar-troca').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-confirmar-troca').addEventListener('click', async () => {
                const form = document.getElementById('form-troca-motorista');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const data = {
                    novoMotoristaId: form.querySelector('[name="novoMotoristaId"]').value,
                    dataTroca: form.querySelector('[name="dataTroca"]').value,
                    horaTroca: form.querySelector('[name="horaTroca"]').value,
                    kmTroca: form.querySelector('[name="kmTroca"]').value,
                    localTroca: form.querySelector('[name="localTroca"]').value.trim(),
                    observacoes: form.querySelector('[name="observacoes"]').value.trim()
                };

                const newDriverObj = freshDrivers.find(d => d.id === data.novoMotoristaId);
                if (!newDriverObj) {
                    window.movixApp.showToast('Selecione um motorista válido.', 'error');
                    return;
                }

                // CNH validation
                if (newDriverObj.dataVencimentoCNH < data.dataTroca) {
                    window.movixApp.showToast(`A CNH do motorista ${newDriverObj.nome} está vencida desde ${newDriverObj.dataVencimentoCNH.split('-').reverse().join('/')}.`, 'error');
                    return;
                }

                // Datetime bounds validation
                const departureDT = new Date(`${t.dataSaida}T${t.horaSaida || '00:00'}:00`);
                const swapDT = new Date(`${data.dataTroca}T${data.horaTroca}:00`);
                if (swapDT < departureDT) {
                    window.movixApp.showToast('A data e hora da troca não podem ser anteriores à data e hora de partida da viagem.', 'error');
                    return;
                }

                // Check scheduling conflict for the new driver
                const checkConflict = () => {
                    const currentTrips = window.movixStore.getViagens();
                    const cStart = new Date(`${data.dataTroca}T${data.horaTroca}:00`);
                    if (isNaN(cStart.getTime())) return null;

                    for (const vi of currentTrips) {
                        if (vi.id === t.id) continue;
                        if (vi.status && vi.status.toLowerCase() === 'cancelada') continue;

                        if (vi.motoristaId !== data.novoMotoristaId) continue;

                        const tStart = new Date(`${vi.dataSaida}T${vi.horaSaida || '00:00'}:00`);
                        let tEnd;
                        if (vi.status && vi.status.toLowerCase() === 'realizada') {
                            tEnd = new Date(`${vi.dataRetorno}T${vi.horaRetorno || '23:59'}:00`);
                        } else {
                            tEnd = new Date();
                            if (tEnd < tStart) {
                                tEnd = new Date(tStart.getTime() + 24 * 60 * 60 * 1000);
                            }
                        }

                        if (isNaN(tStart.getTime()) || isNaN(tEnd.getTime())) continue;

                        if (cStart >= tStart && cStart <= tEnd) return vi;
                    }
                    return null;
                };

                const executeSwap = async (justificativa) => {
                    const saveBtn = document.getElementById('btn-confirmar-troca');
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';

                    // If a justification was needed, append to observations
                    if (justificativa) {
                        data.observacoes = (data.observacoes ? data.observacoes + ' | ' : '') + `[KM Justificado: ${justificativa}]`;
                    }

                    try {
                        const response = await fetch(`/api/viagens/${t.id}/troca-motorista`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });

                        if (!response.ok) {
                            const errData = await response.json();
                            throw new Error(errData.error || 'Erro ao registrar troca de motorista.');
                        }

                        window.movixApp.showToast('Troca de motorista registrada com sucesso!', 'success');
                        modal.classList.remove('active');
                        
                        // Reload trips
                        await window.movixStore.loadData();
                        updateTable();
                    } catch (err) {
                        console.error(err);
                        window.movixApp.showToast(err.message, 'error');
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Confirmar Troca';
                    }
                };

                const conflict = checkConflict();
                if (conflict) {
                    const startFormatted = `${conflict.dataSaida.split('-').reverse().join('/')} às ${conflict.horaSaida || '00:00'}`;
                    let periodMessage = '';
                    if (conflict.status && conflict.status.toLowerCase() === 'realizada') {
                        const endFormatted = `${conflict.dataRetorno.split('-').reverse().join('/')} às ${conflict.horaRetorno || '23:59'}`;
                        periodMessage = `no período de ${startFormatted} até ${endFormatted}`;
                    } else {
                        periodMessage = `iniciada em ${startFormatted} (viagem ainda em andamento)`;
                    }

                    window.movixApp.showConfirmModal(
                        `O motorista ${newDriverObj.nome} já está vinculado à viagem ${conflict.id} de ${conflict.origem} para ${conflict.destino}, ${periodMessage}. Deseja prosseguir com a troca mesmo assim?`,
                        () => {
                            window.movixApp.validateKM(t.veiculoId, parseFloat(data.kmTroca) || 0, executeSwap, false, 0);
                        },
                        () => {}
                    );
                } else {
                    window.movixApp.validateKM(t.veiculoId, parseFloat(data.kmTroca) || 0, executeSwap, false, 0);
                }
            });
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
                                ? vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual}" ${t.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})${v.status === 'em_manutencao' ? ' [Em Oficina]' : ''}</option>`).join('')
                                : vehicles.filter(v => v.status !== 'inativo').map(v => `<option value="${v.id}" data-km="${v.kmAtual}">${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})${v.status === 'em_manutencao' ? ' [Em Oficina]' : ''}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Selecione o Motorista Escalo <span class="required">*</span></label>
                        <select class="form-control" name="motoristaId" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione um motorista</option>
                            ${isEdit
                                ? drivers.map(m => `<option value="${m.id}" ${t.motoristaId === m.id ? 'selected' : ''}>${m.nome} (${m.categoria || 'Motorista Efetivo'})</option>`).join('')
                                : drivers.filter(m => m.status === 'ativo').map(m => `<option value="${m.id}">${m.nome} (${m.categoria || 'Motorista Efetivo'})</option>`).join('')}
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
            const driverSel = modalBody.querySelector('select[name="motoristaId"]');

            window.movixApp.initAutocomplete(veicSel, 'Selecione o veículo...');
            if (driverSel) {
                window.movixApp.initAutocomplete(driverSel, 'Selecione o motorista...');
            }

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

                    const vehicle = vehicles.find(v => v.id === veiculoId);
                    if (!vehicle) return;

                    const activeTrips = window.movixStore.getViagens().filter(t => t.status && t.status.toLowerCase() === 'em andamento');
                    const conflictTrip = activeTrips.find(t => t.veiculoId === veiculoId);

                    if (conflictTrip) {
                        const placa = vehicle.placa || 'N/A';
                        const dateFormatted = conflictTrip.dataSaida.split('-').reverse().join('/');
                        const timeFormatted = conflictTrip.horaSaida || 'N/A';
                        window.movixApp.showConfirmModal(
                            `O veículo de placa ${placa} já está vinculado à viagem em andamento de ${conflictTrip.origem} para ${conflictTrip.destino}, iniciada em ${dateFormatted} às ${timeFormatted}. Deseja utilizar este veículo mesmo assim?`,
                            () => {
                                checkMaintenance();
                            },
                            () => {
                                veicSel.value = "";
                                syncKM();
                            }
                        );
                    } else {
                        checkMaintenance();
                    }

                    function checkMaintenance() {
                        if (vehicle.status === 'em_manutencao') {
                            const placa = vehicle.placa || 'N/A';
                            window.movixApp.showConfirmModal(
                                `O veículo de placa ${placa} está com o status "Em Oficina" (Em Manutenção). Deseja iniciar a viagem mesmo assim?`,
                                () => {
                                    // keep selection
                                },
                                () => {
                                    veicSel.value = "";
                                    syncKM();
                                }
                            );
                        }
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
                            const dateFormatted = conflictTrip.dataSaida.split('-').reverse().join('/');
                            const timeFormatted = conflictTrip.horaSaida || 'N/A';
                            window.movixApp.showConfirmModal(
                                `O motorista ${driverName} já está vinculado à viagem em andamento de ${conflictTrip.origem} para ${conflictTrip.destino}, iniciada em ${dateFormatted} às ${timeFormatted}. Deseja escalar este motorista mesmo assim?`,
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
                const motoristaId = data.motoristaId;
                const dataSaida = data.dataSaida;
                const horaSaida = data.horaSaida;
                const dataRetorno = data.dataRetorno || null;
                const horaRetorno = data.horaRetorno || null;

                // Frontend overlap check
                const checkConflict = () => {
                    const currentTrips = window.movixStore.getViagens();
                    const cStart = new Date(`${dataSaida}T${horaSaida || '00:00'}:00`);
                    let cEnd = null;
                    if (dataRetorno && horaRetorno) {
                        cEnd = new Date(`${dataRetorno}T${horaRetorno}:00`);
                    }

                    if (isNaN(cStart.getTime())) return null;

                    for (const vi of currentTrips) {
                        if (isEdit && vi.id === tripId) continue;
                        if (vi.status && vi.status.toLowerCase() === 'cancelada') continue;

                        if (vi.veiculoId !== veiculoId && vi.motoristaId !== motoristaId) continue;

                        const tStart = new Date(`${vi.dataSaida}T${vi.horaSaida || '00:00'}:00`);
                        let tEnd;
                        if (vi.status && vi.status.toLowerCase() === 'realizada') {
                            tEnd = new Date(`${vi.dataRetorno}T${vi.horaRetorno || '23:59'}:00`);
                        } else {
                            tEnd = new Date();
                            if (tEnd < tStart) {
                                tEnd = new Date(tStart.getTime() + 24 * 60 * 60 * 1000);
                            }
                        }

                        if (isNaN(tStart.getTime()) || isNaN(tEnd.getTime())) continue;

                        if (cEnd) {
                            if (tStart < cEnd && cStart < tEnd) return vi;
                        } else {
                            if (cStart >= tStart && cStart <= tEnd) return vi;
                        }
                    }
                    return null;
                };

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

                const proceedValidation = () => {
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
                };

                const conflict = checkConflict();
                if (conflict) {
                    const target = conflict.veiculoId === veiculoId ? 'veículo' : 'motorista';
                    let targetName = '';
                    if (target === 'veículo') {
                        const v = vehicles.find(item => item.id === veiculoId);
                        targetName = `de placa ${v ? v.placa : 'N/A'}`;
                    } else {
                        const d = drivers.find(item => item.id === motoristaId);
                        targetName = d ? d.nome : 'N/A';
                    }
                    const startFormatted = `${conflict.dataSaida.split('-').reverse().join('/')} às ${conflict.horaSaida || '00:00'}`;
                    let periodMessage = '';
                    if (conflict.status && conflict.status.toLowerCase() === 'realizada') {
                        const endFormatted = `${conflict.dataRetorno.split('-').reverse().join('/')} às ${conflict.horaRetorno || '23:59'}`;
                        periodMessage = `no período de ${startFormatted} até ${endFormatted}`;
                    } else {
                        periodMessage = `iniciada em ${startFormatted} (viagem ainda em andamento)`;
                    }

                    window.movixApp.showConfirmModal(
                        `O ${target} ${targetName} já está vinculado à viagem ${conflict.id} de ${conflict.origem} para ${conflict.destino}, ${periodMessage}. Deseja prosseguir com o registro mesmo assim?`,
                        () => {
                            proceedValidation();
                        },
                        () => {}
                    );
                } else {
                    proceedValidation();
                }
            });
        }

        // Conclude (Partida de Retorno) Dialog
        function openConcluirModal(tripId) {
            const currentTrips = window.movixStore.getViagens();
            const t = currentTrips.find(item => item.id === tripId);
            if (!t) return;

            const freshVehicles = window.movixStore.getVeiculos();
            const freshDrivers = window.movixStore.getMotoristas();

            const v = freshVehicles.find(item => item.id === t.veiculoId);
            const veiculoPlacaModelo = v ? `${v.placa} - ${v.marca || ''} ${v.modelo || ''}`.trim() : 'N/A';

            let hist = t.historicoCondutores || [];
            if (typeof hist === 'string') {
                try {
                    hist = JSON.parse(hist);
                } catch (e) {
                    hist = [];
                }
            }

            const motoristaSaidaName = (hist && hist.length > 0)
                ? (hist[0].motoristaNome || 'N/A')
                : (freshDrivers.find(item => item.id === t.motoristaId)?.nome || 'N/A');

            const currentDriverName = (hist && hist.length > 0)
                ? (hist[hist.length - 1].motoristaNome || 'N/A')
                : (freshDrivers.find(item => item.id === t.motoristaId)?.nome || 'N/A');

            const dateSaidaFormatted = t.dataSaida ? t.dataSaida.split('-').reverse().join('/') : '-';

            let motoristaText = motoristaSaidaName;
            if (hist && hist.length > 1) {
                motoristaText = `${motoristaSaidaName} ➔ ${currentDriverName}`;
            }

            let swapInfoHTML = '';
            let lastSwapKM = parseFloat(t.kmInicial);
            if (hist && hist.length > 1) {
                const lastSwap = hist[hist.length - 1];
                const prevDriver = hist[hist.length - 2].motoristaNome;
                const dStr = lastSwap.dataInicio ? lastSwap.dataInicio.split('-').reverse().join('/') : '-';
                const hStr = lastSwap.horaInicio || '00:00';
                const kmStr = lastSwap.kmInicial ? parseFloat(lastSwap.kmInicial).toLocaleString('pt-BR') : '-';
                swapInfoHTML = `<div><strong>Última Troca:</strong> ${prevDriver} ➔ ${lastSwap.motoristaNome} em ${dStr} às ${hStr} (KM: ${kmStr} km)</div>`;
                lastSwapKM = parseFloat(lastSwap.kmInicial);
            }

            let kmPartidaTexto = `${parseFloat(t.kmInicial).toLocaleString('pt-BR')} km`;
            if (hist && hist.length > 1) {
                const lastSwap = hist[hist.length - 1];
                kmPartidaTexto = `${parseFloat(lastSwap.kmInicial).toLocaleString('pt-BR')} km`;
            }

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = `Finalizar Viagem: ${t.origem} → ${t.destino}`;

            modalBody.innerHTML = `
                <form id="form-concluir-viagem" class="form-grid">
                    <div style="grid-column: span 2; background-color:var(--bg-surface-hover); padding:12px; border-radius:6px; border:1px solid var(--border-color); font-size:0.85rem; display:flex; flex-direction:column; gap:6px; color:var(--text-main);">
                        <div><strong>Veículo:</strong> ${veiculoPlacaModelo}</div>
                        <div><strong>Motorista:</strong> ${motoristaText}</div>
                        <div><strong>KM de Partida:</strong> ${kmPartidaTexto}</div>
                        <div><strong>Saída:</strong> ${dateSaidaFormatted} às ${t.horaSaida || '-'}</div>
                        ${swapInfoHTML}
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
                        <input type="number" class="form-control" name="kmFinal" required placeholder="Odômetro de chegada" min="${lastSwapKM}">
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
