/* MovixFrota - Controle de Multas Module (CRUD & Auditing) */

(function() {

    // Dynamic intelligent driver suggestion crossover engine
    function detectSuggestedDriver(veiculoId, dataVal, horarioVal) {
        if (!veiculoId || !dataVal || !horarioVal) return { driver: null, trips: [] };
        const viagens = window.movixStore.getViagens();
        const fineTime = new Date(`${dataVal}T${horarioVal}:00`);
        if (isNaN(fineTime.getTime())) return { driver: null, trips: [] };
        
        const matchingTrips = viagens.filter(vi => {
            if (vi.veiculoId !== veiculoId) return false;
            
            const tripStart = new Date(`${vi.dataSaida}T${vi.horaSaida || '00:00'}:00`);
            if (isNaN(tripStart.getTime())) return false;
            
            let tripEnd;
            if (vi.status === 'Realizada' || vi.dataRetorno) {
                tripEnd = new Date(`${vi.dataRetorno}T${vi.horaRetorno || '23:59'}:00`);
            } else {
                tripEnd = new Date();
            }
            if (isNaN(tripEnd.getTime())) return false;
            
            return fineTime >= tripStart && fineTime <= tripEnd;
        });
        
        return {
            trips: matchingTrips,
            driver: matchingTrips.length === 1 ? window.movixStore.getMotoristas().find(d => d.id === matchingTrips[0].motoristaId) : null
        };
    }
    
    function renderMultas(container) {
        const multas = window.movixStore.getMultas();
        const vehicles = window.movixStore.getVeiculos();
        const drivers = window.movixStore.getMotoristas();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';
        
        let state = window.movixApp.getListState('multas');
        if (!state) {
            state = {
                currentPage: 1,
                currentSort: { column: 'data', direction: 'desc' },
                filters: {
                    search: '',
                    veiculoId: '',
                    motoristaId: '',
                    status: '',
                    periodo: 'tudo',
                    de: '',
                    ate: ''
                },
                itemsPerPage: 10,
                scroll: 0
            };
            window.movixApp.saveListState('multas', state);
        } else {
            if (state.currentPage === undefined) state.currentPage = 1;
            if (state.itemsPerPage === undefined) state.itemsPerPage = 10;
            if (!state.currentSort) state.currentSort = { column: 'data', direction: 'desc' };
            window.movixApp.saveListState('multas', state);
        }

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Controle de Multas</h1>
                    <p class="page-subtitle">Monitore, recorra e controle os pagamentos das infrações de trânsito da frota</p>
                </div>
                <div class="page-actions">
                    ${!isVisualizador ? `
                        <button class="btn btn-primary" id="btn-nova-multa">
                            <i class="fa-solid fa-plus"></i> Registrar Multa
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- FILTERS PANEL -->
            <div class="filters-card">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Buscar Descrição / Tipo</label>
                        <input type="text" class="filter-input" id="search-multas" placeholder="Ex: Velocidade, Sinal..." value="${state.filters.search || ''}">
                    </div>
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo-multa">
                            <option value="">Todos</option>
                            ${vehicles.map(v => `<option value="${v.id}" ${state.filters.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Motorista</label>
                        <select class="filter-input" id="filter-motorista-multa">
                            <option value="">Todos</option>
                            <option value="sem_motorista" ${state.filters.motoristaId === 'sem_motorista' ? 'selected' : ''}>Sem motorista responsável</option>
                            ${drivers.map(d => `<option value="${d.id}" ${state.filters.motoristaId === d.id ? 'selected' : ''}>${d.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Status</label>
                        <select class="filter-input" id="filter-status-multa">
                            <option value="">Todos</option>
                            <option value="Pago" ${state.filters.status === 'Pago' ? 'selected' : ''}>Pago</option>
                            <option value="Não Pago" ${state.filters.status === 'Não Pago' ? 'selected' : ''}>Não Pago</option>
                            <option value="Recorrendo" ${state.filters.status === 'Recorrendo' ? 'selected' : ''}>Recorrendo (Autuada)</option>
                        </select>
                    </div>
                </div>

                <!-- Custom date range inside filters row -->
                <div class="filters-row" style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; gap: 16px; align-items: flex-end;">
                    <div class="filter-group" style="max-width: 220px;">
                        <label>Período Temporal</label>
                        <select class="filter-input" id="filter-periodo-multa">
                            <option value="tudo" ${state.filters.periodo === 'tudo' ? 'selected' : ''}>Todo o histórico</option>
                            <option value="personalizado" ${state.filters.periodo === 'personalizado' ? 'selected' : ''}>Personalizado (Por data)</option>
                        </select>
                    </div>
                    <div id="custom-date-container" style="display: ${state.filters.periodo === 'personalizado' ? 'flex' : 'none'}; gap: 16px; align-items: flex-end; flex-grow: 1;">
                        <div class="filter-group" style="max-width: 180px;">
                            <label>De</label>
                            <input type="date" class="filter-input" id="filter-data-de" value="${state.filters.de || ''}">
                        </div>
                        <div class="filter-group" style="max-width: 180px;">
                            <label>Até</label>
                            <input type="date" class="filter-input" id="filter-data-ate" value="${state.filters.ate || ''}">
                        </div>
                    </div>
                </div>
            </div>

            <!-- ADMINISTRATIVE SHEET TABLE -->
            <div class="table-responsive">
                <table class="smart-table" id="table-multas">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="data" style="width: 120px;">Data <i class="fa-solid fa-sort"></i></th>
                            <th style="width: 90px;">Horário</th>
                            <th class="sortable" data-sort="veiculoId" style="width: 130px;">Veículo <i class="fa-solid fa-sort"></i></th>
                            <th>Descrição da Infração</th>
                            <th class="sortable" data-sort="valor" style="width: 120px; text-align: right;">Valor <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="motoristaId">Motorista Responsável <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="status" style="width: 130px; text-align: center;">Situação <i class="fa-solid fa-sort"></i></th>
                            <th style="width: 120px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-multas">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
                <div class="table-pagination" id="pagination-multas">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;

        let filteredData = [...multas];
        let currentSort = state.currentSort;

        const dateContainer = document.getElementById('custom-date-container');
        const periodSel = document.getElementById('filter-periodo-multa');

        if (periodSel && dateContainer) {
            periodSel.addEventListener('change', () => {
                if (periodSel.value === 'personalizado') {
                    dateContainer.style.display = 'flex';
                } else {
                    dateContainer.style.display = 'none';
                    document.getElementById('filter-data-de').value = '';
                    document.getElementById('filter-data-ate').value = '';
                }
                state.currentPage = 1;
                updateTable();
            });
        }

        function updateTable() {
            const tbody = document.getElementById('tbody-multas');
            if (!tbody) return;

            const searchVal = document.getElementById('search-multas').value.toLowerCase();
            const veiculoVal = document.getElementById('filter-veiculo-multa').value;
            const motoristaVal = document.getElementById('filter-motorista-multa').value;
            const statusVal = document.getElementById('filter-status-multa').value;
            const dataDeVal = document.getElementById('filter-data-de').value;
            const dataAteVal = document.getElementById('filter-data-ate').value;

            // Save filter state
            state.filters = {
                search: document.getElementById('search-multas').value,
                veiculoId: veiculoVal,
                motoristaId: motoristaVal,
                status: statusVal,
                periodo: periodSel.value,
                de: dataDeVal,
                ate: dataAteVal
            };
            state.currentSort = currentSort;
            window.movixApp.saveListState('multas', state);

            // Sync sort icons
            document.querySelectorAll('#table-multas th.sortable').forEach(th => {
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

            filteredData = multas.filter(m => {
                const matchSearch = (m.descricao || '').toLowerCase().includes(searchVal) ||
                                    (m.observacoes || '').toLowerCase().includes(searchVal);
                const matchVeiculo = !veiculoVal || m.veiculoId === veiculoVal;
                
                let matchMotorista = true;
                if (motoristaVal === 'sem_motorista') {
                    matchMotorista = !m.motoristaId;
                } else if (motoristaVal) {
                    matchMotorista = m.motoristaId === motoristaVal;
                }

                const matchStatus = !statusVal || m.status === statusVal;

                // Date period matching
                let matchDate = true;
                if (periodSel.value === 'personalizado') {
                    const multaDate = new Date(m.data + 'T00:00:00');
                    if (dataDeVal) {
                        const de = new Date(dataDeVal + 'T00:00:00');
                        if (multaDate < de) matchDate = false;
                    }
                    if (dataAteVal) {
                        const ate = new Date(dataAteVal + 'T23:59:59');
                        if (multaDate > ate) matchDate = false;
                    }
                }

                return matchSearch && matchVeiculo && matchMotorista && matchStatus && matchDate;
            });

            // Sorting logic
            filteredData.sort((a, b) => {
                let valA = a[currentSort.column];
                let valB = b[currentSort.column];

                if (currentSort.column === 'valor') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                } else {
                    valA = String(valA || '').toLowerCase();
                    valB = String(valB || '').toLowerCase();
                }

                if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });

            // Pagination calculation
            const itemsPerPageVal = state.itemsPerPage === 'Todos' ? Infinity : (parseInt(state.itemsPerPage) || 10);
            const totalPages = Math.ceil(filteredData.length / itemsPerPageVal) || 1;
            if (state.currentPage > totalPages) {
                state.currentPage = totalPages;
                window.movixApp.saveListState('multas', state);
            }
            
            const startIdx = itemsPerPageVal === Infinity ? 0 : (state.currentPage - 1) * itemsPerPageVal;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPageVal);

            tbody.innerHTML = '';
            if (paginatedItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="search-no-results" style="text-align: center;">Nenhuma multa cadastrada para esta seleção</td></tr>`;
                document.getElementById('pagination-multas').innerHTML = '';
                return;
            }

            paginatedItems.forEach(m => {
                const v = vehicles.find(item => item.id === m.veiculoId);
                const d = drivers.find(item => item.id === m.motoristaId);

                let statusPill = '';
                if (m.status === 'Pago') {
                    statusPill = '<span class="status-pill ok" style="font-weight:700;"><i class="fa-solid fa-circle-check"></i> Pago</span>';
                } else if (m.status === 'Não Pago') {
                    statusPill = '<span class="status-pill vencido" style="font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> Não Pago</span>';
                } else {
                    statusPill = '<span class="status-pill atencao" style="font-weight:700;"><i class="fa-solid fa-circle-exclamation"></i> Recorrendo</span>';
                }

                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight: 600;">${m.data.split('-').reverse().join('/')}</td>
                        <td style="color:var(--text-muted);">${m.horario || '-'}</td>
                        <td style="font-weight: 700; color: var(--primary);">${v ? v.placa : '-'}</td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-family:var(--font-heading); font-size:0.85rem;">${m.descricao}</strong>
                                ${m.anexo ? `<span style="font-size:0.7rem; color:var(--info); font-weight:600;"><i class="fa-solid fa-paperclip"></i> Comprovante Anexo</span>` : ''}
                            </div>
                        </td>
                        <td style="font-weight: 700; text-align: right;">R$ ${(parseFloat(m.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td>
                            ${d ? `<span style="font-weight:600;">${d.nome}</span><span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:2px;">(${m.motoristaCategoria || d.categoria || 'Motorista Efetivo'})</span>` : '<span style="color:var(--text-muted); font-style:italic;">Sem motorista</span>'}
                        </td>
                        <td style="text-align: center;">${statusPill}</td>
                        <td style="text-align: center; display: flex; justify-content: center; gap: 8px;">
                            <button class="btn-icon-only btn-view" data-id="${m.id}" title="Visualizar Detalhes & Auditoria">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            ${!isVisualizador ? `
                                <button class="btn-icon-only btn-edit" data-id="${m.id}" title="Editar">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                ${activeUser.perfil === 'Administrador' ? `
                                    <button class="btn-icon-only danger btn-delete" data-id="${m.id}" title="Excluir">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            ` : ''}
                        </td>
                    </tr>
                `;
            });

            // Render pagination links using central helper
            window.movixApp.renderPagination({
                containerId: 'pagination-multas',
                currentPage: state.currentPage,
                totalItems: filteredData.length,
                itemsPerPage: state.itemsPerPage,
                noun: 'infrações',
                onPageChange: (newPage) => {
                    state.currentPage = newPage;
                    window.movixApp.saveListState('multas', state);
                    updateTable();
                },
                onItemsPerPageChange: (newLimit) => {
                    state.itemsPerPage = newLimit;
                    state.currentPage = 1;
                    window.movixApp.saveListState('multas', state);
                    updateTable();
                }
            });

            // Restore scroll position
            setTimeout(() => {
                window.scrollTo(0, state.scroll || 0);
            }, 0);
        }

        // Attach filter listeners
        document.getElementById('search-multas').addEventListener('input', () => { state.currentPage = 1; updateTable(); });
        document.getElementById('filter-veiculo-multa').addEventListener('change', () => { state.currentPage = 1; updateTable(); });
        document.getElementById('filter-motorista-multa').addEventListener('change', () => { state.currentPage = 1; updateTable(); });
        document.getElementById('filter-status-multa').addEventListener('change', () => { state.currentPage = 1; updateTable(); });
        document.getElementById('filter-data-de').addEventListener('change', () => { state.currentPage = 1; updateTable(); });
        document.getElementById('filter-data-ate').addEventListener('change', () => { state.currentPage = 1; updateTable(); });

        // Sort table clicks
        document.querySelectorAll('#table-multas th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                
                document.querySelectorAll('#table-multas th.sortable i').forEach(icon => {
                    icon.className = 'fa-solid fa-sort';
                });
                const curIcon = th.querySelector('i');
                curIcon.className = currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                
                updateTable();
            });
        });

        // Pagination logic is handled centrally by renderPagination

        // Form Modal Triggers
        if (document.getElementById('btn-nova-multa')) {
            document.getElementById('btn-nova-multa').addEventListener('click', () => openMultaModal());
        }

        document.getElementById('tbody-multas').addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.btn-view');
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            
            if (viewBtn) {
                openMultaDetailModal(viewBtn.getAttribute('data-id'));
            }
            if (editBtn) {
                openMultaModal(editBtn.getAttribute('data-id'));
            }
            if (deleteBtn) {
                confirmDeleteMulta(deleteBtn.getAttribute('data-id'));
            }
        });

        // MULTAS FORM MODAL (CREATE / EDIT)
        function openMultaModal(id = null) {
            const isEdit = id !== null;
            const multa = isEdit ? window.movixStore.getMulta(id) : null;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = isEdit ? `Editar Registro de Multa: ${id}` : 'Registrar Nova Multa na Frota';

            modalBody.innerHTML = `
                <form id="form-multa" class="form-grid">
                    <div class="form-group">
                        <label>Veículo Relacionado <span class="required">*</span></label>
                        <select class="form-control" name="veiculoId" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione um veículo</option>
                            ${vehicles.map(v => `<option value="${v.id}" ${isEdit && multa.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Motorista Responsável</label>
                        <select class="form-control" name="motoristaId">
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione um motorista</option>
                            <option value="" ${isEdit && !multa.motoristaId ? 'selected' : ''}>Sem motorista responsável (Apenas Veículo)</option>
                            ${drivers.map(d => `<option value="${d.id}" ${isEdit && multa.motoristaId === d.id ? 'selected' : ''}>${d.nome}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group full-width" id="driver-suggestion-container" style="display: none; margin-top: -8px; margin-bottom: 8px;">
                        <!-- Suggestion alert injected here dynamically -->
                    </div>
                    <input type="hidden" name="associacaoTipo" id="fine-associacao-tipo" value="${isEdit ? multa.associacaoTipo || 'sem_motorista' : 'sem_motorista'}">
                    <input type="hidden" name="viagemId" id="fine-viagem-id" value="${isEdit && multa.viagemId ? multa.viagemId : ''}">

                    <div class="form-group">
                        <label>Data da Infração <span class="required">*</span></label>
                        <input type="date" class="form-control" name="data" required value="${isEdit ? multa.data : ''}">
                    </div>

                    <div class="form-group">
                        <label>Horário da Infração <span class="required">*</span></label>
                        <input type="time" class="form-control" name="horario" required value="${isEdit ? multa.horario : '12:00'}">
                    </div>

                    <div class="form-group">
                        <label>Valor da Multa (R$) <span class="required">*</span></label>
                        <input type="text" class="form-control" name="valor" required placeholder="Ex: R$ 195,23" value="${isEdit && multa.valor ? window.movixApp.formatCurrency(multa.valor) : ''}">
                    </div>

                    <div class="form-group">
                        <label>Situação da Multa <span class="required">*</span></label>
                        <select class="form-control" name="status" required>
                            <option value="Não Pago" ${isEdit && multa.status === 'Não Pago' ? 'selected' : ''}>Não Pago</option>
                            <option value="Pago" ${isEdit && multa.status === 'Pago' ? 'selected' : ''}>Pago</option>
                            <option value="Recorrendo" ${isEdit && multa.status === 'Recorrendo' ? 'selected' : ''}>Recorrendo (Autuada)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Data de Vencimento do Boleto</label>
                        <input type="date" class="form-control" name="dataVencimentoBoleto" value="${isEdit && multa.dataVencimentoBoleto ? multa.dataVencimentoBoleto : ''}">
                    </div>

                    <div class="form-group full-width">
                        <label>Anexar Comprovante / Guia de Multa (PDF, JPG, PNG)</label>
                        <div class="file-upload-area" id="multa-upload-trigger" style="margin-top: 4px; cursor: pointer; padding: 16px;">
                            <i class="fa-solid fa-cloud-arrow-up text-primary"></i>
                            <span class="file-upload-text" id="multa-upload-text" style="font-size:0.8rem;">
                                ${isEdit && multa.anexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${multa.anexo.split('/').pop()}</strong>` : 'Arraste ou clique para anexar comprovante'}
                            </span>
                            <input type="file" id="multa-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="anexo" id="multa-anexo-url" value="${isEdit && multa.anexo ? multa.anexo : ''}">
                        
                        <div id="multa-anexo-actions" style="display:${isEdit && multa.anexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && multa.anexo ? multa.anexo : '#'}" id="btn-visualizar-multa-anexo" target="_blank" class="btn btn-secondary" style="height:32px; padding:0 12px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-eye"></i> Visualizar
                            </a>
                            <button type="button" class="btn btn-danger" id="btn-remover-multa-anexo" style="height:32px; padding:0 12px; font-size:0.75rem; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Descrição Detalhada da Infração <span class="required">*</span></label>
                        <textarea class="form-control" name="descricao" required placeholder="Excesso de velocidade, avanço de sinal vermelho, estacionamento irregular...">${isEdit ? multa.descricao : ''}</textarea>
                    </div>

                    <div class="form-group full-width">
                        <label>Observações / Notas Adicionais</label>
                        <textarea class="form-control" name="observacoes" placeholder="Anotações gerais sobre andamento de defesas ou pagamentos">${isEdit ? multa.observacoes : ''}</textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">Gravar Registro</button>
            `;

            modal.classList.add('active');

            // Handle uploads
            const uploadTrigger = document.getElementById('multa-upload-trigger');
            const fileInput = document.getElementById('multa-file-input');
            const uploadText = document.getElementById('multa-upload-text');
            const anexoUrl = document.getElementById('multa-anexo-url');
            const anexoActions = document.getElementById('multa-anexo-actions');
            const btnVisualizar = document.getElementById('btn-visualizar-multa-anexo');
            const btnRemover = document.getElementById('btn-remover-multa-anexo');

            if (uploadTrigger && fileInput) {
                uploadTrigger.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        uploadText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
                        uploadTrigger.style.pointerEvents = 'none';

                        const res = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                        });

                        if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Erro no upload.');
                        }

                        const result = await res.json();
                        anexoUrl.value = result.url;
                        uploadText.innerHTML = `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${result.name}</strong>`;
                        
                        btnVisualizar.href = result.url;
                        anexoActions.style.display = 'flex';

                        window.movixApp.showToast('Comprovante anexado!', 'success');
                    } catch (err) {
                        console.error(err);
                        window.movixApp.showToast(err.message || 'Erro ao enviar arquivo.', 'danger');
                        uploadText.innerText = 'Arraste ou clique para anexar comprovante';
                    } finally {
                        uploadTrigger.style.pointerEvents = 'auto';
                    }
                });
            }

            if (btnRemover) {
                btnRemover.addEventListener('click', () => {
                    anexoUrl.value = '';
                    uploadText.innerText = 'Arraste ou clique para anexar comprovante';
                    anexoActions.style.display = 'none';
                    fileInput.value = '';
                    window.movixApp.showToast('Anexo removido.', 'info');
                });
            }

            // SUGGESTION DETECT ENGINE
            function runDriverSuggestionEngine() {
                const form = document.getElementById('form-multa');
                if (!form) return;

                const veiculoSelect = form.querySelector('[name="veiculoId"]');
                const dataInput = form.querySelector('[name="data"]');
                const horarioInput = form.querySelector('[name="horario"]');
                const driverSelect = form.querySelector('[name="motoristaId"]');
                const suggestionContainer = document.getElementById('driver-suggestion-container');
                const assocTipoHidden = document.getElementById('fine-associacao-tipo');
                const viagemIdHidden = document.getElementById('fine-viagem-id');

                if (!veiculoSelect || !dataInput || !horarioInput || !suggestionContainer) return;

                const veiculoId = veiculoSelect.value;
                const dataVal = dataInput.value;
                const horarioVal = horarioInput.value;

                const detection = detectSuggestedDriver(veiculoId, dataVal, horarioVal);

                if (detection.trips.length === 0) {
                    suggestionContainer.style.display = 'none';
                    suggestionContainer.innerHTML = '';
                    return;
                }

                suggestionContainer.style.display = 'block';

                if (detection.trips.length === 1) {
                    const vi = detection.trips[0];
                    const d = detection.driver;
                    
                    if (!d) {
                        suggestionContainer.style.display = 'none';
                        suggestionContainer.innerHTML = '';
                        return;
                    }

                    const periodText = `${vi.dataSaida.split('-').reverse().join('/')} às ${vi.horaSaida || '00:00'} até ` +
                        (vi.status === 'Realizada' ? `${vi.dataRetorno.split('-').reverse().join('/')} às ${vi.horaRetorno || '23:59'}` : 'Em Andamento');

                    suggestionContainer.innerHTML = `
                        <div class="alert-premium-suggestion" style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid var(--success); padding: 12px 16px; border-radius: var(--border-radius-sm); font-size: 0.8rem; display: flex; flex-direction: column; gap: 8px; border: 1px solid rgba(16, 185, 129, 0.18);">
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-lightbulb text-success" style="font-size: 1.15rem;"></i>
                                    <span style="font-weight: 700; color: var(--success); font-family: var(--font-heading);">Possível motorista responsável identificado com base na viagem cadastrada.</span>
                                </div>
                                <button type="button" class="btn btn-secondary" id="btn-vincular-sugestao" style="font-size: 0.72rem; padding: 2px 10px; height: 28px; font-weight: 700; color: var(--success); border-color: var(--success); background: transparent; transition: all 0.2s ease;">
                                    <i class="fa-solid fa-link"></i> Confirmar Sugestão
                                </button>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: var(--text-main); margin-top: 4px;">
                                <div><span style="color: var(--text-muted); font-weight: 500;">Motorista:</span> <strong>${d.nome}</strong></div>
                                <div><span style="color: var(--text-muted); font-weight: 500;">Horário da Viagem:</span> <strong>${periodText}</strong></div>
                                <div style="grid-column: span 2;"><span style="color: var(--text-muted); font-weight: 500;">Rota da Viagem:</span> <strong>${vi.origem} ➔ ${vi.destino}</strong></div>
                            </div>
                        </div>
                    `;

                    // Bind suggestion trigger button with link/unlink toggle capability
                    const btnVincular = document.getElementById('btn-vincular-sugestao');
                    
                    function syncSuggestionButtonState() {
                        if (!btnVincular) return;
                        const isCurrentlyLinked = driverSelect.value === d.id && assocTipoHidden.value === 'automatica';
                        if (isCurrentlyLinked) {
                            btnVincular.innerHTML = '<i class="fa-solid fa-link-slash"></i> Desvincular';
                            btnVincular.style.backgroundColor = 'var(--success)';
                            btnVincular.style.color = '#fff';
                            btnVincular.style.borderColor = 'var(--success)';
                        } else {
                            btnVincular.innerHTML = '<i class="fa-solid fa-link"></i> Confirmar Sugestão';
                            btnVincular.style.backgroundColor = 'transparent';
                            btnVincular.style.color = 'var(--success)';
                            btnVincular.style.borderColor = 'var(--success)';
                        }
                    }

                    if (btnVincular) {
                        btnVincular.addEventListener('click', () => {
                            const isCurrentlyLinked = driverSelect.value === d.id && assocTipoHidden.value === 'automatica';
                            if (isCurrentlyLinked) {
                                driverSelect.value = "";
                                assocTipoHidden.value = 'sem_motorista';
                                viagemIdHidden.value = '';
                                window.movixApp.showToast('Motorista desvinculado com sucesso!', 'info');
                            } else {
                                driverSelect.value = d.id;
                                assocTipoHidden.value = 'automatica';
                                viagemIdHidden.value = vi.id;
                                window.movixApp.showToast('Sugestão inteligente aplicada!', 'success');
                            }
                            syncSuggestionButtonState();
                        });
                    }

                    // Run initial state synchronization
                    syncSuggestionButtonState();
                } else {
                    // Conflict case
                    let conflictsHTML = '';
                    detection.trips.forEach((vi, idx) => {
                        const d = drivers.find(item => item.id === vi.motoristaId);
                        const driverName = d ? d.nome : 'Motorista';
                        const periodText = `${vi.dataSaida.split('-').reverse().join('/')} às ${vi.horaSaida || '00:00'} até ` +
                            (vi.status === 'Realizada' ? `${vi.dataRetorno.split('-').reverse().join('/')} às ${vi.horaRetorno || '23:59'}` : 'Em Andamento');

                        conflictsHTML += `
                            <div style="font-size: 0.75rem; border-top: 1px solid rgba(245, 158, 11, 0.2); padding-top: 6px; margin-top: 6px; display: flex; flex-direction: column;">
                                <span><strong>Viagem #${idx+1}:</strong> ${driverName} (${vi.origem} ➔ ${vi.destino})</span>
                                <span style="font-size: 0.7rem; color: var(--text-muted);">${periodText}</span>
                            </div>
                        `;
                    });

                    suggestionContainer.innerHTML = `
                        <div class="alert-premium-suggestion" style="background: rgba(245, 158, 11, 0.08); border-left: 4px solid var(--warning); padding: 12px 16px; border-radius: var(--border-radius-sm); font-size: 0.8rem; display: flex; flex-direction: column; gap: 6px; border: 1px solid rgba(245, 158, 11, 0.18);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-triangle-exclamation text-warning" style="font-size: 1.2rem;"></i>
                                <span style="font-weight: 700; color: var(--warning); font-family: var(--font-heading);">⚠️ Alerta de Conflito: Múltiplas viagens identificadas para este veículo!</span>
                            </div>
                            <span style="font-size: 0.75rem; color: var(--text-main);">Identificamos mais de uma viagem ativa para este veículo no período da infração. Escolha manualmente o motorista correto no campo acima:</span>
                            <div style="display: flex; flex-direction: column;">
                                ${conflictsHTML}
                            </div>
                        </div>
                    `;
                }
            }

            const veiculoSelect = document.querySelector('[name="veiculoId"]');
            const dataInput = document.querySelector('[name="data"]');
            const horarioInput = document.querySelector('[name="horario"]');
            const driverSelect = document.querySelector('[name="motoristaId"]');

            if (veiculoSelect && dataInput && horarioInput) {
                veiculoSelect.addEventListener('change', runDriverSuggestionEngine);
                dataInput.addEventListener('change', runDriverSuggestionEngine);
                horarioInput.addEventListener('input', runDriverSuggestionEngine);
            }

            if (driverSelect) {
                driverSelect.addEventListener('change', () => {
                    const assocTipoHidden = document.getElementById('fine-associacao-tipo');
                    const viagemIdHidden = document.getElementById('fine-viagem-id');
                    
                    if (driverSelect.value !== "") {
                        const detection = detectSuggestedDriver(veiculoSelect.value, dataInput.value, horarioInput.value);
                        if (detection.driver && detection.driver.id === driverSelect.value) {
                            assocTipoHidden.value = 'automatica';
                            viagemIdHidden.value = detection.trips[0].id;
                        } else {
                            assocTipoHidden.value = 'manual';
                            viagemIdHidden.value = '';
                        }
                    } else {
                        assocTipoHidden.value = 'sem_motorista';
                        viagemIdHidden.value = '';
                    }

                    // Synchronize dynamic button state if suggestion button is visible
                    const btnVincular = document.getElementById('btn-vincular-sugestao');
                    if (btnVincular) {
                        const detection = detectSuggestedDriver(veiculoSelect.value, dataInput.value, horarioInput.value);
                        if (detection.driver) {
                            const isCurrentlyLinked = driverSelect.value === detection.driver.id && assocTipoHidden.value === 'automatica';
                            if (isCurrentlyLinked) {
                                btnVincular.innerHTML = '<i class="fa-solid fa-link-slash"></i> Desvincular';
                                btnVincular.style.backgroundColor = 'var(--success)';
                                btnVincular.style.color = '#fff';
                                btnVincular.style.borderColor = 'var(--success)';
                            } else {
                                btnVincular.innerHTML = '<i class="fa-solid fa-link"></i> Confirmar Sugestão';
                                btnVincular.style.backgroundColor = 'transparent';
                                btnVincular.style.color = 'var(--success)';
                                btnVincular.style.borderColor = 'var(--success)';
                            }
                        }
                    }
                });
            }

            // Run suggestion check initially
            runDriverSuggestionEngine();

            // Save actions
            const saveBtn = document.getElementById('btn-salvar-modal');
            const cancelBtn = document.getElementById('btn-cancelar-modal');

            const closeModal = () => modal.classList.remove('active');
            cancelBtn.addEventListener('click', closeModal);

            saveBtn.addEventListener('click', async () => {
                const form = document.getElementById('form-multa');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const loader = window.movixApp.startLoading(saveBtn, isEdit ? "Atualizando..." : "Salvando...");
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => data[key] = value);

                try {
                    if (isEdit) {
                        data.historico = multa.historico;
                        await window.movixStore.updateMulta(id, data);
                        window.movixApp.showToast('Multa atualizada com sucesso!', 'success');
                    } else {
                        await window.movixStore.addMulta(data);
                        window.movixApp.showToast('Multa registrada com sucesso!', 'success');
                    }
                    closeModal();
                    renderMultas(document.getElementById('view-content-wrapper'));
                } catch (err) {
                    window.movixApp.showToast(err.message || 'Erro ao registrar multa.', 'danger');
                } finally {
                    loader.stop();
                }
            });
        }

        // VIEW MULTA & DETAILED AUDIT TRAIL HISTORICO MODAL
        function openMultaDetailModal(id) {
            const m = window.movixStore.getMulta(id);
            if (!m) return;

            const v = vehicles.find(item => item.id === m.veiculoId);
            const d = drivers.find(item => item.id === m.motoristaId);

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = `Detalhes da Infração: ${m.id}`;

            // Build visual auditing timeline entries HTML
            let historyTimelineHTML = '';
            if (m.historico && m.historico.length > 0) {
                historyTimelineHTML = m.historico.map(h => `
                    <div style="display:flex; gap:16px; border-left:2px solid var(--border-color); padding-left:16px; margin-left:8px; position:relative; padding-bottom:12px;">
                        <span style="position:absolute; left:-6px; top:4px; width:10px; height:10px; border-radius:50%; background-color:var(--primary);"></span>
                        <div style="display:flex; flex-direction:column; gap:2px; font-size:0.8rem;">
                            <div style="display:flex; gap:8px; align-items:center;">
                                <strong style="color:var(--text-main); font-weight:700;">${h.usuario}</strong>
                                <span style="font-size:0.7rem; color:var(--text-muted);">${new Date(h.data).toLocaleString('pt-BR')}</span>
                            </div>
                            <span style="color:var(--text-muted); font-size:0.75rem;">Ação: ${h.acao}</span>
                            <span style="font-size:0.7rem; font-weight:600; color:var(--primary);">Situação da época: <span class="status-pill status-gray" style="font-size:0.6rem; padding:1px 4px;">${h.status}</span></span>
                        </div>
                    </div>
                `).join('');
            } else {
                historyTimelineHTML = '<p style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Nenhum histórico registrado.</p>';
            }

            modalBody.innerHTML = `
                <div class="grid-1-1">
                    <div>
                        <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i> Informações da Infração</h4>
                        <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data</span><strong>${m.data.split('-').reverse().join('/')}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Horário</span><strong>${m.horario || '-'}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Veículo</span><strong style="color:var(--primary);">${v ? `${v.placa} (${v.marca} ${v.modelo})` : '-'}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Valor da Multa</span><strong style="font-size:1rem; color:var(--text-main);">R$ ${(parseFloat(m.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Responsável</span><strong>${d ? d.nome : '<span style="color:var(--text-muted); font-style:italic;">Sem motorista</span>'}</strong></li>
                            ${d ? `<li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Categoria do Condutor</span><strong>${m.motoristaCategoria || d.categoria || 'Motorista Efetivo'}</strong></li>` : ''}
                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Associação do Motorista</span>
                                <strong>
                                    ${m.associacaoTipo === 'automatica' ? '<span class="status-pill ok" style="font-weight:700;"><i class="fa-solid fa-robot"></i> Associado automaticamente</span>' :
                                      (m.associacaoTipo === 'manual' ? '<span class="status-pill primary" style="background-color:rgba(59,130,246,0.12); color:var(--primary); font-weight:700;"><i class="fa-solid fa-user-pen"></i> Associado manualmente</span>' :
                                      '<span class="status-pill status-gray" style="font-weight:700;"><i class="fa-solid fa-user-slash"></i> Sem motorista vinculado</span>')}
                                </strong>
                            </li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Situação Atual</span>
                                ${m.status === 'Pago' ? '<span class="status-pill ok">Pago</span>' : (m.status === 'Não Pago' ? '<span class="status-pill vencido">Não Pago</span>' : '<span class="status-pill atencao">Recorrendo</span>')}
                            </li>
                            <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Vencimento do Boleto</span><strong>${m.dataVencimentoBoleto ? m.dataVencimentoBoleto.split('-').reverse().join('/') : '<span style="color:var(--text-muted); font-style:italic;">Não informado</span>'}</strong></li>
                        </ul>

                        <div style="margin-top:20px;">
                            <h5 style="font-weight:700; margin-bottom:6px; font-size:0.85rem;">Descrição da Infração:</h5>
                            <p style="font-size:0.8rem; line-height:1.5; color:var(--text-muted); background:var(--bg-surface-hover); padding:10px; border-radius:6px; border-left:3px solid var(--primary); white-space:pre-wrap;">${m.descricao}</p>
                        </div>

                        ${m.observacoes ? `
                        <div style="margin-top:12px;">
                            <h5 style="font-weight:700; margin-bottom:6px; font-size:0.85rem;">Observações Adicionais:</h5>
                            <p style="font-size:0.8rem; line-height:1.5; color:var(--text-muted); background:var(--bg-surface-hover); padding:10px; border-radius:6px; border-left:3px solid var(--border-color); white-space:pre-wrap;">${m.observacoes}</p>
                        </div>` : ''}

                        ${m.viagemId ? (() => {
                            const vi = window.movixStore.getViagens().find(v => v.id === m.viagemId);
                            if (!vi) return '';
                            const periodText = `${vi.dataSaida.split('-').reverse().join('/')} às ${vi.horaSaida || '00:00'} até ` +
                                (vi.status === 'Realizada' ? `${vi.dataRetorno.split('-').reverse().join('/')} às ${vi.horaRetorno || '23:59'}` : 'Em Andamento');
                            return `
                            <div style="margin-top:20px; padding:12px; background:var(--bg-surface-hover); border-radius:6px; border-left:3px solid var(--success); font-size:0.8rem; border:1px solid var(--border-light);">
                                <h5 style="font-weight:700; margin-bottom:6px; color:var(--success); display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-route"></i> Viagem Relacionada (Vínculo Inteligente)</h5>
                                <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px;">
                                    <span><strong>Período da Viagem:</strong> ${periodText}</span>
                                    <span><strong>Rota:</strong> ${vi.origem} ➔ ${vi.destino}</span>
                                    <span><strong>Status da Viagem:</strong> <span class="status-pill ${vi.status === 'Realizada' ? 'ok' : 'atencao'}" style="font-size:0.6rem; padding:1px 4px; font-weight:700;">${vi.status}</span></span>
                                </div>
                            </div>
                            `;
                        })() : ''}

                        ${m.anexo ? `
                        <div style="margin-top:20px; display:flex; gap:12px;">
                            <a href="${m.anexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                                <i class="fa-solid fa-eye text-primary"></i> Visualizar Comprovante
                            </a>
                            <a href="${m.anexo}" download class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                                <i class="fa-solid fa-download"></i> Baixar Comprovante
                            </a>
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

        // CONFIRM DELETE
        function confirmDeleteMulta(id) {
            const m = window.movixStore.getMulta(id);
            if (!m) return;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Excluir Registro de Multa';
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Deseja permanentemente remover a multa no valor de <strong>R$ ${(parseFloat(m.valor) || 0).toFixed(2)}</strong>?</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Esta ação removerá permanentemente o histórico e custos com a infração de toda auditoria corporativa.</p>
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
                    await window.movixStore.deleteMulta(id);
                    window.movixApp.showToast('Multa removida com sucesso.', 'success');
                    modal.classList.remove('active');
                    renderMultas(document.getElementById('view-content-wrapper'));
                } catch (err) {
                    window.movixApp.showToast(err.message || 'Erro ao deletar multa.', 'danger');
                } finally {
                    loader.stop();
                }
            });
        }

        updateTable();
    }

    window.movixRouter.register('multas', renderMultas);
})();
