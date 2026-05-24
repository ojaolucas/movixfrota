/* MovixFrota - Documentos Module */

(function() {
    
    function renderDocumentos(container) {
        const docs = window.movixStore.getDocumentos();
        const vehicles = window.movixStore.getVeiculos();
        const drivers = window.movixStore.getMotoristas();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Gestão de Documentos</h1>
                    <p class="page-subtitle">Armazene, monitore vencimentos e anexe apólices, licenças e multas da frota</p>
                </div>
                <div class="page-actions">
                    ${!isVisualizador ? `
                        <button class="btn btn-primary" id="btn-novo-doc">
                            <i class="fa-solid fa-cloud-arrow-up"></i> Anexar Documento
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- TABS FOR SUB-CATEGORIES -->
            <div class="detail-tab-menu" style="margin-bottom:-12px;">
                <button class="detail-tab-btn active" id="tab-btn-veiculos"><i class="fa-solid fa-truck-ramp-box"></i> Documentos de Veículos</button>
                <button class="detail-tab-btn" id="tab-btn-motoristas"><i class="fa-solid fa-user-gear"></i> Documentos de Motoristas</button>
            </div>

            <!-- FILTERS -->
            <div class="filters-card">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Buscar Documento / Tipo</label>
                        <input type="text" class="filter-input" id="search-docs" placeholder="Filtrar por nome...">
                    </div>
                    <div class="filter-group">
                        <label>Situação do Vencimento</label>
                        <select class="filter-input" id="filter-doc-status">
                            <option value="">Todas</option>
                            <option value="ok">Regular (Válido)</option>
                            <option value="atencao">Em Atenção</option>
                            <option value="vencido">Vencido / Expirado</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- GRID OF DOCUMENTS -->
            <div class="table-responsive">
                <table class="smart-table">
                    <thead>
                        <tr>
                            <th>Tipo Documento</th>
                            <th>Vinculado a</th>
                            <th>Emissão</th>
                            <th>Vencimento</th>
                            <th>Situação</th>
                            <th>Arquivo Anexo</th>
                            <th style="width: 100px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-documentos">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
            </div>
        `;

        let activeSubTab = 'veiculo'; // 'veiculo' or 'motorista'
        let currentSearch = '';
        let currentStatusFilter = '';

        function updateTable() {
            const tbody = document.getElementById('tbody-documentos');
            if (!tbody) return;

            const searchVal = document.getElementById('search-docs').value.toLowerCase();
            const statusVal = document.getElementById('filter-doc-status').value;

            // Filter lists based on subtab and conditions
            const filteredDocs = docs.filter(d => {
                const matchTab = d.referenciaType === activeSubTab;
                const matchSearch = d.tipo.toLowerCase().includes(searchVal) || 
                                    (d.arquivo && d.arquivo.toLowerCase().includes(searchVal)) ||
                                    (d.obs && d.obs.toLowerCase().includes(searchVal));
                
                // Expiration calculations
                const today = new Date();
                const tenDaysFromNow = new Date();
                tenDaysFromNow.setDate(today.getDate() + 10);
                
                let calculatedStatus = 'ok';
                if (d.vencimento) {
                    const exp = new Date(d.vencimento);
                    if (exp < today) calculatedStatus = 'vencido';
                    else if (exp <= tenDaysFromNow) calculatedStatus = 'atencao';
                }

                const matchStatus = !statusVal || calculatedStatus === statusVal;

                return matchTab && matchSearch && matchStatus;
            });

            tbody.innerHTML = '';
            if (filteredDocs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="search-no-results" style="text-align: center;">Nenhum documento anexado para esta categoria</td></tr>`;
                return;
            }

            filteredDocs.forEach(d => {
                // Resolve name of vehicle or driver
                let referenceName = '';
                if (d.referenciaType === 'veiculo') {
                    const v = vehicles.find(item => item.id === d.referenciaId);
                    referenceName = v ? `<span style="font-weight:700; color:var(--primary);">${v.placa}</span> (${v.marca} ${v.modelo})` : 'Veículo Desconhecido';
                } else {
                    const m = drivers.find(item => item.id === d.referenciaId);
                    referenceName = m ? `<strong style="font-weight:600;">${m.nome}</strong>` : 'Motorista Desconhecido';
                }

                // Resolve status badge
                const today = new Date();
                const tenDays = new Date();
                tenDays.setDate(today.getDate() + 10);
                let statusBadge = '';
                
                if (d.vencimento) {
                    const exp = new Date(d.vencimento);
                    if (exp < today) {
                        statusBadge = '<span class="status-pill vencido">Vencido</span>';
                    } else if (exp <= tenDays) {
                        statusBadge = '<span class="status-pill atencao">A vencer</span>';
                    } else {
                        statusBadge = '<span class="status-pill ok">Regular</span>';
                    }
                } else {
                    statusBadge = '<span class="status-pill ok">Vitalício</span>';
                }

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight: 600; font-family:var(--font-heading);">${d.tipo}</span>
                                <span style="font-size:0.75rem; color:var(--text-muted); white-space:normal;">${d.obs || ''}</span>
                            </div>
                        </td>
                        <td>${referenceName}</td>
                        <td>${d.emissao ? d.emissao.split('-').reverse().join('/') : '-'}</td>
                        <td style="font-weight:600;">${d.vencimento ? d.vencimento.split('-').reverse().join('/') : 'N/A'}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <a href="#" class="btn-visualizar-doc" data-file="${d.arquivo || 'documento_digital.pdf'}" style="color:var(--info); font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-file-pdf"></i> ${d.arquivo || 'documento.pdf'}
                            </a>
                        </td>
                        <td style="text-align: center; display: flex; justify-content: center; gap: 8px;">
                            <button class="btn-icon-only btn-preview" data-id="${d.id}" title="Visualizar Anexo">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            ${!isVisualizador ? `
                                <button class="btn-icon-only danger btn-delete" data-id="${d.id}" title="Excluir">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });
        }

        // Tab events
        const tabVeic = document.getElementById('tab-btn-veiculos');
        const tabMot = document.getElementById('tab-btn-motoristas');

        tabVeic.addEventListener('click', () => {
            tabVeic.classList.add('active');
            tabMot.classList.remove('active');
            activeSubTab = 'veiculo';
            updateTable();
        });

        tabMot.addEventListener('click', () => {
            tabMot.classList.add('active');
            tabVeic.classList.remove('active');
            activeSubTab = 'motorista';
            updateTable();
        });

        document.getElementById('search-docs').addEventListener('input', updateTable);
        document.getElementById('filter-doc-status').addEventListener('change', updateTable);

        // Upload and Action Triggers
        if (document.getElementById('btn-novo-doc')) {
            document.getElementById('btn-novo-doc').addEventListener('click', () => openDocModal());
        }

        // Actions event delegator
        document.querySelector('.table-responsive').addEventListener('click', (e) => {
            const previewBtn = e.target.closest('.btn-preview');
            const fileLink = e.target.closest('.btn-visualizar-doc');
            const deleteBtn = e.target.closest('.btn-delete');

            if (previewBtn) {
                const id = previewBtn.getAttribute('data-id');
                const d = docs.find(item => item.id === id);
                if (d) openDocumentPreview(d);
            }
            if (fileLink) {
                e.preventDefault();
                const fileName = fileLink.getAttribute('data-file');
                openMockFileDownload(fileName);
            }
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                confirmDeleteDocumento(id);
            }
        });

        // Dynamic Document modal creation
        function openDocModal() {
            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Anexar Documento Digitalizado';

            // Resolve target options lists
            const currentEntities = activeSubTab === 'veiculo' ? vehicles : drivers;
            const optionsHTML = currentEntities.map(item => {
                const label = activeSubTab === 'veiculo' ? `${item.placa} - ${item.marca} ${item.modelo}` : item.nome;
                return `<option value="${item.id}">${label}</option>`;
            }).join('');

            modalBody.innerHTML = `
                <form id="form-documento" class="form-grid">
                    <div class="form-group">
                        <label>Tipo do Documento <span class="required">*</span></label>
                        <select class="form-control" name="tipo" required id="doc-type-sel">
                            ${activeSubTab === 'veiculo' ? `
                                <option value="Licenciamento CRLV">Licenciamento CRLV</option>
                                <option value="Seguro Frota Obrigatório">Seguro Frota Obrigatório</option>
                                <option value="Multa de Trânsito">Multa de Trânsito</option>
                                <option value="Vistoria / Inspeção Veicular">Vistoria / Inspeção Veicular</option>
                            ` : `
                                <option value="CNH Digital">CNH Digital</option>
                                <option value="Identidade / CPF">Identidade / CPF</option>
                                <option value="Atestado de Saúde Ocupacional (ASO)">Atestado de Saúde Ocupacional (ASO)</option>
                                <option value="Certificado de Curso Profissionalizante">Certificado de Curso Profissionalizante</option>
                            `}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Vincular a qual ${activeSubTab === 'veiculo' ? 'Veículo' : 'Motorista'} <span class="required">*</span></label>
                        <select class="form-control" name="referenciaId" required>
                            ${optionsHTML}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Data de Emissão</label>
                        <input type="date" class="form-control" name="emissao" value="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label>Data de Vencimento</label>
                        <input type="date" class="form-control" name="vencimento">
                    </div>

                    <div class="form-group full-width">
                        <label>Anexar Arquivo Digital (PDF, PNG, JPG) <span class="required">*</span></label>
                        <div class="file-upload-area" id="file-upload-trigger">
                            <i class="fa-solid fa-cloud-arrow-up"></i>
                            <span class="file-upload-text" id="uploaded-file-text">Arraste ou clique para selecionar arquivo</span>
                            <span class="file-upload-hint">Tamanho máximo recomendado: 5MB</span>
                            <input type="file" id="file-input-element" style="display:none;" accept="image/*,application/pdf">
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Observações / Descrição</label>
                        <textarea class="form-control" name="obs" placeholder="Ex: Multa paga / Apólice com cobertura total contra colisão."></textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">Salvar Anexo</button>
            `;

            modal.classList.add('active');

            // Handle simulated upload trigger
            const uploadTrigger = document.getElementById('file-upload-trigger');
            const fileInput = document.getElementById('file-input-element');
            const uploadText = document.getElementById('uploaded-file-text');
            let selectedFileName = '';

            uploadTrigger.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    selectedFileName = e.target.files[0].name;
                    uploadText.innerHTML = `<strong class="text-success"><i class="fa-solid fa-circle-check"></i> ${selectedFileName}</strong>`;
                }
            });

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const form = document.getElementById('form-documento');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                if (!selectedFileName) {
                    window.movixApp.showToast('Você precisa anexar um arquivo digital!', 'warning');
                    return;
                }

                const formData = new FormData(form);
                const data = {
                    referenciaType: activeSubTab,
                    arquivo: selectedFileName
                };
                formData.forEach((value, key) => data[key] = value);

                try {
                    await window.movixStore.addDocumento(data);
                    window.movixApp.showToast('Documento anexado com sucesso!', 'success');
                    modal.classList.remove('active');
                    updateTable();
                } catch (e) {
                    console.error(e);
                    window.movixApp.showToast(e.message || 'Erro ao salvar documento.', 'danger');
                }
            });
        }

        // Preview File Screen
        function openDocumentPreview(doc) {
            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = `Visualizador de Anexo: ${doc.tipo}`;

            // Simulated document visual frame (Premium ERP layout)
            modalBody.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; background-color:var(--bg-surface-hover); padding:12px; border-radius:var(--border-radius-sm); border:1px solid var(--border-color);">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <i class="fa-solid fa-file-invoice" style="font-size:2rem; color:var(--primary);"></i>
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-size:0.95rem;">${doc.arquivo || 'documento_assinado.pdf'}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted);">Tamanho: 1.8 MB • Tipo: PDF Document</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-icon-only" onclick="window.movixApp.showToast('Iniciando download...', 'info');" title="Download">
                            <i class="fa-solid fa-cloud-arrow-down"></i>
                        </button>
                    </div>

                    <!-- Simulated Visual File Render -->
                    <div style="width:100%; height:450px; background-color:#525659; border-radius:var(--border-radius-md); display:flex; align-items:center; justify-content:center; overflow:hidden; border:2px solid var(--border-color); position:relative;">
                        
                        <div style="background-color:#ffffff; width:90%; height:92%; box-shadow:0 10px 25px rgba(0,0,0,0.5); padding:40px; display:flex; flex-direction:column; gap:20px; color:#0f172a; overflow:auto;">
                            <!-- Mock Document Header -->
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0055ff; padding-bottom:12px;">
                                <h1 style="font-family:var(--font-heading); font-size:1.5rem; font-weight:700; color:#0f172a;">MOVIX LOGÍSTICA S/A</h1>
                                <span style="font-size:0.7rem; color:#64748b; font-weight:700; border:1px solid #64748b; padding:4px 8px; border-radius:4px;">CÓDIGO INTERNO: ${doc.id}</span>
                            </div>

                            <!-- Document Body -->
                            <div style="display:flex; flex-direction:column; gap:16px;">
                                <h2 style="font-family:var(--font-heading); font-size:1.1rem; text-align:center; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; color:#0055ff;">
                                    ${doc.tipo}
                                </h2>

                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:0.8rem; line-height:1.6;">
                                    <div>
                                        <p><strong>Órgão Emissor:</strong> Secretaria Nacional de Trânsito</p>
                                        <p><strong>Data Emissão:</strong> ${doc.emissao ? doc.emissao.split('-').reverse().join('/') : 'Imediato'}</p>
                                        <p><strong>Data Vencimento:</strong> ${doc.vencimento ? doc.vencimento.split('-').reverse().join('/') : 'Isento'}</p>
                                    </div>
                                    <div>
                                        <p><strong>Referência:</strong> ${doc.referenciaType === 'veiculo' ? 'Frota Automotiva' : 'Colaborador CLT'}</p>
                                        <p><strong>ID Relacionado:</strong> ${doc.referenciaId}</p>
                                        <p><strong>Situação Cadastral:</strong> ATIVO/REGULAR</p>
                                    </div>
                                </div>

                                <div style="margin-top:20px; border:1px dashed #cbd5e1; padding:16px; border-radius:6px; font-size:0.75rem; color:#334155; background-color:#f8fafc;">
                                    <p><strong>Observações de Auditoria:</strong></p>
                                    <p style="margin-top:6px; font-style:italic;">"${doc.obs || 'Documento autenticado eletronicamente através de chave criptografada no banco interno do ERP.'}"</p>
                                </div>

                                <!-- Signature / Stamps -->
                                <div style="margin-top:32px; display:flex; justify-content:space-between; align-items:flex-end;">
                                    <div style="text-align:center; font-size:0.7rem; width:150px;">
                                        <div style="border-top:1px solid #94a3b8; padding-top:4px;">Assinatura Digital</div>
                                    </div>
                                    <div style="border: 2px double #22c55e; color:#22c55e; padding:8px 16px; font-weight:800; font-size:0.75rem; transform:rotate(-5deg); text-transform:uppercase; letter-spacing:1px; border-radius:4px; font-family:var(--font-heading);">
                                        MOVIX AUDITADO
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-fechar-preview">Fechar Visualização</button>
            `;

            modal.classList.add('active');
            document.getElementById('btn-fechar-preview').addEventListener('click', () => modal.classList.remove('active'));
        }

        // Mock Download helper
        function openMockFileDownload(fileName) {
            window.movixApp.showToast(`Iniciando download de ${fileName}...`, 'success');
        }

        function confirmDeleteDocumento(id) {
            const doc = docs.find(item => item.id === id);
            if (!doc) return;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Excluir Anexo Digital';
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <i class="fa-solid fa-file-circle-xmark text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Tem certeza que deseja apagar o documento <strong>${doc.tipo}</strong>?</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">O arquivo digital associado (${doc.arquivo}) será apagado permanentemente.</p>
                </div>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-del">Cancelar</button>
                <button class="btn btn-danger" id="btn-confirmar-del">Remover Documento</button>
            `;

            modal.classList.add('active');

            document.getElementById('btn-cancelar-del').addEventListener('click', () => modal.classList.remove('active'));
            document.getElementById('btn-confirmar-del').addEventListener('click', async () => {
                try {
                    await window.movixStore.deleteDocumento(id);
                    window.movixApp.showToast('Documento removido da base com sucesso.', 'success');
                    modal.classList.remove('active');
                    updateTable();
                } catch (e) {
                    console.error(e);
                    window.movixApp.showToast(e.message || 'Erro ao remover documento.', 'danger');
                }
            });
        }

        updateTable();
    }

    window.movixRouter.register('documentos', renderDocumentos);
})();
