/* MovixFrota - Pneus Module */

(function() {
    
    function renderPneus(container) {
        const tires = window.movixStore.getPneus();
        const vehicles = window.movixStore.getVeiculos();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';

        let state = window.movixApp.getListState('pneus');
        if (!state) {
            state = {
                selectedVehicleId: vehicles.length > 0 ? vehicles[0].id : '',
                scroll: 0
            };
            window.movixApp.saveListState('pneus', state);
        }

        function getPositionsForVehicle(vehicle) {
            if (!vehicle) return [];
            const qtdEixos = parseInt(vehicle.qtdEixos) || 2;
            const isTrailer = vehicle.tipoUnidade === 'Implemento/Reboque';
            const isMultiAxle = qtdEixos > 2;

            const positions = [];
            if (!isTrailer && !isMultiAxle) {
                positions.push('Dianteiro Esquerdo', 'Dianteiro Direito');
                positions.push('Traseiro Esquerdo', 'Traseiro Direito');
            } else {
                for (let i = 1; i <= qtdEixos; i++) {
                    positions.push(`Eixo ${i} Esquerdo`);
                    positions.push(`Eixo ${i} Direito`);
                }
            }
            return positions;
        }
        
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
            <div class="grid-1-2-1">
                
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
                                    ${!isVisualizador ? '<th style="width: 140px; text-align: center;">Ações</th>' : ''}
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
                            ${vehicles.map(v => `<option value="${v.id}" ${state.selectedVehicleId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo}</option>`).join('')}
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
            const currentTires = window.movixStore.getPneus();
            currentTires.forEach(p => {
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
                            <td style="text-align: center;">
                                <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                                    <button class="btn-icon-only btn-edit-pneu" data-id="${p.id}" title="Editar Pneu">
                                        <i class="fa-solid fa-pen-to-square"></i>
                                    </button>
                                    <button class="btn-icon-only btn-rodizio" data-id="${p.id}" title="Efetuar Rodízio / Alterar Posição">
                                        <i class="fa-solid fa-arrows-spin"></i>
                                    </button>
                                    ${activeUser.perfil === 'Administrador' ? `
                                        <button class="btn-icon-only danger btn-delete-pneu" data-id="${p.id}" title="Excluir Pneu" style="background-color: var(--danger-light); color: var(--danger);">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        ` : ''}
                    </tr>
                `;
            });

            // Restore scroll position
            setTimeout(() => {
                window.scrollTo(0, state.scroll || 0);
            }, 0);
        }

        // Render visual tire axel layout on selecting a vehicle
        function renderAxleMap() {
            const container = document.getElementById('axles-visualizer-container');
            const selectEl = document.getElementById('axle-vehicle-sel');
            if (!container) return;

            const veicId = selectEl ? selectEl.value : state.selectedVehicleId;
            state.selectedVehicleId = veicId;
            window.movixApp.saveListState('pneus', state);

            const selectedVeh = vehicles.find(v => v.id === veicId);
            if (!selectedVeh) {
                container.innerHTML = '<div class="search-no-results">Selecione um veículo válido.</div>';
                return;
            }

            const activeTires = window.movixStore.getPneus().filter(p => p.veiculoAtual === veicId);
            const qtdEixos = parseInt(selectedVeh.qtdEixos) || 2;
            const isTrailer = selectedVeh.tipoUnidade === 'Implemento/Reboque';
            const isMultiAxle = qtdEixos > 2;

            let axlesHTML = '';
            
            if (!isTrailer && !isMultiAxle) {
                axlesHTML = `
                    <!-- Eixo Dianteiro -->
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; padding: 0 40px;">
                        <div style="position:absolute; width:100%; height:4px; background-color:#334155; left:0; z-index:1;"></div>
                        ${renderSingleTireCard(activeTires, 'Dianteiro Esquerdo')}
                        ${renderSingleTireCard(activeTires, 'Dianteiro Direito')}
                    </div>

                    <!-- Axle structural bridge -->
                    <div style="width:8px; height:40px; background-color:#334155;"></div>

                    <!-- Eixo Traseiro -->
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; padding: 0 40px;">
                        <div style="position:absolute; width:100%; height:4px; background-color:#334155; left:0; z-index:1;"></div>
                        ${renderSingleTireCard(activeTires, 'Traseiro Esquerdo')}
                        ${renderSingleTireCard(activeTires, 'Traseiro Direito')}
                    </div>
                `;
            } else {
                for (let i = 1; i <= qtdEixos; i++) {
                    axlesHTML += `
                        <!-- Eixo ${i} -->
                        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; padding: 0 40px;">
                            <div style="position:absolute; width:100%; height:4px; background-color:#334155; left:0; z-index:1;"></div>
                            ${renderSingleTireCard(activeTires, `Eixo ${i} Esquerdo`)}
                            ${renderSingleTireCard(activeTires, `Eixo ${i} Direito`)}
                        </div>
                    `;
                    if (i < qtdEixos) {
                        axlesHTML += `<div style="width:8px; height:30px; background-color:#334155;"></div>`;
                    }
                }
            }

            container.innerHTML = `
                <div class="tires-visual-grid" style="width:100%; max-width:420px; min-height:300px; display:flex; flex-direction:column; gap:12px; align-items:center; justify-content:center; padding: 20px 0;">
                    ${axlesHTML}
                </div>
            `;
        }

        function renderSingleTireCard(activeTires, position) {
            const p = activeTires.find(item => item.posicao === position);
            
            if (!p) {
                const parts = position.split(' ');
                const label = parts[parts.length - 1];
                const prefix = parts.length > 2 ? `${parts[0]} ${parts[1]}` : '';
                return `
                    <div style="z-index:2; width:110px; height:80px; background-color:var(--bg-surface-hover); border:2px dashed var(--border-color); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font-size:0.7rem; color:var(--text-muted);">
                        ${prefix ? `<span style="font-size:0.6rem; color:var(--text-muted); font-weight:700;">${prefix}</span>` : ''}
                        <span>${label}</span>
                        <strong style="color:var(--danger); font-size:0.65rem;">[Vazio]</strong>
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
        document.getElementById('axle-vehicle-sel').addEventListener('change', (e) => {
            state.selectedVehicleId = e.target.value;
            window.movixApp.saveListState('pneus', state);
            renderAxleMap();
        });

        // CRUD Add triggers
        if (document.getElementById('btn-novo-pneu')) {
            document.getElementById('btn-novo-pneu').addEventListener('click', () => openPneuModal());
        }

        // CRUD Actions trigger in table
        document.getElementById('tbody-pneus').addEventListener('click', (e) => {
            const rodBtn = e.target.closest('.btn-rodizio');
            const editBtn = e.target.closest('.btn-edit-pneu');
            const deleteBtn = e.target.closest('.btn-delete-pneu');
            
            if (rodBtn) {
                const id = rodBtn.getAttribute('data-id');
                openRodizioModal(id);
            } else if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                openPneuModal(id);
            } else if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                confirmDeletePneu(id);
            }
        });

        // Add Pneu Modal
        function openPneuModal(pneuId = null) {
            const isEdit = pneuId !== null;
            const p = isEdit ? window.movixStore.getPneus().find(item => item.id === pneuId) : null;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = isEdit ? 'Editar Cadastro de Pneu' : 'Instalar Pneu na Frota';

            modalBody.innerHTML = `
                <form id="form-pneu" class="form-grid">
                    <div class="form-group">
                        <label>Código Interno <span class="required">*</span></label>
                        <input type="text" class="form-control" name="codigo" required placeholder="Ex: PN-90022" value="${isEdit ? p.codigo : ''}">
                    </div>
                    <div class="form-group">
                        <label>Marca <span class="required">*</span></label>
                        <input type="text" class="form-control" name="marca" required placeholder="Ex: Michelin, Goodyear" value="${isEdit ? p.marca : ''}">
                    </div>
                    <div class="form-group">
                        <label>Modelo Pneu <span class="required">*</span></label>
                        <input type="text" class="form-control" name="modelo" required placeholder="Ex: X Multi Z" value="${isEdit ? p.modelo : ''}">
                    </div>
                    <div class="form-group">
                        <label>Vida Útil Estimada (KM) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="vidaEstimada" required min="0" value="${isEdit ? p.vidaEstimada : '70000'}">
                    </div>
                    <div class="form-group">
                        <label>Custo Unitário (R$)</label>
                        <input type="text" class="form-control" name="custo" placeholder="Ex: R$ 2.400,00" value="${isEdit && p.custo ? window.movixApp.formatCurrency(p.custo) : ''}">
                    </div>
                    <div class="form-group">
                        <label>Data de Instalação <span class="required">*</span></label>
                        <input type="date" class="form-control" name="dataInstalacao" required value="${isEdit ? p.dataInstalacao : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="form-group">
                        <label>KM de Instalação (Inicial) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmInicial" id="pneu-kminicial-input" required min="0" value="${isEdit ? p.kmInicial : '0'}">
                    </div>

                    ${isEdit ? `
                        <div class="form-group">
                            <label>Status do Pneu</label>
                            <select class="form-control" name="status">
                                <option value="ok" ${p.status === 'ok' ? 'selected' : ''}>Regular (OK)</option>
                                <option value="atencao" ${p.status === 'atencao' ? 'selected' : ''}>Atenção</option>
                                <option value="vencido" ${p.status === 'vencido' ? 'selected' : ''}>Vencido (Trocar)</option>
                            </select>
                        </div>
                    ` : ''}

                    <div class="form-group">
                        <label>Instalar no Veículo</label>
                        <select class="form-control" name="veiculoAtual" id="pneu-veic-sel">
                            <option value="">Apenas em Estoque (Sem veículo)</option>
                            ${vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual || 0}" ${isEdit && p.veiculoAtual === v.id ? 'selected' : ''}>${v.placa} (Eixos: ${v.qtdEixos || 2})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Posição no Veículo</label>
                        <select class="form-control" name="posicao" id="pneu-pos-sel">
                            <option value="">Apenas Estoque</option>
                        </select>
                    </div>

                    <!-- History logs -->
                    ${isEdit ? `
                        <div class="form-group full-width" style="margin-top:10px;">
                            <label>Histórico de Rodízios e Eventos</label>
                            <div id="pneu-historico-lista" style="display:flex; flex-direction:column; gap:8px; max-height:130px; overflow-y:auto; background:var(--bg-surface-hover); border:1px solid var(--border-color); padding:10px; border-radius:6px; margin-bottom:8px;">
                                ${(p.historico || []).length > 0 
                                    ? p.historico.map(h => `<div style="font-size:0.75rem; border-bottom:1px solid var(--border-light); padding-bottom:4px; line-height:1.4;"><strong>${new Date(h.data).toLocaleDateString('pt-BR')}:</strong> ${h.detalhes}</div>`).join('') 
                                    : '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">Nenhum histórico registrado ainda.</div>'}
                            </div>
                            <input type="text" class="form-control" id="pneu-novo-historico-input" placeholder="Adicionar nova anotação/evento no histórico...">
                        </div>
                    ` : ''}
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">${isEdit ? 'Salvar Alterações' : 'Instalar Pneu'}</button>
            `;

            modal.classList.add('active');

            // Dynamic positions updating logic
            const pneuVeicSel = document.getElementById('pneu-veic-sel');
            const pneuPosSel = document.getElementById('pneu-pos-sel');

            const handlePneuVeicChange = () => {
                const veicId = pneuVeicSel.value;
                if (!veicId) {
                    pneuPosSel.innerHTML = '<option value="">Estoque (Sem Posição)</option>';
                    return;
                }
                const selectedVeh = vehicles.find(v => v.id === veicId);
                const positions = getPositionsForVehicle(selectedVeh);
                pneuPosSel.innerHTML = positions.map(pos => `<option value="${pos}" ${isEdit && p.posicao === pos ? 'selected' : ''}>${pos}</option>`).join('');
            };

            if (pneuVeicSel && pneuPosSel) {
                pneuVeicSel.addEventListener('change', handlePneuVeicChange);
                handlePneuVeicChange();
            }

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
                    const selectedVeh = vehicles.find(v => v.id === data.veiculoAtual);
                    data.kmInicial = isEdit ? parseFloat(data.kmInicial) : parseFloat(selectedVeh.kmAtual || 0);
                    data.status = isEdit ? data.status : 'ok';
                } else {
                    data.kmInicial = isEdit ? parseFloat(data.kmInicial) : 0;
                    data.status = isEdit ? data.status : 'ok';
                    data.posicao = '';
                }

                const veiculoId = data.veiculoAtual || null;
                const enteredKM = parseFloat(data.kmInicial) || 0;
                const originalKM = isEdit ? parseFloat(p.kmInicial) || 0 : 0;

                const saveAction = async (justificativa) => {
                     // Compile history
                     if (isEdit) {
                         const historico = p.historico || [];
                         const novaObs = document.getElementById('pneu-novo-historico-input').value.trim();
                         if (novaObs) {
                             historico.push({
                                 data: new Date().toISOString(),
                                 detalhes: novaObs
                             });
                         }
                         // Se a posição mudou, registrar automaticamente no histórico!
                         if (p.posicao !== data.posicao || p.veiculoAtual !== data.veiculoAtual) {
                             const vOld = vehicles.find(item => item.id === p.veiculoAtual)?.placa || 'Estoque';
                             const vNew = vehicles.find(item => item.id === data.veiculoAtual)?.placa || 'Estoque';
                             historico.push({
                                 data: new Date().toISOString(),
                                 detalhes: `Rodízio/Remanejamento manual de [${vOld} - ${p.posicao || 'Estoque'}] para [${vNew} - ${data.posicao || 'Estoque'}]`
                             });
                         }
                         data.historico = historico;
                     } else {
                         data.historico = [
                             {
                                 data: new Date().toISOString(),
                                 detalhes: 'Instalação inicial na frota'
                             }
                         ];
                     }

                     if (justificativa) {
                         if (!data.historico) {
                             data.historico = [];
                         }
                         data.historico.push({
                             data: new Date().toISOString(),
                             detalhes: `Motivo da divergência de KM: ${justificativa}`
                         });
                     }

                     const saveBtn = document.getElementById('btn-salvar-modal');
                     const loader = window.movixApp.startLoading(saveBtn, isEdit ? "Atualizando..." : "Salvando...");
                     try {
                         if (isEdit) {
                             await window.movixStore.updatePneu(pneuId, data);
                             window.movixApp.showToast('Pneu editado com sucesso!', 'success');
                         } else {
                             await window.movixStore.addPneu(data);
                             window.movixApp.showToast('Pneu cadastrado com sucesso!', 'success');
                         }
                         modal.classList.remove('active');
                         updateList();
                         renderAxleMap();
                         window.movixApp.refreshAlertsCount();
                         window.movixApp.refreshNotificationsPanel();
                     } catch (e) {
                         console.error(e);
                         window.movixApp.showToast(e.message || 'Erro ao salvar pneu.', 'danger');
                     } finally {
                         loader.stop();
                     }
                 };

                 if (veiculoId) {
                    window.movixApp.validateKM(veiculoId, enteredKM, saveAction, isEdit, originalKM);
                } else {
                    saveAction();
                }
            });
        }

        // Rodizio Position Swap Modal
        function openRodizioModal(pneuId) {
            const p = window.movixStore.getPneus().find(item => item.id === pneuId);
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
                            ${(() => {
                                const currentVehicle = vehicles.find(v => v.id === p.veiculoAtual);
                                const positions = getPositionsForVehicle(currentVehicle);
                                return positions.length > 0 
                                    ? positions.map(pos => `<option value="${pos}" ${p.posicao === pos ? 'selected' : ''}>${pos}</option>`).join('')
                                    : `<option value="">Estoque</option>`;
                             })()}
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

                const saveBtn = document.getElementById('btn-salvar-modal');
                const loader = window.movixApp.startLoading(saveBtn, "Processando...");
                try {
                    const historico = p.historico || [];
                    historico.push({
                        data: new Date().toISOString(),
                        detalhes: `Rodízio: Alterou de [${p.posicao}] para [${newPos}]${obs ? `. OBS: ${obs}` : ''}`
                    });
                    
                    // Update state
                    await window.movixStore.updatePneu(pneuId, { ...p, posicao: newPos, historico });
                    window.movixApp.showToast('Rodízio de pneu executado com sucesso!', 'success');
                    modal.classList.remove('active');
                    updateList();
                    renderAxleMap();
                    window.movixApp.refreshAlertsCount();
                    window.movixApp.refreshNotificationsPanel();
                } catch (e) {
                    console.error(e);
                    window.movixApp.showToast(e.message || 'Erro ao realizar rodízio do pneu.', 'danger');
                } finally {
                    loader.stop();
                }
            });
        }

        function confirmDeletePneu(pneuId) {
            const p = window.movixStore.getPneus().find(item => item.id === pneuId);
            if (!p) return;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Excluir Cadastro de Pneu';
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Deseja realmente excluir o pneu <strong>${p.codigo}</strong> (${p.marca} ${p.modelo})?</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Esta ação removerá permanentemente o pneu do sistema e dos relatórios de custo da frota.</p>
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
                    await window.movixStore.deletePneu(pneuId);
                    window.movixApp.showToast('Pneu excluído com sucesso.', 'danger');
                    modal.classList.remove('active');
                    updateList();
                    renderAxleMap();
                    window.movixApp.refreshAlertsCount();
                    window.movixApp.refreshNotificationsPanel();
                } catch (err) {
                    window.movixApp.showToast(err.message || 'Erro ao excluir pneu.', 'danger');
                } finally {
                    loader.stop();
                }
            });
        }

        updateList();
        renderAxleMap();
    }

    window.movixRouter.register('pneus', renderPneus);
})();
