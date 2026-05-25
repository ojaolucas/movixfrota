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
                        <input type="text" class="filter-input" id="search-veiculos" placeholder="Buscar...">
                    </div>
                    <div class="filter-group">
                        <label>Tipo de Veículo</label>
                        <select class="filter-input" id="filter-tipo">
                            <option value="">Todos</option>
                            <option value="Caminhão">Caminhão</option>
                            <option value="Van/Furgão">Van/Furgão</option>
                            <option value="Utilitário">Utilitário</option>
                            <option value="Passeio">Passeio</option>
                            <option value="Picape">Picape</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Combustível</label>
                        <select class="filter-input" id="filter-combustivel">
                            <option value="">Todos</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Flex">Flex</option>
                            <option value="Gasolina">Gasolina</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação</label>
                        <select class="filter-input" id="filter-status">
                            <option value="">Todas</option>
                            <option value="disponivel">Disponível</option>
                            <option value="em_manutencao">Em Manutenção</option>
                            <option value="inativo">Inativo</option>
                        </select>
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
        let currentSort = { column: 'placa', direction: 'asc' };
        let currentPage = 1;
        const itemsPerPage = 8;

        // Render functions inside listing scope
        function updateTable() {
            const tbody = document.getElementById('tbody-veiculos');
            if (!tbody) return;

            // Search logic
            const searchVal = document.getElementById('search-veiculos').value.toLowerCase();
            const tipoVal = document.getElementById('filter-tipo').value;
            const combustivelVal = document.getElementById('filter-combustivel').value;
            const statusVal = document.getElementById('filter-status').value;

            filteredData = vehicles.filter(v => {
                const matchSearch = v.placa.toLowerCase().includes(searchVal) || 
                                    v.modelo.toLowerCase().includes(searchVal) ||
                                    v.marca.toLowerCase().includes(searchVal);
                const matchTipo = !tipoVal || v.tipo === tipoVal;
                const matchCombustivel = !combustivelVal || v.combustivel === combustivelVal;
                const matchStatus = !statusVal || v.status === statusVal;
                
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
            const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPage);

            tbody.innerHTML = '';
            if (paginatedItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="search-no-results" style="text-align: center;">Nenhum veículo encontrado</td></tr>`;
                document.getElementById('pagination-veiculos').innerHTML = '';
                return;
            }

            paginatedItems.forEach(v => {
                let statusLabel = '';
                if (v.status === 'disponivel') statusLabel = '<span class="status-pill disponivel">Disponível</span>';
                else if (v.status === 'em_manutencao') statusLabel = '<span class="status-pill em_manutencao">Em Oficina</span>';
                else statusLabel = '<span class="status-pill inativo">Inativo</span>';

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
            let pagHTML = `<span>Mostrando ${startIdx + 1} a ${Math.min(startIdx + itemsPerPage, filteredData.length)} de ${filteredData.length} registros</span>`;
            pagHTML += `<div class="pagination-pages">`;
            pagHTML += `<button class="page-number-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            for (let i = 1; i <= totalPages; i++) {
                pagHTML += `<button class="page-number-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            pagHTML += `<button class="page-number-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
            pagHTML += `</div>`;
            document.getElementById('pagination-veiculos').innerHTML = pagHTML;
        }

        // Event hooks
        document.getElementById('search-veiculos').addEventListener('input', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-tipo').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-combustivel').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; updateTable(); });

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
                
                updateTable();
            });
        });

        // Pagination buttons handlers
        document.getElementById('pagination-veiculos').addEventListener('click', (e) => {
            const btn = e.target.closest('.page-number-btn');
            if (!btn || btn.disabled) return;

            if (btn.id === 'prev-page') currentPage--;
            else if (btn.id === 'next-page') currentPage++;
            else currentPage = parseInt(btn.getAttribute('data-page'));

            updateTable();
        });

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
                <!-- TIPO DA UNIDADE -->
                <div class="form-group full-width" style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 8px;">
                    <label>Tipo da Unidade <span class="required">*</span></label>
                    <select class="form-control" name="tipoUnidade" id="veh-tipo-unidade" required>
                        <option value="Veículo Motorizado" ${isEdit && vehicle.tipoUnidade === 'Veículo Motorizado' ? 'selected' : (!isEdit ? 'selected' : '')}>Veículo Motorizado</option>
                        <option value="Implemento/Reboque" ${isEdit && vehicle.tipoUnidade === 'Implemento/Reboque' ? 'selected' : ''}>Implemento/Reboque</option>
                    </select>
                </div>

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
                    <input type="number" class="form-control" name="ano" required min="1980" max="2030" value="${isEdit ? vehicle.ano : new Date().getFullYear()}">
                </div>
                <div class="form-group">
                    <label>Cor <span class="required">*</span></label>
                    <input type="text" class="form-control" name="cor" required value="${isEdit ? vehicle.cor : ''}" placeholder="Ex: Branco, Preto">
                </div>
                <div class="form-group">
                    <label>Placa <span class="required">*</span></label>
                    <input type="text" class="form-control" name="placa" required placeholder="AAA-0000 / ABC1D23" value="${isEdit ? vehicle.placa : ''}" ${isEdit ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label>Quantidade de Eixos <span class="required">*</span></label>
                    <input type="number" class="form-control" name="qtdEixos" required min="1" max="10" value="${isEdit ? (vehicle.qtdEixos || 2) : 2}">
                </div>

                <!-- MOTORIZED VEHICLE FIELDS -->
                <div id="motorized-fields-container" class="grid-1-1" style="grid-column: span 2;">
                    <div class="form-group">
                        <label>Tipo de Veículo <span class="required">*</span></label>
                        <select class="form-control" name="tipo" id="veh-tipo-motorizado" required>
                            <option value="Caminhão" ${isEdit && vehicle.tipo === 'Caminhão' ? 'selected' : ''}>Caminhão</option>
                            <option value="Van/Furgão" ${isEdit && vehicle.tipo === 'Van/Furgão' ? 'selected' : ''}>Van/Furgão</option>
                            <option value="Utilitário" ${isEdit && vehicle.tipo === 'Utilitário' ? 'selected' : ''}>Utilitário</option>
                            <option value="Passeio" ${isEdit && vehicle.tipo === 'Passeio' ? 'selected' : ''}>Passeio</option>
                            <option value="Picape" ${isEdit && vehicle.tipo === 'Picape' ? 'selected' : ''}>Picape</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Combustível <span class="required">*</span></label>
                        <select class="form-control" name="combustivel" id="veh-combustivel" required>
                            <option value="Diesel" ${isEdit && vehicle.combustivel === 'Diesel' ? 'selected' : ''}>Diesel</option>
                            <option value="Flex" ${isEdit && vehicle.combustivel === 'Flex' ? 'selected' : ''}>Flex</option>
                            <option value="Gasolina" ${isEdit && vehicle.combustivel === 'Gasolina' ? 'selected' : ''}>Gasolina</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>KM Atual <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmAtual" id="veh-kmatual" required value="${isEdit ? vehicle.kmAtual : ''}" placeholder="Odômetro" min="0">
                    </div>
                </div>

                <!-- TRAILER/IMPLEMENT FIELDS -->
                <div id="trailer-fields-container" class="grid-1-1" style="grid-column: span 2; display: none;">
                    <div class="form-group">
                        <label>Tipo do Implemento <span class="required">*</span></label>
                        <select class="form-control" name="tipoImplemento" id="veh-tipo-implemento">
                            <option value="Carrocinha" ${isEdit && vehicle.tipoImplemento === 'Carrocinha' ? 'selected' : ''}>Carrocinha</option>
                            <option value="Reboque" ${isEdit && vehicle.tipoImplemento === 'Reboque' ? 'selected' : ''}>Reboque</option>
                            <option value="Carreta" ${isEdit && vehicle.tipoImplemento === 'Carreta' ? 'selected' : ''}>Carreta</option>
                            <option value="Semirreboque" ${isEdit && vehicle.tipoImplemento === 'Semirreboque' ? 'selected' : ''}>Semirreboque</option>
                            <option value="Trailer" ${isEdit && vehicle.tipoImplemento === 'Trailer' ? 'selected' : ''}>Trailer</option>
                            <option value="Outro" ${isEdit && vehicle.tipoImplemento === 'Outro' ? 'selected' : ''}>Outro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Quantidade de Pneus <span class="required">*</span></label>
                        <input type="number" class="form-control" name="qtdPneus" id="veh-qtdpneus" min="1" value="${isEdit ? vehicle.qtdPneus : ''}" placeholder="Ex: 4, 6, 8, 12">
                    </div>
                    <div class="form-group full-width">
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
                    <input type="date" class="form-control" name="dataAquisicao" value="${isEdit && vehicle.dataAquisicao ? vehicle.dataAquisicao : new Date().toISOString().split('T')[0]}">
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
                        <input type="number" class="form-control" name="valorMensalSeguro" step="0.01" min="0" value="${isEdit && vehicle.valorMensalSeguro ? vehicle.valorMensalSeguro : ''}" placeholder="Ex: 350.00">
                    </div>
                    <div class="form-group">
                        <label>Data de Vencimento do Boleto Mensal</label>
                        <input type="date" class="form-control" name="vencimentoBoletoSeguro" value="${isEdit && vehicle.vencimentoBoletoSeguro ? vehicle.vencimentoBoletoSeguro : ''}">
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

        const vehTipoMotorizado = document.getElementById('veh-tipo-motorizado');
        const vehCombustivel = document.getElementById('veh-combustivel');
        const vehKmAtual = document.getElementById('veh-kmatual');

        const vehTipoImplemento = document.getElementById('veh-tipo-implemento');
        const vehQtdPneus = document.getElementById('veh-qtdpneus');
        const vehCapacidade = document.getElementById('veh-capacidade');

        const handleTipoUnidadeToggle = () => {
            if (tipoUnidadeSel.value === 'Implemento/Reboque') {
                motorizedContainer.style.display = 'none';
                trailerContainer.style.display = 'grid';

                vehTipoMotorizado.removeAttribute('required');
                vehCombustivel.removeAttribute('required');
                vehKmAtual.removeAttribute('required');

                vehTipoImplemento.setAttribute('required', '');
                vehQtdPneus.setAttribute('required', '');
                vehCapacidade.setAttribute('required', '');
            } else {
                motorizedContainer.style.display = 'grid';
                trailerContainer.style.display = 'none';

                vehTipoMotorizado.setAttribute('required', '');
                vehCombustivel.setAttribute('required', '');
                vehKmAtual.setAttribute('required', '');

                vehTipoImplemento.removeAttribute('required');
                vehQtdPneus.removeAttribute('required');
                vehCapacidade.removeAttribute('required');
            }
        };

        if (tipoUnidadeSel) {
            tipoUnidadeSel.addEventListener('change', handleTipoUnidadeToggle);
            handleTipoUnidadeToggle();
        }

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
            try {
                await window.movixStore.deleteVeiculo(id);
                window.movixApp.showToast('Veículo removido com sucesso!', 'danger');
                modal.classList.remove('active');
                renderListagemVeiculos(document.getElementById('view-content-wrapper'));
            } catch (err) {
                window.movixApp.showToast(err.message || 'Erro ao excluir veículo.', 'danger');
            }
        });
    }

    // --- FICHA DE VIDA ÚTIL VIEW ---
    function renderFichaVidaUtil(container, veiculoId) {
        const vehicle = window.movixStore.getVeiculo(veiculoId);
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
                desc: `Óleo: ${o.tipoOleo}. Valor: R$ ${o.valor.toFixed(2)}. Troca efetuada com ${o.kmTroca} KM. Próxima troca em ${o.proximaTrocaKM} KM.`,
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
        const totalOilSpent = oil.reduce((acc, o) => acc + o.valor, 0);
        const totalTripsCost = trips.reduce((acc, t) => acc + t.custos, 0);
        const combinedVehicleCost = totalFuelSpent + totalMaintenanceSpent + totalOilSpent + totalTripsCost;

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
                        <span class="status-pill ${vehicle.status}" style="margin-top:6px;">${vehicle.status === 'disponivel' ? 'Disponível' : (vehicle.status === 'em_manutencao' ? 'Em Oficina' : 'Inativo')}</span>
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
                                    <li class="detail-sidebar-info-item"><span>Custos Operacionais de Viagem</span><strong>R$ ${totalTripsCost.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
                                    <li class="detail-sidebar-info-item" style="border-top:2px solid var(--border-color); padding-top:16px; font-weight:700;"><span>Total de Custos de Vida</span><strong class="text-danger" style="font-size:1.15rem;">R$ ${(totalMaintenanceSpent + totalTripsCost).toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
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
                                        <li class="detail-sidebar-info-item"><span>Gasto Lubrificantes (Óleo)</span><strong>R$ ${totalOilSpent.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
                                        <li class="detail-sidebar-info-item"><span>Custos Operacionais de Viagem</span><strong>R$ ${totalTripsCost.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></li>
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
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Custo Mensal</span><strong>R$ ${(parseFloat(vehicle.valorMensalSeguro) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></li>
                                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Próximo Boleto</span><strong>${vehicle.vencimentoBoletoSeguro ? vehicle.vencimentoBoletoSeguro.split('-').reverse().join('/') : '-'}</strong></li>
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
