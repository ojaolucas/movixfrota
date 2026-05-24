/* MovixFrota - Usuários Module (Admin User CRUD with Real Image Upload) */

(function() {
    
    function renderUsuarios(container) {
        const activeUser = window.movixStore.getActiveUser();
        
        // Block access to non-administrators
        if (!activeUser || activeUser.perfil !== 'Administrador') {
            container.innerHTML = `
                <div class="search-no-results" style="padding: 64px;">
                    <i class="fa-solid fa-user-shield text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <h2 style="color:var(--text-main);">Acesso Restrito</h2>
                    <p style="color:var(--text-muted); margin-top:8px;">Este módulo é exclusivo para Administradores do sistema.</p>
                    <button class="btn btn-primary" style="margin-top:16px;" onclick="window.movixRouter.navigateTo('dashboard')">
                        Voltar ao Dashboard
                    </button>
                </div>
            `;
            return;
        }

        renderListagemUsuarios(container);
    }

    // LISTING VIEW
    function renderListagemUsuarios(container) {
        const users = window.movixStore.state.usuarios;
        const activeUser = window.movixStore.getActiveUser();
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Gestão de Usuários</h1>
                    <p class="page-subtitle">Gerencie as credenciais corporativas, cargos e permissões de acesso ao ERP</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" id="btn-novo-usuario">
                        <i class="fa-solid fa-plus"></i> Novo Usuário
                    </button>
                </div>
            </div>

            <!-- FILTERS PANEL -->
            <div class="filters-card">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Buscar Nome / E-mail / CPF</label>
                        <input type="text" class="filter-input" id="search-usuarios" placeholder="Buscar...">
                    </div>
                    <div class="filter-group">
                        <label>Perfil ERP</label>
                        <select class="filter-input" id="filter-perfil">
                            <option value="">Todos</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Gestor">Gestor</option>
                            <option value="Operacional">Operacional</option>
                            <option value="Visualizador">Visualizador</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Status</label>
                        <select class="filter-input" id="filter-status">
                            <option value="">Todos</option>
                            <option value="ativo">Ativos</option>
                            <option value="inativo">Inativos</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- USERS LIST TABLE -->
            <div class="table-responsive">
                <table class="smart-table" id="table-usuarios">
                    <thead>
                        <tr>
                            <th style="width: 60px; text-align: center;">Avatar</th>
                            <th class="sortable" data-sort="nome">Colaborador / E-mail <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="cpf">CPF <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="cargo">Cargo <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="perfil">Perfil <i class="fa-solid fa-sort"></i></th>
                            <th class="sortable" data-sort="status">Situação <i class="fa-solid fa-sort"></i></th>
                            <th style="width: 120px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-usuarios">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
                <div class="table-pagination" id="pagination-usuarios">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;

        let filteredData = [...users];
        let currentSort = { column: 'nome', direction: 'asc' };
        let currentPage = 1;
        const itemsPerPage = 6;

        function updateTable() {
            const tbody = document.getElementById('tbody-usuarios');
            if (!tbody) return;

            const searchVal = document.getElementById('search-usuarios').value.toLowerCase();
            const perfilVal = document.getElementById('filter-perfil').value;
            const statusVal = document.getElementById('filter-status').value;

            filteredData = users.filter(u => {
                const matchSearch = u.nome.toLowerCase().includes(searchVal) || 
                                    (u.email && u.email.toLowerCase().includes(searchVal)) ||
                                    (u.cpf && u.cpf.toLowerCase().includes(searchVal));
                const matchPerfil = !perfilVal || u.perfil === perfilVal;
                const matchStatus = !statusVal || u.status === statusVal;
                
                return matchSearch && matchPerfil && matchStatus;
            });

            // Sorting logic
            filteredData.sort((a, b) => {
                let valA = String(a[currentSort.column]).toLowerCase();
                let valB = String(b[currentSort.column]).toLowerCase();

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
                tbody.innerHTML = `<tr><td colspan="7" class="search-no-results" style="text-align: center;">Nenhum usuário encontrado</td></tr>`;
                document.getElementById('pagination-usuarios').innerHTML = '';
                return;
            }

            paginatedItems.forEach(u => {
                const statusLabel = u.status === 'ativo' 
                    ? '<span class="status-pill ok">Ativo</span>' 
                    : '<span class="status-pill inativo">Inativo</span>';
                
                const isSelf = activeUser.id === u.id;
                
                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: center;">
                            <img src="${u.foto || '/img/avatar-default.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);">
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight: 700; color: var(--primary);">${u.nome} ${isSelf ? '<span class="status-pill ok" style="font-size:0.65rem; padding: 1px 4px;">Você</span>' : ''}</span>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${u.email}</span>
                            </div>
                        </td>
                        <td style="font-weight: 600;">${u.cpf}</td>
                        <td>${u.cargo || '-'}</td>
                        <td><span class="role-badge ${u.perfil.toLowerCase()}" style="font-size:0.7rem; padding: 4px 8px;">${u.perfil}</span></td>
                        <td>${statusLabel}</td>
                        <td style="text-align: center; display: flex; justify-content: center; gap: 8px;">
                            <button class="btn-icon-only btn-edit" data-id="${u.id}" title="Editar">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-icon-only danger btn-delete" data-id="${u.id}" ${isSelf ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Excluir">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            // Pagination UI
            let pagHTML = `<span>Mostrando ${startIdx + 1} a ${Math.min(startIdx + itemsPerPage, filteredData.length)} de ${filteredData.length} registros</span>`;
            pagHTML += `<div class="pagination-pages">`;
            pagHTML += `<button class="page-number-btn" id="prev-page-u" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            for (let i = 1; i <= totalPages; i++) {
                pagHTML += `<button class="page-number-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            pagHTML += `<button class="page-number-btn" id="next-page-u" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
            pagHTML += `</div>`;
            document.getElementById('pagination-usuarios').innerHTML = pagHTML;
        }

        // Event hooks
        document.getElementById('search-usuarios').addEventListener('input', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-perfil').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; updateTable(); });

        // Sort click triggers
        document.querySelectorAll('#table-usuarios th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                
                document.querySelectorAll('#table-usuarios th.sortable i').forEach(icon => {
                    icon.className = 'fa-solid fa-sort';
                });
                const curIcon = th.querySelector('i');
                curIcon.className = currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                
                updateTable();
            });
        });

        // Pagination buttons handlers
        document.getElementById('pagination-usuarios').addEventListener('click', (e) => {
            const btn = e.target.closest('.page-number-btn');
            if (!btn || btn.disabled) return;

            if (btn.id === 'prev-page-u') currentPage--;
            else if (btn.id === 'next-page-u') currentPage++;
            else currentPage = parseInt(btn.getAttribute('data-page'));

            updateTable();
        });

        // Action Buttons click triggers
        document.getElementById('btn-novo-usuario').addEventListener('click', () => openUsuarioModal());
        
        document.getElementById('tbody-usuarios').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            
            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                openUsuarioModal(id);
            }
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                confirmDeleteUsuario(id);
            }
        });

        updateTable();
    }

    // MODAL FORM (WITH UPLOAD HOOKS)
    function openUsuarioModal(id = null) {
        const isEdit = id !== null;
        let user = null;
        if (isEdit) {
            user = window.movixStore.state.usuarios.find(u => u.id === id);
        }
        
        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');
        
        modalTitle.innerText = isEdit ? `Editar Usuário: ${user.nome}` : 'Cadastrar Novo Usuário ERP';

        modalBody.innerHTML = `
            <form id="form-usuario" class="form-grid" onsubmit="return false;">
                
                <!-- USER PHOTO UPLOAD GRID PANE -->
                <div class="form-group full-width" style="display:flex; flex-direction:column; gap:8px;">
                    <label style="font-weight: 600;">Foto de Avatar Corporativo</label>
                    <div style="display:flex; align-items:center; gap:20px; background:var(--bg-surface-hover); padding:16px; border-radius:var(--border-radius-md); border:1px dashed var(--border-color);">
                        <img id="avatar-upload-preview" src="${isEdit && user.foto ? user.foto : '/img/avatar-default.png'}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); background:#ffffff;">
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <span style="font-size:0.75rem; color:var(--text-muted);">Formatos aceitos: JPG, PNG, WebP (Máx. 5MB)</span>
                            <button type="button" class="btn btn-secondary" id="btn-trigger-upload" style="height:36px; padding:0 16px;">
                                <i class="fa-solid fa-cloud-arrow-up text-primary"></i> Selecionar Imagem
                            </button>
                            <input type="file" id="input-file-uploader" accept="image/*" style="display:none;">
                            <input type="hidden" name="foto" id="input-foto-url" value="${isEdit && user.foto ? user.foto : '/img/avatar-default.png'}">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Nome Completo <span class="required">*</span></label>
                    <input type="text" class="form-control" name="nome" required value="${isEdit ? user.nome : ''}" placeholder="Nome do colaborador">
                </div>
                <div class="form-group">
                    <label>CPF <span class="required">*</span></label>
                    <input type="text" class="form-control" name="cpf" required value="${isEdit ? user.cpf : ''}" placeholder="000.000.000-00" id="input-cpf-mask">
                </div>
                <div class="form-group">
                    <label>E-mail Corporativo <span class="required">*</span></label>
                    <input type="email" class="form-control" name="email" required value="${isEdit ? user.email : ''}" placeholder="nome@empresa.com.br">
                </div>
                <div class="form-group">
                    <label>Cargo na Empresa <span class="required">*</span></label>
                    <input type="text" class="form-control" name="cargo" required value="${isEdit ? user.cargo : ''}" placeholder="Ex: Diretor de Frota, Operador">
                </div>
                <div class="form-group">
                    <label>Nível de Perfil ERP <span class="required">*</span></label>
                    <select class="form-control" name="perfil" required>
                        <option value="Administrador" ${isEdit && user.perfil === 'Administrador' ? 'selected' : ''}>Administrador (Acesso Total)</option>
                        <option value="Gestor" ${isEdit && user.perfil === 'Gestor' ? 'selected' : ''}>Gestor (Edição/Operação/Relatórios)</option>
                        <option value="Operacional" ${isEdit && user.perfil === 'Operacional' ? 'selected' : ''}>Operacional (Cadastro/Movimentações)</option>
                        <option value="Visualizador" ${isEdit && user.perfil === 'Visualizador' ? 'selected' : ''}>Visualizador (Apenas Leitura)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status da Conta <span class="required">*</span></label>
                    <select class="form-control" name="status" required>
                        <option value="ativo" ${isEdit && user.status === 'ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="inativo" ${isEdit && user.status === 'inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Senha de Acesso ${isEdit ? '<span style="color:var(--text-muted); font-weight:normal;">(Preencha apenas para alterar)</span>' : '<span class="required">*</span>'}</label>
                    <input type="password" class="form-control" name="senha" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'Nova senha' : 'Senha inicial de login'}" minlength="4">
                </div>
            </form>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
            <button class="btn btn-primary" id="btn-salvar-modal">
                <i class="fa-solid fa-floppy-disk"></i> Salvar Registro
            </button>
        `;

        modal.classList.add('active');

        // Dynamic File Uploader Integration
        const fileUploader = document.getElementById('input-file-uploader');
        const triggerBtn = document.getElementById('btn-trigger-upload');
        const previewImg = document.getElementById('avatar-upload-preview');
        const hiddenUrlInput = document.getElementById('input-foto-url');

        triggerBtn.addEventListener('click', () => fileUploader.click());

        fileUploader.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('foto', file);

            try {
                triggerBtn.disabled = true;
                triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
                
                const response = await fetch('/api/upload/foto', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Erro no upload.');
                }

                const result = await response.json();
                previewImg.src = result.url;
                hiddenUrlInput.value = result.url;

                window.movixApp.showToast('Foto do usuário enviada com sucesso!', 'success');
            } catch (err) {
                console.error("Upload failed", err);
                window.movixApp.showToast(err.message || 'Falha ao enviar arquivo de imagem.', 'danger');
            } finally {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-primary"></i> Selecionar Imagem';
            }
        });

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

        // Action button bindings
        const saveBtn = document.getElementById('btn-salvar-modal');
        const cancelBtn = document.getElementById('btn-cancelar-modal');

        const closeModal = () => modal.classList.remove('active');

        cancelBtn.addEventListener('click', closeModal);

        saveBtn.addEventListener('click', async () => {
            const form = document.getElementById('form-usuario');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => data[key] = value);

            try {
                if (isEdit) {
                    await window.movixStore.updateUsuario(id, data);
                    window.movixApp.showToast('Usuário atualizado com sucesso!', 'success');
                } else {
                    await window.movixStore.addUsuario(data);
                    window.movixApp.showToast('Usuário corporativo criado com sucesso!', 'success');
                }
                
                closeModal();
                // Re-render
                renderListagemUsuarios(document.getElementById('view-content-wrapper'));
            } catch (err) {
                console.error("Failed saving user", err);
                window.movixApp.showToast(err.message || 'Falha ao salvar dados do usuário.', 'danger');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Registro';
            }
        });
    }

    function confirmDeleteUsuario(id) {
        const u = window.movixStore.state.usuarios.find(user => user.id === id);
        if (!u) return;

        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');

        modalTitle.innerText = 'Remover Acesso do Usuário';
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 16px;">
                <i class="fa-solid fa-user-xmark text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                <p style="font-size: 1.05rem; font-weight: 600;">Deseja revogar o acesso do colaborador <strong>${u.nome}</strong>?</p>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">O usuário [CPF: ${u.cpf}] será excluído do ERP e perderá acesso ao sistema imediatamente.</p>
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
                await window.movixStore.deleteUsuario(id);
                window.movixApp.showToast('Usuário excluído com sucesso!', 'danger');
                modal.classList.remove('active');
                renderListagemUsuarios(document.getElementById('view-content-wrapper'));
            } catch (err) {
                window.movixApp.showToast(err.message || 'Erro ao excluir usuário.', 'danger');
                modal.classList.remove('active');
            }
        });
    }

    // Register into system router
    window.movixRouter.register('usuarios', renderUsuarios);
})();
