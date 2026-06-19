/* MovixFrota - Troca de Óleo Module */

(function() {
    
    function renderOleo(container) {
        const oleos = window.movixStore.getOleos();
        const vehicles = window.movixStore.getVeiculos();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Controle de Troca de Óleo</h1>
                    <p class="page-subtitle">Acompanhe vencimentos de lubrificantes e filtros da frota por quilometragem e dias</p>
                </div>
                <div class="page-actions">
                    ${!isVisualizador ? `
                        <button class="btn btn-primary" id="btn-nova-troca-oleo">
                            <i class="fa-solid fa-oil-can"></i> Registrar Troca de Óleo
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- COMBINED VISUAL SEMAPHORES AND HISTORY -->
            <div class="grid-1-1-8">
                
                <!-- TRAFFIC-LIGHT STATUS CARDS (SEMAFOROS) -->
                <div class="card" style="display:flex; flex-direction:column; gap:16px;">
                    <div class="card-header-simple">
                        <h3>Status de Lubrificação por Veículo</h3>
                        <i class="fa-solid fa-traffic-light text-muted"></i>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:14px; max-height:460px; overflow-y:auto;" id="semaforo-cards-container">
                        <!-- Loaded dynamically -->
                    </div>
                </div>

                <!-- HISTORICAL OIL LOGS -->
                <div class="card">
                    <div class="card-header-simple">
                        <h3>Histórico Completo de Trocas</h3>
                        <span class="status-pill ok" style="font-size:0.75rem;">${oleos.length} registros</span>
                    </div>

                    <div class="table-responsive" style="border:none; box-shadow:none; margin-top:12px;">
                        <table class="smart-table">
                            <thead>
                                <tr>
                                    <th>Veículo</th>
                                    <th>Data Troca</th>
                                    <th>KM Troca</th>
                                    <th>Tipo Lubrificante</th>
                                    <th>Filtros Trocados</th>
                                    <th>Próxima Troca</th>
                                    <th style="width: 100px; text-align: center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-oleos">
                                <!-- Dynamic -->
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        `;

        function renderSemaphores() {
            const cardsContainer = document.getElementById('semaforo-cards-container');
            if (!cardsContainer) return;

            cardsContainer.innerHTML = '';
            
            // Loop through all active vehicles and check oil status
            vehicles.forEach(v => {
                const vehicleChanges = oleos.filter(o => o.veiculoId === v.id);
                if (vehicleChanges.length === 0) {
                    cardsContainer.innerHTML += `
                        <div class="oil-semaforo atencao" style="padding:10px 14px;">
                            <div class="oil-semaforo-bulb"><i class="fa-solid fa-circle-question"></i></div>
                            <div class="oil-semaforo-info">
                                <span class="oil-semaforo-status">${v.placa}</span>
                                <span class="oil-semaforo-desc">Sem trocas de óleo registradas.</span>
                            </div>
                        </div>
                    `;
                    return;
                }

                const latest = vehicleChanges[0];
                const kmRemaining = window.movixStore.getKMRemainingForOil(v.id);
                const daysRemaining = window.movixStore.getDaysRemainingForOil(v.id);

                let situation = 'ok';
                let desc = `Lubrificante regular. Faltam ${kmRemaining.toLocaleString('pt-BR')} KM ou ${daysRemaining} dias.`;
                let icon = '<i class="fa-solid fa-circle-check"></i>';

                if (kmRemaining <= 0 || daysRemaining <= 0) {
                    situation = 'vencido';
                    desc = `ÓLEO VENCIDO! Atrasado por ${Math.abs(kmRemaining).toLocaleString('pt-BR')} KM ou ${Math.abs(daysRemaining)} dias.`;
                    icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
                } else if (kmRemaining < 500 || daysRemaining < 10) {
                    situation = 'atencao';
                    desc = `Atenção: Troca Próxima! Apenas ${kmRemaining.toLocaleString('pt-BR')} KM ou ${daysRemaining} dias restantes.`;
                    icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
                }

                cardsContainer.innerHTML += `
                    <div class="oil-semaforo ${situation}" style="padding:10px 14px; cursor:pointer;" onclick="window.movixRouter.navigateTo('veiculos', '${v.id}')">
                        <div class="oil-semaforo-bulb">${icon}</div>
                        <div class="oil-semaforo-info">
                            <span class="oil-semaforo-status" style="font-weight:700;">${v.placa} • ${v.marca}</span>
                            <span class="oil-semaforo-desc" style="font-size:0.75rem;">${desc}</span>
                        </div>
                    </div>
                `;
            });
        }

        function renderHistoryTable() {
            const tbody = document.getElementById('tbody-oleos');
            if (!tbody) return;

            tbody.innerHTML = '';
            if (oleos.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhum registro de troca encontrado.</td></tr>`;
                return;
            }

            // Ordenar de forma robusta por data decrescente
            const sortedOleos = [...oleos].sort((a, b) => new Date(b.dataTroca) - new Date(a.dataTroca));

            sortedOleos.forEach(o => {
                const v = vehicles.find(item => item.id === o.veiculoId);
                const plaque = v ? v.placa : 'Deletado';
                
                // Compile filters list
                let filters = [];
                if (o.filtroOleo) filters.push('Óleo');
                if (o.filtroAr) filters.push('Ar');
                if (o.filtroCombustivel) filters.push('Comb.');
                const filtersLabel = filters.length > 0 ? filters.join(' + ') : 'Nenhum';

                let actionsHTML = `
                    <td style="text-align: center;">
                        <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                            <button class="btn-icon-only btn-view-oleo" data-id="${o.id}" title="Visualizar Detalhes">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            ${!isVisualizador ? `
                                <button class="btn-icon-only btn-edit-oleo" data-id="${o.id}" title="Editar Troca de Óleo">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                ${activeUser.perfil === 'Administrador' ? `
                                    <button class="btn-icon-only danger btn-delete-oleo" data-id="${o.id}" title="Excluir Troca de Óleo" style="background-color: var(--danger-light); color: var(--danger);">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            ` : ''}
                        </div>
                    </td>
                `;

                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="window.movixRouter.navigateTo('veiculos', '${o.veiculoId}')">${plaque}</td>
                        <td>${o.dataTroca.split('-').reverse().join('/')}</td>
                        <td>${parseFloat(o.kmTroca).toLocaleString('pt-BR')} km</td>
                        <td style="font-weight:600;">${o.tipoOleo}</td>
                        <td style="font-size:0.8rem; color:var(--text-muted);">${filtersLabel}</td>
                        <td style="font-weight:700;">
                            <div style="display:flex; flex-direction:column;">
                                <span>${parseFloat(o.proximaTrocaKM).toLocaleString('pt-BR')} km</span>
                                <span style="font-size:0.7rem; color:var(--text-muted);">${o.proximaTrocaDias ? o.proximaTrocaDias.split('-').reverse().join('/') : ''}</span>
                            </div>
                        </td>
                        ${actionsHTML}
                    </tr>
                `;
            });
        }

        // Add Oil Change Trigger
        if (document.getElementById('btn-nova-troca-oleo')) {
            document.getElementById('btn-nova-troca-oleo').addEventListener('click', () => openOleoModal());
        }

        // Table actions triggers
        const tbodyTable = document.getElementById('tbody-oleos');
        if (tbodyTable) {
            tbodyTable.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.btn-view-oleo');
                const editBtn = e.target.closest('.btn-edit-oleo');
                const deleteBtn = e.target.closest('.btn-delete-oleo');
                if (viewBtn) {
                    const id = viewBtn.getAttribute('data-id');
                    openOleoDetailModal(id);
                } else if (editBtn) {
                    const id = editBtn.getAttribute('data-id');
                    openOleoModal(id);
                } else if (deleteBtn) {
                    const id = deleteBtn.getAttribute('data-id');
                    confirmDeleteOleo(id);
                }
            });
        }

        // Add Troca Modal Dialog
        function openOleoModal(oleoId = null) {
            const isEdit = oleoId !== null;
            const o = isEdit ? oleos.find(item => item.id === oleoId) : null;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = isEdit ? 'Editar Troca de Óleo e Filtros' : 'Registrar Troca de Óleo e Filtros';

            modalBody.innerHTML = `
                <form id="form-oleo" class="form-grid">
                    <div class="form-group">
                        <label>Data da Troca <span class="required">*</span></label>
                        <input type="date" class="form-control" name="dataTroca" required value="${isEdit ? o.dataTroca : ''}">
                    </div>

                    <div class="form-group">
                        <label>Selecione o Veículo <span class="required">*</span></label>
                        <select class="form-control" name="veiculoId" id="oil-veic-sel" required ${isEdit ? 'disabled' : ''}>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione um veículo</option>
                            ${vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual}" ${isEdit && o.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})</option>`).join('')}
                        </select>
                        ${isEdit ? `<input type="hidden" name="veiculoId" value="${o.veiculoId}">` : ''}
                    </div>

                    <div class="form-group">
                        <label>KM Atual do Veículo <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmTroca" id="oil-km-input" required placeholder="Ex: 145000" min="0" value="${isEdit ? o.kmTroca : ''}">
                    </div>

                    <div class="form-group">
                        <label>Oficina / Lubrificantes <span class="required">*</span></label>
                        <input type="text" class="form-control" name="estabelecimento" required placeholder="Ex: Posto BR Lubrax" value="${isEdit ? o.estabelecimento : ''}">
                    </div>

                    <div class="form-group">
                        <label>Especificação / Tipo do Óleo <span class="required">*</span></label>
                        <input type="text" class="form-control" name="tipoOleo" required placeholder="Ex: Shell Rimula 15W40" value="${isEdit ? o.tipoOleo : ''}">
                    </div>

                    <div class="form-group">
                        <label>Próxima Troca por KM (Previsão) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="proximaTrocaKM" id="oil-next-km" required placeholder="Ex: 155000" min="0" value="${isEdit ? o.proximaTrocaKM : ''}">
                    </div>

                    <div class="form-group">
                        <label>Próxima Troca por Data (Previsão) <span class="required">*</span></label>
                        <input type="date" class="form-control" name="proximaTrocaDias" required value="${isEdit ? o.proximaTrocaDias : ''}">
                    </div>

                    <!-- Filters checklist -->
                    <div class="form-group full-width" style="margin-top:6px;">
                        <label>Substituição de Filtros Realizada:</label>
                        <div style="display:flex; gap:24px; margin-top:8px; font-size:0.85rem;">
                            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" name="filtroOleo" value="true" ${!isEdit || o.filtroOleo ? 'checked' : ''} style="width:16px; height:16px;"> Filtro de Óleo
                            </label>
                            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" name="filtroAr" value="true" ${!isEdit || o.filtroAr ? 'checked' : ''} style="width:16px; height:16px;"> Filtro de Ar
                            </label>
                            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" name="filtroCombustivel" value="true" ${isEdit && o.filtroCombustivel ? 'checked' : ''} style="width:16px; height:16px;"> Filtro de Combustível
                            </label>
                        </div>
                    </div>

                    <div class="form-group full-width" style="margin-top:6px;">
                        <label>Observações</label>
                        <textarea class="form-control" name="observacoes" placeholder="Ex: Detalhes técnicos da troca, marca do lubrificante ou filtros utilizados..." rows="2">${isEdit && o.observacoes ? o.observacoes : ''}</textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">${isEdit ? 'Salvar Alterações' : 'Registrar Troca'}</button>
            `;

            modal.classList.add('active');

            const veicSel = document.getElementById('oil-veic-sel');
            const kmInput = document.getElementById('oil-km-input');
            const nextKmInput = document.getElementById('oil-next-km');

            function syncKM() {
                const opt = veicSel.options[veicSel.selectedIndex];
                if (!opt || opt.value === "") {
                    kmInput.value = "";
                    kmInput.removeAttribute('min');
                    nextKmInput.value = "";
                    return;
                }
                const lastKM = opt.getAttribute('data-km');
                kmInput.value = lastKM;
                kmInput.setAttribute('min', lastKM);
                
                // standard 10,000 km oil lifetime guess
                nextKmInput.value = parseInt(lastKM) + 10000;
            }

            if (!isEdit) {
                veicSel.addEventListener('change', syncKM);
                syncKM();
            } else {
                veicSel.addEventListener('change', syncKM);
            }

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const form = document.getElementById('form-oleo');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const data = {
                    filtroOleo: form.querySelector('input[name="filtroOleo"]').checked,
                    filtroAr: form.querySelector('input[name="filtroAr"]').checked,
                    filtroCombustivel: form.querySelector('input[name="filtroCombustivel"]').checked
                };
                formData.forEach((value, key) => {
                    if (key !== 'filtroOleo' && key !== 'filtroAr' && key !== 'filtroCombustivel') {
                        data[key] = value;
                    }
                });
                data.valor = 0;

                const veiculoId = isEdit ? o.veiculoId : veicSel.value;
                const enteredKM = parseFloat(kmInput.value) || 0;
                const originalKM = isEdit ? parseFloat(o.kmTroca) || 0 : 0;

                const saveAction = async (justificativa) => {
                    const saveBtn = document.getElementById('btn-salvar-modal');
                    const loader = window.movixApp.startLoading(saveBtn, isEdit ? "Atualizando..." : "Salvando...");
                    if (justificativa) {
                        data.observacoes = (data.observacoes || '') + (data.observacoes ? '\n' : '') + `Motivo da divergência de KM: ${justificativa}`;
                    }
                    try {
                        if (isEdit) {
                            await window.movixStore.updateOleo(oleoId, data);
                            window.movixApp.showToast('Troca de óleo atualizada com sucesso!', 'success');
                        } else {
                            await window.movixStore.addOleo(data);
                            window.movixApp.showToast('Troca de óleo cadastrada com sucesso!', 'success');
                        }
                        modal.classList.remove('active');
                        renderOleo(container);
                        window.movixApp.refreshAlertsCount();
                        window.movixApp.refreshNotificationsPanel();
                    } catch (e) {
                        console.error(e);
                        window.movixApp.showToast(e.message || 'Erro ao registrar troca de óleo.', 'danger');
                    } finally {
                        loader.stop();
                    }
                };

                window.movixApp.validateKM(veiculoId, enteredKM, saveAction, isEdit, originalKM);
            });
        }

    function openOleoDetailModal(id) {
        const o = oleos.find(item => item.id === id);
        if (!o) return;

        const v = vehicles.find(item => item.id === o.veiculoId);

        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');

        modalTitle.innerText = `Detalhes da Troca de Óleo: ${id}`;

        let filters = [];
        if (o.filtroOleo) filters.push('Filtro de Óleo');
        if (o.filtroAr) filters.push('Filtro de Ar');
        if (o.filtroCombustivel) filters.push('Filtro de Combustível');
        const filtersLabel = filters.length > 0 ? filters.join(', ') : 'Nenhum filtro trocado';

        modalBody.innerHTML = `
            <div style="padding: 10px;">
                <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i> Informações do Registro</h4>
                <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Veículo</span><strong style="color:var(--primary);">${v ? `${v.placa} (${v.marca} ${v.modelo})` : 'Deletado'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data da Troca</span><strong>${o.dataTroca.split('-').reverse().join('/')}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>KM na Troca</span><strong>${parseFloat(o.kmTroca || 0).toLocaleString('pt-BR')} km</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Tipo do Óleo</span><strong>${o.tipoOleo || '-'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Estabelecimento</span><strong>${o.estabelecimento || '-'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Filtros Substituídos</span><strong>${filtersLabel}</strong></li>
                </ul>

                <h4 style="font-family:var(--font-heading); color:var(--primary); margin-top:20px; margin-bottom:12px;"><i class="fa-solid fa-clock"></i> Próxima Manutenção Preventiva</h4>
                <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>KM Próxima Troca</span><strong>${parseFloat(o.proximaTrocaKM || 0).toLocaleString('pt-BR')} km</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data Limite Recomendada</span><strong>${o.proximaTrocaDias ? o.proximaTrocaDias.split('-').reverse().join('/') : 'Não definida'}</strong></li>
                </ul>

                ${o.observacoes ? `
                <div style="margin-top:20px;">
                    <h5 style="font-weight:700; margin-bottom:6px; font-size:0.85rem;">Observações / Detalhes:</h5>
                    <p style="font-size:0.8rem; line-height:1.5; color:var(--text-muted); background:var(--bg-surface-hover); padding:10px; border-radius:6px; border-left:3px solid var(--primary); white-space:pre-wrap;">${o.observacoes}</p>
                </div>` : ''}
            </div>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="btn-fechar-detalhe">Fechar</button>
        `;

        modal.classList.add('active');
        document.getElementById('btn-fechar-detalhe').addEventListener('click', () => modal.classList.remove('active'));
    }

        function confirmDeleteOleo(id) {
            const o = oleos.find(item => item.id === id);
            if (!o) return;
            const v = vehicles.find(item => item.id === o.veiculoId);
            const plaque = v ? v.placa : 'Deletado';

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Excluir Troca de Óleo';
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Deseja realmente excluir a troca de óleo do veículo <strong>${plaque}</strong>?</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Esta ação removerá permanentemente o registro de lubrificação e recalculará as metas da frota.</p>
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
                    await window.movixStore.deleteOleo(id);
                    window.movixApp.showToast('Registro de troca de óleo removido.', 'danger');
                    modal.classList.remove('active');
                    renderOleo(container);
                    window.movixApp.refreshAlertsCount();
                    window.movixApp.refreshNotificationsPanel();
                } catch (err) {
                    window.movixApp.showToast(err.message || 'Erro ao excluir troca de óleo.', 'danger');
                } finally {
                    loader.stop();
                }
            });
        }

        renderSemaphores();
        renderHistoryTable();
    }

    window.movixRouter.register('oleo', renderOleo);
})();
