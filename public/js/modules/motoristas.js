/* MovixFrota - Motoristas Module */

(function() {
    
    function renderMotoristas(container) {
        const drivers = window.movixStore.getMotoristas();
        const fuelLogs = window.movixStore.getAbastecimentos();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';
        
        let state = window.movixApp.getListState('motoristas');
        if (!state) {
            state = {
                currentPage: 1,
                currentSort: { column: 'nome', direction: 'asc' },
                filters: {
                    search: '',
                    cnhCat: '',
                    cnhStatus: '',
                    motStatus: ''
                },
                scroll: 0
            };
            window.movixApp.saveListState('motoristas', state);
        }
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Gestão de Motoristas</h1>
                    <p class="page-subtitle">Monitore a regularidade de habilitações (CNH) e desempenho de condução</p>
                </div>
                <div class="page-actions">
                    ${!isVisualizador ? `
                        <button class="btn btn-primary" id="btn-novo-motorista">
                            <i class="fa-solid fa-plus"></i> Novo Motorista
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- FILTERS -->
            <div class="filters-card">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Buscar Nome / CNH / E-mail</label>
                        <input type="text" class="filter-input" id="search-motoristas" placeholder="Buscar..." value="${state.filters.search || ''}">
                    </div>
                    <div class="filter-group">
                        <label>Categoria CNH</label>
                        <select class="filter-input" id="filter-cnh-cat">
                            <option value="">Todas</option>
                            <option value="B" ${state.filters.cnhCat === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" ${state.filters.cnhCat === 'C' ? 'selected' : ''}>C</option>
                            <option value="D" ${state.filters.cnhCat === 'D' ? 'selected' : ''}>D</option>
                            <option value="E" ${state.filters.cnhCat === 'E' ? 'selected' : ''}>E</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação da CNH</label>
                        <select class="filter-input" id="filter-cnh-status">
                            <option value="">Todas</option>
                            <option value="regular" ${state.filters.cnhStatus === 'regular' ? 'selected' : ''}>Regular</option>
                            <option value="vencida" ${state.filters.cnhStatus === 'vencida' ? 'selected' : ''}>Vencida</option>
                            <option value="a_vencer" ${state.filters.cnhStatus === 'a_vencer' ? 'selected' : ''}>A Vencer (10 dias)</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Status Operacional</label>
                        <select class="filter-input" id="filter-mot-status">
                            <option value="">Todos</option>
                            <option value="ativo" ${state.filters.motStatus === 'ativo' ? 'selected' : ''}>Ativo</option>
                            <option value="inativo" ${state.filters.motStatus === 'inativo' ? 'selected' : ''}>Inativo</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- TABLE -->
            <div class="table-responsive">
                <table class="smart-table" id="table-motoristas">
                    <thead>
                        <tr>
                            <th style="width:60px;">Foto</th>
                            <th class="sortable" data-sort="nome">Nome <i class="fa-solid fa-sort"></i></th>
                            <th>CNH / Categoria</th>
                            <th>Contato</th>
                            <th>Média KM/L</th>
                            <th>Status CNH</th>
                            <th>Situação</th>
                            <th style="width: 100px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-motoristas">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
                <div class="table-pagination" id="pagination-motoristas"></div>
            </div>
        `;

        let filteredData = [...drivers];
        let currentSort = state.currentSort;
        let currentPage = state.currentPage;
        const itemsPerPage = 6;

        function updateTable() {
            const tbody = document.getElementById('tbody-motoristas');
            if (!tbody) return;

            const searchVal = document.getElementById('search-motoristas').value.toLowerCase();
            const catVal = document.getElementById('filter-cnh-cat').value;
            const cnhStatusVal = document.getElementById('filter-cnh-status').value;
            const motStatusVal = document.getElementById('filter-mot-status').value;

            // Save filter state
            state.filters = {
                search: document.getElementById('search-motoristas').value,
                cnhCat: catVal,
                cnhStatus: cnhStatusVal,
                motStatus: motStatusVal
            };
            state.currentPage = currentPage;
            state.currentSort = currentSort;
            window.movixApp.saveListState('motoristas', state);

            // Sync sort icons
            document.querySelectorAll('#table-motoristas th.sortable').forEach(th => {
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

            const today = new Date();
            const tenDaysFromNow = new Date();
            tenDaysFromNow.setDate(today.getDate() + 10);

            filteredData = drivers.filter(m => {
                const matchSearch = m.nome.toLowerCase().includes(searchVal) || 
                                    m.cnh.toLowerCase().includes(searchVal) ||
                                    m.email.toLowerCase().includes(searchVal);
                
                const matchCat = !catVal || m.categoriaCNH === catVal;
                const matchStatus = !motStatusVal || m.status === motStatusVal;
                
                // CNH Expiration filters logic
                const expDate = new Date(m.dataVencimentoCNH);
                let cnhStatus = 'regular';
                if (expDate < today) cnhStatus = 'vencida';
                else if (expDate <= tenDaysFromNow) cnhStatus = 'a_vencer';

                const matchCNH = !cnhStatusVal || cnhStatus === cnhStatusVal;

                return matchSearch && matchCat && matchStatus && matchCNH;
            });

            // Sorting logic
            filteredData.sort((a, b) => {
                let valA = String(a[currentSort.column]).toLowerCase();
                let valB = String(b[currentSort.column]).toLowerCase();

                if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });

            // Pagination
            const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
            if (currentPage > totalPages) {
                currentPage = totalPages;
                state.currentPage = currentPage;
                window.movixApp.saveListState('motoristas', state);
            }
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPage);

            tbody.innerHTML = '';
            if (paginatedItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="search-no-results" style="text-align: center;">Nenhum motorista encontrado</td></tr>`;
                document.getElementById('pagination-motoristas').innerHTML = '';
                return;
            }

            paginatedItems.forEach(m => {
                const expDate = new Date(m.dataVencimentoCNH);
                let cnhBadge = '';
                
                if (expDate < today) {
                    cnhBadge = `<span class="status-pill vencido" title="Venceu em ${m.dataVencimentoCNH.split('-').reverse().join('/')}">Vencida</span>`;
                } else if (expDate <= tenDaysFromNow) {
                    cnhBadge = `<span class="status-pill atencao" title="Vence em ${m.dataVencimentoCNH.split('-').reverse().join('/')}">A Vencer</span>`;
                } else {
                    cnhBadge = `<span class="status-pill ok" title="Vencimento: ${m.dataVencimentoCNH.split('-').reverse().join('/')}">Regular</span>`;
                }

                // Calculate custom performance: average fuel consumption for this specific driver
                const driverSupplies = fuelLogs.filter(a => a.motoristaId === m.id && a.kmL > 0);
                const avgKml = driverSupplies.length > 0 
                    ? (driverSupplies.reduce((acc, a) => acc + a.kmL, 0) / driverSupplies.length).toFixed(1) + ' km/L'
                    : 'N/A';

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <img src="${m.foto || '/img/avatar-default.png'}" onerror="this.src='/img/avatar-default.png'" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:600;">${m.nome}</span>
                                <span style="font-size:0.75rem; color:var(--text-muted);">CPF: ${m.cpf}</span>
                            </div>
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span style="font-weight:600;">Nº ${m.cnh}</span>
                                    ${m.cnhAnexo ? `<a href="${m.cnhAnexo}" target="_blank" title="Visualizar CNH Anexa" style="color:var(--primary); font-size:0.85rem;"><i class="fa-solid fa-paperclip"></i></a>` : ''}
                                </div>
                                <span style="font-size:0.75rem; color:var(--text-muted);">Categoria: ${m.categoriaCNH}</span>
                            </div>
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <span>${m.telefone}</span>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${m.email}</span>
                            </div>
                        </td>
                        <td style="font-weight:700; color:var(--info);">${avgKml}</td>
                        <td>${cnhBadge}</td>
                        <td>
                            <span class="status-pill ${m.status === 'ativo' ? 'ativo' : 'inativo'}">
                                ${m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td style="text-align: center; display: flex; gap: 8px; justify-content: center; align-items:center; height:68px;">
                            <button class="btn-icon-only btn-view" data-id="${m.id}" title="Visualizar Detalhes">
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

            // Render pagination links
            let pagHTML = `<span>Mostrando ${startIdx + 1} a ${Math.min(startIdx + itemsPerPage, filteredData.length)} de ${filteredData.length} motoristas</span>`;
            pagHTML += `<div class="pagination-pages">`;
            pagHTML += `<button class="page-number-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            for (let i = 1; i <= totalPages; i++) {
                pagHTML += `<button class="page-number-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            pagHTML += `<button class="page-number-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
            pagHTML += `</div>`;
            document.getElementById('pagination-motoristas').innerHTML = pagHTML;

            // Restore scroll position
            setTimeout(() => {
                window.scrollTo(0, state.scroll || 0);
            }, 0);
        }

        // Hook filters
        document.getElementById('search-motoristas').addEventListener('input', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-cnh-cat').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-cnh-status').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-mot-status').addEventListener('change', () => { currentPage = 1; updateTable(); });

        // Sorting trigger
        document.querySelectorAll('#table-motoristas th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                
                document.querySelectorAll('#table-motoristas th.sortable i').forEach(icon => {
                    icon.className = 'fa-solid fa-sort';
                });
                const curIcon = th.querySelector('i');
                curIcon.className = currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                
                updateTable();
            });
        });

        // Pagination links
        document.getElementById('pagination-motoristas').addEventListener('click', (e) => {
            const btn = e.target.closest('.page-number-btn');
            if (!btn || btn.disabled) return;

            if (btn.id === 'prev-page') currentPage--;
            else if (btn.id === 'next-page') currentPage++;
            else currentPage = parseInt(btn.getAttribute('data-page'));

            updateTable();
        });

        // CRUD Event triggers
        if (document.getElementById('btn-novo-motorista')) {
            document.getElementById('btn-novo-motorista').addEventListener('click', () => openMotoristaModal());
        }

        document.getElementById('tbody-motoristas').addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.btn-view');
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            
            if (viewBtn) openMotoristaDetailModal(viewBtn.getAttribute('data-id'));
            if (editBtn) openMotoristaModal(editBtn.getAttribute('data-id'));
            if (deleteBtn) confirmDeleteMotorista(deleteBtn.getAttribute('data-id'));
        });

        updateTable();
    }

    function openMotoristaModal(id = null) {
        const isEdit = id !== null;
        const m = isEdit ? window.movixStore.getMotorista(id) : null;
        
        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');
        
        modalTitle.innerText = isEdit ? `Editar Motorista: ${m.nome}` : 'Cadastrar Novo Motorista';

        modalBody.innerHTML = `
            <form id="form-motorista" class="form-grid">
                
                <!-- PHOTO UPLOAD GANE -->
                <div class="form-group full-width" style="display:flex; flex-direction:column; gap:8px;">
                    <label style="font-weight: 600;">Foto de Perfil do Motorista</label>
                    <div style="display:flex; align-items:center; gap:20px; background:var(--bg-surface-hover); padding:16px; border-radius:var(--border-radius-md); border:1px dashed var(--border-color);">
                        <img id="mot-avatar-preview" src="${isEdit && m.foto ? m.foto : '/img/avatar-default.png'}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); background:#ffffff;">
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <span style="font-size:0.75rem; color:var(--text-muted);">Formatos aceitos: JPG, PNG, JPEG (Máx. 5MB)</span>
                            <button type="button" class="btn btn-secondary" id="btn-mot-foto" style="height:36px; padding:0 16px; cursor:pointer;">
                                <i class="fa-solid fa-cloud-arrow-up text-primary"></i> Selecionar Imagem
                            </button>
                            <input type="file" id="mot-foto-file" accept="image/*" style="display:none;">
                            <input type="hidden" name="foto" id="mot-foto-url" value="${isEdit && m.foto ? m.foto : '/img/avatar-default.png'}">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Nome Completo <span class="required">*</span></label>
                    <input type="text" class="form-control" name="nome" required value="${isEdit ? m.nome : ''}" placeholder="Nome do motorista">
                </div>
                <div class="form-group">
                    <label>CPF <span class="required">*</span></label>
                    <input type="text" class="form-control" name="cpf" required value="${isEdit ? m.cpf : ''}" placeholder="000.000.000-00" id="input-cpf-mask">
                </div>
                <div class="form-group">
                    <label>RG</label>
                    <input type="text" class="form-control" name="rg" value="${isEdit && m.rg ? m.rg : ''}" placeholder="00.000.000-0">
                </div>
                <div class="form-group">
                    <label>Telefone Contato <span class="required">*</span></label>
                    <input type="text" class="form-control" name="telefone" required value="${isEdit ? m.telefone : ''}" placeholder="(00) 00000-0000">
                </div>
                <div class="form-group">
                    <label>E-mail</label>
                    <input type="email" class="form-control" name="email" value="${isEdit && m.email ? m.email : ''}" placeholder="motorista@empresa.com.br">
                </div>
                <div class="form-group">
                    <label>Nº Registro CNH <span class="required">*</span></label>
                    <input type="text" class="form-control" name="cnh" required value="${isEdit ? m.cnh : ''}" placeholder="Apenas números">
                </div>
                <div class="form-group">
                    <label>Categoria CNH <span class="required">*</span></label>
                    <input type="text" class="form-control" name="categoriaCNH" required value="${isEdit ? m.categoriaCNH : ''}" placeholder="Ex: AD, B, E">
                </div>
                <div class="form-group">
                    <label>Vencimento CNH <span class="required">*</span></label>
                    <input type="date" class="form-control" name="dataVencimentoCNH" required value="${isEdit ? m.dataVencimentoCNH : ''}">
                </div>
                <div class="form-group">
                    <label>Status <span class="required">*</span></label>
                    <select class="form-control" name="status" required>
                        <option value="ativo" ${isEdit && m.status === 'ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="inativo" ${isEdit && m.status === 'inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Anexar CNH Digitalizada (PDF ou Imagem)</label>
                    <div class="file-upload-area" id="mot-cnh-upload-trigger" style="margin-top: 4px; cursor: pointer;">
                        <i class="fa-solid fa-file-pdf"></i>
                        <span class="file-upload-text" id="mot-cnh-upload-text">
                            ${isEdit && m.cnhAnexo ? `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${m.cnhAnexo.split('/').pop()}</strong>` : 'Arraste ou clique para anexar CNH'}
                        </span>
                        <span class="file-upload-hint">Formatos aceitos: PDF, JPG, PNG, JPEG (Máx. 10MB)</span>
                        <input type="file" id="mot-cnh-file-input" style="display:none;" accept="image/*,application/pdf">
                    </div>
                    <input type="hidden" name="cnhAnexo" id="mot-cnh-anexo-url" value="${isEdit && m.cnhAnexo ? m.cnhAnexo : ''}">
                    
                    <div id="mot-cnh-actions" style="display:${isEdit && m.cnhAnexo ? 'flex' : 'none'}; gap:12px; margin-top:8px; align-items:center;">
                        <a href="${isEdit && m.cnhAnexo ? m.cnhAnexo : '#'}" id="btn-visualizar-cnh" target="_blank" class="btn btn-secondary" style="height:32px; padding:0 12px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-eye"></i> Visualizar
                        </a>
                        <a href="${isEdit && m.cnhAnexo ? m.cnhAnexo : '#'}" id="btn-baixar-cnh" download class="btn btn-secondary" style="height:32px; padding:0 12px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-download"></i> Baixar
                        </a>
                        <button type="button" class="btn btn-danger" id="btn-remover-cnh" style="height:32px; padding:0 12px; font-size:0.75rem; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
                <div class="form-group full-width">
                    <label>Endereço Completo</label>
                    <input type="text" class="form-control" name="endereco" value="${isEdit && m.endereco ? m.endereco : ''}" placeholder="Rua, Número, Bairro - Cidade/UF">
                </div>
                <div class="form-group full-width">
                    <label>Observações</label>
                    <textarea class="form-control" name="observacoes" placeholder="Anotações gerais">${isEdit && m.observacoes ? m.observacoes : ''}</textarea>
                </div>
            </form>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
            <button class="btn btn-primary" id="btn-salvar-modal">Salvar Registro</button>
        `;

        modal.classList.add('active');

        // Simple CPF Mask formatting
        const cpfInput = document.getElementById('input-cpf-mask');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, "");
                if (v.length > 11) v = v.substring(0, 11);
                if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
                else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
                e.target.value = v;
            });
        }

        // Photo Upload Logic
        const btnFoto = document.getElementById('btn-mot-foto');
        const fotoFile = document.getElementById('mot-foto-file');
        const avatarPreview = document.getElementById('mot-avatar-preview');
        const fotoUrlInput = document.getElementById('mot-foto-url');

        if (btnFoto && fotoFile) {
            btnFoto.addEventListener('click', () => fotoFile.click());
            fotoFile.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('foto', file);

                try {
                    btnFoto.disabled = true;
                    btnFoto.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

                    const res = await fetch('/api/upload/foto', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Erro no upload.');
                    }

                    const result = await res.json();
                    avatarPreview.src = result.url;
                    fotoUrlInput.value = result.url;

                    window.movixApp.showToast('Foto do motorista atualizada!', 'success');
                } catch (err) {
                    console.error(err);
                    window.movixApp.showToast(err.message || 'Erro ao enviar foto.', 'danger');
                } finally {
                    btnFoto.disabled = false;
                    btnFoto.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-primary"></i> Selecionar Imagem';
                }
            });
        }

        // CNH Document Upload Logic
        const cnhUploadTrigger = document.getElementById('mot-cnh-upload-trigger');
        const cnhFileInput = document.getElementById('mot-cnh-file-input');
        const cnhUploadText = document.getElementById('mot-cnh-upload-text');
        const cnhAnexoUrl = document.getElementById('mot-cnh-anexo-url');
        const cnhActionsDiv = document.getElementById('mot-cnh-actions');
        const btnVisualizarCnh = document.getElementById('btn-visualizar-cnh');
        const btnBaixarCnh = document.getElementById('btn-baixar-cnh');
        const btnRemoverCnh = document.getElementById('btn-remover-cnh');

        if (cnhUploadTrigger && cnhFileInput) {
            cnhUploadTrigger.addEventListener('click', () => cnhFileInput.click());
            cnhFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('file', file);

                try {
                    cnhUploadText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando arquivo...';
                    cnhUploadTrigger.style.pointerEvents = 'none';

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Erro no upload.');
                    }

                    const result = await res.json();
                    cnhAnexoUrl.value = result.url;
                    cnhUploadText.innerHTML = `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${result.name}</strong>`;
                    
                    btnVisualizarCnh.href = result.url;
                    btnBaixarCnh.href = result.url;
                    cnhActionsDiv.style.display = 'flex';

                    window.movixApp.showToast('CNH anexada com sucesso!', 'success');
                } catch (err) {
                    console.error(err);
                    window.movixApp.showToast(err.message || 'Erro ao enviar CNH.', 'danger');
                    cnhUploadText.innerText = 'Arraste ou clique para anexar CNH';
                } finally {
                    cnhUploadTrigger.style.pointerEvents = 'auto';
                }
            });
        }

        if (btnRemoverCnh) {
            btnRemoverCnh.addEventListener('click', () => {
                cnhAnexoUrl.value = '';
                cnhUploadText.innerText = 'Arraste ou clique para anexar CNH';
                cnhActionsDiv.style.display = 'none';
                cnhFileInput.value = '';
                window.movixApp.showToast('CNH removida.', 'info');
            });
        }

        document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

        document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
            const form = document.getElementById('form-motorista');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const saveBtn = document.getElementById('btn-salvar-modal');
            const loader = window.movixApp.startLoading(saveBtn, isEdit ? "Atualizando..." : "Salvando...");

            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => data[key] = value);

            try {
                if (isEdit) {
                    await window.movixStore.updateMotorista(id, data);
                    window.movixApp.showToast('Cadastro do motorista atualizado!', 'success');
                } else {
                    await window.movixStore.addMotorista(data);
                    window.movixApp.showToast('Motorista cadastrado com sucesso!', 'success');
                }
                modal.classList.remove('active');
                renderMotoristas(document.getElementById('view-content-wrapper'));
            } catch (err) {
                window.movixApp.showToast(err.message || 'Erro ao salvar motorista.', 'danger');
            } finally {
                loader.stop();
            }
        });
    }

    function openMotoristaDetailModal(id) {
        const m = window.movixStore.getMotorista(id);
        if (!m) return;

        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');

        modalTitle.innerText = `Detalhes do Motorista: ${m.nome}`;

        modalBody.innerHTML = `
            <div style="padding: 10px;">
                <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; background:var(--bg-surface-hover); padding:16px; border-radius:var(--border-radius-md); border:1px solid var(--border-light);">
                    <img src="${m.foto || '/img/avatar-default.png'}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); background:#ffffff;">
                    <div>
                        <h4 style="font-family:var(--font-heading); color:var(--text-main); font-size:1.1rem; font-weight:700; margin:0;">${m.nome}</h4>
                        <span class="status-pill ${m.status === 'ativo' ? 'ativo' : 'inativo'}" style="margin-top:6px; display:inline-block;">
                            ${m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                </div>

                <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i> Informações Pessoais</h4>
                <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>CPF</span><strong>${m.cpf}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>RG</span><strong>${m.rg || '-'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Telefone</span><strong>${m.telefone}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>E-mail</span><strong>${m.email || '-'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Endereço</span><strong>${m.endereco || '-'}</strong></li>
                </ul>

                <h4 style="font-family:var(--font-heading); color:var(--primary); margin-top:20px; margin-bottom:12px;"><i class="fa-solid fa-id-card"></i> Detalhes da Habilitação (CNH)</h4>
                <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Nº Registro CNH</span><strong>${m.cnh}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Categoria CNH</span><strong style="color:var(--primary);">${m.categoriaCNH}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Vencimento CNH</span><strong>${m.dataVencimentoCNH.split('-').reverse().join('/')}</strong></li>
                </ul>

                ${m.observacoes ? `
                <div style="margin-top:20px;">
                    <h5 style="font-weight:700; margin-bottom:6px; font-size:0.85rem;">Observações:</h5>
                    <p style="font-size:0.8rem; line-height:1.5; color:var(--text-muted); background:var(--bg-surface-hover); padding:10px; border-radius:6px; border-left:3px solid var(--primary); white-space:pre-wrap;">${m.observacoes}</p>
                </div>` : ''}

                ${m.cnhAnexo ? `
                <div style="margin-top:20px; display:flex; gap:12px;">
                    <a href="${m.cnhAnexo}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-eye text-primary"></i> Visualizar CNH Anexa
                    </a>
                    <a href="${m.cnhAnexo}" download class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-download"></i> Baixar CNH Anexa
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

    function confirmDeleteMotorista(id) {
        const m = window.movixStore.getMotorista(id);
        if (!m) return;

        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');

        modalTitle.innerText = 'Excluir Motorista';
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 16px;">
                <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                <p style="font-size: 1.05rem; font-weight: 600;">Deseja realmente remover o cadastro de <strong>${m.nome}</strong>?</p>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Esta operação não apagará o histórico histórico de abastecimentos ou viagens antigas associadas.</p>
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
                await window.movixStore.deleteMotorista(id);
                window.movixApp.showToast('Motorista removido da base.', 'danger');
                modal.classList.remove('active');
                renderMotoristas(document.getElementById('view-content-wrapper'));
            } catch (err) {
                window.movixApp.showToast(err.message || 'Erro ao excluir motorista.', 'danger');
            } finally {
                loader.stop();
            }
        });
    }

    window.movixRouter.register('motoristas', renderMotoristas);
})();
