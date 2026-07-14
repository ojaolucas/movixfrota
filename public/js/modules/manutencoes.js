/* MovixFrota - Manutenções Module */

(function() {
    
    function renderManutencoes(container) {
        const maintenances = window.movixStore.getMaintenances();
        const vehicles = window.movixStore.getVeiculos();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';
        
        let state = window.movixApp.getListState('manutencoes');
        if (!state) {
            state = {
                currentPage: 1,
                filters: {
                    veiculoId: '',
                    tipo: '',
                    categoria: '',
                    status: ''
                },
                itemsPerPage: 10,
                scroll: 0
            };
            window.movixApp.saveListState('manutencoes', state);
        } else if (state.itemsPerPage === undefined) {
            state.itemsPerPage = 10;
            window.movixApp.saveListState('manutencoes', state);
        }

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Manutenções e Despesas Operacionais</h1>
                    <p class="page-subtitle">Registre manutenções preventivas, corretivas e despesas operacionais da frota (lavagem, guincho, licenciamento e mais)</p>
                </div>
                <div class="page-actions">
                    ${!isVisualizador ? `
                        <button class="btn btn-primary" id="btn-nova-manutencao">
                            <i class="fa-solid fa-plus"></i> Registrar Serviço / Despesa
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- CARDS DE METRICAS RAPIDAS -->
            <div class="grid-3">
                <div class="card stat-card" style="padding: 16px 20px;">
                    <div class="stat-info" style="gap:4px;">
                        <span class="stat-label" style="font-size:0.75rem;">Total Gasto Oficina</span>
                        <span class="stat-value" id="val-total-manut" style="font-size:1.45rem;">R$ 0,00</span>
                    </div>
                    <div class="stat-icon danger" style="width:36px; height:36px; font-size:1rem;"><i class="fa-solid fa-coins"></i></div>
                </div>

                <div class="card stat-card" style="padding: 16px 20px;">
                    <div class="stat-info" style="gap:4px;">
                        <span class="stat-label" style="font-size:0.75rem;">Preventivas Realizadas</span>
                        <span class="stat-value" id="val-prev-count" style="font-size:1.45rem;">0</span>
                    </div>
                    <div class="stat-icon success" style="width:36px; height:36px; font-size:1rem;"><i class="fa-solid fa-square-check"></i></div>
                </div>

                <div class="card stat-card" style="padding: 16px 20px;">
                    <div class="stat-info" style="gap:4px;">
                        <span class="stat-label" style="font-size:0.75rem;">Corretivas Urgentes</span>
                        <span class="stat-value" id="val-corr-count" style="font-size:1.45rem;">0</span>
                    </div>
                    <div class="stat-icon warning" style="width:36px; height:36px; font-size:1rem;"><i class="fa-solid fa-triangle-exclamation"></i></div>
                </div>
            </div>

            <!-- FILTERS -->
            <div class="filters-card" style="margin-top: 12px;">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Placa Veículo</label>
                        <select class="filter-input" id="filter-veiculo-manut">
                            <option value="">Todos</option>
                            ${vehicles.map(v => `<option value="${v.id}" ${state.filters.veiculoId === v.id ? 'selected' : ''}>${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Tipo</label>
                        <select class="filter-input" id="filter-tipo-manut">
                            <option value="">Todos</option>
                            <option value="Preventiva" ${state.filters.tipo === 'Preventiva' ? 'selected' : ''}>Preventiva</option>
                            <option value="Corretiva" ${state.filters.tipo === 'Corretiva' ? 'selected' : ''}>Corretiva</option>
                            <option value="Despesa Operacional" ${state.filters.tipo === 'Despesa Operacional' ? 'selected' : ''}>Despesa Operacional</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Categoria</label>
                        <select class="filter-input" id="filter-cat-manut">
                            <option value="">Todas</option>
                            <optgroup label="— Manutenção Mecânica —">
                                <option value="Mecânica" ${state.filters.categoria === 'Mecânica' ? 'selected' : ''}>Mecânica Geral</option>
                                <option value="Pneus" ${state.filters.categoria === 'Pneus' ? 'selected' : ''}>Pneus / Alinhamento / Balanceamento</option>
                                <option value="Lubrificantes" ${state.filters.categoria === 'Lubrificantes' ? 'selected' : ''}>Lubrificantes / Filtros</option>
                                <option value="Freios" ${state.filters.categoria === 'Freios' ? 'selected' : ''}>Freios / Segurança</option>
                                <option value="Suspensão" ${state.filters.categoria === 'Suspensão' ? 'selected' : ''}>Suspensão / Direção</option>
                            </optgroup>
                            <optgroup label="— Despesa Operacional —">
                                <option value="Elétrica" ${state.filters.categoria === 'Elétrica' ? 'selected' : ''}>Elétrica / Bateria</option>
                                <option value="Estética" ${state.filters.categoria === 'Estética' ? 'selected' : ''}>Estética / Lavagem</option>
                                <option value="Funilaria" ${state.filters.categoria === 'Funilaria' ? 'selected' : ''}>Funilaria / Pintura</option>
                                <option value="Guincho" ${state.filters.categoria === 'Guincho' ? 'selected' : ''}>Guincho / Reboque</option>
                            </optgroup>
                            <optgroup label="— Taxas e Documentação —">
                                <option value="Licenciamento" ${state.filters.categoria === 'Licenciamento' ? 'selected' : ''}>Licenciamento</option>
                                <option value="IPVA" ${state.filters.categoria === 'IPVA' ? 'selected' : ''}>IPVA / DPVAT</option>
                                <option value="Vistoria" ${state.filters.categoria === 'Vistoria' ? 'selected' : ''}>Vistoria / Laudo</option>
                                <option value="Outros" ${state.filters.categoria === 'Outros' ? 'selected' : ''}>Outros</option>
                            </optgroup>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação da O.S.</label>
                        <select class="filter-input" id="filter-status-manut">
                            <option value="">Todas</option>
                            <option value="Programada" ${state.filters.status === 'Programada' ? 'selected' : ''}>Programada</option>
                            <option value="Em andamento" ${state.filters.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                            <option value="Realizada" ${state.filters.status === 'Realizada' ? 'selected' : ''}>Realizada</option>
                            <option value="Atrasada" ${state.filters.status === 'Atrasada' ? 'selected' : ''}>Atrasada</option>
                        </select>
                    </div>
                    <div class="filter-group" style="justify-content: flex-end;">
                        <button class="btn btn-secondary" id="btn-limpar-filtros" style="height: 38px; width: 100%; white-space: nowrap; justify-content: center;">
                            <i class="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
                        </button>
                    </div>
                </div>
            </div>

            <!-- TABLE -->
            <div class="table-responsive">
                <table class="smart-table" id="table-manutencoes">
                    <thead>
                        <tr>
                            <th>Veículo</th>
                            <th>Tipo / Categoria</th>
                            <th>Data Programada</th>
                            <th>KM Agendado</th>
                            <th>Oficina</th>
                            <th>Custo Total</th>
                            <th>Situação</th>
                            <th style="width: 100px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-manutencoes">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
                <div class="table-pagination" id="pagination-manutencoes"></div>
            </div>
        `;

        let filteredData = [...maintenances];
        let currentPage = state.currentPage;

        function updateMetrics() {
            // Update upper counts based on currently selected filters (dynamic UX)
            const totalCusto = filteredData.reduce((acc, m) => acc + (m.status === 'Realizada' || m.status === 'Em andamento' ? m.valor : 0), 0);
            const prevCount = filteredData.filter(m => m.tipo === 'Preventiva' && m.status === 'Realizada').length;
            const corrCount = filteredData.filter(m => m.tipo === 'Corretiva').length;

            document.getElementById('val-total-manut').innerText = window.movixApp.formatCurrency(totalCusto);
            document.getElementById('val-prev-count').innerText = prevCount;
            document.getElementById('val-corr-count').innerText = corrCount;
        }

        function updateTable() {
            const tbody = document.getElementById('tbody-manutencoes');
            if (!tbody) return;

            const veiculoVal = document.getElementById('filter-veiculo-manut').value;
            const tipoVal = document.getElementById('filter-tipo-manut').value;
            const catVal = document.getElementById('filter-cat-manut').value;
            const statusVal = document.getElementById('filter-status-manut').value;

            // Save filter state
            state.filters = {
                veiculoId: veiculoVal,
                tipo: tipoVal,
                categoria: catVal,
                status: statusVal
            };
            state.currentPage = currentPage;
            window.movixApp.saveListState('manutencoes', state);

            filteredData = maintenances.filter(m => {
                const matchVeiculo = !veiculoVal || m.veiculoId === veiculoVal;
                const matchTipo = !tipoVal || m.tipo === tipoVal;
                const matchCat = !catVal || m.categoria === catVal;
                const matchStatus = !statusVal || m.status === statusVal;
                return matchVeiculo && matchTipo && matchCat && matchStatus;
            });

            // Update top count summaries dynamically
            updateMetrics();

            const itemsPerPageVal = state.itemsPerPage === 'Todos' ? Infinity : (parseInt(state.itemsPerPage) || 10);
            const totalPages = Math.ceil(filteredData.length / itemsPerPageVal) || 1;
            if (currentPage > totalPages) {
                currentPage = totalPages;
                state.currentPage = currentPage;
                window.movixApp.saveListState('manutencoes', state);
            }
            const startIdx = itemsPerPageVal === Infinity ? 0 : (currentPage - 1) * itemsPerPageVal;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPageVal);

            tbody.innerHTML = '';
            if (paginatedItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="search-no-results" style="text-align: center;">Nenhuma manutenção programada para os filtros selecionados</td></tr>`;
                document.getElementById('pagination-manutencoes').innerHTML = '';
                return;
            }

            paginatedItems.forEach(m => {
                const v = vehicles.find(item => item.id === m.veiculoId);
                const statusClass = m.status === 'Realizada' ? 'realizada' : (m.status === 'Em andamento' ? 'em_andamento' : (m.status === 'Programada' ? 'programada' : 'atrasada'));

                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="window.movixRouter.navigateTo('veiculos', '${m.veiculoId}')">
                            ${v ? v.placa : 'Veículo Deletado'}
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span style="font-weight:600;">${m.tipo}</span>
                                    ${m.anexo ? `<a href="${m.anexo}" target="_blank" title="Visualizar Nota Fiscal / Recibo" style="color:var(--primary); font-size:0.85rem;"><i class="fa-solid fa-paperclip"></i></a>` : ''}
                                </div>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${m.categoria}</span>
                            </div>
                        </td>
                        <td>${m.data.split('-').reverse().join('/')}</td>
                        <td style="font-weight:600; color: ${(!m.km || parseFloat(m.km) === 0) ? 'var(--text-muted)' : 'inherit'}">${(!m.km || parseFloat(m.km) === 0) ? '<span style="font-size:0.8rem;">—</span>' : parseFloat(m.km).toLocaleString('pt-BR') + ' km'}</td>
                        <td>${m.oficina}</td>
                        <td style="font-weight:700;">${window.movixApp.formatCurrency(m.valor)}</td>
                        <td><span class="status-pill ${statusClass}">${m.status}</span></td>
                        <td style="text-align: center; display: flex; justify-content: center; gap: 8px;">
                            <button class="btn-icon-only btn-view" data-id="${m.id}" title="Visualizar OS">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            ${!isVisualizador ? `
                                <button class="btn-icon-only btn-edit" data-id="${m.id}" title="Alterar Status / Editar">
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

            // Pagination Render using centralized helper
            window.movixApp.renderPagination({
                containerId: 'pagination-manutencoes',
                currentPage: currentPage,
                totalItems: filteredData.length,
                itemsPerPage: state.itemsPerPage || 10,
                noun: 'manutenções',
                onPageChange: (newPage) => {
                    currentPage = newPage;
                    state.currentPage = newPage;
                    window.movixApp.saveListState('manutencoes', state);
                    updateTable();
                },
                onItemsPerPageChange: (newLimit) => {
                    state.itemsPerPage = newLimit;
                    currentPage = 1;
                    state.currentPage = 1;
                    window.movixApp.saveListState('manutencoes', state);
                    updateTable();
                }
            });

            // Restore scroll position
            setTimeout(() => {
                window.scrollTo(0, state.scroll || 0);
            }, 0);
        }

        // Initialize Autocompletes
        window.movixApp.initAutocomplete(document.getElementById('filter-veiculo-manut'), 'Filtrar veículo...');

        // Filters events hooks
        document.getElementById('filter-veiculo-manut').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-tipo-manut').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-cat-manut').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-status-manut').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
            const fV = document.getElementById('filter-veiculo-manut');
            const fT = document.getElementById('filter-tipo-manut');
            const fC = document.getElementById('filter-cat-manut');
            const fS = document.getElementById('filter-status-manut');
            fV.value = '';
            fT.value = '';
            fC.value = '';
            fS.value = '';
            fV.dispatchEvent(new Event('change'));
            fT.dispatchEvent(new Event('change'));
            fC.dispatchEvent(new Event('change'));
            fS.dispatchEvent(new Event('change'));
            currentPage = 1;
            updateTable();
        });

        // Pagination handled by MovixApp.renderPagination helper

        // Add maintenance trigger
        if (document.getElementById('btn-nova-manutencao')) {
            document.getElementById('btn-nova-manutencao').addEventListener('click', () => openManutencaoModal());
        }

        // Deletion, Editing and View Triggers
        document.querySelector('.table-responsive').addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.btn-view');
            const editBtn = e.target.closest('.btn-edit');
            const delBtn = e.target.closest('.btn-delete');
            
            if (viewBtn) openManutencaoDetailModal(viewBtn.getAttribute('data-id'));
            if (editBtn) openManutencaoModal(editBtn.getAttribute('data-id'));
            if (delBtn) confirmDeleteManutencao(delBtn.getAttribute('data-id'));
        });

        // CRUD Modal Dialog
        function openManutencaoModal(id = null) {
            const isEdit = id !== null;
            const m = isEdit ? maintenances.find(item => item.id === id) : null;
            
            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = isEdit ? `Ordem de Serviço: ${id}` : 'Registrar Serviço ou Despesa';

            modalBody.innerHTML = `
                <form id="form-manutencao" class="form-grid">
                    <div class="form-group">
                        <label>Data Programada <span class="required">*</span></label>
                        <input type="date" class="form-control" name="data" required value="${isEdit ? m.data : ''}">
                    </div>

                    <div class="form-group">
                        <label>Veículo Alvo <span class="required">*</span></label>
                        <select class="form-control" name="veiculoId" id="man-veic-sel" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione um veículo</option>
                            ${vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual}" ${isEdit && m.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Tipo de Serviço <span class="required">*</span></label>
                        <select class="form-control" name="tipo" id="man-tipo-sel" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione o tipo</option>
                            <option value="Preventiva" ${isEdit && m.tipo === 'Preventiva' ? 'selected' : ''}>Preventiva (Programada por KM/Tempo)</option>
                            <option value="Corretiva" ${isEdit && m.tipo === 'Corretiva' ? 'selected' : ''}>Corretiva (Avaria / Quebra)</option>
                            <option value="Despesa Operacional" ${isEdit && m.tipo === 'Despesa Operacional' ? 'selected' : ''}>Despesa Operacional (Lavagem, Taxa, Guincho...)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Categoria <span class="required">*</span></label>
                        <select class="form-control" name="categoria" id="man-cat-sel" required>
                            <!-- Dynamically populated -->
                        </select>
                    </div>

                    <div class="form-group" id="man-km-wrapper">
                        <label id="man-km-label">KM Programado / Executado <span class="required" id="man-km-asterisk">*</span></label>
                        <input type="number" class="form-control" name="km" id="man-km-input" placeholder="Ex: 145000" min="0" value="${isEdit ? m.km : ''}">
                        <span style="font-size:0.7rem; color:var(--text-muted); margin-top:2px; display:block;" id="man-km-help"></span>
                    </div>

                    <div class="form-group">
                        <label>Custo total estimado (R$) <span class="required">*</span></label>
                        <input type="text" class="form-control" name="valor" required placeholder="Ex: R$ 850,00" value="${isEdit && m.valor ? window.movixApp.formatCurrency(m.valor) : ''}">
                    </div>

                    <div class="form-group">
                        <label id="man-oficina-label">Oficina / Estabelecimento <span class="required">*</span></label>
                        <input type="text" class="form-control" name="oficina" id="man-oficina-input" required placeholder="Nome da mecânica" value="${isEdit ? m.oficina : ''}">
                    </div>

                    <div class="form-group">
                        <label>Fornecedor de Peças</label>
                        <input type="text" class="form-control" name="fornecedor" placeholder="Ex: Distribuidora Scania" value="${isEdit && m.fornecedor ? m.fornecedor : ''}">
                    </div>

                    <div class="form-group">
                        <label>Situação da O.S. <span class="required">*</span></label>
                        <select class="form-control" name="status" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione a situação da O.S.</option>
                            <option value="Programada" ${isEdit && m.status === 'Programada' ? 'selected' : ''}>Programada</option>
                            <option value="Em andamento" ${isEdit && m.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                            <option value="Realizada" ${isEdit && m.status === 'Realizada' ? 'selected' : ''}>Realizada (Concluída)</option>
                            <option value="Atrasada" ${isEdit && m.status === 'Atrasada' ? 'selected' : ''}>Atrasada</option>
                        </select>
                    </div>

                    <div class="form-group full-width">
                        <label>Anexar Nota Fiscal / Recibo (PDF ou Imagem)</label>
                        <div class="file-upload-area" id="man-upload-trigger" style="margin-top: 4px; cursor: pointer;">
                            <i class="fa-solid fa-cloud-arrow-up"></i>
                            <span class="file-upload-text" id="man-upload-text">
                                ${isEdit && m.anexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${m.anexo.split('/').pop()}</strong>` : 'Arraste ou clique para anexar Nota Fiscal'}
                            </span>
                            <span class="file-upload-hint">Formatos aceitos: PDF, JPG, PNG, JPEG (Máx. 10MB)</span>
                            <input type="file" id="man-file-input" style="display:none;" accept="image/*,application/pdf">
                        </div>
                        <input type="hidden" name="anexo" id="man-anexo-url" value="${isEdit && m.anexo ? m.anexo : ''}">
                        
                        <div id="man-anexo-actions" style="display:${isEdit && m.anexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                            <a href="${isEdit && m.anexo ? m.anexo : '#'}" id="btn-visualizar-anexo" target="_blank" class="btn btn-secondary" style="height:32px; padding:0 12px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-eye"></i> Visualizar
                            </a>
                            <a href="${isEdit && m.anexo ? m.anexo : '#'}" id="btn-baixar-anexo" download class="btn btn-secondary" style="height:32px; padding:0 12px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-download"></i> Baixar
                            </a>
                            <button type="button" class="btn btn-danger" id="btn-remover-anexo" style="height:32px; padding:0 12px; font-size:0.75rem; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Descrição Detalhada do Serviço <span class="required">*</span></label>
                        <textarea class="form-control" name="descricao" required placeholder="Substituição de correia dentada, troca de pastilhas de freio...">${isEdit ? m.descricao : ''}</textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">Gravar Ordem</button>
            `;

            modal.classList.add('active');

            // Autocomplete KM and Categories update dynamically based on unit type
            const veicSel = document.getElementById('man-veic-sel');
            const kmInput = document.getElementById('man-km-input');
            const catSel = document.getElementById('man-cat-sel');

            window.movixApp.initAutocomplete(veicSel, 'Selecione o veículo...');

            // Dicionário de comportamento por categoria
            const CATEGORIAS_CONFIG = {
                // KM Obrigatório
                'Mecânica':      { requerKM: 'required', labelEstab: 'Oficina / Estabelecimento' },
                'Pneus':         { requerKM: 'required', labelEstab: 'Borracharia / Oficina' },
                'Lubrificantes': { requerKM: 'required', labelEstab: 'Oficina / Estabelecimento' },
                'Freios':        { requerKM: 'required', labelEstab: 'Oficina / Estabelecimento' },
                'Suspensão':     { requerKM: 'required', labelEstab: 'Oficina / Estabelecimento' },
                // Implemento/Reboque (KM opcional)
                'Rolamentos':    { requerKM: 'optional', labelEstab: 'Oficina / Estabelecimento' },
                'Estrutura':     { requerKM: 'optional', labelEstab: 'Oficina / Soldagem' },
                'Solda':         { requerKM: 'optional', labelEstab: 'Oficina / Soldagem' },
                'Parte elétrica':{ requerKM: 'optional', labelEstab: 'Elétrica / Oficina' },
                'Lubrificação':  { requerKM: 'optional', labelEstab: 'Oficina / Estabelecimento' },
                // KM Opcional
                'Elétrica':      { requerKM: 'optional', labelEstab: 'Elétrica / Oficina' },
                'Estética':      { requerKM: 'optional', labelEstab: 'Lava-Jato / Estética' },
                'Funilaria':     { requerKM: 'optional', labelEstab: 'Funilaria / Pintura' },
                'Guincho':       { requerKM: 'optional', labelEstab: 'Empresa de Guincho' },
                // KM Oculto (Documental)
                'Licenciamento': { requerKM: 'hidden',   labelEstab: 'Órgão / Despachante' },
                'IPVA':          { requerKM: 'hidden',   labelEstab: 'Órgão / Despachante' },
                'Vistoria':      { requerKM: 'hidden',   labelEstab: 'Vistoriadora / CIRETRAN' },
                'Outros':        { requerKM: 'hidden',   labelEstab: 'Fornecedor / Estabelecimento' },
            };

            // Aplica comportamento do campo KM com base no config da categoria
            const applyKMBehavior = (categoria) => {
                const config = CATEGORIAS_CONFIG[categoria] || { requerKM: 'required', labelEstab: 'Oficina / Estabelecimento' };
                const kmWrapper = document.getElementById('man-km-wrapper');
                const kmInput = document.getElementById('man-km-input');
                const kmLabel = document.getElementById('man-km-label');
                const kmAsterisk = document.getElementById('man-km-asterisk');
                const oficinaLabel = document.getElementById('man-oficina-label');
                const kmHelp = document.getElementById('man-km-help');

                if (config.requerKM === 'hidden') {
                    kmWrapper.style.display = 'none';
                    kmInput.removeAttribute('required');
                    kmInput.value = '0';
                    if (kmHelp) kmHelp.style.display = 'none';
                } else if (config.requerKM === 'optional') {
                    kmWrapper.style.display = '';
                    kmInput.removeAttribute('required');
                    if (kmAsterisk) kmAsterisk.style.display = 'none';
                    kmLabel.innerHTML = 'KM Atual do Veículo <span style="font-size:0.75rem;color:var(--text-muted);">(Opcional)</span>';
                    kmInput.placeholder = 'Opcional — registrar KM atual';
                    if (kmHelp) kmHelp.style.display = 'block';
                } else { // required
                    kmWrapper.style.display = '';
                    kmInput.setAttribute('required', '');
                    kmLabel.innerHTML = 'KM Programado / Executado <span class="required" id="man-km-asterisk">*</span>';
                    kmInput.placeholder = 'Ex: 145000';
                    if (kmHelp) kmHelp.style.display = 'block';
                }

                if (oficinaLabel) {
                    oficinaLabel.innerHTML = `${config.labelEstab} <span class="required">*</span>`;
                }
            };

            // Popula categorias de acordo com o tipo selecionado e o tipo de veículo
            const populateCategories = () => {
                const tipoSel = document.getElementById('man-tipo-sel');
                const tipoVal = tipoSel ? tipoSel.value : 'Preventiva';
                const selectedOption = veicSel.options[veicSel.selectedIndex];
                const veicId = veicSel.value;
                const selectedVeh = vehicles.find(v => v.id === veicId);
                const isTrailer = selectedVeh && selectedVeh.tipoUnidade === 'Implemento/Reboque';
                const curVal = isEdit ? m.categoria : catSel.value;

                if (!selectedOption || selectedOption.value === '') {
                    catSel.innerHTML = '<option value="">Selecione um veículo primeiro</option>';
                    applyKMBehavior('Mecânica');
                    return;
                }

                if (tipoVal === 'Despesa Operacional') {
                    catSel.innerHTML = `
                        <optgroup label="— Serviços Eventuais —">
                            <option value="Elétrica" ${curVal === 'Elétrica' ? 'selected' : ''}>Elétrica / Bateria</option>
                            <option value="Estética" ${curVal === 'Estética' ? 'selected' : ''}>Estética / Lavagem</option>
                            <option value="Funilaria" ${curVal === 'Funilaria' ? 'selected' : ''}>Funilaria / Pintura</option>
                            <option value="Guincho" ${curVal === 'Guincho' ? 'selected' : ''}>Guincho / Reboque</option>
                        </optgroup>
                        <optgroup label="— Taxas e Documentação —">
                            <option value="Licenciamento" ${curVal === 'Licenciamento' ? 'selected' : ''}>Licenciamento</option>
                            <option value="IPVA" ${curVal === 'IPVA' ? 'selected' : ''}>IPVA / DPVAT</option>
                            <option value="Vistoria" ${curVal === 'Vistoria' ? 'selected' : ''}>Vistoria / Laudo</option>
                            <option value="Outros" ${curVal === 'Outros' ? 'selected' : ''}>Outros</option>
                        </optgroup>
                    `;
                } else if (isTrailer) {
                    catSel.innerHTML = `
                        <option value="Suspensão" ${curVal === 'Suspensão' ? 'selected' : ''}>Suspensão</option>
                        <option value="Rolamentos" ${curVal === 'Rolamentos' ? 'selected' : ''}>Rolamentos</option>
                        <option value="Estrutura" ${curVal === 'Estrutura' ? 'selected' : ''}>Estrutura</option>
                        <option value="Solda" ${curVal === 'Solda' ? 'selected' : ''}>Solda</option>
                        <option value="Parte elétrica" ${curVal === 'Parte elétrica' ? 'selected' : ''}>Parte elétrica</option>
                        <option value="Pneus" ${curVal === 'Pneus' ? 'selected' : ''}>Pneus</option>
                        <option value="Lubrificação" ${curVal === 'Lubrificação' ? 'selected' : ''}>Lubrificação</option>
                        <option value="Estética" ${curVal === 'Estética' ? 'selected' : ''}>Estética / Lavagem</option>
                    `;
                } else {
                    catSel.innerHTML = `
                        <option value="Mecânica" ${curVal === 'Mecânica' ? 'selected' : ''}>Mecânica Geral</option>
                        <option value="Elétrica" ${curVal === 'Elétrica' ? 'selected' : ''}>Elétrica / Bateria</option>
                        <option value="Pneus" ${curVal === 'Pneus' ? 'selected' : ''}>Pneus / Alinhamento / Balanceamento</option>
                        <option value="Lubrificantes" ${curVal === 'Lubrificantes' ? 'selected' : ''}>Lubrificantes / Filtros</option>
                        <option value="Freios" ${curVal === 'Freios' ? 'selected' : ''}>Freios / Segurança</option>
                        <option value="Suspensão" ${curVal === 'Suspensão' ? 'selected' : ''}>Suspensão / Direção</option>
                    `;
                }

                // Atualiza o KM com base na categoria atualmente selecionada
                const currentCat = catSel.value;
                applyKMBehavior(currentCat);

                const kmInput = document.getElementById('man-km-input');
                const kmHelp = document.getElementById('man-km-help');
                const config = CATEGORIAS_CONFIG[currentCat] || { requerKM: 'required' };
                
                const veicKM = parseFloat(selectedOption.getAttribute('data-km')) || 0;
                if (kmHelp) {
                    kmHelp.innerText = `KM atual do veículo: ${veicKM.toLocaleString('pt-BR')} km. Lançamentos com KM menor serão validados como retroativos.`;
                }

                // Deixa o campo KM em branco se não estiver editando ou se trocar o veículo
                if (config.requerKM !== 'hidden' && (!isEdit || veicId !== m.veiculoId)) {
                    kmInput.value = '';
                }
            };

            if (veicSel) {
                veicSel.addEventListener('change', populateCategories);
                populateCategories();
            }

            const tipoSel = document.getElementById('man-tipo-sel');
            if (tipoSel) {
                tipoSel.addEventListener('change', populateCategories);
            }

            if (catSel) {
                catSel.addEventListener('change', () => applyKMBehavior(catSel.value));
            }

            // Se editando, aplicar comportamento imediato com a categoria salva
            if (isEdit && m.categoria) {
                applyKMBehavior(m.categoria);
            }

            // File Upload logic
            const uploadTrigger = document.getElementById('man-upload-trigger');
            const fileInput = document.getElementById('man-file-input');
            const uploadText = document.getElementById('man-upload-text');
            const anexoUrl = document.getElementById('man-anexo-url');
            const actionsDiv = document.getElementById('man-anexo-actions');
            const btnVisualizar = document.getElementById('btn-visualizar-anexo');
            const btnBaixar = document.getElementById('btn-baixar-anexo');
            const btnRemover = document.getElementById('btn-remover-anexo');

            if (uploadTrigger && fileInput) {
                uploadTrigger.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        uploadText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando arquivo...';
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
                        
                        // Update action buttons URLs and show div
                        btnVisualizar.href = result.url;
                        btnBaixar.href = result.url;
                        actionsDiv.style.display = 'flex';

                        window.movixApp.showToast('Nota Fiscal anexada com sucesso!', 'success');
                    } catch (err) {
                        console.error(err);
                        window.movixApp.showToast(err.message || 'Erro ao fazer upload do documento.', 'danger');
                        uploadText.innerText = 'Arraste ou clique para anexar Nota Fiscal';
                    } finally {
                        uploadTrigger.style.pointerEvents = 'auto';
                    }
                });
            }

            if (btnRemover) {
                btnRemover.addEventListener('click', () => {
                    anexoUrl.value = '';
                    uploadText.innerText = 'Arraste ou clique para anexar Nota Fiscal';
                    actionsDiv.style.display = 'none';
                    fileInput.value = '';
                    window.movixApp.showToast('Anexo removido da ordem.', 'info');
                });
            }

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const form = document.getElementById('form-manutencao');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => data[key] = value);

                const veiculoId = veicSel.value;
                const enteredKM = parseFloat(data.km) || 0;
                const originalKM = (isEdit && veiculoId === m.veiculoId) ? parseFloat(m.km) || 0 : 0;

                const selectedVeh = vehicles.find(v => v.id === veiculoId);
                const isTrailer = selectedVeh && selectedVeh.tipoUnidade === 'Implemento/Reboque';

                const saveAction = async (justificativa) => {
                     if (justificativa) {
                         data.descricao = (data.descricao || '') + (data.descricao ? '\n' : '') + `Motivo da divergência de KM: ${justificativa}`;
                     }
                     const saveBtn = document.getElementById('btn-salvar-modal');
                     const loader = window.movixApp.startLoading(saveBtn, isEdit ? "Atualizando..." : "Salvando...");
                     try {
                         if (isEdit) {
                             data.veiculoId = veiculoId;
                             await window.movixStore.updateMaintenance(id, data);
                             window.movixApp.showToast('Ordem de serviço atualizada!', 'success');
                         } else {
                             await window.movixStore.addMaintenance(data);
                             window.movixApp.showToast('Nova ordem registrada!', 'success');
                         }
                         modal.classList.remove('active');
                         renderManutencoes(document.getElementById('view-content-wrapper'));
                     } catch (err) {
                         window.movixApp.showToast(err.message || 'Erro ao salvar manutenção.', 'danger');
                     } finally {
                         loader.stop();
                     }
                 };

                // Verifica o comportamento do KM com base na categoria escolhida
                 const currentCatSel = document.getElementById('man-cat-sel');
                 const currentCat = currentCatSel ? currentCatSel.value : 'Mecânica';
                 const catConfig = CATEGORIAS_CONFIG[currentCat] || { requerKM: 'required' };
                 const kmExigido = catConfig.requerKM === 'required';

                 if (isTrailer || !kmExigido) {
                    saveAction();
                 } else {
                     window.movixApp.validateKM(veiculoId, enteredKM, saveAction, isEdit, originalKM);
                 }
            });
        }

    function openManutencaoDetailModal(id) {
        const m = maintenances.find(item => item.id === id);
        if (!m) return;

        const v = vehicles.find(item => item.id === m.veiculoId);

        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');

        modalTitle.innerText = `Detalhes da Ordem de Serviço: ${m.id}`;

        const statusClass = m.status === 'Realizada' ? 'realizada' : (m.status === 'Em andamento' ? 'em_andamento' : (m.status === 'Programada' ? 'programada' : 'atrasada'));

        modalBody.innerHTML = `
            <div style="padding: 10px;">
                <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i> Informações da OS</h4>
                <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Veículo</span><strong style="color:var(--primary);">${v ? `${v.placa} (${v.marca} ${v.modelo})` : 'Deletado'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Tipo da Manutenção</span><strong>${m.tipo}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Categoria</span><strong>${m.categoria}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data Programada</span><strong>${m.data.split('-').reverse().join('/')}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Quilometragem (KM)</span><strong>${(!m.km || parseFloat(m.km) === 0) ? '<span style="color:var(--text-muted);font-size:0.85rem">— Não aplicável</span>' : parseFloat(m.km || 0).toLocaleString('pt-BR') + ' km'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Oficina / Estabelecimento</span><strong>${m.oficina || '-'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Fornecedor de Peças</span><strong>${m.fornecedor || '-'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Valor da Manutenção</span><strong style="font-size:1.05rem; color:var(--text-main);">${window.movixApp.formatCurrency(m.valor)}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Status da OS</span><strong><span class="status-pill ${statusClass}">${m.status}</span></strong></li>
                </ul>

                ${m.descricao ? `
                <div style="margin-top:20px;">
                    <h5 style="font-weight:700; margin-bottom:6px; font-size:0.85rem;">Descrição dos Serviços:</h5>
                    <p style="font-size:0.8rem; line-height:1.5; color:var(--text-muted); background:var(--bg-surface-hover); padding:10px; border-radius:6px; border-left:3px solid var(--primary); white-space:pre-wrap;">${m.descricao}</p>
                </div>` : ''}

                ${m.anexo ? `
                <div style="margin-top:20px; display:flex; gap:12px;">
                    <a href="${m.anexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-eye text-primary"></i> Visualizar Nota Fiscal / Recibo
                    </a>
                    <a href="${m.anexo}" download class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-download"></i> Baixar Nota Fiscal / Recibo
                    </a>
                </div>` : ''}
            </div>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="btn-fechar-detalhe">Fechar</button>
        `;

        modal.classList.add('active');
        document.getElementById('btn-fechar-detalhe').addEventListener('click', () => modal.classList.remove('active'));
    }

        function confirmDeleteManutencao(id) {
            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Excluir Ordem de Serviço';
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Deseja permanentemente remover este registro de manutenção?</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Os gastos associados a esta OS serão eliminados da auditoria e dashboard.</p>
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
                    await window.movixStore.deleteMaintenance(id);
                    window.movixApp.showToast('OS removida.', 'danger');
                    modal.classList.remove('active');
                    renderManutencoes(document.getElementById('view-content-wrapper'));
                } catch (err) {
                    window.movixApp.showToast(err.message || 'Erro ao excluir OS.', 'danger');
                } finally {
                    loader.stop();
                }
            });
        }

        updateTable();
    }

    window.movixRouter.register('manutencoes', renderManutencoes);
})();
