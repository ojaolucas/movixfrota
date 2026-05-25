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
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum registro de troca encontrado.</td></tr>`;
                return;
            }

            oleos.forEach(o => {
                const v = vehicles.find(item => item.id === o.veiculoId);
                const plaque = v ? v.placa : 'Deletado';
                
                // Compile filters list
                let filters = [];
                if (o.filtroOleo) filters.push('Óleo');
                if (o.filtroAr) filters.push('Ar');
                if (o.filtroCombustivel) filters.push('Comb.');
                const filtersLabel = filters.length > 0 ? filters.join(' + ') : 'Nenhum';

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
                    </tr>
                `;
            });
        }

        // Add Oil Change Trigger
        if (document.getElementById('btn-nova-troca-oleo')) {
            document.getElementById('btn-nova-troca-oleo').addEventListener('click', () => openOleoModal());
        }

        // Add Troca Modal Dialog
        function openOleoModal() {
            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Registrar Troca de Óleo e Filtros';

            modalBody.innerHTML = `
                <form id="form-oleo" class="form-grid">
                    <div class="form-group">
                        <label>Data da Troca <span class="required">*</span></label>
                        <input type="date" class="form-control" name="dataTroca" required value="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label>Selecione o Veículo <span class="required">*</span></label>
                        <select class="form-control" name="veiculoId" id="oil-veic-sel" required>
                            ${vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual}">${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>KM Atual do Veículo <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmTroca" id="oil-km-input" required placeholder="Ex: 145000" min="0">
                    </div>

                    <div class="form-group">
                        <label>Oficina / Lubrificantes <span class="required">*</span></label>
                        <input type="text" class="form-control" name="estabelecimento" required placeholder="Ex: Posto BR Lubrax">
                    </div>

                    <div class="form-group">
                        <label>Especificação / Tipo do Óleo <span class="required">*</span></label>
                        <input type="text" class="form-control" name="tipoOleo" required placeholder="Ex: Shell Rimula 15W40">
                    </div>

                    <div class="form-group">
                        <label>Valor Total (R$) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="valor" required placeholder="Ex: 480.00" step="0.01" min="0">
                    </div>

                    <div class="form-group">
                        <label>Próxima Troca por KM (Previsão) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="proximaTrocaKM" id="oil-next-km" required placeholder="Ex: 155000" min="0">
                    </div>

                    <div class="form-group">
                        <label>Próxima Troca por Data (Previsão) <span class="required">*</span></label>
                        <input type="date" class="form-control" name="proximaTrocaDias" required>
                    </div>

                    <!-- Filters checklist -->
                    <div class="form-group full-width" style="margin-top:6px;">
                        <label>Substituição de Filtros Realizada:</label>
                        <div style="display:flex; gap:24px; margin-top:8px; font-size:0.85rem;">
                            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" name="filtroOleo" value="true" checked style="width:16px; height:16px;"> Filtro de Óleo
                            </label>
                            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" name="filtroAr" value="true" checked style="width:16px; height:16px;"> Filtro de Ar
                            </label>
                            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" name="filtroCombustivel" value="true" style="width:16px; height:16px;"> Filtro de Combustível
                            </label>
                        </div>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">Registrar Troca</button>
            `;

            modal.classList.add('active');

            const veicSel = document.getElementById('oil-veic-sel');
            const kmInput = document.getElementById('oil-km-input');
            const nextKmInput = document.getElementById('oil-next-km');

            function syncKM() {
                const opt = veicSel.options[veicSel.selectedIndex];
                const lastKM = opt.getAttribute('data-km');
                kmInput.value = lastKM;
                kmInput.setAttribute('min', lastKM);
                
                // standard 10,000 km oil lifetime guess
                nextKmInput.value = parseInt(lastKM) + 10000;
            }

            veicSel.addEventListener('change', syncKM);
            syncKM();

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const form = document.getElementById('form-oleo');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                // Verify minimum odometer rule
                const enteredKM = parseFloat(kmInput.value);
                const limitKM = parseFloat(kmInput.getAttribute('min'));
                if (enteredKM < limitKM) {
                    window.movixApp.showToast(`O KM inserido (${enteredKM}) é menor que o KM registrado do veículo (${limitKM})!`, 'danger');
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

                try {
                    await window.movixStore.addOleo(data);
                    window.movixApp.showToast('Troca de óleo cadastrada com sucesso!', 'success');
                    modal.classList.remove('active');
                    renderSemaphores();
                    renderHistoryTable();
                } catch (e) {
                    console.error(e);
                    window.movixApp.showToast(e.message || 'Erro ao registrar troca de óleo.', 'danger');
                }
            });
        }

        renderSemaphores();
        renderHistoryTable();
    }

    window.movixRouter.register('oleo', renderOleo);
})();
