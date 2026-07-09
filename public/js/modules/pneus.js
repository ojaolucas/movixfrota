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
                currentPage: 1,
                itemsPerPage: 10,
                scroll: 0
            };
            window.movixApp.saveListState('pneus', state);
        } else {
            if (state.currentPage === undefined) state.currentPage = 1;
            if (state.itemsPerPage === undefined) state.itemsPerPage = 10;
        }

        function createMovementLog(posOld, posNew, vehOldId, vehNewId, kmVal) {
            const userName = activeUser ? activeUser.nome : 'Usuário';
            const vOld = vehicles.find(item => item.id === vehOldId)?.placa || 'Estoque';
            const vNew = vehicles.find(item => item.id === vehNewId)?.placa || 'Estoque';
            
            const locOld = vehOldId ? `${vOld} - ${posOld || 'Estoque'}` : 'Estoque';
            const locNew = vehNewId ? `${vNew} - ${posNew || 'Estoque'}` : 'Estoque';
            
            const nowStr = new Date().toLocaleDateString('pt-BR');
            const timeStr = new Date().toLocaleTimeString('pt-BR');
            const kmStr = kmVal !== undefined && kmVal !== null && kmVal > 0 ? ` | KM: ${parseFloat(kmVal).toLocaleString('pt-BR')}` : '';
            
            return `Movimentação: [${locOld}] para [${locNew}] por ${userName} em ${nowStr} às ${timeStr}${kmStr}`;
        }

        function getPositionsForVehicle(vehicle) {
            if (!vehicle) return [];
            
            const tipo = vehicle.tipo || 'Passeio';
            let positions = [];
            
            if (tipo === 'Moto') {
                positions = ['Dianteiro', 'Traseiro'];
            } else if (tipo === 'Passeio') {
                positions = [
                    'Dianteiro Esquerdo', 'Dianteiro Direito',
                    'Traseiro Esquerdo', 'Traseiro Direito'
                ];
            } else {
                let configEixos = vehicle.configEixos;
                if (typeof configEixos === 'string') {
                    try {
                        configEixos = JSON.parse(configEixos);
                    } catch(e) {
                        configEixos = [];
                    }
                }

                if (configEixos && Array.isArray(configEixos) && configEixos.length > 0) {
                    configEixos.forEach(ax => {
                        const axleNum = ax.eixo;
                        if (ax.tipo === 'Simples') {
                            positions.push(`Eixo ${axleNum} - Esquerdo`);
                            positions.push(`Eixo ${axleNum} - Direito`);
                        } else if (ax.tipo === 'Dupla') {
                            positions.push(`Eixo ${axleNum} - Esquerdo Externo`);
                            positions.push(`Eixo ${axleNum} - Esquerdo Interno`);
                            positions.push(`Eixo ${axleNum} - Direito Interno`);
                            positions.push(`Eixo ${axleNum} - Direito Externo`);
                        }
                    });
                } else {
                    // Fallback for legacy vehicles
                    if (tipo === 'Utilitário') {
                        positions = [
                            'Dianteiro Esquerdo', 'Dianteiro Direito',
                            'Traseiro Esquerdo', 'Traseiro Direito'
                        ];
                    } else {
                        const qtdEixos = parseInt(vehicle.qtdEixos) || 2;
                        for (let i = 1; i <= qtdEixos; i++) {
                            positions.push(`Eixo ${i} - Esquerdo`);
                            positions.push(`Eixo ${i} - Direito`);
                        }
                    }
                }
            }

            // Append Estepes according to vehicle.qtdEstepes
            const numEstepes = vehicle.qtdEstepes !== undefined && vehicle.qtdEstepes !== null ? parseInt(vehicle.qtdEstepes) : 1;
            for (let i = 1; i <= numEstepes; i++) {
                positions.push(`Estepe ${i}`);
            }
            
            return positions;
        }
        
        function getKPIsHTML(selectedVehicleId) {
            const allTires = window.movixStore.getPneus();
            const allVehicles = window.movixStore.getVeiculos();
            const selectedVeh = allVehicles.find(v => v.id === selectedVehicleId);
            
            let vehTiresCount = 0;
            let vehTiresCost = 0;
            let vehTiresKMRodadoSum = 0;
            let vehTiresCustoKMUnits = 0;
            let vehTiresCustoKMSum = 0;
            
            if (selectedVeh) {
                const vehTires = allTires.filter(p => p.veiculoAtual === selectedVeh.id);
                vehTiresCount = vehTires.length;
                
                vehTires.forEach(p => {
                    vehTiresCost += (p.custo || 0);
                    const kmRodado = Math.max(0, (selectedVeh.kmAtual || 0) - (p.kmInicial || 0));
                    vehTiresKMRodadoSum += kmRodado;
                    
                    if (kmRodado > 0) {
                        vehTiresCustoKMSum += (p.custo || 0) / kmRodado;
                        vehTiresCustoKMUnits++;
                    }
                });
            }
            
            const avgKMRodado = vehTiresCount > 0 ? (vehTiresKMRodadoSum / vehTiresCount) : 0;
            const avgCustoKM = vehTiresCustoKMUnits > 0 ? (vehTiresCustoKMSum / vehTiresCustoKMUnits) : 0;
            
            let inStockCount = 0;
            let recapadosCount = 0;
            let alertCount = 0;
            let expiredCount = 0;
            
            allTires.forEach(p => {
                if (!p.veiculoAtual) {
                    inStockCount++;
                }
                if (p.recapado) {
                    recapadosCount++;
                }
                
                const kmLeft = window.movixStore.getRemainingKMForTire(p.id);
                const percent = p.vidaEstimada > 0 ? (kmLeft / p.vidaEstimada) * 100 : 0;
                
                if (p.veiculoAtual) {
                    if (percent < 10) {
                        expiredCount++;
                    } else if (percent < 25) {
                        alertCount++;
                    }
                }
            });
            
            return `
                <div class="kpis-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; width: 100%;">
                    <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; margin-bottom:0; box-shadow: var(--shadow-sm);">
                        <div style="width: 48px; height: 48px; border-radius: 8px; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="fa-solid fa-truck-monster"></i>
                        </div>
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display:block;">Pneus no Veículo</span>
                            <strong style="font-size: 1.25rem; color: var(--text-main); font-family: var(--font-heading);">${vehTiresCount} pneus</strong>
                        </div>
                    </div>
                    <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; margin-bottom:0; box-shadow: var(--shadow-sm);">
                        <div style="width: 48px; height: 48px; border-radius: 8px; background-color: var(--success-light); color: var(--success); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="fa-solid fa-dollar-sign"></i>
                        </div>
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display:block;">Custo Instalado</span>
                            <strong style="font-size: 1.25rem; color: var(--text-main); font-family: var(--font-heading);">${window.movixApp.formatCurrency(vehTiresCost)}</strong>
                        </div>
                    </div>
                    <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; margin-bottom:0; box-shadow: var(--shadow-sm);">
                        <div style="width: 48px; height: 48px; border-radius: 8px; background-color: var(--info-light); color: var(--info); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="fa-solid fa-road"></i>
                        </div>
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display:block;">Média KM Rodado</span>
                            <strong style="font-size: 1.25rem; color: var(--text-main); font-family: var(--font-heading);">${avgKMRodado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km</strong>
                        </div>
                    </div>
                    <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; margin-bottom:0; box-shadow: var(--shadow-sm);">
                        <div style="width: 48px; height: 48px; border-radius: 8px; background-color: var(--warning-light); color: var(--warning); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="fa-solid fa-gauge-high"></i>
                        </div>
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display:block;">Custo por KM</span>
                            <strong style="font-size: 1.25rem; color: var(--text-main); font-family: var(--font-heading);">R$ ${avgCustoKM.toFixed(4).replace('.', ',')}</strong>
                        </div>
                    </div>
                    <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; margin-bottom:0; box-shadow: var(--shadow-sm);">
                        <div style="width: 48px; height: 48px; border-radius: 8px; background-color: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="fa-solid fa-warehouse"></i>
                        </div>
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display:block;">Em Estoque</span>
                            <strong style="font-size: 1.25rem; color: var(--text-main); font-family: var(--font-heading);">${inStockCount} pneus</strong>
                        </div>
                    </div>
                    <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; margin-bottom:0; box-shadow: var(--shadow-sm);">
                        <div style="width: 48px; height: 48px; border-radius: 8px; background-color: #faf5ff; color: #a855f7; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="fa-solid fa-retweet"></i>
                        </div>
                        <div>
                            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display:block;">Recapados</span>
                            <strong style="font-size: 1.25rem; color: var(--text-main); font-family: var(--font-heading);">${recapadosCount} pneus</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        function updateKPIs() {
            const kpiContainer = document.getElementById('pneus-kpi-container');
            if (kpiContainer) {
                const selectEl = document.getElementById('axle-vehicle-sel');
                const veicId = selectEl ? selectEl.value : state.selectedVehicleId;
                kpiContainer.innerHTML = getKPIsHTML(veicId);
            }
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

            <!-- DYNAMIC KPI ROW -->
            <div id="pneus-kpi-container"></div>

            <!-- COMBINED VISUAL AXLE MAP AND DATA LIST -->
            <div class="grid-1-2-1">

                
                <!-- TIRES LIST -->
                <div class="card" style="min-height: 480px;">
                    <div class="card-header-simple">
                        <h3>Pneus Registrados na Frota</h3>
                        <span class="status-pill ok" id="total-tires-count" style="font-size:0.75rem;">${tires.length} pneus</span>
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
                    <div class="table-pagination" id="pagination-pneus"></div>
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

        window.movixApp.initAutocomplete(document.getElementById('axle-vehicle-sel'), 'Selecione o veículo...');

        function updateList() {
            const tbody = document.getElementById('tbody-pneus');
            if (!tbody) return;

            tbody.innerHTML = '';
            const currentTires = window.movixStore.getPneus();
            
            // Pagination logic
            const totalItems = currentTires.length;
            const itemsPerPageNum = state.itemsPerPage === 'Todos' ? Infinity : parseInt(state.itemsPerPage);
            const totalPages = Math.ceil(totalItems / itemsPerPageNum) || 1;
            let validPage = Math.min(Math.max(1, state.currentPage), totalPages);
            state.currentPage = validPage;

            const start = (validPage - 1) * itemsPerPageNum;
            const end = itemsPerPageNum === Infinity ? totalItems : start + itemsPerPageNum;
            const paginatedTires = currentTires.slice(start, end);

            const totalCountSpan = document.getElementById('total-tires-count');
            if (totalCountSpan) {
                totalCountSpan.textContent = `${totalItems} pneus`;
            }

            paginatedTires.forEach(p => {
                const v = vehicles.find(item => item.id === p.veiculoAtual);
                const kmLeft = window.movixStore.getRemainingKMForTire(p.id);
                const percent = p.vidaEstimada > 0 ? (kmLeft / p.vidaEstimada) * 100 : 0;
                
                let healthClass = 'ok';
                if (percent < 10) healthClass = 'vencido';
                else if (percent < 25) healthClass = 'atencao';

                const veicHTML = v 
                    ? `<span style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="window.movixRouter.navigateTo('veiculos', '${v.id}')">${v.placa}</span>`
                    : '<span style="color:var(--text-muted);">Estoque</span>';

                const recapHTML = p.recapado 
                    ? '<span class="status-pill warning" style="font-size:0.65rem; margin-top:2px; padding:1px 4px; line-height:1; display:inline-block; width:max-content;">Recapado</span>' 
                    : '';

                const tireInfo = window.movixApp.getTireInfo(p);

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <strong style="font-family:var(--font-heading);">${p.codigo}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${tireInfo.marcaModelo}${tireInfo.refMedida ? ` - ${tireInfo.refMedida}` : ''}</span>
                                ${recapHTML}
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

            // Render pagination links using central helper
            window.movixApp.renderPagination({
                containerId: 'pagination-pneus',
                currentPage: state.currentPage,
                totalItems: totalItems,
                itemsPerPage: state.itemsPerPage,
                noun: 'pneus',
                onPageChange: (newPage) => {
                    state.currentPage = newPage;
                    window.movixApp.saveListState('pneus', state);
                    updateList();
                },
                onItemsPerPageChange: (newLimit) => {
                    state.itemsPerPage = newLimit;
                    state.currentPage = 1;
                    window.movixApp.saveListState('pneus', state);
                    updateList();
                }
            });

            // Restore scroll position
            setTimeout(() => {
                window.scrollTo(0, state.scroll || 0);
            }, 0);
            updateKPIs();
        }

        function renderSingleTireCard(activeTires, position, shortLabel) {
            const p = activeTires.find(item => item.posicao === position);
            
            if (!p) {
                return `
                    <div class="tire-widget-empty" data-position="${position}" style="cursor: pointer; z-index:2; width:85px; height:68px; background-color:var(--bg-surface-hover); border:2px dashed var(--border-color); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font-size:0.65rem; color:var(--text-muted);" title="Instalar pneu em: ${position}">
                        <span style="font-size:0.55rem; color:var(--text-muted); font-weight:700; text-align:center;">${shortLabel}</span>
                        <strong style="color:var(--danger); font-size:0.6rem;">[Instalar]</strong>
                    </div>
                `;
            }

            const kmLeft = window.movixStore.getRemainingKMForTire(p.id);
            const percent = p.vidaEstimada > 0 ? (kmLeft / p.vidaEstimada) * 100 : 0;
            let barColor = 'ok';
            if (percent < 10) barColor = 'danger';
            else if (percent < 25) barColor = 'warning';

            return `
                <div class="tire-widget-active" data-id="${p.id}" style="cursor: pointer; z-index:2; width:85px; padding:6px; border-radius:6px; border:2px solid ${barColor === 'danger' ? 'var(--danger)' : (barColor === 'warning' ? 'var(--warning)' : 'var(--success)')}; background: var(--bg-surface); display:flex; flex-direction:column; gap:4px;" title="Código: ${p.codigo}\nPosição: ${position}\nVida restante: ${percent.toFixed(0)}%">
                    <div style="display:flex; justify-content:space-between; font-size:0.6rem; font-weight:700;">
                        <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 45px;">${p.codigo}</span>
                        <span class="${barColor === 'danger' ? 'text-danger' : (barColor === 'warning' ? 'text-warning' : 'text-success')}">${percent.toFixed(0)}%</span>
                    </div>
                    <div class="tire-health-bar-container" style="height:4px; background: var(--border-color); border-radius:2px; overflow:hidden;">
                        <div class="tire-health-bar ${barColor}" style="height:100%; background-color: ${barColor === 'danger' ? 'var(--danger)' : (barColor === 'warning' ? 'var(--warning)' : 'var(--success)')}; width: ${percent}%;"></div>
                    </div>
                    <span style="font-size:0.55rem; color:var(--text-muted); font-weight:600; text-align:center; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${shortLabel}</span>
                </div>
            `;
        }

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
            
            let configEixos = selectedVeh.configEixos;
            if (typeof configEixos === 'string') {
                try {
                    configEixos = JSON.parse(configEixos);
                } catch(e) {
                    configEixos = [];
                }
            }

            let axlesHTML = '';
            
            if (configEixos && Array.isArray(configEixos) && configEixos.length > 0) {
                configEixos.forEach(ax => {
                    const i = ax.eixo;
                    const isDupla = ax.tipo === 'Dupla';
                    
                    let leftHTML = '';
                    if (isDupla) {
                        leftHTML = `
                            <div style="display: flex; gap: 8px;">
                                ${renderSingleTireCard(activeTires, `Eixo ${i} - Esquerdo Externo`, `Eixo ${i} - Esq. Ext.`)}
                                ${renderSingleTireCard(activeTires, `Eixo ${i} - Esquerdo Interno`, `Eixo ${i} - Esq. Int.`)}
                            </div>
                        `;
                    } else {
                        leftHTML = renderSingleTireCard(activeTires, `Eixo ${i} - Esquerdo`, `Eixo ${i} - Esq.`);
                    }

                    let rightHTML = '';
                    if (isDupla) {
                        rightHTML = `
                            <div style="display: flex; gap: 8px;">
                                ${renderSingleTireCard(activeTires, `Eixo ${i} - Direito Interno`, `Eixo ${i} - Dir. Int.`)}
                                ${renderSingleTireCard(activeTires, `Eixo ${i} - Direito Externo`, `Eixo ${i} - Dir. Ext.`)}
                            </div>
                        `;
                    } else {
                        rightHTML = renderSingleTireCard(activeTires, `Eixo ${i} - Direito`, `Eixo ${i} - Dir.`);
                    }

                    axlesHTML += `
                        <!-- Eixo ${i} -->
                        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; margin: 10px 0;">
                            <!-- Left Tires -->
                            <div style="display: flex; justify-content: flex-end; flex-grow: 1; padding-right: 15px;">
                                ${leftHTML}
                            </div>
                            
                            <!-- Axle Shaft representation -->
                            <div style="width: 30px; height: 6px; background-color: #475569; flex-shrink: 0; z-index: 1;"></div>
                            
                            <!-- Right Tires -->
                            <div style="display: flex; justify-content: flex-start; flex-grow: 1; padding-left: 15px;">
                                ${rightHTML}
                            </div>
                        </div>
                    `;
                    
                    if (i < configEixos.length) {
                        axlesHTML += `
                            <div style="display: flex; justify-content: center; width: 100%; height: 25px; margin: -10px 0;">
                                <div style="width: 8px; height: 100%; background-color: #475569;"></div>
                            </div>
                        `;
                    }
                });
            } else {
                // Fallback rendering
                const tipo = selectedVeh.tipo || 'Passeio';

                if (tipo === 'Moto') {
                    axlesHTML = `
                        <!-- Moto Layout -->
                        <div style="display:flex; flex-direction:column; align-items:center; gap:40px; position:relative; padding: 20px 0; width: 100%;">
                            <div style="position:absolute; width:6px; height:100%; background-color:#475569; left:calc(50% - 3px); z-index:1;"></div>
                            ${renderSingleTireCard(activeTires, 'Dianteiro', 'Dianteiro')}
                            ${renderSingleTireCard(activeTires, 'Traseiro', 'Traseiro')}
                        </div>
                    `;
                } else if (tipo === 'Passeio' || tipo === 'Utilitário') {
                    axlesHTML = `
                        <!-- Eixo Dianteiro Leve -->
                        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; margin: 15px 0; padding: 0 40px;">
                            <div style="width: calc(100% - 170px); height: 6px; background-color: #475569; position:absolute; left:85px; z-index: 1;"></div>
                            ${renderSingleTireCard(activeTires, 'Dianteiro Esquerdo', 'Diant. Esq.')}
                            ${renderSingleTireCard(activeTires, 'Dianteiro Direito', 'Diant. Dir.')}
                        </div>
                        
                        <div style="display: flex; justify-content: center; width: 100%; height: 50px; margin: -15px 0;">
                            <div style="width: 8px; height: 100%; background-color: #475569;"></div>
                        </div>

                        <!-- Eixo Traseiro Leve -->
                        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; margin: 15px 0; padding: 0 40px;">
                            <div style="width: calc(100% - 170px); height: 6px; background-color: #475569; position:absolute; left:85px; z-index: 1;"></div>
                            ${renderSingleTireCard(activeTires, 'Traseiro Esquerdo', 'Tras. Esq.')}
                            ${renderSingleTireCard(activeTires, 'Traseiro Direito', 'Tras. Dir.')}
                        </div>
                    `;
                } else {
                    for (let i = 1; i <= qtdEixos; i++) {
                        axlesHTML += `
                            <!-- Eixo ${i} -->
                            <div style="display:flex; justify-content:space-between; width:100%; align-items:center; position:relative; padding: 0 40px;">
                                <div style="position:absolute; width:100%; height:4px; background-color:#334155; left:0; z-index:1;"></div>
                                ${renderSingleTireCard(activeTires, `Eixo ${i} Esquerdo`, `Eixo ${i} Esq.`)}
                                ${renderSingleTireCard(activeTires, `Eixo ${i} Direito`, `Eixo ${i} Dir.`)}
                            </div>
                        `;
                        if (i < qtdEixos) {
                            axlesHTML += `<div style="width:8px; height:30px; background-color:#334155;"></div>`;
                        }
                    }
                }
            }

            // Render estepes / reserve tyres at the bottom
            const numEstepes = selectedVeh.qtdEstepes !== undefined && selectedVeh.qtdEstepes !== null ? parseInt(selectedVeh.qtdEstepes) : 1;
            let estepesHTML = '';
            if (numEstepes > 0) {
                estepesHTML += `
                    <div style="margin-top: 20px; width: 100%; border-top: 1px dashed var(--border-color); padding-top: 15px;">
                        <h4 style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px; text-align: center;">Pneus Reserva (Estepe)</h4>
                        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; width: 100%;">
                `;
                for (let j = 1; j <= numEstepes; j++) {
                    estepesHTML += renderSingleTireCard(activeTires, `Estepe ${j}`, `Estepe ${j}`);
                }
                estepesHTML += `
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="tires-visual-grid" style="width:100%; max-width:420px; min-height:300px; display:flex; flex-direction:column; gap:12px; align-items:center; justify-content:center; padding: 20px 0;">
                    ${axlesHTML}
                    ${estepesHTML}
                </div>
            `;
            
            // Add click listeners to widgets inside visualizer
            const containerEl = document.getElementById('axles-visualizer-container');
            if (containerEl) {
                const newContainerEl = containerEl.cloneNode(true);
                containerEl.parentNode.replaceChild(newContainerEl, containerEl);
                
                newContainerEl.addEventListener('click', (e) => {
                    const emptyWidget = e.target.closest('.tire-widget-empty');
                    const activeWidget = e.target.closest('.tire-widget-active');
                    
                    if (emptyWidget) {
                        const pos = emptyWidget.getAttribute('data-position');
                        openPneuModal(null, pos);
                    } else if (activeWidget) {
                        const tireId = activeWidget.getAttribute('data-id');
                        openRodizioModal(tireId);
                    }
                });
            }
            
            updateKPIs();
        }

        // Action selector event listeners
        document.getElementById('axle-vehicle-sel').addEventListener('change', (e) => {
            state.selectedVehicleId = e.target.value;
            window.movixApp.saveListState('pneus', state);
            renderAxleMap();
            updateKPIs();
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
        function openPneuModal(pneuId = null, defaultPos = null) {
            const isEdit = pneuId !== null;
            const p = isEdit ? window.movixStore.getPneus().find(item => item.id === pneuId) : null;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = isEdit ? 'Editar Cadastro de Pneu' : 'Instalar Pneu na Frota';

            modalBody.innerHTML = `
                <form id="form-pneu" class="form-grid">
                    ${isEdit ? `
                        <div class="form-group full-width" style="margin-bottom: 8px;">
                            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Código do Pneu:</span>
                            <span class="status-pill ok" style="margin-left: 8px; font-weight: 700;">${p.codigo}</span>
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Marca / Modelo <span class="required">*</span></label>
                        <input type="text" class="form-control" name="marca" required placeholder="Ex: Michelin X Multi Z" value="${isEdit ? p.marca : ''}">
                    </div>
                    <div class="form-group">
                        <label>Referência / Medida <span class="required">*</span></label>
                        <input type="text" class="form-control" name="modelo" required placeholder="Ex: 295/80 R22.5" value="${isEdit ? p.modelo : ''}">
                    </div>
                    <div class="form-group">
                        <label>Vida Útil Estimada (KM) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="vidaEstimada" required min="0" placeholder="Ex: 80000" value="${isEdit ? p.vidaEstimada : ''}">
                    </div>
                    <div class="form-group">
                        <label>Custo Unitário (R$)</label>
                        <input type="text" class="form-control" name="custo" placeholder="Ex: R$ 2.400,00" value="${isEdit && p.custo ? window.movixApp.formatCurrency(p.custo) : ''}">
                    </div>
                    <div class="form-group">
                        <label>Pneu Recapado? <span class="required">*</span></label>
                        <select class="form-control" name="recapado" required>
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Selecione...</option>
                            <option value="false" ${isEdit && !p.recapado ? 'selected' : ''}>Não (Original)</option>
                            <option value="true" ${isEdit && p.recapado ? 'selected' : ''}>Sim (Recapado)</option>
                        </select>
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
                            <option value="" disabled ${!isEdit && !defaultPos ? 'selected' : ''}>Selecione um veículo</option>
                            <option value="" ${isEdit && !p.veiculoAtual ? 'selected' : ''}>Apenas em Estoque (Sem veículo)</option>
                            ${vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual || 0}" ${isEdit && p.veiculoAtual === v.id ? 'selected' : ''}>${v.placa} (Eixos: ${v.qtdEixos || 2})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Posição no Veículo</label>
                        <select class="form-control" name="posicao" id="pneu-pos-sel">
                            <option value="">Apenas Estoque</option>
                        </select>
                    </div>

                    <div class="form-group" id="pneu-datainstalacao-group">
                        <label>Data de Instalação <span class="required">*</span></label>
                        <input type="date" class="form-control" name="dataInstalacao" id="pneu-datainstalacao-input" required value="${isEdit ? p.dataInstalacao || '' : ''}">
                    </div>

                    <div class="form-group" id="pneu-kminicial-group">
                        <label>KM de Instalação (Inicial) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmInicial" id="pneu-kminicial-input" required min="0" placeholder="Ex: 0" value="${isEdit ? p.kmInicial : ''}">
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

            const pneuVeicSel = document.getElementById('pneu-veic-sel');
            const pneuPosSel = document.getElementById('pneu-pos-sel');

            window.movixApp.initAutocomplete(pneuVeicSel, 'Selecione o veículo...');

            const toggleInstallFields = (isStock) => {
                 const kmInput = document.getElementById('pneu-kminicial-input');
                 const dateInput = document.getElementById('pneu-datainstalacao-input');
                 const kmGroup = document.getElementById('pneu-kminicial-group');
                 const dateGroup = document.getElementById('pneu-datainstalacao-group');

                 if (isStock) {
                     if (kmGroup) kmGroup.style.display = 'none';
                     if (dateGroup) dateGroup.style.display = 'none';
                     if (kmInput) {
                         kmInput.removeAttribute('required');
                         kmInput.value = '';
                     }
                     if (dateInput) {
                         dateInput.removeAttribute('required');
                         dateInput.value = '';
                     }
                 } else {
                     if (kmGroup) kmGroup.style.display = '';
                     if (dateGroup) dateGroup.style.display = '';
                     if (kmInput) {
                         kmInput.setAttribute('required', 'required');
                     }
                     if (dateInput) {
                         dateInput.setAttribute('required', 'required');
                     }
                 }
            };

            const handlePneuVeicChange = () => {
                 const veicId = pneuVeicSel.value;
                 if (!veicId) {
                     pneuPosSel.innerHTML = '<option value="">Estoque (Sem Posição)</option>';
                     if (!isEdit) {
                         const kmInput = document.getElementById('pneu-kminicial-input');
                         if (kmInput) kmInput.value = '';
                         const dateInput = document.getElementById('pneu-datainstalacao-input');
                         if (dateInput) dateInput.value = '';
                     }
                     toggleInstallFields(true);
                     return;
                 }
                 const selectedVeh = vehicles.find(v => v.id === veicId);
                 const positions = getPositionsForVehicle(selectedVeh);
                 
                 // Get active tires on this vehicle, excluding current tire if editing
                 const activeTires = window.movixStore.getPneus().filter(tire => tire.veiculoAtual === veicId && (!isEdit || tire.id !== p.id));
                 const occupiedPositions = activeTires.map(tire => tire.posicao);

                 pneuPosSel.innerHTML = positions.map(pos => {
                     const isOccupied = occupiedPositions.includes(pos);
                     const isSelected = ((isEdit && p.posicao === pos) || (defaultPos === pos));
                     if (isOccupied) {
                         return `<option value="${pos}" disabled style="color:var(--text-muted);">${pos} (Ocupada)</option>`;
                     }
                     return `<option value="${pos}" ${isSelected ? 'selected' : ''}>${pos}</option>`;
                 }).join('');
                 
                 if (!isEdit && selectedVeh) {
                     const kmInput = document.getElementById('pneu-kminicial-input');
                     if (kmInput) kmInput.value = parseFloat(selectedVeh.kmAtual || 0);
                     const dateInput = document.getElementById('pneu-datainstalacao-input');
                     if (dateInput && !dateInput.value) {
                         dateInput.value = new Date().toISOString().split('T')[0];
                     }
                 }
                 toggleInstallFields(false);
            };

            if (pneuVeicSel && pneuPosSel) {
                pneuVeicSel.addEventListener('change', handlePneuVeicChange);
            }

            if (!isEdit && defaultPos) {
                const activeVehId = document.getElementById('axle-vehicle-sel').value;
                if (activeVehId) {
                    pneuVeicSel.value = activeVehId;
                    const selectedVeh = vehicles.find(v => v.id === activeVehId);
                    if (selectedVeh) {
                        const kmInput = document.getElementById('pneu-kminicial-input');
                        if (kmInput) kmInput.value = parseFloat(selectedVeh.kmAtual || 0);
                    }
                }
            }

            handlePneuVeicChange();

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

                if (data.veiculoAtual) {
                    const selectedVeh = vehicles.find(v => v.id === data.veiculoAtual);
                    data.kmInicial = parseFloat(data.kmInicial) || 0;
                    data.status = isEdit ? data.status : 'ok';
                } else {
                    data.kmInicial = 0;
                    data.status = isEdit ? data.status : 'ok';
                    data.posicao = '';
                    data.dataInstalacao = '';
                }

                const veiculoId = data.veiculoAtual || null;
                const enteredKM = parseFloat(data.kmInicial) || 0;
                const originalKM = isEdit ? parseFloat(p.kmInicial) || 0 : 0;

                const saveAction = async (justificativa) => {
                     if (isEdit) {
                         const historico = p.historico || [];
                         const novaObs = document.getElementById('pneu-novo-historico-input').value.trim();
                         if (novaObs) {
                             historico.push({
                                 data: new Date().toISOString(),
                                 detalhes: novaObs
                             });
                         }
                         if (p.posicao !== data.posicao || p.veiculoAtual !== data.veiculoAtual) {
                             const currentVeh = vehicles.find(v => v.id === data.veiculoAtual);
                             const kmVal = currentVeh ? currentVeh.kmAtual : 0;
                             const logMsg = createMovementLog(p.posicao, data.posicao, p.veiculoAtual, data.veiculoAtual, kmVal);
                             historico.push({
                                 data: new Date().toISOString(),
                                 detalhes: logMsg
                             });
                         }
                         data.historico = historico;
                     } else {
                         const currentVeh = vehicles.find(v => v.id === veiculoId);
                         const kmVal = currentVeh ? currentVeh.kmAtual : 0;
                         const logMsg = veiculoId 
                             ? createMovementLog('Estoque', data.posicao, null, veiculoId, kmVal) 
                             : 'Cadastro inicial em estoque';
                         data.historico = [
                             {
                                 data: new Date().toISOString(),
                                 detalhes: logMsg
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

            const tireInfo = window.movixApp.getTireInfo(p);

            modalBody.innerHTML = `
                <form id="form-rodizio" class="form-grid" style="display:flex; flex-direction:column; gap:16px;">
                    <div style="background-color:var(--bg-surface-hover); padding:16px; border-radius:8px; border:1px solid var(--border-color); font-size:0.85rem; line-height:1.6;">
                        <p><strong>Pneu Selecionado:</strong> ${tireInfo.marcaModelo}${tireInfo.refMedida ? ` - ${tireInfo.refMedida}` : ''} (${p.codigo})</p>
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
                    const allTires = window.movixStore.getPneus();
                    const otherP = allTires.find(item => item.veiculoAtual === p.veiculoAtual && item.posicao === newPos && item.id !== p.id);
                    
                    const pOldPos = p.posicao || 'Estoque';
                    const targetPosLabel = newPos || 'Estoque';
                    
                    const veh = vehicles.find(v => v.id === p.veiculoAtual);
                    const kmVal = veh ? veh.kmAtual : 0;

                    const historicoP = p.historico || [];
                    if (otherP) {
                        const logMsgP = createMovementLog(pOldPos, targetPosLabel, p.veiculoAtual, p.veiculoAtual, kmVal);
                        historicoP.push({
                            data: new Date().toISOString(),
                            detalhes: `Permuta de posição com pneu ${otherP.codigo}: ${logMsgP}${obs ? `. OBS: ${obs}` : ''}`
                        });
                        
                        const logMsgOther = createMovementLog(targetPosLabel, pOldPos, otherP.veiculoAtual, otherP.veiculoAtual, kmVal);
                        const historicoOther = otherP.historico || [];
                        historicoOther.push({
                            data: new Date().toISOString(),
                            detalhes: `Permuta de posição com pneu ${p.codigo}: ${logMsgOther}`
                        });
                        
                        await window.movixStore.updatePneu(otherP.id, { ...otherP, posicao: pOldPos, historico: historicoOther });
                    } else {
                        const logMsg = createMovementLog(pOldPos, targetPosLabel, p.veiculoAtual, p.veiculoAtual, kmVal);
                        historicoP.push({
                            data: new Date().toISOString(),
                            detalhes: `${logMsg}${obs ? `. OBS: ${obs}` : ''}`
                        });
                    }
                    
                    await window.movixStore.updatePneu(pneuId, { ...p, posicao: newPos, historico: historicoP });
                    
                    window.movixApp.showToast(otherP ? 'Rodízio de permuta executado com sucesso!' : 'Rodízio executado com sucesso!', 'success');
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
            const tireInfoDel = window.movixApp.getTireInfo(p);
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Deseja realmente excluir o pneu <strong>${p.codigo}</strong> (${tireInfoDel.marcaModelo}${tireInfoDel.refMedida ? ` - ${tireInfoDel.refMedida}` : ''})?</p>
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
