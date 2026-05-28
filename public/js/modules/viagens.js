/* MovixFrota - Viagens Module */

(function() {
    
    function renderViagens(container) {
        const trips = window.movixStore.getViagens();
        const vehicles = window.movixStore.getVeiculos();
        const drivers = window.movixStore.getMotoristas();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';

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
                            <th>Situação</th>
                            <th style="width: 80px; text-align: center;">Retorno</th>
                            ${!isVisualizador ? '<th style="width: 120px; text-align: center;">Ações</th>' : ''}
                        </tr>
                    </thead>
                    <tbody id="tbody-viagens">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
                <div class="table-pagination" id="pagination-viagens"></div>
            </div>
        `;

        let currentPage = 1;
        const itemsPerPage = 8;

        function updateTable() {
            const tbody = document.getElementById('tbody-viagens');
            if (!tbody) return;

            const currentTrips = window.movixStore.getViagens();
            const filteredData = [...currentTrips];

            const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPage);

            tbody.innerHTML = '';
            if (paginatedItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${isVisualizador ? 7 : 8}" class="search-no-results" style="text-align: center;">Nenhuma viagem registrada no momento.</td></tr>`;
                document.getElementById('pagination-viagens').innerHTML = '';
                return;
            }

            paginatedItems.forEach(t => {
                const v = vehicles.find(item => item.id === t.veiculoId);
                const m = drivers.find(item => item.id === t.motoristaId);
                
                const statusClass = t.status === 'Realizada' ? 'realizada' : 'em_andamento';

                let actionsHTML = '';
                if (!isVisualizador) {
                    actionsHTML = `
                        <td style="text-align: center;">
                            <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                                <button class="btn-icon-only btn-edit-viagem" data-id="${t.id}" title="Editar Viagem">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                ${activeUser.perfil === 'Administrador' ? `
                                    <button class="btn-icon-only danger btn-delete-viagem" data-id="${t.id}" title="Excluir Viagem" style="background-color: var(--danger-light); color: var(--danger);">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    `;
                }

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
                                <span>Partida: ${t.dataSaida.split('-').reverse().join('/')}${t.horaPartida ? ` às ${t.horaPartida}` : ''}</span>
                                <span>Retorno: ${t.dataRetorno ? `${t.dataRetorno.split('-').reverse().join('/')}${t.horaChegada ? ` às ${t.horaChegada}` : ''}` : '<strong class="text-warning">Em trânsito</strong>'}</span>
                            </div>
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column; font-size:0.8rem;">
                                <span>Saída: ${parseFloat(t.kmInicial).toLocaleString('pt-BR')} km</span>
                                <span>Retorno: ${t.kmFinal > 0 ? `${parseFloat(t.kmFinal).toLocaleString('pt-BR')} km` : '-'}</span>
                            </div>
                        </td>
                        <td><span class="status-pill ${statusClass}">${t.status}</span></td>
                        <td style="text-align: center;">
                            ${t.status === 'Em andamento' && !isVisualizador ? `
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

        // Add Trip Trigger
        if (document.getElementById('btn-nova-viagem')) {
            document.getElementById('btn-nova-viagem').addEventListener('click', () => openViagemModal());
        }

        // Table actions triggers
        document.querySelector('.table-responsive').addEventListener('click', (e) => {
            const conclBtn = e.target.closest('.btn-conclude');
            const editBtn = e.target.closest('.btn-edit-viagem');
            const deleteBtn = e.target.closest('.btn-delete-viagem');
            
            if (conclBtn) {
                openConcluirModal(conclBtn.getAttribute('data-id'));
            } else if (editBtn) {
                openViagemModal(editBtn.getAttribute('data-id'));
            } else if (deleteBtn) {
                confirmDeleteViagem(deleteBtn.getAttribute('data-id'));
            }
        });

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
                        <input type="date" class="form-control" name="dataSaida" required value="${isEdit ? t.dataSaida : new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label>Hora de Partida <span class="text-muted">(Opcional)</span></label>
                        <input type="time" class="form-control" name="horaPartida" value="${isEdit && t.horaPartida ? t.horaPartida : ''}">
                    </div>

                    <div class="form-group">
                        <label>Selecione o Veículo <span class="required">*</span></label>
                        <select class="form-control" name="veiculoId" id="via-veic-sel" required>
                            ${isEdit 
                                ? vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual}" ${t.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})</option>`).join('')
                                : vehicles.filter(v => v.status === 'disponivel').map(v => `<option value="${v.id}" data-km="${v.kmAtual}">${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Selecione o Motorista Escalo <span class="required">*</span></label>
                        <select class="form-control" name="motoristaId" required>
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

                    ${isEdit && t.status === 'Realizada' ? `
                        <div class="form-group">
                            <label>Data de Retorno <span class="required">*</span></label>
                            <input type="date" class="form-control" name="dataRetorno" required value="${t.dataRetorno || ''}">
                        </div>

                        <div class="form-group">
                            <label>Hora de Chegada <span class="text-muted">(Opcional)</span></label>
                            <input type="time" class="form-control" name="horaChegada" value="${t.horaChegada || ''}">
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
                if (veicSel.options.length > 0 && !isEdit) {
                    const opt = veicSel.options[veicSel.selectedIndex];
                    kmInput.value = opt.getAttribute('data-km');
                    kmInput.setAttribute('min', opt.getAttribute('data-km'));
                }
            }

            veicSel.addEventListener('change', syncKM);
            if (!isEdit) syncKM();

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

                try {
                    if (isEdit) {
                        await window.movixStore.updateViagem(tripId, data);
                        window.movixApp.showToast('Viagem atualizada com sucesso!', 'success');
                    } else {
                        data.status = 'Em andamento';
                        data.custos = 0;
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
                }
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
                        <input type="date" class="form-control" name="dataRetorno" required value="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label>Hora de Chegada <span class="text-muted">(Opcional)</span></label>
                        <input type="time" class="form-control" name="horaChegada">
                    </div>

                    <div class="form-group">
                        <label>KM de Retorno (Odômetro Final) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmFinal" required placeholder="Odômetro de chegada" min="${t.kmInicial}">
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
                }
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
                    <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
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
                try {
                    await window.movixStore.deleteViagem(tripId);
                    window.movixApp.showToast('Viagem excluída com sucesso.', 'danger');
                    modal.classList.remove('active');
                    renderViagens(container);
                    window.movixApp.refreshAlertsCount();
                    window.movixApp.refreshNotificationsPanel();
                } catch (err) {
                    window.movixApp.showToast(err.message || 'Erro ao excluir viagem.', 'danger');
                }
            });
        }

        updateTable();
    }

    window.movixRouter.register('viagens', renderViagens);
})();
