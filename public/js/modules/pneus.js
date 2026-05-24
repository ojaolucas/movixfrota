/* MovixFrota - Pneus Module */

(function() {
    
    function renderPneus(container) {
        const tires = window.movixStore.getPneus();
        const vehicles = window.movixStore.getVeiculos();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Controle de Pneus & Rodízio</h1>
                    <p class="page-subtitle">Monitore a vida útil de pneus individuais e agende rodízios preventivos de eixos</p>
                </div>
                <div class="page-actions">
                    ${!isVisualizador ? `
                        <button class="btn btn-primary" id="btn-novo-pneu">
                            <i class="fa-solid fa-plus"></i> Novo Pneu
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- COMBINED VISUAL AXLE MAP AND DATA LIST -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
                
                <!-- TIRES LIST -->
                <div class="card" style="min-height: 480px;">
                    <div class="card-header-simple">
                        <h3>Pneus Registrados na Frota</h3>
                        <span class="status-pill ok" style="font-size:0.75rem;">${tires.length} pneus</span>
                    </div>

                    <div class="table-responsive" style="border:none; box-shadow:none; margin-top:12px;">
                        <table class="smart-table">
                            <thead>
                                <tr>
                                    <th>Cód / Pneu</th>
                                    <th>Veículo Alvo</th>
                                    <th>Posição</th>
                                    <th>KM Restante</th>
                                    <th>Uso (%)</th>
                                    ${!isVisualizador ? '<th style="width: 100px; text-align: center;">Ações</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tbody-pneus">
                                <!-- Dynamic -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- VISUAL VEHICLE AXLES MAP (CONTROL DE RODÍZIO) -->
                <div class="card">
                    <div class="card-header-simple">
                        <h3>Visualizador de Eixos e Posições</h3>
                        <i class="fa-solid fa-truck-monster text-muted"></i>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <label style="font-size: 0.8rem; font-weight: 600;">Selecione o Veículo para Carregar Mapa:</label>
                        <select class="filter-input" id="axle-vehicle-sel">
                            ${vehicles.map(v => `<option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo}</option>`).join('')}
                        </select>
                    </div>

                    <!-- AXLES DRAW LAYOUT -->
                    <div id="axles-visualizer-container" style="flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:350px;">
                        <!-- Injected dynamically on select -->
                    </div>
                </div>

            </div>
        `;

        function updateList() {
            const tbody = document.getElementById('tbody-pneus');
            if (!tbody) return;

            tbody.innerHTML = '';
            tires.forEach(p => {
                const v = vehicles.find(item => item.id === p.veiculoAtual);
                const kmLeft = window.movixStore.getRemainingKMForTire(p.id);
                const percent = (kmLeft / p.vidaEstimada) * 100;
                
                let healthClass = 'ok';
                if (percent < 10) healthClass = 'vencido';
                else if (percent < 25) healthClass = 'atencao';

                const veicHTML = v 
                    ? `<span style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="window.movixRouter.navigateTo('veiculos', '${v.id}')">${v.placa}</span>`
                    : '<span style="color:var(--text-muted);">Estoque</span>';

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-family:var(--font-heading);">${p.codigo}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${p.marca} ${p.modelo}</span>
                            </div>
                        </td>
                        <td>${veicHTML}</td>
                        <td style="font-weight:600;">${p.posicao || '-'}</td>
                        <td style="font-weight:700;">
                            <span class="${healthClass === 'vencido' ? 'text-danger' : (healthClass === 'atencao' ? 'text-warning' : 'text-success')}">
                                ${kmLeft.toLocaleString('pt-BR')} km
                            </span>
                        </td>
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <div class="tire-health-bar-container" style="width:50px;">
                                    <div class="tire-health-bar ${healthClass === 'vencido' ? 'danger' : (healthClass === 'atencao' ? 'warning' : 'ok')}" style="width: ${percent}%;"></div>
                                </div>
                                <span style="font-size:0.75rem; font-weight:600;">${percent.toFixed(0)}%</span>
                            </div>
                        </td>
                        ${!isVisualizador ? `
                            <td style="text-align: center; display:flex; gap:6px; justify-content:center; align-items:center; height:58px;">
                                <button class="btn-icon-only btn-rodizio" data-id="${p.id}" title="Efetuar Rodízio / Alterar Posição">
                                    <i class="fa-solid fa-arrows-spin"></i>
                                </button>
                            </td>
                        ` : ''}
                    </tr>
                `;
            });
        }

        // Render visual tire axel layout on selecting a vehicle
        function renderAxleMap() {
            const container = document.getElementById('axles-visualizer-container');
            const veicId = document.getElementById('axle-vehicle-sel').value;
            const activeTires = tires.filter(p => p.veiculoAtual === veicId);

            if (!container) return;

            // Axle rendering
            container.innerHTML = `
                <div class="tires-visual-grid" style="width:100%; max-width:420px; min-height:300px; display:flex; flex-direction:column; gap:20px; align-items:center; justify-content:center;">
                    
                    <!-- Dianteiro Axle -->
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; padding: 0 40px;">
                        <div style="position:absolute; width:100%; height:4px; background-color:#334155; left:0; z-index:1;"></div>
                        
                        <!-- Left Front -->
                        ${renderSingleTireCard(activeTires, 'Dianteiro Esquerdo')}
                        
                        <!-- Right Front -->
                        ${renderSingleTireCard(activeTires, 'Dianteiro Direito')}
                    </div>

                    <!-- Axle structural bridge -->
                    <div style="width:8px; height:60px; background-color:#334155;"></div>

                    <!-- Traseiro Axle -->
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; padding: 0 40px;">
                        <div style="position:absolute; width:100%; height:4px; background-color:#334155; left:0; z-index:1;"></div>
                        
                        <!-- Left Rear -->
                        ${renderSingleTireCard(activeTires, 'Traseiro Esquerdo')}
                        
                        <!-- Right Rear -->
                        ${renderSingleTireCard(activeTires, 'Traseiro Direito')}
                    </div>
                </div>
            `;
        }

        function renderSingleTireCard(activeTires, position) {
            const p = activeTires.find(item => item.posicao === position);
            
            if (!p) {
                return `
                    <div style="z-index:2; width:110px; height:80px; background-color:var(--bg-surface-hover); border:2px dashed var(--border-color); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-size:0.7rem; color:var(--text-muted);">
                        <span>${position.split(' ')[1]}</span>
                        <strong style="color:var(--danger);">[Vazio]</strong>
                    </div>
                `;
            }

            const kmLeft = window.movixStore.getRemainingKMForTire(p.id);
            const percent = (kmLeft / p.vidaEstimada) * 100;
            let barColor = 'ok';
            if (percent < 10) barColor = 'danger';
            else if (percent < 25) barColor = 'warning';

            return `
                <div class="tire-widget" style="z-index:2; width:110px; padding:8px; gap:6px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.7rem; font-weight:700;">
                        <span>${p.codigo}</span>
                        <span class="${barColor === 'danger' ? 'text-danger' : (barColor === 'warning' ? 'text-warning' : 'text-success')}">${percent.toFixed(0)}%</span>
                    </div>
                    <div class="tire-health-bar-container" style="height:6px;">
                        <div class="tire-health-bar ${barColor}" style="width: ${percent}%;"></div>
                    </div>
                    <span style="font-size:0.6rem; color:var(--text-muted); font-weight:600; text-align:center;">${position.replace('Esquerdo', 'Esq.').replace('Direito', 'Dir.')}</span>
                </div>
            `;
        }

        // Action selector event listeners
        document.getElementById('axle-vehicle-sel').addEventListener('change', renderAxleMap);

        // CRUD Add triggers
        if (document.getElementById('btn-novo-pneu')) {
            document.getElementById('btn-novo-pneu').addEventListener('click', () => openPneuModal());
        }

        // Rodizio Action trigger
        document.getElementById('tbody-pneus').addEventListener('click', (e) => {
            const rodBtn = e.target.closest('.btn-rodizio');
            if (rodBtn) {
                const id = rodBtn.getAttribute('data-id');
                openRodizioModal(id);
            }
        });

        // Add Pneu Modal
        function openPneuModal() {
            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Instalar Pneu na Frota';

            modalBody.innerHTML = `
                <form id="form-pneu" class="form-grid">
                    <div class="form-group">
                        <label>Código Interno <span class="required">*</span></label>
                        <input type="text" class="form-control" name="codigo" required placeholder="Ex: PN-90022">
                    </div>
                    <div class="form-group">
                        <label>Marca <span class="required">*</span></label>
                        <input type="text" class="form-control" name="marca" required placeholder="Ex: Michelin, Goodyear">
                    </div>
                    <div class="form-group">
                        <label>Modelo Pneu <span class="required">*</span></label>
                        <input type="text" class="form-control" name="modelo" required placeholder="Ex: X Multi Z">
                    </div>
                    <div class="form-group">
                        <label>Vida Útil Estimada (KM) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="vidaEstimada" required value="70000" min="0">
                    </div>
                    <div class="form-group">
                        <label>Custo Unitário (R$)</label>
                        <input type="number" class="form-control" name="custo" placeholder="Ex: 2400.00" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Data de Instalação <span class="required">*</span></label>
                        <input type="date" class="form-control" name="dataInstalacao" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="form-group">
                        <label>Instalar no Veículo</label>
                        <select class="form-control" name="veiculoAtual" id="pneu-veic-sel">
                            <option value="">Apenas em Estoque (Sem veículo)</option>
                            ${vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual}">${v.placa} (KM: ${v.kmAtual})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Posição no Veículo</label>
                        <select class="form-control" name="posicao">
                            <option value="Dianteiro Esquerdo">Dianteiro Esquerdo</option>
                            <option value="Dianteiro Direito">Dianteiro Direito</option>
                            <option value="Traseiro Esquerdo">Traseiro Esquerdo</option>
                            <option value="Traseiro Direito">Traseiro Direito</option>
                        </select>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">Instalar Pneu</button>
            `;

            modal.classList.add('active');

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const form = document.getElementById('form-pneu');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => data[key] = value);

                // Auto set initial KM to current Vehicle odometer on installation
                if (data.veiculoAtual) {
                    const veicOpt = document.getElementById('pneu-veic-sel');
                    const km = veicOpt.options[veicOpt.selectedIndex].getAttribute('data-km');
                    data.kmInicial = parseFloat(km) || 0;
                    data.status = 'ok';
                } else {
                    data.kmInicial = 0;
                    data.status = 'ok';
                    data.posicao = '';
                }

                try {
                    await window.movixStore.addPneu(data);
                    window.movixApp.showToast('Pneu cadastrado com sucesso!', 'success');
                    modal.classList.remove('active');
                    updateList();
                    renderAxleMap();
                } catch (e) {
                    console.error(e);
                    window.movixApp.showToast(e.message || 'Erro ao cadastrar pneu.', 'danger');
                }
            });
        }

        // Rodizio Position Swap Modal
        function openRodizioModal(pneuId) {
            const p = tires.find(item => item.id === pneuId);
            if (!p) return;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = `Efetuar Rodízio - Pneu ${p.codigo}`;

            modalBody.innerHTML = `
                <form id="form-rodizio" class="form-grid" style="display:flex; flex-direction:column; gap:16px;">
                    <div style="background-color:var(--bg-surface-hover); padding:16px; border-radius:8px; border:1px solid var(--border-color); font-size:0.85rem; line-height:1.6;">
                        <p><strong>Pneu Selecionado:</strong> ${p.marca} ${p.modelo} (${p.codigo})</p>
                        <p><strong>Veículo Instalado:</strong> ${vehicles.find(item => item.id === p.veiculoAtual)?.placa || 'Sem veículo'}</p>
                        <p><strong>Posição Atual:</strong> ${p.posicao || 'Estoque'}</p>
                    </div>

                    <div class="form-group">
                        <label>Nova Posição no Veículo <span class="required">*</span></label>
                        <select class="form-control" name="posicao" required>
                            <option value="Dianteiro Esquerdo" ${p.posicao === 'Dianteiro Esquerdo' ? 'selected' : ''}>Dianteiro Esquerdo</option>
                            <option value="Dianteiro Direito" ${p.posicao === 'Dianteiro Direito' ? 'selected' : ''}>Dianteiro Direito</option>
                            <option value="Traseiro Esquerdo" ${p.posicao === 'Traseiro Esquerdo' ? 'selected' : ''}>Traseiro Esquerdo</option>
                            <option value="Traseiro Direito" ${p.posicao === 'Traseiro Direito' ? 'selected' : ''}>Traseiro Direito</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Observação de Rodízio</label>
                        <textarea class="form-control" id="rodizio-obs" placeholder="Ex: Efetuado rodízio cruzado para corrigir desgaste lateral."></textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">Aplicar Rodízio</button>
            `;

            modal.classList.add('active');

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const newPos = document.querySelector('#form-rodizio select[name="posicao"]').value;
                const obs = document.getElementById('rodizio-obs').value;

                try {
                    // Update state
                    await window.movixStore.updatePneu(pneuId, { ...p, posicao: newPos });
                    window.movixApp.showToast('Rodízio de pneu executado com sucesso!', 'success');
                    modal.classList.remove('active');
                    updateList();
                    renderAxleMap();
                } catch (e) {
                    console.error(e);
                    window.movixApp.showToast(e.message || 'Erro ao realizar rodízio do pneu.', 'danger');
                }
            });
        }

        updateList();
        renderAxleMap();
    }

    window.movixRouter.register('pneus', renderPneus);
})();
