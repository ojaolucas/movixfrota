/* MovixFrota - Veículos Module (CRUD & Ficha de Vida Útil) */

(function() {
    
    function renderVeiculos(container, targetId) {
        if (targetId) {
            renderFichaVidaUtil(container, targetId);
        } else {
            renderListagemVeiculos(container);
        }
    }

    // LISTING VIEW
    function renderListagemVeiculos(container) {
        const vehicles = window.movixStore.getVeiculos();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';
        
        let state = window.movixApp.getListState('veiculos');
        if (!state) {
            state = {
                currentPage: 1,
                currentSort: { column: 'placa', direction: 'asc' },
                filters: {
                    search: '',
                    tipo: '',
                    combustivel: '',
                    status: ''
                },
                itemsPerPage: 10,
                scroll: 0
            };
            window.movixApp.saveListState('veiculos', state);
        } else if (state.itemsPerPage === undefined) {
            state.itemsPerPage = 10;
            window.movixApp.saveListState('veiculos', state);
        }

        // Setup base layout
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Gestão de Veículos</h1>
                    <p class="page-subtitle">Cadastre, edite e acompanhe o histórico completo da sua frota</p>
                </div>
                <div class="page-actions">
                    ${!isVisualizador ? `
                        <button class="btn btn-primary" id="btn-novo-veiculo">
                            <i class="fa-solid fa-plus"></i> Novo Veículo
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- FILTERS PANEL -->
            <div class="filters-card">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Buscar Placa / Modelo</label>
                        <input type="text" class="filter-input" id="search-veiculos" placeholder="Buscar..." value="${state.filters.search || ''}">
                    </div>
                    <div class="filter-group">
                        <label>Tipo de Veículo</label>
                        <select class="filter-input" id="filter-tipo">
                            <option value="">Todos</option>
                            <option value="Caminhão" ${state.filters.tipo === 'Caminhão' ? 'selected' : ''}>Caminhão</option>
                            <option value="Van/Furgão" ${state.filters.tipo === 'Van/Furgão' ? 'selected' : ''}>Van/Furgão</option>
                            <option value="Utilitário" ${state.filters.tipo === 'Utilitário' ? 'selected' : ''}>Utilitário</option>
                            <option value="Passeio" ${state.filters.tipo === 'Passeio' ? 'selected' : ''}>Passeio</option>
                            <option value="Picape" ${state.filters.tipo === 'Picape' ? 'selected' : ''}>Picape</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Combustível</label>
                        <select class="filter-input" id="filter-combustivel">
                            <option value="">Todos</option>
                            <option value="Diesel" ${state.filters.combustivel === 'Diesel' ? 'selected' : ''}>Diesel</option>
                            <option value="Diesel S10" ${state.filters.combustivel === 'Diesel S10' ? 'selected' : ''}>Diesel S10</option>
                            <option value="Flex" ${state.filters.combustivel === 'Flex' ? 'selected' : ''}>Flex</option>
                            <option value="Gasolina" ${state.filters.combustivel === 'Gasolina' ? 'selected' : ''}>Gasolina</option>
                            <option value="Etanol" ${state.filters.combustivel === 'Etanol' ? 'selected' : ''}>Etanol</option>
                            <option value="GNV" ${state.filters.combustivel === 'GNV' ? 'selected' : ''}>GNV</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação</label>
                        <select class="filter-input" id="filter-status">
                            <option value="">Todas</option>
                            <option value="disponivel" ${state.filters.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
                            <option value="em_viagem" ${state.filters.status === 'em_viagem' ? 'selected' : ''}>Em Viagem</option>
                            <option value="em_manutencao" ${state.filters.status === 'em_manutencao' ? 'selected' : ''}>Em Manutenção</option>
                            <option value="inativo" ${state.filters.status === 'inativo' ? 'selected' : ''}>Inativo</option>
                        </select>
                    </div>
                    <div class="filter-group" style="justify-content: flex-end;">
                        <button class="btn btn-secondary" id="btn-limpar-filtros" style="height: 38px; width: 100%; white-space: nowrap; justify-content: center;">
                            <i class="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
                        </button>
                    </div>
                </div>
            </div>

            <!-- VEHICLES LIST TABLE -->
            <div class="table-responsive">
                <table class="smart-table" id="table-veiculos">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="placa">Placa <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="marca">Modelo / Marca <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="tipo">Tipo <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="combustivel">Combustível <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="kmAtual">KM Atual <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="status">Situação <i class="fa-solid fa-sort"></i></th>
                            <th style="width: 120px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-veiculos">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
                <div class="table-pagination" id="pagination-veiculos">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;

        // State variables for dynamic filtering/sorting/pagination
        let filteredData = [...vehicles];
        let currentSort = state.currentSort;
        let currentPage = state.currentPage;

        // Render functions inside listing scope
        function updateTable() {
            const tbody = document.getElementById('tbody-veiculos');
            if (!tbody) return;

            // Get active trips to resolve traveling vehicles in-memory
            const activeTrips = window.movixStore.getViagens().filter(t => t.status && t.status.toLowerCase() === 'em andamento');
            const vehiclesInUseIds = new Set(activeTrips.map(t => t.veiculoId));

            // Search logic
            const searchVal = document.getElementById('search-veiculos').value.toLowerCase();
            const tipoVal = document.getElementById('filter-tipo').value;
            const combustivelVal = document.getElementById('filter-combustivel').value;
            const statusVal = document.getElementById('filter-status').value;

            // Save filter state
            state.filters = {
                search: document.getElementById('search-veiculos').value,
                tipo: tipoVal,
                combustivel: combustivelVal,
                status: statusVal
            };
            state.currentPage = currentPage;
            state.currentSort = currentSort;
            window.movixApp.saveListState('veiculos', state);

            // Sync sort icons
            document.querySelectorAll('#table-veiculos th.sortable').forEach(th => {
                const icon = th.querySelector('i');
                if (icon) {
                    const col = th.getAttribute('data-sort');
                    if (col === currentSort.column) {
                        icon.className = currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                    } else {
                        icon.className = 'fa-solid fa-sort';
                    }
                }
            });

            filteredData = vehicles.filter(v => {
                const matchSearch = v.placa.toLowerCase().includes(searchVal) || 
                                    v.modelo.toLowerCase().includes(searchVal) ||
                                    v.marca.toLowerCase().includes(searchVal);
                const matchTipo = !tipoVal || v.tipo === tipoVal;
                const matchCombustivel = !combustivelVal || v.combustivel === combustivelVal;
                
                let actualStatus = v.status;
                if (v.status === 'disponivel' && vehiclesInUseIds.has(v.id)) {
                    actualStatus = 'em_viagem';
                }
                const matchStatus = !statusVal || actualStatus === statusVal;
                
                return matchSearch && matchTipo && matchCombustivel && matchStatus;
            });

            // Sorting logic
            filteredData.sort((a, b) => {
                let valA = a[currentSort.column];
                let valB = b[currentSort.column];

                if (currentSort.column === 'kmAtual') {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });

            // Pagination calculation
            const itemsPerPageVal = state.itemsPerPage === 'Todos' ? Infinity : (parseInt(state.itemsPerPage) || 10);
            const totalPages = Math.ceil(filteredData.length / itemsPerPageVal) || 1;
            if (currentPage > totalPages) {
                currentPage = totalPages;
                state.currentPage = currentPage;
                window.movixApp.saveListState('veiculos', state);
            }
            
            const startIdx = itemsPerPageVal === Infinity ? 0 : (currentPage - 1) * itemsPerPageVal;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPageVal);

            tbody.innerHTML = '';
            if (paginatedItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="search-no-results" style="text-align: center;">Nenhum veículo encontrado</td></tr>`;
                document.getElementById('pagination-veiculos').innerHTML = '';
                return;
            }

            paginatedItems.forEach(v => {
                let statusLabel = '';
                if (v.status === 'inativo') {
                    statusLabel = '<span class="status-pill inativo">Inativo</span>';
                } else if (v.status === 'em_manutencao') {
                    statusLabel = '<span class="status-pill em_manutencao">Em Oficina</span>';
                } else if (vehiclesInUseIds.has(v.id)) {
                    statusLabel = '<span class="status-pill em_andamento">Em Viagem</span>';
                } else {
                    statusLabel = '<span class="status-pill disponivel">Disponível</span>';
                }

                const isTrailer = v.tipoUnidade === 'Implemento/Reboque';

                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight: 700; color: var(--primary);">${v.placa}</td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight: 600;">${v.marca} ${v.modelo}</span>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${v.ano} • ${v.cor} ${isTrailer ? '• <span class="status-pill warning" style="font-size:0.55rem; padding:1px 4px; line-height:1;">Reboque</span>' : ''}</span>
                            </div>
                        </td>
                        <td>${isTrailer ? `Reboque (${v.tipoImplemento || 'Outro'})` : (v.tipo || '-')}</td>
                        <td>${isTrailer ? '-' : (v.combustivel || '-')}</td>
                        <td style="font-weight: 600;">${isTrailer ? '-' : `${parseFloat(v.kmAtual || 0).toLocaleString('pt-BR')} km`}</td>
                        <td>${statusLabel}</td>
                        <td style="text-align: center; display: flex; justify-content: center; gap: 8px;">
                            <button class="btn-icon-only" onclick="window.movixRouter.navigateTo('veiculos', '${v.id}')" title="Ver Ficha de Vida Útil">
                                <i class="fa-solid fa-clipboard-user"></i>
                            </button>
                            ${!isVisualizador ? `
                                <button class="btn-icon-only btn-edit" data-id="${v.id}" title="Editar">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                ${activeUser.perfil === 'Administrador' ? `
                                    <button class="btn-icon-only danger btn-delete" data-id="${v.id}" title="Excluir">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            ` : ''}
                        </td>
                    </tr>
                `;
            });

            // Render pagination links
            window.movixApp.renderPagination({
                containerId: 'pagination-veiculos',
                currentPage: currentPage,
                totalItems: filteredData.length,
                itemsPerPage: state.itemsPerPage || 10,
                noun: 'veículos',
                onPageChange: (newPage) => {
                    currentPage = newPage;
                    state.currentPage = newPage;
                    window.movixApp.saveListState('veiculos', state);
                    updateTable();
                },
                onItemsPerPageChange: (newLimit) => {
                    state.itemsPerPage = newLimit;
                    currentPage = 1;
                    state.currentPage = 1;
                    window.movixApp.saveListState('veiculos', state);
                    updateTable();
                }
            });
 
            // Restore scroll position
            setTimeout(() => {
                window.scrollTo(0, state.scroll || 0);
            }, 0);
        }

        // Event hooks
        document.getElementById('search-veiculos').addEventListener('input', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-tipo').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-combustivel').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
            document.getElementById('search-veiculos').value = '';
            document.getElementById('filter-tipo').value = '';
            document.getElementById('filter-combustivel').value = '';
            document.getElementById('filter-status').value = '';
            currentSort = { column: 'placa', direction: 'asc' };
            state.currentSort = currentSort;
            currentPage = 1;
            updateTable();
        });

        // Sort click triggers
        document.querySelectorAll('#table-veiculos th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                
                // Update sorting arrows
                document.querySelectorAll('#table-veiculos th.sortable i').forEach(icon => {
                    icon.className = 'fa-solid fa-sort';
                });
                const curIcon = th.querySelector('i');
                curIcon.className = currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                
                // Pagination handled by MovixApp.renderPagination helper
                updateTable();
            });
        });

        // Pagination handled by MovixApp.renderPagination helper

        // Insert and Edit Form Modals
        if (document.getElementById('btn-novo-veiculo')) {
            document.getElementById('btn-novo-veiculo').addEventListener('click', () => openVeiculoModal());
        }

        document.getElementById('tbody-veiculos').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            
            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                openVeiculoModal(id);
            }
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                confirmDeleteVeiculo(id);
            }
        });

        updateTable();
    }

    // VEHICLE CRUD MODALS
    function openVeiculoModal(id = null) {
        const isEdit = id !== null;
        const vehicle = isEdit ? window.movixStore.getVeiculo(id) : null;
        
        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');
        
        modalTitle.innerText = isEdit ? `Editar Veículo: ${vehicle.placa}` : 'Cadastrar Novo Veículo';

        modalBody.innerHTML = `
            <form id="form-veiculo" class="form-grid">
                <!-- TIPO DE VEÍCULO -->
                <div class="form-group full-width" style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 8px;">
                    <label>Tipo de Veículo <span class="required">*</span></label>
                    <select class="form-control" name="tipo" id="veh-tipo" required>
                        <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione...</option>
                        <option value="Moto" ${isEdit && vehicle.tipo === 'Moto' ? 'selected' : ''}>Moto</option>
                        <option value="Passeio" ${isEdit && vehicle.tipo === 'Passeio' ? 'selected' : ''}>Passeio</option>
                        <option value="Utilitário" ${isEdit && vehicle.tipo === 'Utilitário' ? 'selected' : ''}>Utilitário</option>
                        <option value="Caminhão" ${isEdit && vehicle.tipo === 'Caminhão' ? 'selected' : ''}>Caminhão</option>
                        <option value="Cavalo Mecânico" ${isEdit && vehicle.tipo === 'Cavalo Mecânico' ? 'selected' : ''}>Cavalo Mecânico</option>
                        <option value="Implemento" ${isEdit && vehicle.tipo === 'Implemento' ? 'selected' : ''}>Implemento</option>
                        <option value="Reboque" ${isEdit && vehicle.tipo === 'Reboque' ? 'selected' : ''}>Reboque</option>
                        <option value="Personalizado" ${isEdit && vehicle.tipo === 'Personalizado' ? 'selected' : ''}>Personalizado</option>
                    </select>
                </div>
                <input type="hidden" name="tipoUnidade" id="veh-tipo-unidade" value="${isEdit ? (vehicle.tipoUnidade || 'Veículo Motorizado') : 'Veículo Motorizado'}">

                <div class="form-group">
                    <label>Marca <span class="required">*</span></label>
                    <input type="text" class="form-control" name="marca" required value="${isEdit ? vehicle.marca : ''}" placeholder="Ex: Scania, Chevrolet">
                </div>
                <div class="form-group">
                    <label>Modelo <span class="required">*</span></label>
                    <input type="text" class="form-control" name="modelo" required value="${isEdit ? vehicle.modelo : ''}" placeholder="Ex: R 450, Onix">
                </div>
                <div class="form-group">
                    <label>Ano <span class="required">*</span></label>
                    <input type="number" class="form-control" name="ano" required min="1980" max="2030" value="${isEdit ? vehicle.ano : ''}" placeholder="Ex: 2026">
                </div>
                <div class="form-group">
                    <label>Cor <span class="required">*</span></label>
                    <input type="text" class="form-control" name="cor" required value="${isEdit ? vehicle.cor : ''}" placeholder="Ex: Branco, Preto">
                </div>
                <div class="form-group">
                    <label>Placa <span class="required">*</span></label>
                    <input type="text" class="form-control" name="placa" required placeholder="AAA-0000 / ABC1D23" value="${isEdit ? vehicle.placa : ''}" ${isEdit ? 'readonly' : ''}>
                </div>
                <div class="form-group" id="veh-config-rodagem-group">
                    <label>Configuração de Rodagem <span class="required">*</span></label>
                    <select class="form-control" name="configRodagem" id="veh-config-rodagem" required>
                        <option value="4x2" ${isEdit && vehicle.configRodagem === '4x2' ? 'selected' : (!isEdit ? 'selected' : '')}>Toco 4x2</option>
                        <option value="6x2" ${isEdit && vehicle.configRodagem === '6x2' ? 'selected' : ''}>Truck 6x2</option>
                        <option value="6x4" ${isEdit && vehicle.configRodagem === '6x4' ? 'selected' : ''}>Traçado 6x4</option>
                        <option value="8x2" ${isEdit && vehicle.configRodagem === '8x2' ? 'selected' : ''}>Bitruck 8x2</option>
                        <option value="Personalizado" ${isEdit && vehicle.configRodagem === 'Personalizado' ? 'selected' : ''}>Personalizado</option>
                    </select>
                </div>
                <div class="form-group" id="veh-qtd-eixos-group" style="display: ${isEdit && vehicle.configRodagem === 'Personalizado' ? 'block' : 'none'};">
                    <label>Quantidade de Eixos <span class="required">*</span></label>
                    <input type="number" class="form-control" name="qtdEixos" id="veh-qtd-eixos" min="1" max="10" value="${isEdit ? (vehicle.qtdEixos || 2) : 2}">
                </div>
                <div class="form-group">
                    <label>Quantidade de Pneus (Calculado)</label>
                    <input type="number" class="form-control" name="qtdPneus" id="veh-qtdpneus" readonly value="${isEdit ? (vehicle.qtdPneus || '') : ''}" placeholder="Automático">
                </div>
                <div class="form-group" id="veh-tipo-implemento-group" style="display: none;">
                    <label>Tipo do Implemento <span class="required">*</span></label>
                    <select class="form-control" name="tipoImplemento" id="veh-tipo-implemento">
                        <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione...</option>
                        <option value="Carrocinha" ${isEdit && vehicle.tipoImplemento === 'Carrocinha' ? 'selected' : ''}>Carrocinha</option>
                        <option value="Reboque" ${isEdit && vehicle.tipoImplemento === 'Reboque' ? 'selected' : ''}>Reboque</option>
                        <option value="Carreta" ${isEdit && vehicle.tipoImplemento === 'Carreta' ? 'selected' : ''}>Carreta</option>
                        <option value="Semirreboque" ${isEdit && vehicle.tipoImplemento === 'Semirreboque' ? 'selected' : ''}>Semirreboque</option>
                        <option value="Trailer" ${isEdit && vehicle.tipoImplemento === 'Trailer' ? 'selected' : ''}>Trailer</option>
                        <option value="Outro" ${isEdit && vehicle.tipoImplemento === 'Outro' ? 'selected' : ''}>Outro</option>
                    </select>
                </div>

                <div class="form-group full-width" id="veh-eixos-config-wrapper" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; background: var(--bg-surface-hover); margin-bottom: 12px; grid-column: span 2;">
                    <label style="font-weight: 700; color: var(--primary); margin-bottom: 8px; display: block;"><i class="fa-solid fa-gears"></i> Detalhamento de Rodagem dos Eixos</label>
                    <div id="veh-eixos-config-list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Injected dynamically -->
                    </div>
                </div>
                <input type="hidden" name="configEixos" id="veh-config-eixos-json" value="${isEdit && vehicle.configEixos ? (typeof vehicle.configEixos === 'string' ? vehicle.configEixos : JSON.stringify(vehicle.configEixos)) : '[]'}">

                <!-- MOTORIZED VEHICLE FIELDS -->
                <div id="motorized-fields-container" style="display: contents;">
                    <div class="form-group">
                        <label>Combustível <span class="required">*</span></label>
                        <select class="form-control" name="combustivel" id="veh-combustivel" required>
                            <option value="Diesel" ${isEdit && vehicle.combustivel === 'Diesel' ? 'selected' : ''}>Diesel</option>
                            <option value="Diesel S10" ${isEdit && vehicle.combustivel === 'Diesel S10' ? 'selected' : ''}>Diesel S10</option>
                            <option value="Flex" ${isEdit && vehicle.combustivel === 'Flex' ? 'selected' : ''}>Flex</option>
                            <option value="Gasolina" ${isEdit && vehicle.combustivel === 'Gasolina' ? 'selected' : ''}>Gasolina</option>
                            <option value="Etanol" ${isEdit && vehicle.combustivel === 'Etanol' ? 'selected' : ''}>Etanol</option>
                            <option value="GNV" ${isEdit && vehicle.combustivel === 'GNV' ? 'selected' : ''}>GNV</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>KM Atual <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmAtual" id="veh-kmatual" required value="${isEdit ? vehicle.kmAtual : ''}" placeholder="Odômetro" min="0">
                    </div>
                </div>

                <!-- TRAILER/IMPLEMENT FIELDS -->
                <div id="trailer-fields-container" style="display: none;">
                    <div class="form-group">
                        <label>Capacidade de Carga (kg) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="capacidadeCarga" id="veh-capacidade" min="0" value="${isEdit ? vehicle.capacidadeCarga : ''}" placeholder="Ex: 15000">
                    </div>
                </div>

                <div class="form-group">
                    <label>Renavam</label>
                    <input type="text" class="form-control" name="renavam" value="${isEdit && vehicle.renavam ? vehicle.renavam : ''}" placeholder="Apenas números">
                </div>
                <div class="form-group">
                    <label>Chassi</label>
                    <input type="text" class="form-control" name="chassi" value="${isEdit && vehicle.chassi ? vehicle.chassi : ''}" placeholder="17 caracteres">
                </div>
                <div class="form-group">
                    <label>Data de Aquisição</label>
                    <input type="date" class="form-control" name="dataAquisicao" value="${isEdit && vehicle.dataAquisicao ? vehicle.dataAquisicao : ''}">
                </div>
                <div class="form-group">
                    <label>Situação <span class="required">*</span></label>
                    <select class="form-control" name="status" required>
                        <option value="disponivel" ${isEdit && vehicle.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
                        <option value="em_manutencao" ${isEdit && vehicle.status === 'em_manutencao' ? 'selected' : ''}>Em Manutenção</option>
                        <option value="inativo" ${isEdit && vehicle.status === 'inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Possui Seguro Ativo? <span class="required">*</span></label>
                    <select class="form-control" name="possuiSeguro" id="veh-possui-seguro" required>
                        <option value="Não" ${isEdit && vehicle.possuiSeguro === 'Não' ? 'selected' : ''}>Não</option>
                        <option value="Sim" ${isEdit && vehicle.possuiSeguro === 'Sim' ? 'selected' : ''}>Sim</option>
                    </select>
                </div>

                <!-- DOCUMENTATION UPLOAD -->
                <div class="form-group full-width" style="margin-top:12px; border-top:1px solid var(--border-color); padding-top:16px;">
                    <h3 style="font-size:1rem; font-family:var(--font-heading); color:var(--text-main); margin-bottom:12px;"><i class="fa-solid fa-file-contract text-primary"></i> Digitalização de Documentos do Veículo</h3>
                </div>

                <div class="form-group full-width">
                    <label>Documento do Veículo (CRLV - PDF ou Imagem)</label>
                    <div class="file-upload-area" id="veh-crlv-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 16px;">
                        <i class="fa-solid fa-file-invoice"></i>
                        <span class="file-upload-text" id="veh-crlv-upload-text" style="font-size:0.8rem;">
                            ${isEdit && vehicle.docVeiculoAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.docVeiculoAnexo.split('/').pop()}</strong>` : 'Arraste ou clique para anexar o CRLV'}
                        </span>
                        <input type="file" id="veh-crlv-file-input" style="display:none;" accept="image/*,application/pdf">
                    </div>
                    <input type="hidden" name="docVeiculoAnexo" id="veh-crlv-anexo-url" value="${isEdit && vehicle.docVeiculoAnexo ? vehicle.docVeiculoAnexo : ''}">
                    
                    <div id="veh-crlv-actions" style="display:${isEdit && vehicle.docVeiculoAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                        <a href="${isEdit && vehicle.docVeiculoAnexo ? vehicle.docVeiculoAnexo : '#'}" id="btn-visualizar-crlv" target="_blank" class="btn btn-secondary" style="height:32px; padding:0 12px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-eye"></i> Visualizar
                        </a>
                        <button type="button" class="btn btn-danger" id="btn-remover-crlv" style="height:32px; padding:0 12px; font-size:0.75rem; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-trash"></i> Remover
                        </button>
                    </div>
                </div>

                <!-- DYNAMIC INSURANCE FIELDS CONTAINER -->
                <div id="insurance-fields-container" class="grid-1-1" style="grid-column: span 2; display:${isEdit && vehicle.possuiSeguro === 'Sim' ? 'grid' : 'none'}; border-left: 3px solid var(--primary); padding-left: 16px; margin: 8px 0;">
                    <div style="grid-column: span 2; margin-bottom:-4px;">
                        <h4 style="font-family:var(--font-heading); color:var(--primary);"><i class="fa-solid fa-shield-halved"></i> Detalhamento da Cobertura de Seguro</h4>
                    </div>
                    <div class="form-group">
                        <label>Seguradora</label>
                        <input type="text" class="form-control" name="seguradora" value="${isEdit && vehicle.seguradora ? vehicle.seguradora : ''}" placeholder="Ex: Porto Seguro, Azul">
                    </div>
                    <div class="form-group">
                        <label>Número da Apólice</label>
                        <input type="text" class="form-control" name="apolice" value="${isEdit && vehicle.apolice ? vehicle.apolice : ''}" placeholder="Ex: AP-890234">
                    </div>
                    <div class="form-group">
                        <label>Valor Mensal do Seguro (R$)</label>
                        <input type="text" class="form-control" name="valorMensalSeguro" value="${isEdit && vehicle.valorMensalSeguro ? window.movixApp.formatCurrency(vehicle.valorMensalSeguro) : ''}" placeholder="Ex: R$ 350,00">
                    </div>
                    <div class="form-group">
                        <label>Vencimento do Boleto</label>
                        <input type="number" class="form-control" name="vencimentoBoletoSeguro" min="1" max="31" value="${isEdit && vehicle.vencimentoBoletoSeguro ? (vehicle.vencimentoBoletoSeguro.includes('-') ? parseInt(vehicle.vencimentoBoletoSeguro.split('-')[2]) : vehicle.vencimentoBoletoSeguro) : ''}" placeholder="Ex: 10">
                    </div>
                    <div class="form-group">
                        <label>Início do Contrato</label>
                        <input type="date" class="form-control" name="inicioContratoSeguro" value="${isEdit && vehicle.inicioContratoSeguro ? vehicle.inicioContratoSeguro : ''}">
                    </div>
                    <div class="form-group">
                        <label>Validade do Contrato (Expiração)</label>
                        <input type="date" class="form-control" name="validadeContratoSeguro" value="${isEdit && vehicle.validadeContratoSeguro ? vehicle.validadeContratoSeguro : ''}">
                    </div>

                    <div class="form-group full-width">
                        <label>Contrato do Seguro (PDF ou Imagem)</label>
                        <div class="file-upload-area" id="veh-seg-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 16px;">
                            <i class="fa-solid fa-file-shield"></i>
                            <span class="file-upload-text" id="veh-seg-upload-text" style="font-size:0.8rem;">
                                ${isEdit && vehicle.contratoSeguroAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.contratoSeguroAnexo.split('/').pop()}</strong>` : 'Arraste ou clique para anexar o Contrato de Seguro'}
                            </span>
                            <input type="file" id="veh-seg-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="contratoSeguroAnexo" id="veh-seg-anexo-url" value="${isEdit && vehicle.contratoSeguroAnexo ? vehicle.contratoSeguroAnexo : ''}">
                        
                        <div id="veh-seg-actions" style="display:${isEdit && vehicle.contratoSeguroAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.contratoSeguroAnexo ? vehicle.contratoSeguroAnexo : '#'}" id="btn-visualizar-seg" target="_blank" class="btn btn-secondary" style="height:32px; padding:0 12px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-eye"></i> Visualizar
                            </a>
                            <button type="button" class="btn btn-danger" id="btn-remover-seg" style="height:32px; padding:0 12px; font-size:0.75rem; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Observações do Seguro</label>
                        <textarea class="form-control" name="observacoesSeguro" placeholder="Cobertura total, contra terceiros, reboque ilimitado...">${isEdit && vehicle.observacoesSeguro ? vehicle.observacoesSeguro : ''}</textarea>
                    </div>
                </div>

                <!-- SECTION: VEICULO RASTREADOR -->
                <div class="form-group full-width" style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 12px;">
                    <label>Possui Sistema de Rastreamento? <span class="required">*</span></label>
                    <select class="form-control" name="possuiRastreador" id="veh-possui-rastreador" required>
                        <option value="Não" ${isEdit && vehicle.possuiRastreador === 'Não' ? 'selected' : ''}>Não</option>
                        <option value="Sim" ${isEdit && vehicle.possuiRastreador === 'Sim' ? 'selected' : ''}>Sim</option>
                    </select>
                </div>

                <div id="tracker-fields-container" class="grid-1-1" style="grid-column: span 2; display:${isEdit && vehicle.possuiRastreador === 'Sim' ? 'grid' : 'none'}; border-left: 3px solid var(--primary); padding-left: 16px; margin: 8px 0;">
                    <div style="grid-column: span 2; margin-bottom:-4px;">
                        <h4 style="font-family:var(--font-heading); color:var(--primary);"><i class="fa-solid fa-satellite-dish"></i> Detalhamento do Sistema de Rastreamento</h4>
                    </div>
                    <div class="form-group">
                        <label>Empresa Fornecedora</label>
                        <input type="text" class="form-control" name="empresaRastreador" value="${isEdit && vehicle.empresaRastreador ? vehicle.empresaRastreador : ''}" placeholder="Ex: Sascar, Autotrac">
                    </div>
                    <div class="form-group">
                        <label>Modelo do Equipamento</label>
                        <input type="text" class="form-control" name="modeloRastreador" value="${isEdit && vehicle.modeloRastreador ? vehicle.modeloRastreador : ''}" placeholder="Ex: SASCAR-V4">
                    </div>
                    <div class="form-group">
                        <label>ID / Número do Rastreador</label>
                        <input type="text" class="form-control" name="idRastreador" value="${isEdit && vehicle.idRastreador ? vehicle.idRastreador : ''}" placeholder="Ex: RST-89043">
                    </div>
                    <div class="form-group">
                        <label>IMEI / Código do Dispositivo</label>
                        <input type="text" class="form-control" name="imeiRastreador" value="${isEdit && vehicle.imeiRastreador ? vehicle.imeiRastreador : ''}" placeholder="IMEI de 15 dígitos">
                    </div>
                    <div class="form-group">
                        <label>Data de Instalação</label>
                        <input type="date" class="form-control" name="dataInstalacaoRastreador" value="${isEdit && vehicle.dataInstalacaoRastreador ? vehicle.dataInstalacaoRastreador : ''}">
                    </div>
                    <div class="form-group">
                        <label>Status do Rastreador <span class="required">*</span></label>
                        <select class="form-control" name="statusRastreador">
                            <option value="Ativo" ${isEdit && vehicle.statusRastreador === 'Ativo' ? 'selected' : ''}>Ativo</option>
                            <option value="Inativo" ${isEdit && vehicle.statusRastreador === 'Inativo' ? 'selected' : ''}>Inativo</option>
                            <option value="Em manutenção" ${isEdit && vehicle.statusRastreador === 'Em manutenção' ? 'selected' : ''}>Em manutenção</option>
                            <option value="Cancelado" ${isEdit && vehicle.statusRastreador === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Valor Mensal do Serviço (R$)</label>
                        <input type="text" class="form-control" name="valorMensalRastreador" value="${isEdit && vehicle.valorMensalRastreador ? window.movixApp.formatCurrency(vehicle.valorMensalRastreador) : ''}" placeholder="Ex: R$ 120,00">
                    </div>
                    <div class="form-group">
                        <label>Início do Contrato</label>
                        <input type="date" class="form-control" name="inicioContratoRastreador" value="${isEdit && vehicle.inicioContratoRastreador ? vehicle.inicioContratoRastreador : ''}">
                    </div>
                    <div class="form-group">
                        <label>Vencimento do Contrato</label>
                        <input type="date" class="form-control" name="validadeContratoRastreador" value="${isEdit && vehicle.validadeContratoRastreador ? vehicle.validadeContratoRastreador : ''}">
                    </div>

                    <!-- MULTIPLE ANEXOS RASTREADOR -->
                    <div class="form-group full-width" style="margin-top:8px; margin-bottom: 0;">
                        <h4 style="font-family:var(--font-heading); color:var(--text-muted); font-size:0.85rem; text-transform:uppercase;"><i class="fa-solid fa-paperclip"></i> Anexos do Rastreador</h4>
                    </div>

                    <!-- Contrato -->
                    <div class="form-group">
                        <label>Contrato de Rastreamento</label>
                        <div class="file-upload-area" id="veh-ras-contrato-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 12px;">
                            <i class="fa-solid fa-file-contract"></i>
                            <span class="file-upload-text" id="veh-ras-contrato-upload-text" style="font-size:0.75rem;">
                                ${isEdit && vehicle.rastreadorContratoAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.rastreadorContratoAnexo.split('/').pop()}</strong>` : 'Anexar Contrato'}
                            </span>
                            <input type="file" id="veh-ras-contrato-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="rastreadorContratoAnexo" id="veh-ras-contrato-anexo-url" value="${isEdit && vehicle.rastreadorContratoAnexo ? vehicle.rastreadorContratoAnexo : ''}">
                        <div id="veh-ras-contrato-actions" style="display:${isEdit && vehicle.rastreadorContratoAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.rastreadorContratoAnexo ? vehicle.rastreadorContratoAnexo : '#'}" id="btn-ver-ras-contrato" target="_blank" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Ver</a>
                            <button type="button" class="btn btn-danger" id="btn-rem-ras-contrato" style="height:28px; padding:0 8px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">Remover</button>
                        </div>
                    </div>

                    <!-- Nota Fiscal -->
                    <div class="form-group">
                        <label>Nota Fiscal do Equipamento</label>
                        <div class="file-upload-area" id="veh-ras-nf-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 12px;">
                            <i class="fa-solid fa-file-invoice-dollar"></i>
                            <span class="file-upload-text" id="veh-ras-nf-upload-text" style="font-size:0.75rem;">
                                ${isEdit && vehicle.rastreadorNotaFiscalAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.rastreadorNotaFiscalAnexo.split('/').pop()}</strong>` : 'Anexar Nota Fiscal'}
                            </span>
                            <input type="file" id="veh-ras-nf-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="rastreadorNotaFiscalAnexo" id="veh-ras-nf-anexo-url" value="${isEdit && vehicle.rastreadorNotaFiscalAnexo ? vehicle.rastreadorNotaFiscalAnexo : ''}">
                        <div id="veh-ras-nf-actions" style="display:${isEdit && vehicle.rastreadorNotaFiscalAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.rastreadorNotaFiscalAnexo ? vehicle.rastreadorNotaFiscalAnexo : '#'}" id="btn-ver-ras-nf" target="_blank" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Ver</a>
                            <button type="button" class="btn btn-danger" id="btn-rem-ras-nf" style="height:28px; padding:0 8px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">Remover</button>
                        </div>
                    </div>

                    <!-- Ordem de Serviço -->
                    <div class="form-group">
                        <label>Ordem de Serviço (O.S.)</label>
                        <div class="file-upload-area" id="veh-ras-os-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 12px;">
                            <i class="fa-solid fa-file-signature"></i>
                            <span class="file-upload-text" id="veh-ras-os-upload-text" style="font-size:0.75rem;">
                                ${isEdit && vehicle.rastreadorOrdemServicoAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.rastreadorOrdemServicoAnexo.split('/').pop()}</strong>` : 'Anexar O.S.'}
                            </span>
                            <input type="file" id="veh-ras-os-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="rastreadorOrdemServicoAnexo" id="veh-ras-os-anexo-url" value="${isEdit && vehicle.rastreadorOrdemServicoAnexo ? vehicle.rastreadorOrdemServicoAnexo : ''}">
                        <div id="veh-ras-os-actions" style="display:${isEdit && vehicle.rastreadorOrdemServicoAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.rastreadorOrdemServicoAnexo ? vehicle.rastreadorOrdemServicoAnexo : '#'}" id="btn-ver-ras-os" target="_blank" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Ver</a>
                            <button type="button" class="btn btn-danger" id="btn-rem-ras-os" style="height:28px; padding:0 8px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">Remover</button>
                        </div>
                    </div>

                    <!-- Comprovantes -->
                    <div class="form-group">
                        <label>Outros Comprovantes</label>
                        <div class="file-upload-area" id="veh-ras-comp-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 12px;">
                            <i class="fa-solid fa-receipt"></i>
                            <span class="file-upload-text" id="veh-ras-comp-upload-text" style="font-size:0.75rem;">
                                ${isEdit && vehicle.rastreadorComprovanteAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.rastreadorComprovanteAnexo.split('/').pop()}</strong>` : 'Anexar Comprovantes'}
                            </span>
                            <input type="file" id="veh-ras-comp-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="rastreadorComprovanteAnexo" id="veh-ras-comp-anexo-url" value="${isEdit && vehicle.rastreadorComprovanteAnexo ? vehicle.rastreadorComprovanteAnexo : ''}">
                        <div id="veh-ras-comp-actions" style="display:${isEdit && vehicle.rastreadorComprovanteAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.rastreadorComprovanteAnexo ? vehicle.rastreadorComprovanteAnexo : '#'}" id="btn-ver-ras-comp" target="_blank" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Ver</a>
                            <button type="button" class="btn btn-danger" id="btn-rem-ras-comp" style="height:28px; padding:0 8px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">Remover</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Observações do Rastreador</label>
                        <textarea class="form-control" name="observacoesRastreador" placeholder="Detalhes da instalação, restrições ou termos de fidelidade...">${isEdit && vehicle.observacoesRastreador ? vehicle.observacoesRastreador : ''}</textarea>
                    </div>
                </div>

                <!-- SECTION: CONTROLE DE EXTINTOR -->
                <div class="form-group full-width" style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 12px;">
                    <label>Possui Controle de Extintor de Incêndio? <span class="required">*</span></label>
                    <select class="form-control" name="possuiExtintor" id="veh-possui-extintor" required>
                        <option value="Não" ${isEdit && vehicle.possuiExtintor === 'Não' ? 'selected' : ''}>Não</option>
                        <option value="Sim" ${isEdit && vehicle.possuiExtintor === 'Sim' ? 'selected' : ''}>Sim</option>
                    </select>
                </div>

                <div id="extinguisher-fields-container" class="grid-1-1" style="grid-column: span 2; display:${isEdit && vehicle.possuiExtintor === 'Sim' ? 'grid' : 'none'}; border-left: 3px solid var(--danger); padding-left: 16px; margin: 8px 0;">
                    <div style="grid-column: span 2; margin-bottom:-4px;">
                        <h4 style="font-family:var(--font-heading); color:var(--danger);"><i class="fa-solid fa-fire-extinguisher"></i> Detalhamento do Controle de Extintor</h4>
                    </div>
                    <div class="form-group">
                        <label>Tipo do Extintor</label>
                        <select class="form-control" name="tipoExtintor">
                            <option value="ABC" ${isEdit && vehicle.tipoExtintor === 'ABC' ? 'selected' : ''}>ABC (Pó Químico)</option>
                            <option value="BC" ${isEdit && vehicle.tipoExtintor === 'BC' ? 'selected' : ''}>BC (Gás Carbônico)</option>
                            <option value="Água" ${isEdit && vehicle.tipoExtintor === 'Água' ? 'selected' : ''}>Água Pressurizada</option>
                            <option value="Outro" ${isEdit && vehicle.tipoExtintor === 'Outro' ? 'selected' : ''}>Outro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Capacidade (kg/L)</label>
                        <input type="text" class="form-control" name="capacidadeExtintor" value="${isEdit && vehicle.capacidadeExtintor ? vehicle.capacidadeExtintor : ''}" placeholder="Ex: 2kg, 4kg, 6L">
                    </div>
                    <div class="form-group">
                        <label>Número do Selo INMETRO</label>
                        <input type="text" class="form-control" name="seloExtintor" value="${isEdit && vehicle.seloExtintor ? vehicle.seloExtintor : ''}" placeholder="Ex: INM-90234">
                    </div>
                    <div class="form-group">
                        <label>Data de Fabricação</label>
                        <input type="date" class="form-control" name="dataFabricacaoExtintor" value="${isEdit && vehicle.dataFabricacaoExtintor ? vehicle.dataFabricacaoExtintor : ''}">
                    </div>
                    <div class="form-group">
                        <label>Data da Última Recarga</label>
                        <input type="date" class="form-control" name="dataRecargaExtintor" value="${isEdit && vehicle.dataRecargaExtintor ? vehicle.dataRecargaExtintor : ''}">
                    </div>
                    <div class="form-group">
                        <label>Data de Validade (Vencimento)</label>
                        <input type="date" class="form-control" name="validadeExtintor" value="${isEdit && vehicle.validadeExtintor ? vehicle.validadeExtintor : ''}">
                    </div>
                    <div class="form-group">
                        <label>Data da Próxima Recarga</label>
                        <input type="date" class="form-control" name="proximaRecargaExtintor" value="${isEdit && vehicle.proximaRecargaExtintor ? vehicle.proximaRecargaExtintor : ''}">
                    </div>
                    <div class="form-group">
                        <label>Status do Extintor <span class="required">*</span></label>
                        <select class="form-control" name="statusExtintor">
                            <option value="Regular" ${isEdit && vehicle.statusExtintor === 'Regular' ? 'selected' : ''}>Regular</option>
                            <option value="Próximo do vencimento" ${isEdit && vehicle.statusExtintor === 'Próximo do vencimento' ? 'selected' : ''}>Próximo do vencimento</option>
                            <option value="Vencido" ${isEdit && vehicle.statusExtintor === 'Vencido' ? 'selected' : ''}>Vencido</option>
                            <option value="Em manutenção" ${isEdit && vehicle.statusExtintor === 'Em manutenção' ? 'selected' : ''}>Em manutenção</option>
                        </select>
                    </div>

                    <!-- MULTIPLE ANEXOS EXTINTOR -->
                    <div class="form-group full-width" style="margin-top:8px; margin-bottom: 0;">
                        <h4 style="font-family:var(--font-heading); color:var(--text-muted); font-size:0.85rem; text-transform:uppercase;"><i class="fa-solid fa-paperclip"></i> Anexos do Extintor</h4>
                    </div>

                    <!-- Certificado -->
                    <div class="form-group">
                        <label>Certificado de Conformidade</label>
                        <div class="file-upload-area" id="veh-ext-cert-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 12px;">
                            <i class="fa-solid fa-file-lines"></i>
                            <span class="file-upload-text" id="veh-ext-cert-upload-text" style="font-size:0.75rem;">
                                ${isEdit && vehicle.extintorCertificadoAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.extintorCertificadoAnexo.split('/').pop()}</strong>` : 'Anexar Certificado'}
                            </span>
                            <input type="file" id="veh-ext-cert-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="extintorCertificadoAnexo" id="veh-ext-cert-anexo-url" value="${isEdit && vehicle.extintorCertificadoAnexo ? vehicle.extintorCertificadoAnexo : ''}">
                        <div id="veh-ext-cert-actions" style="display:${isEdit && vehicle.extintorCertificadoAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.extintorCertificadoAnexo ? vehicle.extintorCertificadoAnexo : '#'}" id="btn-ver-ext-cert" target="_blank" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Ver</a>
                            <button type="button" class="btn btn-danger" id="btn-rem-ext-cert" style="height:28px; padding:0 8px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">Remover</button>
                        </div>
                    </div>

                    <!-- Comprovante -->
                    <div class="form-group">
                        <label>Comprovante de Recarga</label>
                        <div class="file-upload-area" id="veh-ext-comp-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 12px;">
                            <i class="fa-solid fa-receipt"></i>
                            <span class="file-upload-text" id="veh-ext-comp-upload-text" style="font-size:0.75rem;">
                                ${isEdit && vehicle.extintorComprovanteAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.extintorComprovanteAnexo.split('/').pop()}</strong>` : 'Anexar Comprovante'}
                            </span>
                            <input type="file" id="veh-ext-comp-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="extintorComprovanteAnexo" id="veh-ext-comp-anexo-url" value="${isEdit && vehicle.extintorComprovanteAnexo ? vehicle.extintorComprovanteAnexo : ''}">
                        <div id="veh-ext-comp-actions" style="display:${isEdit && vehicle.extintorComprovanteAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.extintorComprovanteAnexo ? vehicle.extintorComprovanteAnexo : '#'}" id="btn-ver-ext-comp" target="_blank" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Ver</a>
                            <button type="button" class="btn btn-danger" id="btn-rem-ext-comp" style="height:28px; padding:0 8px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">Remover</button>
                        </div>
                    </div>

                    <!-- Laudo -->
                    <div class="form-group">
                        <label>Laudo Técnico</label>
                        <div class="file-upload-area" id="veh-ext-laudo-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 12px;">
                            <i class="fa-solid fa-file-shield"></i>
                            <span class="file-upload-text" id="veh-ext-laudo-upload-text" style="font-size:0.75rem;">
                                ${isEdit && vehicle.extintorLaudoAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.extintorLaudoAnexo.split('/').pop()}</strong>` : 'Anexar Laudo'}
                            </span>
                            <input type="file" id="veh-ext-laudo-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="extintorLaudoAnexo" id="veh-ext-laudo-anexo-url" value="${isEdit && vehicle.extintorLaudoAnexo ? vehicle.extintorLaudoAnexo : ''}">
                        <div id="veh-ext-laudo-actions" style="display:${isEdit && vehicle.extintorLaudoAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.extintorLaudoAnexo ? vehicle.extintorLaudoAnexo : '#'}" id="btn-ver-ext-laudo" target="_blank" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Ver</a>
                            <button type="button" class="btn btn-danger" id="btn-rem-ext-laudo" style="height:28px; padding:0 8px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">Remover</button>
                        </div>
                    </div>

                    <!-- Nota Fiscal -->
                    <div class="form-group">
                        <label>Nota Fiscal da Compra</label>
                        <div class="file-upload-area" id="veh-ext-nf-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 12px;">
                            <i class="fa-solid fa-file-invoice-dollar"></i>
                            <span class="file-upload-text" id="veh-ext-nf-upload-text" style="font-size:0.75rem;">
                                ${isEdit && vehicle.extintorNotaFiscalAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.extintorNotaFiscalAnexo.split('/').pop()}</strong>` : 'Anexar Nota Fiscal'}
                            </span>
                            <input type="file" id="veh-ext-nf-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="extintorNotaFiscalAnexo" id="veh-ext-nf-anexo-url" value="${isEdit && vehicle.extintorNotaFiscalAnexo ? vehicle.extintorNotaFiscalAnexo : ''}">
                        <div id="veh-ext-nf-actions" style="display:${isEdit && vehicle.extintorNotaFiscalAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.extintorNotaFiscalAnexo ? vehicle.extintorNotaFiscalAnexo : '#'}" id="btn-ver-ext-nf" target="_blank" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Ver</a>
                            <button type="button" class="btn btn-danger" id="btn-rem-ext-nf" style="height:28px; padding:0 8px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">Remover</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Observações do Extintor</label>
                        <textarea class="form-control" name="observacoesExtintor" placeholder="Histórico de recargas, empresa responsável ou observações técnicas...">${isEdit && vehicle.observacoesExtintor ? vehicle.observacoesExtintor : ''}</textarea>
                    </div>
                </div>

                <!-- SECTION: CONTROLE DE TACÓGRAFO -->
                <div class="form-group full-width" style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 12px;">
                    <label>Possui Tacógrafo? <span class="required">*</span></label>
                    <select class="form-control" name="possuiTacografo" id="veh-possui-tacografo" required>
                        <option value="Não" ${isEdit && vehicle.possuiTacografo === 'Sim' ? '' : 'selected'}>Não</option>
                        <option value="Sim" ${isEdit && vehicle.possuiTacografo === 'Sim' ? 'selected' : ''}>Sim</option>
                    </select>
                </div>

                <div id="tacografo-fields-container" class="grid-1-1" style="grid-column: span 2; display:${isEdit && vehicle.possuiTacografo === 'Sim' ? 'grid' : 'none'}; border-left: 3px solid var(--primary); padding-left: 16px; margin: 8px 0;">
                    <div style="grid-column: span 2; margin-bottom:-4px;">
                        <h4 style="font-family:var(--font-heading); color:var(--primary);"><i class="fa-solid fa-gauge"></i> Detalhamento do Controle de Tacógrafo</h4>
                    </div>
                    <div class="form-group">
                        <label>Marca do Tacógrafo</label>
                        <input type="text" class="form-control" name="marcaTacografo" value="${isEdit && vehicle.marcaTacografo ? vehicle.marcaTacografo : ''}" placeholder="Ex: VDO, Siemens">
                    </div>
                    <div class="form-group">
                        <label>Modelo do Tacógrafo</label>
                        <input type="text" class="form-control" name="modeloTacografo" value="${isEdit && vehicle.modeloTacografo ? vehicle.modeloTacografo : ''}" placeholder="Ex: 1318, DTCO 1381">
                    </div>
                    <div class="form-group">
                        <label>Número de Série</label>
                        <input type="text" class="form-control" name="numSerieTacografo" value="${isEdit && vehicle.numSerieTacografo ? vehicle.numSerieTacografo : ''}" placeholder="Ex: TAC-12345">
                    </div>
                    <div class="form-group">
                        <label>Data da Instalação</label>
                        <input type="date" class="form-control" name="dataInstalacaoTacografo" value="${isEdit && vehicle.dataInstalacaoTacografo ? vehicle.dataInstalacaoTacografo : ''}">
                    </div>
                    <div class="form-group">
                        <label>Data da Última Aferição</label>
                        <input type="date" class="form-control" name="dataUltimaAfericaoTacografo" value="${isEdit && vehicle.dataUltimaAfericaoTacografo ? vehicle.dataUltimaAfericaoTacografo : ''}">
                    </div>
                    <div class="form-group">
                        <label>Data de Validade/Aferição</label>
                        <input type="date" class="form-control" name="validadeAfericaoTacografo" value="${isEdit && vehicle.validadeAfericaoTacografo ? vehicle.validadeAfericaoTacografo : ''}">
                    </div>
                    <div class="form-group full-width">
                        <label>Empresa Responsável pela Aferição</label>
                        <input type="text" class="form-control" name="empresaAfericaoTacografo" value="${isEdit && vehicle.empresaAfericaoTacografo ? vehicle.empresaAfericaoTacografo : ''}" placeholder="Ex: Inmetro Autorizada">
                    </div>

                    <!-- MULTIPLE ANEXOS TACÓGRAFO -->
                    <div class="form-group full-width" style="margin-top:8px; margin-bottom: 0;">
                        <h4 style="font-family:var(--font-heading); color:var(--text-muted); font-size:0.85rem; text-transform:uppercase;"><i class="fa-solid fa-paperclip"></i> Anexos do Tacógrafo</h4>
                    </div>

                    <!-- Comprovantes -->
                    <div class="form-group full-width">
                        <label>Comprovante do Tacógrafo (Imagem ou PDF)</label>
                        <div class="file-upload-area" id="veh-tac-comp-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 16px;">
                            <i class="fa-solid fa-receipt"></i>
                            <span class="file-upload-text" id="veh-tac-comp-upload-text" style="font-size:0.8rem;">
                                ${isEdit && vehicle.anexoComprovanteTacografo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${vehicle.anexoComprovanteTacografo.split('/').pop()}</strong>` : 'Arraste ou clique para anexar o Comprovante'}
                            </span>
                            <input type="file" id="veh-tac-comp-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="anexoComprovanteTacografo" id="veh-tac-comp-anexo-url" value="${isEdit && vehicle.anexoComprovanteTacografo ? vehicle.anexoComprovanteTacografo : ''}">
                        <div id="veh-tac-comp-actions" style="display:${isEdit && vehicle.anexoComprovanteTacografo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && vehicle.anexoComprovanteTacografo ? vehicle.anexoComprovanteTacografo : '#'}" id="btn-ver-tac-comp" target="_blank" class="btn btn-secondary" style="height:32px; padding:0 12px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-eye"></i> Visualizar
                            </a>
                            <button type="button" class="btn btn-danger" id="btn-rem-tac-comp" style="height:32px; padding:0 12px; font-size:0.75rem; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Observações do Tacógrafo</label>
                        <textarea class="form-control" name="observacoesTacografo" placeholder="Detalhes adicionais, histórico de aferições, observações sobre funcionamento...">${isEdit && vehicle.observacoesTacografo ? vehicle.observacoesTacografo : ''}</textarea>
                    </div>
                </div>

                <div class="form-group full-width">
                    <label>Observações</label>
                    <textarea class="form-control" name="observacoes" placeholder="Anotações gerais sobre o veículo">${isEdit && vehicle.observacoes ? vehicle.observacoes : ''}</textarea>
                </div>
            </form>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
            <button class="btn btn-primary" id="btn-salvar-modal">Salvar Registro</button>
        `;

        modal.classList.add('active');

        // Dynamic visibility logic for unit type
        const tipoUnidadeSel = document.getElementById('veh-tipo-unidade');
        const motorizedContainer = document.getElementById('motorized-fields-container');
        const trailerContainer = document.getElementById('trailer-fields-container');

        const vehTipo = document.getElementById('veh-tipo');
        const vehCombustivel = document.getElementById('veh-combustivel');
        const vehKmAtual = document.getElementById('veh-kmatual');

        const vehTipoImplemento = document.getElementById('veh-tipo-implemento');
        const vehTipoImplementoGroup = document.getElementById('veh-tipo-implemento-group');
        const vehQtdPneus = document.getElementById('veh-qtdpneus');
        const vehCapacidade = document.getElementById('veh-capacidade');
        const configRodagemGroup = document.getElementById('veh-config-rodagem-group');
        const configRodagemSel = document.getElementById('veh-config-rodagem');
        const eixosConfigWrapper = document.getElementById('veh-eixos-config-wrapper');

        const qtdEixosInput = document.getElementById('veh-qtd-eixos');
        const qtdEixosGroup = document.getElementById('veh-qtd-eixos-group');
        const eixosConfigList = document.getElementById('veh-eixos-config-list');
        const configEixosJsonInput = document.getElementById('veh-config-eixos-json');

        let configEixos = [];
        if (isEdit && vehicle.configEixos) {
            configEixos = typeof vehicle.configEixos === 'string' ? JSON.parse(vehicle.configEixos) : vehicle.configEixos;
        }

        const calculateTotals = () => {
            const tipo = vehTipo.value;
            if (tipo === 'Moto') {
                vehQtdPneus.value = 2;
                if (configEixosJsonInput) configEixosJsonInput.value = '[]';
                return;
            } else if (tipo === 'Passeio') {
                vehQtdPneus.value = 4;
                if (configEixosJsonInput) configEixosJsonInput.value = '[]';
                return;
            }

            let totalPneus = 0;
            const axleSelects = document.querySelectorAll('.axle-type-select');
            const axlesData = [];
            
            axleSelects.forEach(sel => {
                const eixo = parseInt(sel.getAttribute('data-eixo'));
                const tipo = sel.value;
                totalPneus += (tipo === 'Simples' ? 2 : 4);
                axlesData.push({ eixo, tipo });
            });

            if (vehQtdPneus) {
                vehQtdPneus.value = totalPneus;
            }
            if (configEixosJsonInput) {
                configEixosJsonInput.value = JSON.stringify(axlesData);
            }
        };

        const renderEixosList = (axles, isPreset) => {
            eixosConfigList.innerHTML = axles.map(ax => {
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 6px;">
                        <span style="font-weight: 600; font-size: 0.85rem;"><i class="fa-solid fa-truck-pickup text-muted"></i> Eixo ${ax.eixo}</span>
                        <select class="form-control axle-type-select" id="veh-axle-type-${ax.eixo}" data-eixo="${ax.eixo}" style="width: 140px; height: 32px; padding: 0 8px; font-size: 0.8rem;" ${isPreset ? 'disabled' : ''}>
                            <option value="Simples" ${ax.tipo === 'Simples' ? 'selected' : ''}>Simples (2 rodas)</option>
                            <option value="Dupla" ${ax.tipo === 'Dupla' ? 'selected' : ''}>Dupla (4 rodas)</option>
                        </select>
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.axle-type-select').forEach(sel => {
                sel.addEventListener('change', calculateTotals);
            });

            calculateTotals();
        };

        const updateEixosUI = () => {
            const tipo = vehTipo.value;
            const rodagem = configRodagemSel.value;
            let axles = [];

            if (tipo === 'Moto') {
                qtdEixosInput.value = 2;
                vehQtdPneus.value = 2;
                configEixosJsonInput.value = '[]';
                return;
            } else if (tipo === 'Passeio') {
                qtdEixosInput.value = 2;
                vehQtdPneus.value = 4;
                configEixosJsonInput.value = '[]';
                return;
            }

            const isTrailer = (tipo === 'Implemento' || tipo === 'Reboque');

            if (isTrailer) {
                const count = parseInt(qtdEixosInput.value) || 2;
                for (let i = 1; i <= count; i++) {
                    const selectEl = document.getElementById(`veh-axle-type-${i}`);
                    const existingTipo = selectEl ? selectEl.value : (configEixos[i-1] ? configEixos[i-1].tipo : 'Dupla');
                    axles.push({ eixo: i, tipo: existingTipo });
                }
                renderEixosList(axles, false);
            } else {
                if (tipo === 'Utilitário') {
                    if (rodagem === 'Personalizado') {
                        qtdEixosGroup.style.display = 'block';
                        const count = parseInt(qtdEixosInput.value) || 2;
                        for (let i = 1; i <= count; i++) {
                            const selectEl = document.getElementById(`veh-axle-type-${i}`);
                            const existingTipo = selectEl ? selectEl.value : (configEixos[i-1] ? configEixos[i-1].tipo : 'Simples');
                            axles.push({ eixo: i, tipo: existingTipo });
                        }
                        renderEixosList(axles, false);
                    } else {
                        qtdEixosGroup.style.display = 'none';
                        qtdEixosInput.value = 2;
                        axles = [
                            { eixo: 1, tipo: 'Simples' },
                            { eixo: 2, tipo: 'Simples' }
                        ];
                        renderEixosList(axles, true);
                    }
                } else {
                    if (rodagem === '4x2') {
                        qtdEixosGroup.style.display = 'none';
                        qtdEixosInput.value = 2;
                        axles = [
                            { eixo: 1, tipo: 'Simples' },
                            { eixo: 2, tipo: 'Dupla' }
                        ];
                        renderEixosList(axles, true);
                    } else if (rodagem === '6x2' || rodagem === '6x4') {
                        qtdEixosGroup.style.display = 'none';
                        qtdEixosInput.value = 3;
                        axles = [
                            { eixo: 1, tipo: 'Simples' },
                            { eixo: 2, tipo: 'Dupla' },
                            { eixo: 3, tipo: 'Dupla' }
                        ];
                        renderEixosList(axles, true);
                    } else if (rodagem === '8x2') {
                        qtdEixosGroup.style.display = 'none';
                        qtdEixosInput.value = 4;
                        axles = [
                            { eixo: 1, tipo: 'Simples' },
                            { eixo: 2, tipo: 'Simples' },
                            { eixo: 3, tipo: 'Dupla' },
                            { eixo: 4, tipo: 'Dupla' }
                        ];
                        renderEixosList(axles, true);
                    } else {
                        qtdEixosGroup.style.display = 'block';
                        const count = parseInt(qtdEixosInput.value) || 2;
                        for (let i = 1; i <= count; i++) {
                            const selectEl = document.getElementById(`veh-axle-type-${i}`);
                            const existingTipo = selectEl ? selectEl.value : (configEixos[i-1] ? configEixos[i-1].tipo : (i === 1 ? 'Simples' : 'Dupla'));
                            axles.push({ eixo: i, tipo: existingTipo });
                        }
                        renderEixosList(axles, false);
                    }
                }
            }
        };

        const applyImplementoSuggestion = () => {
            const impType = vehTipoImplemento.value;
            if (!impType) {
                qtdEixosInput.value = '';
                vehQtdPneus.value = '';
                if (configEixosJsonInput) configEixosJsonInput.value = '[]';
                eixosConfigList.innerHTML = '';
                qtdEixosGroup.style.display = 'none';
                eixosConfigWrapper.style.display = 'none';
                return;
            }

            qtdEixosGroup.style.display = 'block';
            eixosConfigWrapper.style.display = 'block';

            let suggestedEixos = 2;
            let suggestedType = 'Dupla';

            if (impType === 'Carrocinha') {
                suggestedEixos = 1;
                suggestedType = 'Simples';
            } else if (impType === 'Reboque' || impType === 'Trailer') {
                suggestedEixos = 2;
                suggestedType = 'Simples';
            } else if (impType === 'Carreta' || impType === 'Semirreboque') {
                suggestedEixos = 3;
                suggestedType = 'Dupla';
            } else if (impType === 'Outro') {
                suggestedEixos = 2;
                suggestedType = 'Dupla';
            }

            qtdEixosInput.value = suggestedEixos;

            const axles = [];
            for (let i = 1; i <= suggestedEixos; i++) {
                axles.push({ eixo: i, tipo: suggestedType });
            }

            configEixos = axles;
            renderEixosList(axles, false);
        };

        const handleTipoToggle = (isFirstLoad = false) => {
            const tipo = vehTipo.value;
            
            if (!tipo) {
                tipoUnidadeSel.value = '';
                motorizedContainer.style.display = 'none';
                trailerContainer.style.display = 'none';
                if (vehTipoImplementoGroup) vehTipoImplementoGroup.style.display = 'none';

                vehCombustivel.removeAttribute('required');
                vehKmAtual.removeAttribute('required');
                vehTipoImplemento.removeAttribute('required');
                vehQtdPneus.removeAttribute('required');
                vehCapacidade.removeAttribute('required');

                if (vehQtdPneus) vehQtdPneus.value = '';

                configRodagemGroup.style.display = 'none';
                qtdEixosGroup.style.display = 'none';
                eixosConfigWrapper.style.display = 'none';
                return;
            }

            const isTrailer = (tipo === 'Implemento' || tipo === 'Reboque');

            tipoUnidadeSel.value = isTrailer ? 'Implemento/Reboque' : 'Veículo Motorizado';

            if (isTrailer) {
                motorizedContainer.style.display = 'none';
                trailerContainer.style.display = 'contents';

                vehCombustivel.removeAttribute('required');
                vehKmAtual.removeAttribute('required');

                vehTipoImplemento.setAttribute('required', '');
                vehQtdPneus.setAttribute('required', '');
                vehCapacidade.setAttribute('required', '');

                if (vehTipoImplementoGroup) vehTipoImplementoGroup.style.display = 'block';
            } else {
                motorizedContainer.style.display = 'contents';
                trailerContainer.style.display = 'none';

                vehCombustivel.setAttribute('required', '');
                vehKmAtual.setAttribute('required', '');

                vehTipoImplemento.removeAttribute('required');
                vehQtdPneus.removeAttribute('required');
                vehCapacidade.removeAttribute('required');

                if (vehTipoImplementoGroup) vehTipoImplementoGroup.style.display = 'none';
            }

            if (tipo === 'Moto') {
                configRodagemGroup.style.display = 'none';
                qtdEixosGroup.style.display = 'none';
                eixosConfigWrapper.style.display = 'none';

                qtdEixosInput.value = 2;
                vehQtdPneus.value = 2;
                configEixosJsonInput.value = '[]';
            } else if (tipo === 'Passeio') {
                configRodagemGroup.style.display = 'none';
                qtdEixosGroup.style.display = 'none';
                eixosConfigWrapper.style.display = 'none';

                qtdEixosInput.value = 2;
                vehQtdPneus.value = 4;
                configEixosJsonInput.value = '[]';
            } else if (tipo === 'Utilitário') {
                configRodagemGroup.style.display = 'block';
                qtdEixosGroup.style.display = configRodagemSel.value === 'Personalizado' ? 'block' : 'none';
                eixosConfigWrapper.style.display = 'block';
                
                if (!isEdit && !isFirstLoad) {
                    configRodagemSel.value = 'Personalizado';
                }
                updateEixosUI();
            } else if (tipo === 'Caminhão' || tipo === 'Cavalo Mecânico') {
                configRodagemGroup.style.display = 'block';
                qtdEixosGroup.style.display = configRodagemSel.value === 'Personalizado' ? 'block' : 'none';
                eixosConfigWrapper.style.display = 'block';
                
                if (!isEdit && !isFirstLoad) {
                    configRodagemSel.value = '4x2';
                }
                updateEixosUI();
            } else if (tipo === 'Implemento' || tipo === 'Reboque') {
                configRodagemGroup.style.display = 'none';
                
                const impType = vehTipoImplemento.value;
                if (!impType) {
                    qtdEixosGroup.style.display = 'none';
                    eixosConfigWrapper.style.display = 'none';
                    qtdEixosInput.value = '';
                    vehQtdPneus.value = '';
                } else {
                    qtdEixosGroup.style.display = 'block';
                    eixosConfigWrapper.style.display = 'block';
                }

                if (!isFirstLoad) {
                    applyImplementoSuggestion();
                } else {
                    updateEixosUI();
                }
            } else if (tipo === 'Personalizado') {
                configRodagemGroup.style.display = 'block';
                qtdEixosGroup.style.display = 'block';
                eixosConfigWrapper.style.display = 'block';
                
                if (!isEdit && !isFirstLoad) {
                    configRodagemSel.value = 'Personalizado';
                }
                updateEixosUI();
            }
        };

        if (vehTipo) {
            vehTipo.addEventListener('change', () => handleTipoToggle(false));
        }
        if (vehTipoImplemento) {
            vehTipoImplemento.addEventListener('change', applyImplementoSuggestion);
        }
        if (configRodagemSel) {
            configRodagemSel.addEventListener('change', () => {
                qtdEixosGroup.style.display = configRodagemSel.value === 'Personalizado' ? 'block' : 'none';
                updateEixosUI();
            });
        }
        if (qtdEixosInput) {
            qtdEixosInput.addEventListener('input', updateEixosUI);
        }

        handleTipoToggle(true);

        // Dynamic visibility logic for insurance
        const possuiSeguroSel = document.getElementById('veh-possui-seguro');
        const insuranceContainer = document.getElementById('insurance-fields-container');

        if (possuiSeguroSel && insuranceContainer) {
            possuiSeguroSel.addEventListener('change', () => {
                if (possuiSeguroSel.value === 'Sim') {
                    insuranceContainer.style.display = 'grid';
                } else {
                    insuranceContainer.style.display = 'none';
                    // clear fields
                    document.querySelectorAll('#insurance-fields-container input').forEach(input => input.value = '');
                    document.querySelectorAll('#insurance-fields-container textarea').forEach(txt => txt.value = '');
                    document.getElementById('veh-seg-anexo-url').value = '';
                    document.getElementById('veh-seg-upload-text').innerText = 'Arraste ou clique para anexar o Contrato de Seguro';
                    document.getElementById('veh-seg-actions').style.display = 'none';
                }
            });
        }

        // CRLV File Upload logic
        const crlvTrigger = document.getElementById('veh-crlv-upload-trigger');
        const crlvFileInput = document.getElementById('veh-crlv-file-input');
        const crlvUploadText = document.getElementById('veh-crlv-upload-text');
        const crlvAnexoUrl = document.getElementById('veh-crlv-anexo-url');
        const crlvActions = document.getElementById('veh-crlv-actions');
        const btnVerCrlv = document.getElementById('btn-visualizar-crlv');
        const btnRemCrlv = document.getElementById('btn-remover-crlv');

        if (crlvTrigger && crlvFileInput) {
            crlvTrigger.addEventListener('click', () => crlvFileInput.click());
            crlvFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('file', file);

                try {
                    crlvUploadText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
                    crlvTrigger.style.pointerEvents = 'none';

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Erro no upload.');
                    }

                    const result = await res.json();
                    crlvAnexoUrl.value = result.url;
                    crlvUploadText.innerHTML = `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${result.name}</strong>`;
                    
                    btnVerCrlv.href = result.url;
                    crlvActions.style.display = 'flex';

                    window.movixApp.showToast('Documento CRLV anexado!', 'success');
                } catch (err) {
                    console.error(err);
                    window.movixApp.showToast(err.message || 'Erro ao enviar CRLV.', 'danger');
                    crlvUploadText.innerText = 'Arraste ou clique para anexar o CRLV';
                } finally {
                    crlvTrigger.style.pointerEvents = 'auto';
                }
            });
        }

        if (btnRemCrlv) {
            btnRemCrlv.addEventListener('click', () => {
                crlvAnexoUrl.value = '';
                crlvUploadText.innerText = 'Arraste ou clique para anexar o CRLV';
                crlvActions.style.display = 'none';
                crlvFileInput.value = '';
                window.movixApp.showToast('CRLV removido.', 'info');
            });
        }

        // Insurance File Upload logic
        const segTrigger = document.getElementById('veh-seg-upload-trigger');
        const segFileInput = document.getElementById('veh-seg-file-input');
        const segUploadText = document.getElementById('veh-seg-upload-text');
        const segAnexoUrl = document.getElementById('veh-seg-anexo-url');
        const segActions = document.getElementById('veh-seg-actions');
        const btnVerSeg = document.getElementById('btn-visualizar-seg');
        const btnRemSeg = document.getElementById('btn-remover-seg');

        if (segTrigger && segFileInput) {
            segTrigger.addEventListener('click', () => segFileInput.click());
            segFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('file', file);

                try {
                    segUploadText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
                    segTrigger.style.pointerEvents = 'none';

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Erro no upload.');
                    }

                    const result = await res.json();
                    segAnexoUrl.value = result.url;
                    segUploadText.innerHTML = `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${result.name}</strong>`;
                    
                    btnVerSeg.href = result.url;
                    segActions.style.display = 'flex';

                    window.movixApp.showToast('Contrato de Seguro anexado!', 'success');
                } catch (err) {
                    console.error(err);
                    window.movixApp.showToast(err.message || 'Erro ao enviar Contrato.', 'danger');
                    segUploadText.innerText = 'Arraste ou clique para anexar o Contrato de Seguro';
                } finally {
                    segTrigger.style.pointerEvents = 'auto';
                }
            });
        }

        if (btnRemSeg) {
            btnRemSeg.addEventListener('click', () => {
                segAnexoUrl.value = '';
                segUploadText.innerText = 'Arraste ou clique para anexar o Contrato de Seguro';
                segActions.style.display = 'none';
                segFileInput.value = '';
                window.movixApp.showToast('Contrato de seguro removido.', 'info');
            });
        }

        // Dynamic visibility logic for Tracker
        const possuiRastreadorSel = document.getElementById('veh-possui-rastreador');
        const trackerContainer = document.getElementById('tracker-fields-container');
        if (possuiRastreadorSel && trackerContainer) {
            possuiRastreadorSel.addEventListener('change', () => {
                if (possuiRastreadorSel.value === 'Sim') {
                    trackerContainer.style.display = 'grid';
                } else {
                    trackerContainer.style.display = 'none';
                    document.querySelectorAll('#tracker-fields-container input').forEach(input => input.value = '');
                    document.querySelectorAll('#tracker-fields-container textarea').forEach(txt => txt.value = '');
                    document.getElementById('veh-ras-contrato-upload-text').innerText = 'Anexar Contrato';
                    document.getElementById('veh-ras-nf-upload-text').innerText = 'Anexar Nota Fiscal';
                    document.getElementById('veh-ras-os-upload-text').innerText = 'Anexar O.S.';
                    document.getElementById('veh-ras-comp-upload-text').innerText = 'Anexar Comprovantes';
                    document.getElementById('veh-ras-contrato-actions').style.display = 'none';
                    document.getElementById('veh-ras-nf-actions').style.display = 'none';
                    document.getElementById('veh-ras-os-actions').style.display = 'none';
                    document.getElementById('veh-ras-comp-actions').style.display = 'none';
                }
            });
        }

        // Generic upload helper for Tracker and Extinguisher files to keep code DRY and elegant
        const setupFieldUpload = (triggerId, inputId, textId, urlId, actionsId, verBtnId, remBtnId, successMsg) => {
            const trigger = document.getElementById(triggerId);
            const input = document.getElementById(inputId);
            const text = document.getElementById(textId);
            const urlInput = document.getElementById(urlId);
            const actions = document.getElementById(actionsId);
            const verBtn = document.getElementById(verBtnId);
            const remBtn = document.getElementById(remBtnId);

            if (trigger && input) {
                trigger.addEventListener('click', () => input.click());
                input.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        text.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
                        trigger.style.pointerEvents = 'none';

                        const res = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                        });

                        if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Erro no upload.');
                        }

                        const result = await res.json();
                        urlInput.value = result.url;
                        text.innerHTML = `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${result.name}</strong>`;
                        
                        verBtn.href = result.url;
                        actions.style.display = 'flex';

                        window.movixApp.showToast(successMsg, 'success');
                    } catch (err) {
                        console.error(err);
                        window.movixApp.showToast(err.message || 'Erro ao carregar anexo.', 'danger');
                        text.innerText = 'Tentar novamente';
                    } finally {
                        trigger.style.pointerEvents = 'auto';
                    }
                });
            }

            if (remBtn) {
                remBtn.addEventListener('click', () => {
                    urlInput.value = '';
                    text.innerText = 'Arraste ou clique para anexar';
                    actions.style.display = 'none';
                    input.value = '';
                    window.movixApp.showToast('Anexo removido.', 'info');
                });
            }
        };

        // Binds Tracker file uploads
        setupFieldUpload('veh-ras-contrato-upload-trigger', 'veh-ras-contrato-file-input', 'veh-ras-contrato-upload-text', 'veh-ras-contrato-anexo-url', 'veh-ras-contrato-actions', 'btn-ver-ras-contrato', 'btn-rem-ras-contrato', 'Contrato de rastreador anexado!');
        setupFieldUpload('veh-ras-nf-upload-trigger', 'veh-ras-nf-file-input', 'veh-ras-nf-upload-text', 'veh-ras-nf-anexo-url', 'veh-ras-nf-actions', 'btn-ver-ras-nf', 'btn-rem-ras-nf', 'Nota fiscal do rastreador anexada!');
        setupFieldUpload('veh-ras-os-upload-trigger', 'veh-ras-os-file-input', 'veh-ras-os-upload-text', 'veh-ras-os-anexo-url', 'veh-ras-os-actions', 'btn-ver-ras-os', 'btn-rem-ras-os', 'Ordem de serviço do rastreador anexada!');
        setupFieldUpload('veh-ras-comp-upload-trigger', 'veh-ras-comp-file-input', 'veh-ras-comp-upload-text', 'veh-ras-comp-anexo-url', 'veh-ras-comp-actions', 'btn-ver-ras-comp', 'btn-rem-ras-comp', 'Comprovante do rastreador anexado!');

        // Dynamic visibility logic for Extinguisher
        const possuiExtintorSel = document.getElementById('veh-possui-extintor');
        const extinguisherContainer = document.getElementById('extinguisher-fields-container');
        if (possuiExtintorSel && extinguisherContainer) {
            possuiExtintorSel.addEventListener('change', () => {
                if (possuiExtintorSel.value === 'Sim') {
                    extinguisherContainer.style.display = 'grid';
                } else {
                    extinguisherContainer.style.display = 'none';
                    document.querySelectorAll('#extinguisher-fields-container input').forEach(input => input.value = '');
                    document.querySelectorAll('#extinguisher-fields-container select').forEach(sel => sel.value = 'ABC');
                    document.querySelectorAll('#extinguisher-fields-container textarea').forEach(txt => txt.value = '');
                    document.getElementById('veh-ext-cert-upload-text').innerText = 'Anexar Certificado';
                    document.getElementById('veh-ext-comp-upload-text').innerText = 'Anexar Comprovante';
                    document.getElementById('veh-ext-laudo-upload-text').innerText = 'Anexar Laudo';
                    document.getElementById('veh-ext-nf-upload-text').innerText = 'Anexar Nota Fiscal';
                    document.getElementById('veh-ext-cert-actions').style.display = 'none';
                    document.getElementById('veh-ext-comp-actions').style.display = 'none';
                    document.getElementById('veh-ext-laudo-actions').style.display = 'none';
                    document.getElementById('veh-ext-nf-actions').style.display = 'none';
                }
            });
        }

        // Binds Extinguisher file uploads
        setupFieldUpload('veh-ext-cert-upload-trigger', 'veh-ext-cert-file-input', 'veh-ext-cert-upload-text', 'veh-ext-cert-anexo-url', 'veh-ext-cert-actions', 'btn-ver-ext-cert', 'btn-rem-ext-cert', 'Certificado do extintor anexado!');
        setupFieldUpload('veh-ext-comp-upload-trigger', 'veh-ext-comp-file-input', 'veh-ext-comp-upload-text', 'veh-ext-comp-anexo-url', 'veh-ext-comp-actions', 'btn-ver-ext-comp', 'btn-rem-ext-comp', 'Comprovante do extintor anexado!');
        setupFieldUpload('veh-ext-laudo-upload-trigger', 'veh-ext-laudo-file-input', 'veh-ext-laudo-upload-text', 'veh-ext-laudo-anexo-url', 'veh-ext-laudo-actions', 'btn-ver-ext-laudo', 'btn-rem-ext-laudo', 'Laudo do extintor anexado!');
        setupFieldUpload('veh-ext-nf-upload-trigger', 'veh-ext-nf-file-input', 'veh-ext-nf-upload-text', 'veh-ext-nf-anexo-url', 'veh-ext-nf-actions', 'btn-ver-ext-nf', 'btn-rem-ext-nf', 'Nota fiscal do extintor anexada!');

        // Dynamic visibility logic for Tacógrafo
        const possuiTacografoSel = document.getElementById('veh-possui-tacografo');
        const tacografoContainer = document.getElementById('tacografo-fields-container');
        if (possuiTacografoSel && tacografoContainer) {
            possuiTacografoSel.addEventListener('change', () => {
                if (possuiTacografoSel.value === 'Sim') {
                    tacografoContainer.style.display = 'grid';
                } else {
                    tacografoContainer.style.display = 'none';
                    document.querySelectorAll('#tacografo-fields-container input').forEach(input => input.value = '');
                    document.querySelectorAll('#tacografo-fields-container textarea').forEach(txt => txt.value = '');
                    document.getElementById('veh-tac-comp-anexo-url').value = '';
                    document.getElementById('veh-tac-comp-upload-text').innerText = 'Arraste ou clique para anexar o Comprovante';
                    document.getElementById('veh-tac-comp-actions').style.display = 'none';
                }
            });
        }

        // Binds Tacógrafo file uploads
        setupFieldUpload('veh-tac-comp-upload-trigger', 'veh-tac-comp-file-input', 'veh-tac-comp-upload-text', 'veh-tac-comp-anexo-url', 'veh-tac-comp-actions', 'btn-ver-tac-comp', 'btn-rem-tac-comp', 'Comprovante do tacógrafo anexado!');

        // Modal Action logic
        const saveBtn = document.getElementById('btn-salvar-modal');
        const cancelBtn = document.getElementById('btn-cancelar-modal');
 
        const closeModal = () => modal.classList.remove('active');
 
        cancelBtn.addEventListener('click', closeModal);

        saveBtn.addEventListener('click', async () => {
            const form = document.getElementById('form-veiculo');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
 
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => data[key] = value);

            const enteredKM = parseFloat(data.kmAtual) || 0;
            const originalKM = isEdit ? parseFloat(vehicle.kmAtual) || 0 : 0;

            const saveAction = async (justificativa) => {
                const saveBtn = document.getElementById('btn-salvar-modal');
                const loader = window.movixApp.startLoading(saveBtn, isEdit ? "Atualizando..." : "Salvando...");
                if (justificativa) {
                    data.observacoes = (data.observacoes || '') + (data.observacoes ? '\n' : '') + `Motivo da divergência de KM: ${justificativa}`;
                }
                try {
                    if (isEdit) {
                        data.historicoKM = vehicle.historicoKM;
                        await window.movixStore.updateVeiculo(id, data);
                        window.movixApp.showToast('Veículo atualizado com sucesso!', 'success');
                    } else {
                        await window.movixStore.addVeiculo(data);
                        window.movixApp.showToast('Veículo cadastrado com sucesso!', 'success');
                    }
                    closeModal();
                    renderListagemVeiculos(document.getElementById('view-content-wrapper'));
                } catch (err) {
                    window.movixApp.showToast(err.message || 'Erro ao salvar veículo.', 'danger');
                } finally {
                    loader.stop();
                }
            };

            if (isEdit && enteredKM !== originalKM) {
                window.movixApp.validateKM(id, enteredKM, saveAction, true, originalKM);
            } else {
                saveAction();
            }
        });
    }

    function confirmDeleteVeiculo(id) {
        const vehicle = window.movixStore.getVeiculo(id);
        if (!vehicle) return;

        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');

        modalTitle.innerText = 'Excluir Veículo';
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 16px;">
                <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                <p style="font-size: 1.05rem; font-weight: 600;">Tem certeza que deseja remover o veículo <strong>${vehicle.placa}</strong> (${vehicle.marca} ${vehicle.modelo})?</p>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Esta ação é permanente e removerá o veículo das listagens gerenciais.</p>
            </div>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="btn-cancelar-del">Cancelar</button>
            <button class="btn btn-danger" id="btn-confirmar-del">Sim, Excluir</button>
        `;

        modal.classList.add('active');

        document.getElementById('btn-cancelar-del').addEventListener('click', () => modal.classList.remove('active'));
        document.getElementById('btn-confirmar-del').addEventListener('click', async () => {
            const delBtn = document.getElementById('btn-confirmar-del');
            const loader = window.movixApp.startLoading(delBtn, "Excluindo...");
            try {
                await window.movixStore.deleteVeiculo(id);
                window.movixApp.showToast('Veículo removido com sucesso!', 'danger');
                modal.classList.remove('active');
                renderListagemVeiculos(document.getElementById('view-content-wrapper'));
            } catch (err) {
                window.movixApp.showToast(err.message || 'Erro ao excluir veículo.', 'danger');
            } finally {
                loader.stop();
            }
        });
    }

    // --- FICHA DE VIDA ÚTIL VIEW ---
    function renderFichaVidaUtil(container, veiculoId) {
        const vehicle = window.movixStore.getVeiculo(veiculoId);
        const activeTrips = window.movixStore.getViagens().filter(t => t.status && t.status.toLowerCase() === 'em andamento');
        const isCurrentlyTraveling = activeTrips.some(t => t.veiculoId === veiculoId);
        if (!vehicle) {
            container.innerHTML = `
                <div class="search-no-results" style="padding: 64px;">
                    <i class="fa-solid fa-circle-question text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-weight:600;">Veículo não encontrado!</p>
                    <button class="btn btn-primary" style="margin-top:16px;" onclick="window.movixRouter.navigateTo('veiculos')">Voltar para Listagem</button>
                </div>
            `;
            return;
        }

        // Gather specific history logs
        const fuel = window.movixStore.getAbastecimentos().filter(a => a.veiculoId === veiculoId);
        const maintenance = window.movixStore.getMaintenances().filter(m => m.veiculoId === veiculoId);
        const oil = window.movixStore.getOleos().filter(o => o.veiculoId === veiculoId);
        const trips = window.movixStore.getViagens().filter(v => v.veiculoId === veiculoId);

        // Compile combined timeline events
        let events = [];
        fuel.forEach(f => {
            events.push({
                date: f.data,
                type: 'abastecimento',
                title: 'Abastecimento Registrado',
                desc: `Registrado R$ ${f.valorTotal.toFixed(2)} (${f.litros}L a R$ ${f.valorLitro.toFixed(2)}/L). Média: ${f.kmL} KM/L. Posto: ${f.posto}.`,
                icon: '<i class="fa-solid fa-gas-pump" style="color:var(--success)"></i>'
            });
        });
        maintenance.forEach(m => {
            events.push({
                date: m.data,
                type: 'manutencao',
                title: `Manutenção ${m.tipo} - ${m.categoria}`,
                desc: `Oficina: ${m.oficina}. Valor: R$ ${m.valor.toFixed(2)}. Status: ${m.status}. Detalhes: ${m.descricao}.`,
                icon: '<i class="fa-solid fa-screwdriver-wrench" style="color:var(--danger)"></i>'
            });
        });
        oil.forEach(o => {
            events.push({
                date: o.dataTroca,
                type: 'oleo',
                title: 'Troca de Óleo Efetuada',
                desc: `Óleo: ${o.tipoOleo}. Troca efetuada com ${o.kmTroca} KM. Próxima troca em ${o.proximaTrocaKM} KM.`,
                icon: '<i class="fa-solid fa-oil-can" style="color:var(--warning)"></i>'
            });
        });
        trips.forEach(t => {
            events.push({
                date: t.dataSaida,
                type: 'viagem',
                title: `Saída de Viagem: ${t.origem} → ${t.destino}`,
                desc: `Conduzido por ${window.movixStore.getMotorista(t.motoristaId)?.nome || 'Motorista'}. KM Inicial: ${t.kmInicial}. Status: ${t.status}.`,
                icon: '<i class="fa-solid fa-route" style="color:var(--info)"></i>'
            });
            if (t.dataRetorno) {
                events.push({
                    date: t.dataRetorno,
                    type: 'viagem',
                    title: `Retorno de Viagem: ${t.destino} → ${t.origem}`,
                    desc: `KM Final: ${t.kmFinal}. Total rodado: ${t.kmRodado} KM. Custos de viagem: R$ ${t.custos.toFixed(2)}.`,
                    icon: '<i class="fa-solid fa-route" style="color:var(--info)"></i>'
                });
            }
        });

        // Sort events newest first
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Compile Visual HTML components
        let timelineHTML = '';
        if (events.length === 0) {
            timelineHTML = `<div class="search-no-results">Nenhum evento registrado na vida útil deste veículo.</div>`;
        } else {
            timelineHTML += `<div class="history-timeline">`;
            events.forEach(ev => {
                const itemClass = ev.type;
                timelineHTML += `
                    <div class="timeline-item ${itemClass}">
                        <div class="timeline-dot">${ev.icon}</div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <span class="timeline-title" style="font-weight: 700;">${ev.title}</span>
                                <span>${ev.date.split('-').reverse().join('/')}</span>
                            </div>
                            <span class="timeline-desc" style="margin-top: 4px; color: var(--text-muted);">${ev.desc}</span>
                        </div>
                    </div>
                `;
            });
            timelineHTML += `</div>`;
        }

        // Financial totals specifically for this vehicle
        const totalFuelSpent = fuel.reduce((acc, a) => acc + a.valorTotal, 0);
        const totalMaintenanceSpent = maintenance.reduce((acc, m) => acc + m.valor, 0);
        const combinedVehicleCost = totalFuelSpent + totalMaintenanceSpent;

        // Render layout
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <button class="btn-icon-only" onclick="window.movixRouter.navigateTo('veiculos')" title="Voltar">
                            <i class="fa-solid fa-arrow-left-long"></i>
                        </button>
                        <h1 class="page-title">Ficha de Vida Útil</h1>
                    </div>
                    <p class="page-subtitle">Timeline operacional, financeiro e histórico de manutenção do veículo</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="window.print()">
                        <i class="fa-solid fa-print"></i> Exportar Ficha (PDF)
                    </button>
                </div>
            </div>

            <div class="detail-sheet-grid">
                
                <!-- SIDEBAR VEHICLE PROFILE SPEC -->
                <aside class="detail-sheet-sidebar">
                    <div class="sidebar-logo" style="width:70px; height:70px; font-size:2.2rem; border-radius:var(--border-radius-md); box-shadow:none;">
                        ${vehicle.placa.substr(0,1)}
                    </div>
                    <div class="detail-sidebar-title">
                        <h2>${vehicle.marca} ${vehicle.modelo}</h2>
                        <span class="status-pill ${isCurrentlyTraveling ? 'em_andamento' : vehicle.status}" style="margin-top:6px;">${isCurrentlyTraveling ? 'Em Viagem' : (vehicle.status === 'disponivel' ? 'Disponível' : (vehicle.status === 'em_manutencao' ? 'Em Oficina' : 'Inativo'))}</span>
                    </div>

                    <ul class="detail-sidebar-info-list">
                        <li class="detail-sidebar-info-item"><span>Placa</span><strong>${vehicle.placa}</strong></li>
                        ${vehicle.tipoUnidade === 'Implemento/Reboque' ? `
                            <li class="detail-sidebar-info-item"><span>Tipo Implemento</span><strong>${vehicle.tipoImplemento || 'Reboque'}</strong></li>
                            <li class="detail-sidebar-info-item"><span>Qtd. Eixos</span><strong>${vehicle.qtdEixos || 2}</strong></li>
                            <li class="detail-sidebar-info-item"><span>Qtd. Pneus</span><strong>${vehicle.qtdPneus || '-'}</strong></li>
                            <li class="detail-sidebar-info-item"><span>Capacidade</span><strong>${vehicle.capacidadeCarga ? `${parseFloat(vehicle.capacidadeCarga).toLocaleString('pt-BR')} kg` : '-'}</strong></li>
                        ` : `
                            <li class="detail-sidebar-info-item"><span>Combustível</span><strong>${vehicle.combustivel || '-'}</strong></li>
                            <li class="detail-sidebar-info-item"><span>KM Atual</span><strong>${parseFloat(vehicle.kmAtual || 0).toLocaleString('pt-BR')} km</strong></li>
                            <li class="detail-sidebar-info-item"><span>Qtd. Eixos</span><strong>${vehicle.qtdEixos || 2}</strong></li>
                        `}
                        <li class="detail-sidebar-info-item"><span>Ano/Modelo</span><strong>${vehicle.ano}</strong></li>
                        <li class="detail-sidebar-info-item"><span>Cor</span><strong>${vehicle.cor}</strong></li>
                        <li class="detail-sidebar-info-item"><span>Aquisição</span><strong>${vehicle.dataAquisicao ? vehicle.dataAquisicao.split('-').reverse().join('/') : '-'}</strong></li>
                        <li class="detail-sidebar-info-item"><span>Renavam</span><strong style="font-size:0.75rem;">${vehicle.renavam || '-'}</strong></li>
                        <li class="detail-sidebar-info-item"><span>Chassi</span><strong style="font-size:0.75rem;">${vehicle.chassi || '-'}</strong></li>
                    </ul>

                    <!-- DOCUMENTOS ANEXOS SIDEBAR BUTTONS -->
                    <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <h4 style="font-size:0.85rem; font-family:var(--font-heading); color:var(--text-muted); text-transform:uppercase; margin-bottom:12px;"><i class="fa-solid fa-paperclip"></i> Documentos Anexos</h4>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            ${vehicle.docVeiculoAnexo ? `
                                <a href="${vehicle.docVeiculoAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.75rem; text-decoration:none; padding:8px 12px; display:inline-flex; align-items:center; gap:8px; justify-content:center; width:100%;">
                                    <i class="fa-solid fa-file-pdf text-danger"></i> Visualizar CRLV
                                </a>
                            ` : `
                                <div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:8px; border:1px dashed var(--border-color); border-radius:var(--border-radius-sm);">
                                    CRLV não anexado
                                </div>
                            `}
                            ${vehicle.contratoSeguroAnexo ? `
                                <a href="${vehicle.contratoSeguroAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.75rem; text-decoration:none; padding:8px 12px; display:inline-flex; align-items:center; gap:8px; justify-content:center; width:100%;">
                                    <i class="fa-solid fa-file-shield text-primary"></i> Contrato de Seguro
                                </a>
                            ` : (vehicle.possuiSeguro === 'Sim' ? `
                                <div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:8px; border:1px dashed var(--border-color); border-radius:var(--border-radius-sm);">
                                    Contrato não anexado
                                </div>
                            ` : '')}
                            ${vehicle.rastreadorContratoAnexo ? `
                                <a href="${vehicle.rastreadorContratoAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.75rem; text-decoration:none; padding:8px 12px; display:inline-flex; align-items:center; gap:8px; justify-content:center; width:100%;">
                                    <i class="fa-solid fa-file-contract text-info"></i> Contrato Rastreamento
                                </a>
                            ` : ''}
                            ${vehicle.extintorCertificadoAnexo ? `
                                <a href="${vehicle.extintorCertificadoAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.75rem; text-decoration:none; padding:8px 12px; display:inline-flex; align-items:center; gap:8px; justify-content:center; width:100%;">
                                    <i class="fa-solid fa-file-lines text-warning"></i> Certificado Extintor
                                </a>
                            ` : ''}
                            ${vehicle.anexoComprovanteTacografo ? `
                                <a href="${vehicle.anexoComprovanteTacografo}" target="_blank" class="btn btn-secondary" style="font-size:0.75rem; text-decoration:none; padding:8px 12px; display:inline-flex; align-items:center; gap:8px; justify-content:center; width:100%;">
                                    <i class="fa-solid fa-receipt text-info"></i> Comprovante Tacógrafo
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </aside>

                <!-- DETAILED TABS CONTENT PANEL -->
                <section class="detail-sheet-content">
                    
                    <!-- TAB MENU -->
                    <div class="detail-tab-menu">
                        <button class="detail-tab-btn active" data-tab="tab-timeline"><i class="fa-solid fa-timeline"></i> Timeline da Vida Útil</button>
                        <button class="detail-tab-btn" data-tab="tab-financeiro"><i class="fa-solid fa-file-invoice-dollar"></i> Balanço Financeiro</button>
                        <button class="detail-tab-btn" data-tab="tab-historicos"><i class="fa-solid fa-clock-rotate-left"></i> Histórico Detalhado</button>
                        ${vehicle.possuiSeguro === 'Sim' ? `
                            <button class="detail-tab-btn" data-tab="tab-seguro"><i class="fa-solid fa-shield-halved"></i> Cobertura de Seguro</button>
                        ` : ''}
                        ${vehicle.possuiRastreador === 'Sim' ? `
                            <button class="detail-tab-btn" data-tab="tab-rastreador"><i class="fa-solid fa-satellite-dish"></i> Rastreador</button>
                        ` : ''}
                        ${vehicle.possuiExtintor === 'Sim' ? `
                            <button class="detail-tab-btn" data-tab="tab-extintor"><i class="fa-solid fa-fire-extinguisher"></i> Extintor</button>
                        ` : ''}
                        ${vehicle.possuiTacografo === 'Sim' ? `
                            <button class="detail-tab-btn" data-tab="tab-tacografo"><i class="fa-solid fa-gauge"></i> Tacógrafo</button>
                        ` : ''}
                    </div>

                    <!-- TIMELINE PANE -->
                    <div class="detail-tab-pane active" id="tab-timeline">
                        <div class="card">
                            <div class="card-header-simple">
                                <h3>Linha do Tempo Completa</h3>
                                <span class="status-pill ok" style="font-size:0.75rem;">${events.length} Eventos</span>
                            </div>
                            <div style="margin-top:16px;">
                                ${timelineHTML}
                            </div>
                        </div>
                    </div>

                    <!-- FINANCIAL BALANCING PANE -->
                    <div class="detail-tab-pane" id="tab-financeiro">
                        ${vehicle.tipoUnidade === 'Implemento/Reboque' ? `
                            <div class="card" style="max-width: 600px; margin: 0 auto;">
                                <div class="card-header-simple">
                                    <h3>Balanço Acumulado de Despesas (Implemento)</h3>
                                    <i class="fa-solid fa-coins text-muted"></i>
                                </div>
                                <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.9rem; gap:16px;">
                                    <li class="detail-sidebar-info-item"><span>Gasto Oficina/Peças</span><strong>R$ ${totalMaintenanceSpent.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
                                    <li class="detail-sidebar-info-item" style="border-top:2px solid var(--border-color); padding-top:16px; font-weight:700;"><span>Total de Custos de Vida</span><strong class="text-danger" style="font-size:1.15rem;">R$ ${totalMaintenanceSpent.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
                                </ul>
                            </div>
                        ` : `
                            <div class="grid-2">
                                <div class="card">
                                    <div class="card-header-simple">
                                        <h3>Balanço Acumulado de Despesas</h3>
                                        <i class="fa-solid fa-coins text-muted"></i>
                                    </div>
                                    <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.9rem; gap:16px;">
                                        <li class="detail-sidebar-info-item"><span>Gasto Combustível</span><strong>R$ ${totalFuelSpent.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
                                        <li class="detail-sidebar-info-item"><span>Gasto Oficina/Peças</span><strong>R$ ${totalMaintenanceSpent.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
                                        <li class="detail-sidebar-info-item" style="border-top:2px solid var(--border-color); padding-top:16px; font-weight:700;"><span>Total de Custos de Vida</span><strong class="text-danger" style="font-size:1.15rem;">R$ ${combinedVehicleCost.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
                                    </ul>
                                </div>

                                <div class="card" style="justify-content: center; align-items: center; text-align: center;">
                                    <i class="fa-solid fa-calculator text-primary" style="font-size:3rem; margin-bottom:12px;"></i>
                                    <h3>Custo médio por KM Rodado</h3>
                                    <p style="font-size:2rem; font-weight:800; font-family:var(--font-heading); margin:12px 0; color:var(--text-main);">
                                        R$ ${(vehicle.kmAtual > 0 ? (combinedVehicleCost / vehicle.kmAtual) : 0).toFixed(2)} / km
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted);">Estimado dividindo o total gasto acumulado pela quilometragem atual do odômetro.</p>
                                </div>
                            </div>
                        `}
                    </div>

                    <!-- INSURANCE COV PANE -->
                    ${vehicle.possuiSeguro === 'Sim' ? `
                    <div class="detail-tab-pane" id="tab-seguro">
                        <div class="card">
                            <div class="card-header-simple" style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <h3 style="margin:0;"><i class="fa-solid fa-shield-halved text-primary"></i> Detalhes do Seguro Ativo</h3>
                                    <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">Informações da apólice, vigência e custos mensais</p>
                                </div>
                                <div>
                                    ${(() => {
                                        if (!vehicle.validadeContratoSeguro) return '<span class="status-pill status-gray">Vigência Indefinida</span>';
                                        const expDate = new Date(vehicle.validadeContratoSeguro + 'T23:59:59');
                                        const now = new Date();
                                        now.setHours(0,0,0,0);
                                        expDate.setHours(0,0,0,0);
                                        if (expDate < now) {
                                            return '<span class="status-pill text-danger" style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Contrato Expirado</span>';
                                        } else {
                                            return '<span class="status-pill text-success" style="background:rgba(34,197,94,0.1); border:1px solid var(--success); font-weight:700;"><i class="fa-solid fa-circle-check"></i> Contrato Ativo</span>';
                                        }
                                    })()}
                                </div>
                            </div>

                            <div style="margin-top: 24px;">
                                <div class="grid-2" style="gap: 20px;">
                                    <div>
                                        <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">Informações Gerais</h4>
                                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; gap:12px; font-size:0.9rem;">
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Seguradora</span><strong>${vehicle.seguradora || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Nº Apólice</span><strong>${vehicle.apolice || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;">
                                                <span>Próximo Boleto</span>
                                                <strong>
                                                    ${(() => {
                                                        if (!vehicle.vencimentoBoletoSeguro) return '-';
                                                        if (vehicle.vencimentoBoletoSeguro.includes('-')) {
                                                            return vehicle.vencimentoBoletoSeguro.split('-').reverse().join('/');
                                                        }
                                                        const day = parseInt(vehicle.vencimentoBoletoSeguro) || 1;
                                                        const today = new Date();
                                                        let dueDate = new Date(today.getFullYear(), today.getMonth(), day);
                                                        const rolloverLimit = new Date(dueDate.getTime() + 5 * 24 * 60 * 60 * 1000);
                                                        if (today > rolloverLimit) {
                                                            dueDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
                                                        }
                                                        return `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()}`;
                                                    })()}
                                                </strong>
                                            </li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Custo Mensal</span><strong>R$ ${(parseFloat(vehicle.valorMensalSeguro) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">Vigência do Contrato</h4>
                                        <div style="background:var(--bg-light); border-radius:var(--border-radius-md); padding:16px; margin-bottom:16px;">
                                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">
                                                <span>Início da Cobertura</span>
                                                <span>Fim da Cobertura</span>
                                            </div>
                                            <div style="display:flex; justify-content:space-between; font-weight:700; color:var(--text-main); font-size:0.95rem; margin-bottom:12px;">
                                                <span>${vehicle.inicioContratoSeguro ? vehicle.inicioContratoSeguro.split('-').reverse().join('/') : '-'}</span>
                                                <span>${vehicle.validadeContratoSeguro ? vehicle.validadeContratoSeguro.split('-').reverse().join('/') : '-'}</span>
                                            </div>
                                            <!-- Simple timeline bar -->
                                            <div style="background:var(--border-color); height:6px; border-radius:3px; position:relative; overflow:hidden;">
                                                ${(() => {
                                                    if (!vehicle.inicioContratoSeguro || !vehicle.validadeContratoSeguro) return '';
                                                    const start = new Date(vehicle.inicioContratoSeguro + 'T00:00:00');
                                                    const end = new Date(vehicle.validadeContratoSeguro + 'T23:59:59');
                                                    const now = new Date();
                                                    if (now < start) return '<div style="background:var(--primary); width:0%; height:100%;"></div>';
                                                    if (now > end) return '<div style="background:var(--danger); width:100%; height:100%;"></div>';
                                                    const total = end - start;
                                                    const elapsed = now - start;
                                                    const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
                                                    return `<div style="background:var(--primary); width:${percent}%; height:100%; transition: width 0.3s ease;"></div>`;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style="margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px;">
                                    <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); margin-bottom:8px;">Observações da Cobertura</h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); background:var(--bg-light); padding:12px; border-radius:var(--border-radius-sm); border-left:3px solid var(--border-color); white-space:pre-wrap; margin:0;">${vehicle.observacoesSeguro || 'Nenhuma observação registrada para a cobertura de seguro.'}</p>
                                </div>

                                ${vehicle.contratoSeguroAnexo ? `
                                <div style="margin-top:20px; display:flex; gap:12px;">
                                    <a href="${vehicle.contratoSeguroAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                                        <i class="fa-solid fa-eye"></i> Visualizar Apólice Anexa
                                    </a>
                                    <a href="${vehicle.contratoSeguroAnexo}" download class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                                        <i class="fa-solid fa-download"></i> Baixar Arquivo
                                    </a>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- RASTREADOR PANE -->
                    ${vehicle.possuiRastreador === 'Sim' ? `
                    <div class="detail-tab-pane" id="tab-rastreador">
                        <div class="card">
                            <div class="card-header-simple">
                                <h3><i class="fa-solid fa-satellite-dish text-primary"></i> Detalhes do Sistema de Rastreamento</h3>
                                <span class="status-pill ${vehicle.statusRastreador === 'Ativo' ? 'ok' : 'atencao'}">${vehicle.statusRastreador || 'Ativo'}</span>
                            </div>

                            <div style="margin-top: 24px;">
                                <div class="grid-2" style="gap: 20px;">
                                    <div>
                                        <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">Especificações Técnicas</h4>
                                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; gap:12px; font-size:0.9rem;">
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Fornecedora</span><strong>${vehicle.empresaRastreador || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Modelo</span><strong>${vehicle.modeloRastreador || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>ID Equipamento</span><strong>${vehicle.idRastreador || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Código IMEI</span><strong>${vehicle.imeiRastreador || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data Instalação</span><strong>${vehicle.dataInstalacaoRastreador ? vehicle.dataInstalacaoRastreador.split('-').reverse().join('/') : '-'}</strong></li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">Dados do Contrato</h4>
                                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; gap:12px; font-size:0.9rem;">
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Valor Mensal</span><strong>R$ ${(parseFloat(vehicle.valorMensalRastreador) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Início Cobertura</span><strong>${vehicle.inicioContratoRastreador ? vehicle.inicioContratoRastreador.split('-').reverse().join('/') : '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Vencimento</span><strong>${vehicle.validadeContratoRastreador ? vehicle.validadeContratoRastreador.split('-').reverse().join('/') : '-'}</strong></li>
                                        </ul>
                                    </div>
                                </div>

                                <div style="margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px;">
                                    <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); margin-bottom:8px;">Observações</h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); background:var(--bg-light); padding:12px; border-radius:var(--border-radius-sm); border-left:3px solid var(--border-color); white-space:pre-wrap; margin:0;">${vehicle.observacoesRastreador || 'Nenhuma observação registrada.'}</p>
                                </div>

                                <div style="margin-top:20px; display:flex; flex-wrap:wrap; gap:12px;">
                                    ${vehicle.rastreadorContratoAnexo ? `<a href="${vehicle.rastreadorContratoAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-file-contract text-primary"></i> Contrato</a>` : ''}
                                    ${vehicle.rastreadorNotaFiscalAnexo ? `<a href="${vehicle.rastreadorNotaFiscalAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-file-invoice-dollar text-success"></i> Nota Fiscal</a>` : ''}
                                    ${vehicle.rastreadorOrdemServicoAnexo ? `<a href="${vehicle.rastreadorOrdemServicoAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-file-signature text-warning"></i> O.S. Instalação</a>` : ''}
                                    ${vehicle.rastreadorComprovanteAnexo ? `<a href="${vehicle.rastreadorComprovanteAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-receipt text-danger"></i> Comprovantes</a>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- EXTINTOR PANE -->
                    ${vehicle.possuiExtintor === 'Sim' ? `
                    <div class="detail-tab-pane" id="tab-extintor">
                        <div class="card">
                            <div class="card-header-simple">
                                <h3><i class="fa-solid fa-fire-extinguisher text-danger"></i> Detalhes do Controle do Extintor</h3>
                                <span class="status-pill ${vehicle.statusExtintor === 'Regular' ? 'ok' : (vehicle.statusExtintor === 'Em manutenção' ? 'atencao' : 'atrasada')}">${vehicle.statusExtintor || 'Regular'}</span>
                            </div>

                            <div style="margin-top: 24px;">
                                <div class="grid-2" style="gap: 20px;">
                                    <div>
                                        <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">Especificações Técnicas</h4>
                                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; gap:12px; font-size:0.9rem;">
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Tipo de Carga</span><strong>${vehicle.tipoExtintor || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Capacidade</span><strong>${vehicle.capacidadeExtintor || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Nº Selo INMETRO</span><strong>${vehicle.seloExtintor || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data Fabricação</span><strong>${vehicle.dataFabricacaoExtintor ? vehicle.dataFabricacaoExtintor.split('-').reverse().join('/') : '-'}</strong></li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">Cronograma de Recarga & Validade</h4>
                                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; gap:12px; font-size:0.9rem;">
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Última Recarga</span><strong>${vehicle.dataRecargaExtintor ? vehicle.dataRecargaExtintor.split('-').reverse().join('/') : '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data de Validade</span><strong>${vehicle.validadeExtintor ? vehicle.validadeExtintor.split('-').reverse().join('/') : '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Próxima Recarga</span><strong>${vehicle.proximaRecargaExtintor ? vehicle.proximaRecargaExtintor.split('-').reverse().join('/') : '-'}</strong></li>
                                        </ul>
                                    </div>
                                </div>

                                <div style="margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px;">
                                    <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); margin-bottom:8px;">Observações</h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); background:var(--bg-light); padding:12px; border-radius:var(--border-radius-sm); border-left:3px solid var(--border-color); white-space:pre-wrap; margin:0;">${vehicle.observacoesExtintor || 'Nenhuma observação registrada.'}</p>
                                </div>

                                <div style="margin-top:20px; display:flex; flex-wrap:wrap; gap:12px;">
                                    ${vehicle.extintorCertificadoAnexo ? `<a href="${vehicle.extintorCertificadoAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-file-lines text-primary"></i> Certificado</a>` : ''}
                                    ${vehicle.extintorComprovanteAnexo ? `<a href="${vehicle.extintorComprovanteAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-receipt text-success"></i> Recarga</a>` : ''}
                                    ${vehicle.extintorLaudoAnexo ? `<a href="${vehicle.extintorLaudoAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-file-shield text-warning"></i> Laudo Técnico</a>` : ''}
                                    ${vehicle.extintorNotaFiscalAnexo ? `<a href="${vehicle.extintorNotaFiscalAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-file-invoice-dollar text-danger"></i> Nota Fiscal</a>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- TACOGRAFO PANE -->
                    ${vehicle.possuiTacografo === 'Sim' ? `
                    <div class="detail-tab-pane" id="tab-tacografo">
                        <div class="card">
                            <div class="card-header-simple" style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <h3 style="margin:0;"><i class="fa-solid fa-gauge text-primary"></i> Detalhes do Controle de Tacógrafo</h3>
                                    <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">Especificações, aferições e certificados do tacógrafo do veículo</p>
                                </div>
                                <div>
                                    ${(() => {
                                        const status = window.movixStore.getTacografoStatus(vehicle);
                                        if (status === 'Regular') {
                                            return '<span class="status-pill text-success" style="background:rgba(34,197,94,0.1); border:1px solid var(--success); font-weight:700;"><i class="fa-solid fa-circle-check"></i> Regular</span>';
                                        } else if (status === 'Próximo do vencimento') {
                                            return '<span class="status-pill text-warning" style="background:rgba(234,179,8,0.1); border:1px solid var(--warning); font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Próximo do Vencimento</span>';
                                        } else if (status === 'Vencido') {
                                            return '<span class="status-pill text-danger" style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Vencido</span>';
                                        } else if (status === 'Em manutenção') {
                                            return '<span class="status-pill text-info" style="background:rgba(59,130,246,0.1); border:1px solid var(--info); font-weight:700;"><i class="fa-solid fa-screwdriver-wrench"></i> Em Manutenção</span>';
                                        }
                                        return '<span class="status-pill status-gray">-</span>';
                                    })()}
                                </div>
                            </div>

                            <div style="margin-top: 24px;">
                                <div class="grid-2" style="gap: 20px;">
                                    <div>
                                        <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">Especificações do Equipamento</h4>
                                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; gap:12px; font-size:0.9rem;">
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Marca do Tacógrafo</span><strong>${vehicle.marcaTacografo || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Modelo</span><strong>${vehicle.modeloTacografo || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Número de Série</span><strong>${vehicle.numSerieTacografo || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data de Instalação</span><strong>${vehicle.dataInstalacaoTacografo ? vehicle.dataInstalacaoTacografo.split('-').reverse().join('/') : '-'}</strong></li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">Aferição e Vigência</h4>
                                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; gap:12px; font-size:0.9rem;">
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Última Aferição</span><strong>${vehicle.dataUltimaAfericaoTacografo ? vehicle.dataUltimaAfericaoTacografo.split('-').reverse().join('/') : '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Empresa Responsável</span><strong>${vehicle.empresaAfericaoTacografo || '-'}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Validade Aferição</span><strong>${vehicle.validadeAfericaoTacografo ? vehicle.validadeAfericaoTacografo.split('-').reverse().join('/') : '-'}</strong></li>
                                        </ul>
                                    </div>
                                </div>

                                <!-- Progress bar for aferição validity -->
                                <div style="margin-top:20px; background:var(--bg-light); border-radius:var(--border-radius-md); padding:16px;">
                                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">
                                        <span>Data de Última Aferição</span>
                                        <span>Validade da Aferição</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; font-weight:700; color:var(--text-main); font-size:0.95rem; margin-bottom:12px;">
                                        <span>${vehicle.dataUltimaAfericaoTacografo ? vehicle.dataUltimaAfericaoTacografo.split('-').reverse().join('/') : '-'}</span>
                                        <span>${vehicle.validadeAfericaoTacografo ? vehicle.validadeAfericaoTacografo.split('-').reverse().join('/') : '-'}</span>
                                    </div>
                                    <div style="background:var(--border-color); height:6px; border-radius:3px; position:relative; overflow:hidden;">
                                        ${(() => {
                                            if (!vehicle.dataUltimaAfericaoTacografo || !vehicle.validadeAfericaoTacografo) return '';
                                            const start = new Date(vehicle.dataUltimaAfericaoTacografo + 'T00:00:00');
                                            const end = new Date(vehicle.validadeAfericaoTacografo + 'T23:59:59');
                                            const now = new Date();
                                            if (now < start) return '<div style="background:var(--primary); width:0%; height:100%;"></div>';
                                            if (now > end) return '<div style="background:var(--danger); width:100%; height:100%;"></div>';
                                            const total = end - start;
                                            const elapsed = now - start;
                                            const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
                                            return `<div style="background:var(--primary); width:${percent}%; height:100%; transition: width 0.3s ease;"></div>`;
                                        })()}
                                    </div>
                                </div>

                                <div style="margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px;">
                                    <h4 style="font-size:0.95rem; font-family:var(--font-heading); color:var(--text-main); margin-bottom:8px;">Observações</h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); background:var(--bg-light); padding:12px; border-radius:var(--border-radius-sm); border-left:3px solid var(--border-color); white-space:pre-wrap; margin:0;">${vehicle.observacoesTacografo || 'Nenhuma observação registrada para o tacógrafo.'}</p>
                                </div>

                                <div style="margin-top:20px; display:flex; flex-wrap:wrap; gap:12px;">
                                    ${vehicle.anexoComprovanteTacografo ? `<a href="${vehicle.anexoComprovanteTacografo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:8px;"><i class="fa-solid fa-receipt text-info"></i> Comprovante do Tacógrafo</a>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- HISTORICAL PANE -->
                    <div class="detail-tab-pane" id="tab-historicos">
                        <div class="card">
                            <div class="card-header-simple">
                                <h3>Registros Operacionais e Manutenção</h3>
                                <i class="fa-solid fa-list-check text-muted"></i>
                            </div>

                            ${vehicle.tipoUnidade === 'Implemento/Reboque' ? '' : `
                                <!-- Supply table -->
                                <h4 style="font-family:var(--font-heading); margin-top:12px; border-left:3px solid var(--success); padding-left:8px;">Abastecimentos Recentes</h4>
                                <div class="table-responsive" style="margin-top:8px;">
                                    <table class="smart-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Litros</th>
                                                <th>Valor Total</th>
                                                <th>KM/L</th>
                                                <th>Posto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${fuel.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Sem registros</td></tr>' : fuel.map(f => `
                                                <tr>
                                                    <td>${f.data.split('-').reverse().join('/')}</td>
                                                    <td>${f.litros} L</td>
                                                    <td style="font-weight:600;">R$ ${f.valorTotal.toFixed(2)}</td>
                                                    <td class="text-success" style="font-weight:700;">${f.kmL} km/L</td>
                                                    <td>${f.posto}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}

                            <!-- Maintenance Table -->
                            <h4 style="font-family:var(--font-heading); margin-top:24px; border-left:3px solid var(--danger); padding-left:8px;">Manutenções Registradas</h4>
                            <div class="table-responsive" style="margin-top:8px;">
                                <table class="smart-table">
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Tipo/Categoria</th>
                                            <th>Descrição</th>
                                            <th>Custo</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${maintenance.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Sem registros</td></tr>' : maintenance.map(m => `
                                            <tr>
                                                <td>${m.data.split('-').reverse().join('/')}</td>
                                                <td style="font-weight:600;">${m.tipo} (${m.categoria})</td>
                                                <td><span style="font-size:0.8rem; white-space:normal; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${m.descricao}</span></td>
                                                <td style="font-weight:600;">R$ ${m.valor.toFixed(2)}</td>
                                                <td><span class="status-pill ${m.status.toLowerCase()}">${m.status}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </section>
            </div>
        `;

        // Tab click behavior
        document.querySelectorAll('.detail-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.detail-tab-pane').forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const paneId = btn.getAttribute('data-tab');
                document.getElementById(paneId).classList.add('active');
            });
        });
    }

    // Register module into routing
    window.movixRouter.register('veiculos', renderVeiculos);
})();
