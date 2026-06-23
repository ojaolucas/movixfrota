/* MovixFrota - Central Inteligente de Relatórios Frotistas */

(function() {
    
    function renderRelatorios(container) {
        const vehicles = window.movixStore.getVeiculos();
        const drivers = window.movixStore.getMotoristas();
        const activeUser = window.movixStore.getActiveUser();
        
        let state = window.movixApp.getListState('relatorios');
        if (!state) {
            state = {
                currentPage: 1,
                itemsPerPage: 10,
                currentSort: { column: '', direction: 'asc' },
                reportType: 'fuel_costs',
                filters: {
                    search: ''
                },
                scroll: 0
            };
            window.movixApp.saveListState('relatorios', state);
        } else {
            if (state.currentPage === undefined) state.currentPage = 1;
            if (state.itemsPerPage === undefined) state.itemsPerPage = 10;
            if (!state.currentSort) state.currentSort = { column: '', direction: 'asc' };
            if (!state.reportType) state.reportType = 'fuel_costs';
            if (!state.filters) state.filters = { search: '' };
            window.movixApp.saveListState('relatorios', state);
        }
        
        container.innerHTML = `
            <style>
                /* Estilos CSS Otimizados para Exibição Executiva e Impressão */
                .reports-summary-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    transition: transform var(--transition-fast) ease, box-shadow var(--transition-fast) ease;
                    position: relative;
                    overflow: hidden;
                }
                .theme-dark .reports-summary-card {
                    background: rgba(30, 41, 59, 0.4);
                }
                .reports-summary-card::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background-color: var(--card-accent-color, var(--primary));
                }
                .reports-summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                .reports-summary-title {
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    letter-spacing: 0.05em;
                }
                .reports-summary-value {
                    font-size: 1.5rem;
                    font-weight: 800;
                    font-family: var(--font-heading);
                    color: var(--text-main);
                }
                .reports-summary-sub {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                }
                
                /* Layout da Grade de Relatórios */
                .report-grid-container {
                    display: grid;
                    grid-template-columns: 1.8fr 1.2fr;
                    gap: 20px;
                    margin-top: 12px;
                }
                @media (max-width: 992px) {
                    .report-grid-container {
                        grid-template-columns: 1fr;
                    }
                }
                
                /* Estilos Exclusivos para Impressão e PDF */
                @media print {
                    .not-logged-in, .sidebar, .header, .filters-card, .page-header, .page-actions, .table-pagination, #report-search-bar {
                        display: none !important;
                    }
                    body, .app-container, .content-wrapper, #view-content-wrapper {
                        background: #fff !important;
                        color: #000 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .report-grid-container {
                        grid-template-columns: 1fr !important;
                    }
                    .card {
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        padding: 0 !important;
                    }
                    .print-only-header {
                        display: block !important;
                    }
                    .smart-table th {
                        background-color: #f1f5f9 !important;
                        color: #000 !important;
                    }
                }
            </style>

            <!-- PRINT AUDITING HEADER -->
            <div class="print-only-header" style="display: none; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; width:100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; width:100%;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="favicon.png" style="width: 48px; height: 48px; border-radius: 10px; object-fit:cover;">
                        <div>
                            <h2 style="margin: 0; font-family: var(--font-heading); font-size: 1.4rem; color: #3b82f6; font-weight:800;">MovixFrota ERP</h2>
                            <span style="font-size: 0.8rem; color: #64748b;">Central Inteligente de Gestão de Frotas</span>
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 0.8rem; color: #64748b; line-height: 1.4;">
                        <div><strong>Relatório:</strong> <span id="print-report-name">N/A</span></div>
                        <div><strong>Gerado por:</strong> <span id="print-report-user">${activeUser ? activeUser.nome : 'Usuário ERP'}</span></div>
                        <div><strong>Emitido em:</strong> <span id="print-report-time">N/A</span></div>
                    </div>
                </div>
            </div>

            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Central de Relatórios Gerenciais</h1>
                    <p class="page-subtitle">Monitore, cruze e exporte relatórios consolidados de custos, consumo, vencimentos e auditorias</p>
                </div>
                <div class="page-actions" style="display: flex; gap: 12px;">
                    <button class="btn btn-secondary" id="btn-export-excel">
                        <i class="fa-solid fa-file-excel text-success"></i> Exportar Excel
                    </button>
                    <button class="btn btn-primary" id="btn-export-pdf">
                        <i class="fa-solid fa-print"></i> Imprimir / PDF
                    </button>
                </div>
            </div>

            <!-- FILTERS PANEL -->
            <div class="filters-card">
                <div class="filters-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div class="filter-group">
                        <label>Tipo de Análise Gerencial</label>
                        <select class="filter-input" id="report-type-sel" style="font-weight:700; color:var(--primary);">
                            <optgroup label="Operações & Custos">
                                <option value="fuel_costs" selected>Relatório de Combustíveis</option>
                                <option value="multas_report">Relatório de Multas</option>
                                <option value="maint_report">Relatório de Manutenções</option>
                                <option value="trips_report">Relatório de Viagens</option>
                            </optgroup>
                            <optgroup label="Manutenção Fina & Equipamentos">
                                <option value="pneus_report">Relatório de Pneus</option>
                                <option value="oil_report">Relatório de Troca de Óleo</option>
                                <option value="extinguishers_report">Relatório de Extintores</option>
                            </optgroup>
                            <optgroup label="Contratos & Serviços">
                                <option value="insurances_report">Relatório de Seguros</option>
                                <option value="trackers_report">Relatório de Rastreadores</option>
                            </optgroup>
                            <optgroup label="Cadastros & Auditorias">
                                <option value="veiculos_report">Relatório de Veículos</option>
                                <option value="drivers_report">Relatório de Motoristas</option>
                                <option value="implements_report">Relatório de Implementos</option>
                            </optgroup>
                            <optgroup label="Executivos & Vencimentos">
                                <option value="fleet_costs_consolidated">Relatório de Custos da Frota</option>
                                <option value="vehicle_lifetime">Relatório de Vida Útil do Veículo</option>
                                <option value="expirations_alerts">Relatório de Vencimentos e Alertas</option>
                            </optgroup>
                        </select>
                    </div>

                    <!-- DYNAMIC FILTER CONTAINER FOR REPORT SPECIFIC FILTERS -->
                    <div id="dynamic-filters-group" style="display:contents;">
                        <!-- Injected dynamic fields based on selected report type -->
                    </div>
                </div>
            </div>

            <!-- SUMMARY KPI CARD GRID Container -->
            <div class="reports-summary-grid" id="reports-summary-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; margin-bottom: 16px;">
                <!-- Summary cards injected here -->
            </div>

            <!-- DYNAMIC REPORT CONTENT GRID -->
            <div class="report-grid-container">
                
                <!-- REPORT DATA SHEET -->
                <div class="card" style="min-height: 450px; display:flex; flex-direction:column; padding: 20px;">
                    <div id="report-search-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid fa-magnifying-glass text-muted"></i>
                            <input type="text" id="report-search" class="filter-input" placeholder="Filtrar dados na tela..." style="max-width: 250px; height: 36px; padding: 6px 12px;">
                        </div>
                        <span id="report-counter" style="font-size:0.75rem; color:var(--text-muted); font-weight:600;"></span>
                    </div>

                    <div class="table-responsive" style="border:none; box-shadow:none; flex-grow:1; overflow-x:auto;">
                        <table class="smart-table" id="table-report-output" style="width:100%;">
                            <thead id="thead-report-output">
                                <!-- Dynamic -->
                            </thead>
                            <tbody id="tbody-report-output">
                                <!-- Dynamic -->
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div class="table-pagination" id="report-pagination" style="margin-top:16px;"></div>
                </div>

                <!-- REPORT CHART WIDGET -->
                <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; padding: 20px; min-height:450px;">
                    <div class="card-header-simple" style="padding-bottom:12px; border-bottom:1px solid var(--border-color);">
                        <h3 style="font-size:0.95rem; font-weight:800; font-family:var(--font-heading); color:var(--text-main);"><i class="fa-solid fa-chart-pie text-primary"></i> Detalhamento Gráfico Relacionado</h3>
                    </div>
                    
                    <div style="flex-grow:1; display:flex; align-items:center; justify-content:center; position:relative; margin-top:20px; min-height:300px;">
                        <canvas id="reportChart"></canvas>
                    </div>
                </div>

            </div>
        `;

        if (state.reportType) {
            document.getElementById('report-type-sel').value = state.reportType;
        }

        let currentChartInstance = null;
        let activeReportData = []; // Rows of generated report
        let activeHeaders = [];

        // Date helper
        function parseDate(dateStr) {
            if (!dateStr) return null;
            return new Date(dateStr + 'T12:00:00');
        }

        // Check if date is in selected filter range
        function checkPeriodRange(dateStr, periodSelVal, startVal, endVal) {
            if (!dateStr) return false;
            const itemDate = parseDate(dateStr);
            if (!itemDate || isNaN(itemDate.getTime())) return false;

            const today = new Date();
            let startLimit = null;
            let endLimit = null;

            if (periodSelVal === 'custom') {
                if (startVal) startLimit = parseDate(startVal);
                if (endVal) {
                    endLimit = parseDate(endVal);
                    endLimit.setHours(23, 59, 59, 999);
                }
            } else if (periodSelVal !== 'all') {
                const months = parseInt(periodSelVal) || 12;
                startLimit = new Date();
                startLimit.setMonth(today.getMonth() - months);
                startLimit.setHours(0, 0, 0, 0);
            }

            if (startLimit && itemDate < startLimit) return false;
            if (endLimit && itemDate > endLimit) return false;
            return true;
        }

        // Render dynamic filter fields based on report type selection
        function setupDynamicFilters(isInitial = false) {
            const reportType = document.getElementById('report-type-sel').value;
            const filterGroup = document.getElementById('dynamic-filters-group');
            if (!filterGroup) return;

            const vehiclesList = window.movixStore.getVeiculos() || [];
            const driversList = window.movixStore.getMotoristas() || [];

            let html = '';

            // Common Period dropdown helper
            const periodHTML = `
                <div class="filter-group">
                    <label>Período</label>
                    <select class="filter-input" id="report-period-filter">
                        <option value="all">Todo o histórico</option>
                        <option value="1">Este mês</option>
                        <option value="3">Últimos 3 meses</option>
                        <option value="6">Últimos 6 meses</option>
                        <option value="12" selected>Últimos 12 meses</option>
                        <option value="custom">Personalizado...</option>
                    </select>
                </div>
                <div class="filter-group" id="report-custom-dates-container" style="display:none; grid-column: span 2; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label>De</label>
                        <input type="date" class="filter-input" id="report-date-start">
                    </div>
                    <div>
                        <label>Até</label>
                        <input type="date" class="filter-input" id="report-date-end">
                    </div>
                </div>
            `;

            if (reportType === 'fuel_costs') {
                html += `
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.filter(v => v.tipoUnidade !== 'Implemento/Reboque').map(v => `<option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Motorista</label>
                        <select class="filter-input" id="filter-motorista">
                            <option value="">Todos</option>
                            ${driversList.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Combustível</label>
                        <select class="filter-input" id="filter-combustivel">
                            <option value="">Todos</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Diesel S10">Diesel S10</option>
                            <option value="Gasolina">Gasolina</option>
                            <option value="Etanol">Etanol</option>
                            <option value="GNV">GNV</option>
                            <option value="Arla 32">Arla 32</option>
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'multas_report') {
                html += `
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Motorista</label>
                        <select class="filter-input" id="filter-motorista">
                            <option value="">Todos</option>
                            <option value="sem_motorista">Sem motorista</option>
                            ${driversList.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação</label>
                        <select class="filter-input" id="filter-situacao">
                            <option value="">Todos</option>
                            <option value="Pago">Pago</option>
                            <option value="Não Pago">Não Pago</option>
                            <option value="Recorrendo">Recorrendo (Autuada)</option>
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'maint_report') {
                html += `
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Tipo OS</label>
                        <select class="filter-input" id="filter-tipo-os">
                            <option value="">Todos</option>
                            <option value="Preventiva">Preventiva</option>
                            <option value="Corretiva">Corretiva</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Status</label>
                        <select class="filter-input" id="filter-status-os">
                            <option value="">Todos</option>
                            <option value="Realizada">Realizada</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Agendada">Agendada</option>
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'pneus_report') {
                html += `
                    <div class="filter-group">
                        <label>Veículo Vinculado</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.map(v => `<option value="${v.id}">${v.placa} ${v.tipoUnidade === 'Implemento/Reboque' ? '(Reboque)' : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Eixo/Implemento</label>
                        <select class="filter-input" id="filter-implemento">
                            <option value="">Todos</option>
                            <option value="motorizado">Somente Veículos</option>
                            <option value="implemento">Somente Implementos/Reboques</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação Pneu</label>
                        <select class="filter-input" id="filter-situacao-pneu">
                            <option value="">Todos</option>
                            <option value="Regular">Regular</option>
                            <option value="Atenção">Atenção</option>
                            <option value="Vencido">Vencido/Desgastado</option>
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'oil_report') {
                html += `
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.filter(v => v.tipoUnidade !== 'Implemento/Reboque').map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Status Troca</label>
                        <select class="filter-input" id="filter-status-oleo">
                            <option value="">Todos</option>
                            <option value="ok">Ok / Regular</option>
                            <option value="atencao">Atenção (Próxima)</option>
                            <option value="vencido">Atrasada / Vencida</option>
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'trips_report') {
                html += `
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.filter(v => v.tipoUnidade !== 'Implemento/Reboque').map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Motorista</label>
                        <select class="filter-input" id="filter-motorista">
                            <option value="">Todos</option>
                            ${driversList.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'veiculos_report') {
                html += `
                    <div class="filter-group">
                        <label>Tipo Unidade</label>
                        <select class="filter-input" id="filter-tipo-unidade">
                            <option value="">Todos</option>
                            <option value="Veículo Motorizado">Veículo Motorizado</option>
                            <option value="Implemento/Reboque">Implemento / Reboque</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação</label>
                        <select class="filter-input" id="filter-situacao-veiculo">
                            <option value="">Todos</option>
                            <option value="disponivel">Disponível</option>
                            <option value="em_viagem">Em Viagem</option>
                            <option value="manutencao">Em Oficina</option>
                            <option value="inativo">Inativo</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Combustível</label>
                        <select class="filter-input" id="filter-combustivel">
                            <option value="">Todos</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Gasolina">Gasolina</option>
                            <option value="Flex">Flex / Etanol</option>
                        </select>
                    </div>
                `;
            } else if (reportType === 'drivers_report') {
                html += `
                    <div class="filter-group">
                        <label>Motorista</label>
                        <select class="filter-input" id="filter-motorista">
                            <option value="">Todos</option>
                            ${driversList.filter(d => d.status !== 'inativo').map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Categoria do Condutor</label>
                        <select class="filter-input" id="filter-categoria-condutor">
                            <option value="">Todas</option>
                            <option value="Motorista Efetivo">Motorista Efetivo</option>
                            <option value="Motorista Temporário (Diarista)">Motorista Temporário (Diarista)</option>
                            <option value="Condutor Interno">Condutor Interno</option>
                            <option value="Condutor Externo">Condutor Externo</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Status CNH</label>
                        <select class="filter-input" id="filter-status-cnh">
                            <option value="">Todos</option>
                            <option value="Regular">CNH Regular</option>
                            <option value="Vence30">Vence em 30 dias</option>
                            <option value="Vencida">CNH Vencida</option>
                        </select>
                    </div>
                `;
            } else if (reportType === 'implements_report') {
                html += `
                    <div class="filter-group">
                        <label>Implemento</label>
                        <select class="filter-input" id="filter-implemento">
                            <option value="">Todos</option>
                            ${vehiclesList.filter(v => v.tipoUnidade === 'Implemento/Reboque').map(v => `<option value="${v.id}">${v.placa} - ${v.tipoImplemento || 'Reboque'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação</label>
                        <select class="filter-input" id="filter-situacao">
                            <option value="">Todos</option>
                            <option value="disponivel">Disponível</option>
                            <option value="manutencao">Em Oficina</option>
                            <option value="inativo">Inativo</option>
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'insurances_report') {
                html += `
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Situação Seguro</label>
                        <select class="filter-input" id="filter-seguro-status">
                            <option value="">Todos</option>
                            <option value="Sim">Com Seguro Ativo</option>
                            <option value="Não">Sem Seguro</option>
                            <option value="Vencido">Contratos Vencidos</option>
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'trackers_report') {
                html += `
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Empresa</label>
                        <select class="filter-input" id="filter-empresa">
                            <option value="">Todas</option>
                            <option value="Sascar">Sascar</option>
                            <option value="Omnilink">Omnilink</option>
                            <option value="Autotrac">Autotrac</option>
                            <option value="Outros">Outras</option>
                        </select>
                    </div>
                `;
            } else if (reportType === 'extinguishers_report') {
                html += `
                    <div class="filter-group">
                        <label>Veículo</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.filter(v => v.tipoUnidade !== 'Implemento/Reboque').map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Status Extintor</label>
                        <select class="filter-input" id="filter-extintor-status">
                            <option value="">Todos</option>
                            <option value="Regular">Válido / Ok</option>
                            <option value="Vence30">Vence em 30 dias</option>
                            <option value="Vencido">Vencido</option>
                        </select>
                    </div>
                `;
            } else if (reportType === 'fleet_costs_consolidated') {
                html += `
                    <div class="filter-group">
                        <label>Veículo Motorizado</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehiclesList.filter(v => v.tipoUnidade !== 'Implemento/Reboque').map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Implemento Vinculado</label>
                        <select class="filter-input" id="filter-implemento">
                            <option value="">Todos</option>
                            ${vehiclesList.filter(v => v.tipoUnidade === 'Implemento/Reboque').map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'vehicle_lifetime') {
                html += `
                    <div class="filter-group">
                        <label>Selecione o Veículo <span class="required">*</span></label>
                        <select class="filter-input" id="filter-veiculo" style="border-color:var(--primary); font-weight:700;">
                            ${vehiclesList.map(v => `<option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo} (${v.tipoUnidade === 'Implemento/Reboque' ? 'Implemento' : 'Motorizado'})</option>`).join('')}
                        </select>
                    </div>
                    ${periodHTML}
                `;
            } else if (reportType === 'expirations_alerts') {
                html += `
                    <div class="filter-group">
                        <label>Tipo de Vencimento</label>
                        <select class="filter-input" id="filter-alerta-tipo">
                            <option value="">Todos os Vencimentos</option>
                            <option value="CNH">CNH de Motoristas</option>
                            <option value="Seguro">Contratos de Seguros</option>
                            <option value="Extintor">Validade de Extintores</option>
                            <option value="Oleo">Trocas de Óleos Atrasadas</option>
                            <option value="Manutencao">OS de Manutenções Atrasadas</option>
                        </select>
                    </div>
                `;
            }

            filterGroup.innerHTML = html + `
                <div class="filter-group" style="justify-content: flex-end;">
                    <button class="btn btn-secondary" id="btn-limpar-filtros" style="height: 38px; width: 100%; white-space: nowrap; justify-content: center;">
                        <i class="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
                    </button>
                </div>
            `;

            // Restore from state if initial bootstrap
            if (isInitial) {
                const dynamicInputs = filterGroup.querySelectorAll('.filter-input');
                dynamicInputs.forEach(input => {
                    if (state.filters[input.id] !== undefined) {
                        input.value = state.filters[input.id];
                    }
                });
                const dateStart = document.getElementById('report-date-start');
                const dateEnd = document.getElementById('report-date-end');
                if (dateStart && state.filters['report-date-start'] !== undefined) {
                    dateStart.value = state.filters['report-date-start'];
                }
                if (dateEnd && state.filters['report-date-end'] !== undefined) {
                    dateEnd.value = state.filters['report-date-end'];
                }
            }

            // Hook dates visibility toggling
            const periodFilter = document.getElementById('report-period-filter');
            const customDatesContainer = document.getElementById('report-custom-dates-container');
            if (periodFilter && customDatesContainer) {
                const handlePeriodChange = (isInitCall = false) => {
                    if (periodFilter.value === 'custom') {
                        customDatesContainer.style.display = 'grid';
                    } else {
                        customDatesContainer.style.display = 'none';
                    }
                    state.filters['report-period-filter'] = periodFilter.value;
                    const dateStart = document.getElementById('report-date-start');
                    const dateEnd = document.getElementById('report-date-end');
                    if (dateStart) state.filters['report-date-start'] = dateStart.value;
                    if (dateEnd) state.filters['report-date-end'] = dateEnd.value;
                    
                    if (!isInitCall) {
                        state.currentPage = 1;
                    }
                    window.movixApp.saveListState('relatorios', state);
                    generateReport(isInitCall);
                };
                periodFilter.addEventListener('change', () => handlePeriodChange(false));
                
                const dateStart = document.getElementById('report-date-start');
                const dateEnd = document.getElementById('report-date-end');
                if (dateStart) {
                    dateStart.addEventListener('change', () => {
                        state.filters['report-date-start'] = dateStart.value;
                        state.currentPage = 1;
                        window.movixApp.saveListState('relatorios', state);
                        generateReport(false);
                    });
                }
                if (dateEnd) {
                    dateEnd.addEventListener('change', () => {
                        state.filters['report-date-end'] = dateEnd.value;
                        state.currentPage = 1;
                        window.movixApp.saveListState('relatorios', state);
                        generateReport(false);
                    });
                }

                // Run initially
                if (isInitial) {
                    if (periodFilter.value === 'custom') {
                        customDatesContainer.style.display = 'grid';
                    } else {
                        customDatesContainer.style.display = 'none';
                    }
                } else {
                    handlePeriodChange(false);
                }
            }

            // Hook listeners to all inputs to trigger report re-generation
            const dynamicInputs = filterGroup.querySelectorAll('.filter-input');
            dynamicInputs.forEach(input => {
                if (input.id !== 'report-period-filter' && input.id !== 'report-date-start' && input.id !== 'report-date-end') {
                    input.addEventListener('change', () => {
                        state.filters[input.id] = input.value;
                        state.currentPage = 1;
                        window.movixApp.saveListState('relatorios', state);
                        generateReport(false);
                    });
                    if (input.tagName === 'INPUT') {
                        input.addEventListener('input', () => {
                            state.filters[input.id] = input.value;
                            state.currentPage = 1;
                            window.movixApp.saveListState('relatorios', state);
                            generateReport(false);
                        });
                    }
                }
            });

            const btnLimpar = document.getElementById('btn-limpar-filtros');
            if (btnLimpar) {
                btnLimpar.addEventListener('click', () => {
                    const inputs = filterGroup.querySelectorAll('.filter-input');
                    inputs.forEach(input => {
                        if (input.id === 'report-period-filter') {
                            input.value = 'all';
                        } else if (input.id === 'report-date-start' || input.id === 'report-date-end') {
                            input.value = '';
                        } else if (input.tagName === 'SELECT') {
                            input.value = '';
                        } else if (input.tagName === 'INPUT') {
                            input.value = '';
                        }
                        state.filters[input.id] = input.value;
                    });
                    
                    const customDatesContainer = document.getElementById('report-custom-dates-container');
                    if (customDatesContainer) {
                        customDatesContainer.style.display = 'none';
                    }

                    const searchInput = document.getElementById('report-search');
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    state.filters.search = '';

                    state.currentSort = { column: '', direction: 'asc' };
                    state.currentPage = 1;
                    window.movixApp.saveListState('relatorios', state);
                    generateReport(false);
                });
            }

            generateReport(isInitial);
        }

        // MAIN GENERATION FUNCTION
        function generateReport(isInitial = false) {
            const reportType = document.getElementById('report-type-sel').value;
            const periodFilter = document.getElementById('report-period-filter');
            const periodVal = periodFilter ? periodFilter.value : 'all';
            const dateStartVal = document.getElementById('report-date-start') ? document.getElementById('report-date-start').value : '';
            const dateEndVal = document.getElementById('report-date-end') ? document.getElementById('report-date-end').value : '';

            // Update print header time
            document.getElementById('print-report-time').innerText = new Date().toLocaleString('pt-BR');
            const selectEl = document.getElementById('report-type-sel');
            const printReportName = document.getElementById('print-report-name');
            if (printReportName && selectEl) {
                printReportName.innerText = selectEl.options[selectEl.selectedIndex].text;
            }

            // Clean active data
            activeReportData = [];
            activeHeaders = [];

            // UI targets
            const summaryContainer = document.getElementById('reports-summary-container');
            const thead = document.getElementById('thead-report-output');

            const isDark = document.body.classList.contains('theme-dark');
            const textMuted = isDark ? '#9ca3af' : '#64748b';
            const borderColor = isDark ? '#1f293d' : '#e2e8f0';

            // Gather base store arrays
            const supplies = window.movixStore.getAbastecimentos() || [];
            const maint = window.movixStore.getMaintenances() || [];
            const multas = window.movixStore.getMultas() || [];
            const pneus = window.movixStore.getPneus() || [];
            const oleos = window.movixStore.getOleos() || [];
            const viagens = window.movixStore.getViagens() || [];

            // Reset Chart.js Canvas
            const canvasContainer = document.getElementById('reportChart').parentElement;
            canvasContainer.innerHTML = '<canvas id="reportChart"></canvas>';

            // ─── 📊 1. FUEL REPORT ──────────────────────────────────
            if (reportType === 'fuel_costs') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterDriver = document.getElementById('filter-motorista').value;
                const filterFuel = document.getElementById('filter-combustivel').value;

                activeHeaders = ['Data', 'Veículo', 'Motorista', 'Combustível', 'Litros', 'Valor Litro', 'Valor Total', 'Posto', 'Média KM/L'];

                const filtered = supplies.filter(a => {
                    const matchVeic = !filterVeic || a.veiculoId === filterVeic;
                    const matchDriver = !filterDriver || a.motoristaId === filterDriver;
                    const matchFuel = !filterFuel || a.combustivel === filterFuel;
                    const matchDate = checkPeriodRange(a.data, periodVal, dateStartVal, dateEndVal);
                    return matchVeic && matchDriver && matchFuel && matchDate;
                });

                // KPIs
                const totalGasto = filtered.reduce((acc, a) => acc + (a.valorTotal || 0), 0);
                const totalLitros = filtered.reduce((acc, a) => acc + (a.litros || 0), 0);
                const suppliesWithKML = filtered.filter(a => a.kmL > 0);
                const avgKml = suppliesWithKML.length > 0 ? (suppliesWithKML.reduce((acc, a) => acc + a.kmL, 0) / suppliesWithKML.length) : 0;
                const costPerLiter = totalLitros > 0 ? (totalGasto / totalLitros) : 0;

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #22c55e;">
                        <span class="reports-summary-title">Total Gasto</span>
                        <span class="reports-summary-value">R$ ${totalGasto.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Em ${filtered.length} abastecimentos</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Total Abastecido</span>
                        <span class="reports-summary-value">${window.movixApp.formatDecimal(totalLitros)} L</span>
                        <span class="reports-summary-sub">Volume total acumulado</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Média de Consumo</span>
                        <span class="reports-summary-value">${avgKml > 0 ? `${avgKml.toFixed(2)} km/L` : 'N/A'}</span>
                        <span class="reports-summary-sub">KM/L médio ponderado</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #0ea5e9;">
                        <span class="reports-summary-title">Custo Médio Litro</span>
                        <span class="reports-summary-value">R$ ${costPerLiter.toFixed(2)}/L</span>
                        <span class="reports-summary-sub">Média paga por litro</span>
                    </div>
                `;

                activeReportData = filtered.map(a => {
                    const v = vehicles.find(item => item.id === a.veiculoId);
                    const d = drivers.find(item => item.id === a.motoristaId);
                    return {
                        id: a.id,
                        data: a.data,
                        dataFormatted: a.data.split('-').reverse().join('/'),
                        veiculo: v ? v.placa : 'Veículo',
                        motorista: d ? d.nome : 'Motorista',
                        combustivel: a.combustivel,
                        litros: `${window.movixApp.formatDecimal(a.litros)} L`,
                        valorLitro: `R$ ${a.valorLitro.toFixed(2)}`,
                        valorTotal: `R$ ${a.valorTotal.toFixed(2)}`,
                        posto: a.posto || '-',
                        kmL: a.kmL > 0 ? `${a.kmL.toFixed(2)} km/L` : 'N/A',
                        _rawTotal: a.valorTotal
                    };
                });

                // Chart: Custo por Veículo
                const vCosts = {};
                filtered.forEach(a => {
                    const p = vehicles.find(v=>v.id===a.veiculoId)?.placa || 'Desconhecido';
                    vCosts[p] = (vCosts[p] || 0) + a.valorTotal;
                });
                const sortedVehicles = Object.keys(vCosts).sort((a,b) => vCosts[b] - vCosts[a]).slice(0, 5);
                const chartValues = sortedVehicles.map(v => vCosts[v]);
                renderReportChart('bar', sortedVehicles, chartValues, 'Gastos por Veículo (R$)', '#22c55e', textMuted, borderColor);

            // ─── 🚨 2. FINES REPORT ─────────────────────────────────
            } else if (reportType === 'multas_report') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterDriver = document.getElementById('filter-motorista').value;
                const filterStatus = document.getElementById('filter-situacao').value;

                activeHeaders = ['Data', 'Veículo', 'Motorista', 'Descrição', 'Valor', 'Status'];

                const filtered = multas.filter(m => {
                    const matchVeic = !filterVeic || m.veiculoId === filterVeic;
                    
                    let matchDriver = true;
                    if (filterDriver === 'sem_motorista') {
                        matchDriver = !m.motoristaId;
                    } else if (filterDriver) {
                        matchDriver = m.motoristaId === filterDriver;
                    }

                    const matchStatus = !filterStatus || m.status === filterStatus;
                    const matchDate = checkPeriodRange(m.data, periodVal, dateStartVal, dateEndVal);
                    return matchVeic && matchDriver && matchStatus && matchDate;
                });

                const totalMultas = filtered.length;
                const totalValor = filtered.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                const totalPago = filtered.filter(m => m.status === 'Pago').reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                const totalPendente = filtered.filter(m => m.status === 'Não Pago').reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Total de Multas</span>
                        <span class="reports-summary-value">${totalMultas} OS</span>
                        <span class="reports-summary-sub">Registradas no período</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Custo Acumulado</span>
                        <span class="reports-summary-value">R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Valor de face total</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Total Pago</span>
                        <span class="reports-summary-value">R$ ${totalPago.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Multas quitadas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Total Pendente</span>
                        <span class="reports-summary-value">R$ ${totalPendente.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Não pagas / Vencidas</span>
                    </div>
                `;

                activeReportData = filtered.map(m => {
                    const v = vehicles.find(item => item.id === m.veiculoId);
                    const d = drivers.find(item => item.id === m.motoristaId);
                    return {
                        id: m.id,
                        data: m.data,
                        dataFormatted: m.data.split('-').reverse().join('/'),
                        veiculo: v ? v.placa : 'Veículo',
                        motorista: d ? d.nome : 'Sem motorista',
                        descricao: m.descricao,
                        valor: `R$ ${(parseFloat(m.valor) || 0).toFixed(2)}`,
                        status: m.status,
                        _rawTotal: parseFloat(m.valor) || 0
                    };
                });

                // Chart: Gravidade das Multas
                const severityCounts = { 'Leve': 0, 'Média': 0, 'Grave': 0, 'Gravíssima': 0 };
                filtered.forEach(m => {
                    const g = m.gravidade || 'Média';
                    if (severityCounts[g] !== undefined) severityCounts[g]++;
                });
                renderReportChart('doughnut', Object.keys(severityCounts), Object.values(severityCounts), 'Gravidade', ['#10b981','#3b82f6','#f59e0b','#ef4444'], textMuted, borderColor);

            // ─── 🔧 3. MAINTENANCE REPORT ───────────────────────────
            } else if (reportType === 'maint_report') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterTipo = document.getElementById('filter-tipo-os').value;
                const filterStatus = document.getElementById('filter-status-os').value;

                activeHeaders = ['Data', 'Veículo', 'Oficina / Fornecedor', 'Tipo OS', 'Categoria', 'KM OS', 'Valor OS', 'Status'];

                const filtered = maint.filter(m => {
                    const matchVeic = !filterVeic || m.veiculoId === filterVeic;
                    const matchTipo = !filterTipo || m.tipo === filterTipo;
                    const matchStatus = !filterStatus || m.status === filterStatus;
                    const matchDate = checkPeriodRange(m.data, periodVal, dateStartVal, dateEndVal);
                    return matchVeic && matchTipo && matchStatus && matchDate;
                });

                const totalOS = filtered.length;
                const totalValor = filtered.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                const preventivas = filtered.filter(m => m.tipo === 'Preventiva').length;
                const corretivas = filtered.filter(m => m.tipo === 'Corretiva').length;

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Ordens de Serviço</span>
                        <span class="reports-summary-value">${totalOS} OS</span>
                        <span class="reports-summary-sub">Lançadas no período</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Custo de Oficina</span>
                        <span class="reports-summary-value">R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Peças e mão de obra</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Preventivas</span>
                        <span class="reports-summary-value">${preventivas} OS</span>
                        <span class="reports-summary-sub">Manutenções planejadas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Corretivas</span>
                        <span class="reports-summary-value">${corretivas} OS</span>
                        <span class="reports-summary-sub">Manutenções corretivas</span>
                    </div>
                `;

                activeReportData = filtered.map(m => {
                    const v = vehicles.find(item => item.id === m.veiculoId);
                    return {
                        id: m.id,
                        data: m.data,
                        dataFormatted: m.data.split('-').reverse().join('/'),
                        veiculo: v ? v.placa : 'Veículo',
                        oficina: m.oficina || m.fornecedor || '-',
                        tipo: m.tipo,
                        categoria: m.categoria,
                        km: `${(parseFloat(m.km) || 0).toLocaleString('pt-BR')} km`,
                        valor: `R$ ${(parseFloat(m.valor) || 0).toFixed(2)}`,
                        status: m.status,
                        _rawTotal: parseFloat(m.valor) || 0
                    };
                });

                // Chart: Custo por categoria
                const categories = {};
                filtered.forEach(m => {
                    categories[m.categoria] = (categories[m.categoria] || 0) + (parseFloat(m.valor) || 0);
                });
                renderReportChart('doughnut', Object.keys(categories), Object.values(categories), 'Custos', ['#3b82f6','#ef4444','#f59e0b','#10b981','#0ea5e9','#8b5cf6'], textMuted, borderColor);

            // ─── 🛞 4. TYRE REPORT ──────────────────────────────────
            } else if (reportType === 'pneus_report') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterImp = document.getElementById('filter-implemento').value;
                const filterStatus = document.getElementById('filter-situacao-pneu').value;

                activeHeaders = ['Código Pneu', 'Marca / Modelo', 'Medida', 'Custo unitário', 'Veículo Vinculado', 'Posição', 'KM Instalado', 'Vida Útil Estimada', 'Situação'];

                const filtered = pneus.filter(p => {
                    const v = vehicles.find(item => item.id === p.veiculoAtual);
                    const matchVeic = !filterVeic || p.veiculoAtual === filterVeic;
                    
                    let matchImp = true;
                    if (filterImp === 'motorizado') {
                        matchImp = !v || v.tipoUnidade !== 'Implemento/Reboque';
                    } else if (filterImp === 'implemento') {
                        matchImp = v && v.tipoUnidade === 'Implemento/Reboque';
                    }

                    const matchStatus = !filterStatus || p.status === filterStatus;
                    const matchDate = checkPeriodRange(p.dataInstalacao, periodVal, dateStartVal, dateEndVal);
                    return matchVeic && matchImp && matchStatus && matchDate;
                });

                const totalPneus = filtered.length;
                const totalCusto = filtered.reduce((acc, p) => acc + (parseFloat(p.custo) || 0), 0);
                const avgVida = filtered.length > 0 ? (filtered.reduce((acc, p) => acc + (parseFloat(p.vidaEstimada) || 80000), 0) / filtered.length) : 0;
                const desgastados = filtered.filter(p => p.status === 'Vencido').length;

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #6b7280;">
                        <span class="reports-summary-title">Total de Pneus</span>
                        <span class="reports-summary-value">${totalPneus} Pneus</span>
                        <span class="reports-summary-sub">Ativos e em estoque</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Investimento Total</span>
                        <span class="reports-summary-value">R$ ${totalCusto.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Custo de pneus ativos</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Média de Vida Útil</span>
                        <span class="reports-summary-value">${avgVida.toLocaleString('pt-BR', {maximumFractionDigits:0})} km</span>
                        <span class="reports-summary-sub">Estimativa média do eixo</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Vencidos / Desgastados</span>
                        <span class="reports-summary-value">${desgastados}</span>
                        <span class="reports-summary-sub">Necessitam de recapagem/troca</span>
                    </div>
                `;

                activeReportData = filtered.map(p => {
                    const v = vehicles.find(item => item.id === p.veiculoAtual);
                    return {
                        id: p.id,
                        codigo: p.codigo,
                        marcaModelo: `${p.marca || '-'} ${p.modelo || ''}`,
                        medida: p.medida || '-',
                        custo: `R$ ${(parseFloat(p.custo) || 0).toFixed(2)}`,
                        veiculo: v ? v.placa : 'Estoque / Sem Veículo',
                        posicao: p.posicao || 'N/A',
                        kmInicial: `${(parseFloat(p.kmInicial) || 0).toLocaleString('pt-BR')} km`,
                        vidaEstimada: `${(parseFloat(p.vidaEstimada) || 80000).toLocaleString('pt-BR')} km`,
                        status: p.status,
                        _rawTotal: parseFloat(p.custo) || 0
                    };
                });

                // Chart: Distribuição de Status do Pneu
                const statusCounts = { 'Regular': 0, 'Atenção': 0, 'Vencido': 0 };
                filtered.forEach(p => {
                    const s = p.status || 'Regular';
                    if (statusCounts[s] !== undefined) statusCounts[s]++;
                });
                renderReportChart('doughnut', Object.keys(statusCounts), Object.values(statusCounts), 'Situação', ['#10b981','#f59e0b','#ef4444'], textMuted, borderColor);

            // ─── 🛢️ 5. OIL REPORT ───────────────────────────────────
            } else if (reportType === 'oil_report') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterStatus = document.getElementById('filter-status-oleo').value;

                activeHeaders = ['Data Troca', 'Veículo', 'KM Troca', 'Lubrificante', 'Próxima Troca (KM)', 'Filtros Trocados', 'Estabelecimento'];

                const filtered = oleos.filter(o => {
                    const v = vehicles.find(item => item.id === o.veiculoId);
                    const matchVeic = !filterVeic || o.veiculoId === filterVeic;
                    
                    let matchStatus = true;
                    if (filterStatus && v) {
                        const kmRestante = o.proximaTrocaKM - v.kmAtual;
                        if (filterStatus === 'ok') matchStatus = kmRestante > 1000;
                        else if (filterStatus === 'atencao') matchStatus = kmRestante <= 1000 && kmRestante > 0;
                        else if (filterStatus === 'vencido') matchStatus = kmRestante <= 0;
                    }

                    const matchDate = checkPeriodRange(o.dataTroca, periodVal, dateStartVal, dateEndVal);
                    return matchVeic && matchStatus && matchDate;
                });

                const totalTrocas = filtered.length;
                
                // Calculate overdue oil changes
                let overdueCount = 0;
                filtered.forEach(o => {
                    const v = vehicles.find(item => item.id === o.veiculoId);
                    if (v && o.proximaTrocaKM <= v.kmAtual) overdueCount++;
                });

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #0ea5e9;">
                        <span class="reports-summary-title">Total de Trocas</span>
                        <span class="reports-summary-value">${totalTrocas} Trocas</span>
                        <span class="reports-summary-sub">Realizadas no período</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Trocas Atrasadas</span>
                        <span class="reports-summary-value">${overdueCount} Veículos</span>
                        <span class="reports-summary-sub">Odômetro ultrapassou limite</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Lubrificantes Ok</span>
                        <span class="reports-summary-value">${totalTrocas - overdueCount} Veículos</span>
                        <span class="reports-summary-sub">Dentro do período de validade</span>
                    </div>
                `;

                activeReportData = filtered.map(o => {
                    const v = vehicles.find(item => item.id === o.veiculoId);
                    const filtros = [];
                    if (o.filtroAr) filtros.push('Ar');
                    if (o.filtroOleo) filtros.push('Óleo');
                    if (o.filtroCombustivel) filtros.push('Comb.');

                    return {
                        id: o.id,
                        _dataTroca: o.dataTroca,
                        dataFormatted: o.dataTroca.split('-').reverse().join('/'),
                        veiculo: v ? v.placa : 'Veículo',
                        kmTroca: `${(parseFloat(o.kmTroca) || 0).toLocaleString('pt-BR')} km`,
                        tipoOleo: o.tipoOleo || '-',
                        proximaTrocaKM: `${(parseFloat(o.proximaTrocaKM) || 0).toLocaleString('pt-BR')} km`,
                        filtros: filtros.length > 0 ? filtros.join(', ') : 'Nenhum',
                        estabelecimento: o.estabelecimento || '-'
                    };
                });

                // Chart: Contagem de trocas por veículo
                const oilCounts = {};
                filtered.forEach(o => {
                    const p = vehicles.find(v=>v.id===o.veiculoId)?.placa || 'Outros';
                    oilCounts[p] = (oilCounts[p] || 0) + 1;
                });
                renderReportChart('bar', Object.keys(oilCounts), Object.values(oilCounts), 'Quantidade de Trocas por Veículo', '#0ea5e9', textMuted, borderColor);

            // ─── 🚚 6. TRIPS REPORT ─────────────────────────────────
            } else if (reportType === 'trips_report') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterDriver = document.getElementById('filter-motorista').value;

                activeHeaders = ['Data Saída', 'Hora', 'Data Retorno', 'Hora', 'Veículo', 'Motorista', 'Origem', 'Destino', 'KM Rodado', 'Status'];

                const filtered = viagens.filter(vi => {
                    const matchVeic = !filterVeic || vi.veiculoId === filterVeic;
                    const matchDriver = !filterDriver || vi.motoristaId === filterDriver;
                    const matchDate = checkPeriodRange(vi.dataSaida, periodVal, dateStartVal, dateEndVal);
                    return matchVeic && matchDriver && matchDate;
                });

                const totalViagens = filtered.length;
                const totalKM = filtered.reduce((acc, vi) => acc + (parseFloat(vi.kmRodado) || 0), 0);
                const emAndamento = filtered.filter(vi => vi.status && vi.status.toLowerCase() === 'em andamento').length;
                const totalCustos = filtered.reduce((acc, vi) => acc + (parseFloat(vi.custos) || 0), 0);

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Viagens Realizadas</span>
                        <span class="reports-summary-value">${totalViagens} Viagens</span>
                        <span class="reports-summary-sub">Em tráfego e concluídas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Quilometragem Percorrida</span>
                        <span class="reports-summary-value">${totalKM.toLocaleString('pt-BR')} km</span>
                        <span class="reports-summary-sub">KM acumulado do período</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Viagens Ativas</span>
                        <span class="reports-summary-value">${emAndamento} Em Andamento</span>
                        <span class="reports-summary-sub">Veículos em trânsito no momento</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #8b5cf6;">
                        <span class="reports-summary-title">Despesas de Viagem</span>
                        <span class="reports-summary-value">R$ ${totalCustos.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Custo de motoristas/pedágios</span>
                    </div>
                `;

                activeReportData = filtered.map(vi => {
                    const v = vehicles.find(item => item.id === vi.veiculoId);
                    const d = drivers.find(item => item.id === vi.motoristaId);
                    return {
                        id: vi.id,
                        _dataSaida: vi.dataSaida,
                        dataFormatted: vi.dataSaida.split('-').reverse().join('/'),
                        horaSaida: vi.horaSaida || '-',
                        dataRetorno: vi.dataRetorno ? vi.dataRetorno.split('-').reverse().join('/') : '-',
                        horaRetorno: vi.horaRetorno || '-',
                        veiculo: v ? v.placa : 'Veículo',
                        motorista: d ? d.nome : 'Motorista',
                        origem: vi.origem,
                        destino: vi.destino,
                        kmRodado: `${(parseFloat(vi.kmRodado) || 0).toLocaleString('pt-BR')} km`,
                        status: vi.status,
                        _rawDataRetorno: vi.dataRetorno || '',
                        _rawTotal: parseFloat(vi.kmRodado) || 0
                    };
                });

                // Chart: Viagens por veículo
                const tripCounts = {};
                filtered.forEach(vi => {
                    const p = vehicles.find(v=>v.id===vi.veiculoId)?.placa || 'Outros';
                    tripCounts[p] = (tripCounts[p] || 0) + 1;
                });
                renderReportChart('bar', Object.keys(tripCounts), Object.values(tripCounts), 'Frequência de Viagens (Qtd)', '#3b82f6', textMuted, borderColor);

            // ─── 🚗 7. VEHICLES REPORT ──────────────────────────────
            } else if (reportType === 'veiculos_report') {
                const filterTipo = document.getElementById('filter-tipo-unidade').value;
                const filterStatus = document.getElementById('filter-situacao-veiculo').value;
                const filterFuel = document.getElementById('filter-combustivel').value;

                activeHeaders = ['Placa', 'Marca / Modelo', 'Ano', 'Tipo Unidade', 'KM Atual', 'Combustível', 'Seguro?', 'Rastreador?', 'Status'];

                const filtered = vehicles.filter(v => {
                    const matchTipo = !filterTipo || v.tipoUnidade === filterTipo;
                    const matchStatus = !filterStatus || v.status === filterStatus;
                    const matchFuel = !filterFuel || (v.combustivel || '').toLowerCase().includes(filterFuel.toLowerCase());
                    return matchTipo && matchStatus && matchFuel;
                });

                const totalVeic = filtered.length;
                const ativos = filtered.filter(v => v.status === 'disponivel').length;
                const manutencoesCount = filtered.filter(v => v.status === 'manutencao').length;
                const avgKM = filtered.length > 0 ? (filtered.reduce((acc, v) => acc + (parseFloat(v.kmAtual) || 0), 0) / filtered.length) : 0;

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Frota Selecionada</span>
                        <span class="reports-summary-value">${totalVeic} Veículos</span>
                        <span class="reports-summary-sub">Ativos no banco</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Ativos Disponíveis</span>
                        <span class="reports-summary-value">${ativos}</span>
                        <span class="reports-summary-sub">Disponíveis para rota</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Em Oficina (OS)</span>
                        <span class="reports-summary-value">${manutencoesCount}</span>
                        <span class="reports-summary-sub">Parados em manutenção</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Odômetro Médio</span>
                        <span class="reports-summary-value">${avgKM.toLocaleString('pt-BR', {maximumFractionDigits:0})} km</span>
                        <span class="reports-summary-sub">Quilometragem média da frota</span>
                    </div>
                `;

                activeReportData = filtered.map(v => {
                    return {
                        id: v.id,
                        placa: v.placa,
                        marcaModelo: `${v.marca} ${v.modelo}`,
                        ano: v.ano,
                        tipoUnidade: v.tipoUnidade || 'Veículo Motorizado',
                        kmAtual: `${(parseFloat(v.kmAtual) || 0).toLocaleString('pt-BR')} km`,
                        combustivel: v.combustivel || 'Diesel',
                        seguro: v.possuiSeguro || 'Não',
                        rastreador: v.possuiRastreador || 'Não',
                        status: v.status || 'disponivel',
                        _rawTotal: parseFloat(v.kmAtual) || 0
                    };
                });

                // Chart: Distribuição de Tipo de Veículo
                const vehicleTypes = {};
                filtered.forEach(v => {
                    const t = v.tipo || 'Outros';
                    vehicleTypes[t] = (vehicleTypes[t] || 0) + 1;
                });
                renderReportChart('doughnut', Object.keys(vehicleTypes), Object.values(vehicleTypes), 'Categoria', ['#3b82f6','#8b5cf6','#10b981','#0ea5e9','#f59e0b'], textMuted, borderColor);

            // ─── 👨✈️ 8. DRIVERS REPORT ──────────────────────────────
            } else if (reportType === 'drivers_report') {
                const filterDriver = document.getElementById('filter-motorista').value;
                const filterCategoria = document.getElementById('filter-categoria-condutor') ? document.getElementById('filter-categoria-condutor').value : '';
                const filterStatusCNH = document.getElementById('filter-status-cnh').value;

                activeHeaders = ['Nome Motorista', 'Categoria Condutor', 'CPF', 'CNH', 'Categoria', 'Vencimento CNH', 'Telefone', 'E-mail', 'Status', 'Vencimento Situação'];

                const filtered = drivers.filter(d => {
                    if (d.status === 'inativo') return false;
                    const matchDriver = !filterDriver || d.id === filterDriver;
                    const matchCategoria = !filterCategoria || d.categoria === filterCategoria;
                    
                    let matchStatus = true;
                    if (filterStatusCNH) {
                        const venc = parseDate(d.dataVencimentoCNH);
                        if (venc) {
                            const today = new Date();
                            const diffTime = venc.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (filterStatusCNH === 'Regular') matchStatus = diffDays > 30;
                            else if (filterStatusCNH === 'Vence30') matchStatus = diffDays <= 30 && diffDays > 0;
                            else if (filterStatusCNH === 'Vencida') matchStatus = diffDays <= 0;
                        } else {
                            matchStatus = false;
                        }
                    }

                    return matchDriver && matchStatus && matchCategoria;
                });

                const totalDrivers = filtered.length;
                let cnhVencida = 0;
                let cnhAviso = 0;
                filtered.forEach(d => {
                    const venc = parseDate(d.dataVencimentoCNH);
                    if (venc) {
                        const diff = venc.getTime() - new Date().getTime();
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        if (days <= 0) cnhVencida++;
                        else if (days <= 30) cnhAviso++;
                    }
                });

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Total Motoristas</span>
                        <span class="reports-summary-value">${totalDrivers} Operadores</span>
                        <span class="reports-summary-sub">Cadastros ativos</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">CNHs Vencidas</span>
                        <span class="reports-summary-value">${cnhVencida} Vencidas</span>
                        <span class="reports-summary-sub">Bloqueados para viagem</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Vencem em 30 dias</span>
                        <span class="reports-summary-value">${cnhAviso}</span>
                        <span class="reports-summary-sub">Necessitam de renovação em breve</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Operação Regular (%)</span>
                        <span class="reports-summary-value">${totalDrivers > 0 ? ((totalDrivers - cnhVencida) / totalDrivers * 100).toFixed(0) : '0'}%</span>
                        <span class="reports-summary-sub">Porcentagem habilitada</span>
                    </div>
                `;

                activeReportData = filtered.map(d => {
                    const venc = parseDate(d.dataVencimentoCNH);
                    let label = 'Regular';
                    if (venc) {
                        const diff = venc.getTime() - new Date().getTime();
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        if (days <= 0) label = 'Vencida';
                        else if (days <= 30) label = 'Vence em breve';
                    }

                    return {
                        id: d.id,
                        nome: d.nome,
                        categoriaCondutor: d.categoria || 'Motorista Efetivo',
                        cpf: d.cpf,
                        cnh: d.cnh,
                        categoriaCNH: d.categoriaCNH,
                        dataVencimentoCNH: d.dataVencimentoCNH.split('-').reverse().join('/'),
                        telefone: d.telefone || '-',
                        email: d.email || '-',
                        status: d.status || 'ativo',
                        situacaoVencimento: label,
                        _rawTotal: venc ? venc.getTime() : 0
                    };
                });

                // Chart: Categoria CNH
                const cats = {};
                filtered.forEach(d => {
                    const c = d.categoriaCNH || 'B';
                    cats[c] = (cats[c] || 0) + 1;
                });
                renderReportChart('doughnut', Object.keys(cats), Object.values(cats), 'Categorias', ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'], textMuted, borderColor);

            // ─── 🏗️ 9. IMPLEMENTS REPORT ────────────────────────────
            } else if (reportType === 'implements_report') {
                const filterImp = document.getElementById('filter-implemento').value;
                const filterStatus = document.getElementById('filter-situacao').value;

                activeHeaders = ['Placa', 'Tipo Implemento', 'Eixos', 'Pneus Ativos', 'Capacidade', 'Seguro?', 'Manutenções OS (Custo)', 'Status'];

                const filtered = vehicles.filter(v => {
                    if (v.tipoUnidade !== 'Implemento/Reboque') return false;
                    const matchImp = !filterImp || v.id === filterImp;
                    const matchStatus = !filterStatus || v.status === filterStatus;
                    return matchImp && matchStatus;
                });

                const totalImplements = filtered.length;
                const implementsPneus = filtered.reduce((acc, v) => acc + (parseInt(v.qtdPneus) || 0), 0);
                
                // OS costs connected to implement
                const implementsMaint = filtered.reduce((acc, v) => {
                    const list = maint.filter(m => m.veiculoId === v.id);
                    return acc + list.reduce((sub, m) => sub + (parseFloat(m.valor) || 0), 0);
                }, 0);

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #8b5cf6;">
                        <span class="reports-summary-title">Implementos Cadastrados</span>
                        <span class="reports-summary-value">${totalImplements} Reboques</span>
                        <span class="reports-summary-sub">Semirreboques no banco</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #6b7280;">
                        <span class="reports-summary-title">Total de Eixos / Pneus</span>
                        <span class="reports-summary-value">${implementsPneus} Pneus</span>
                        <span class="reports-summary-sub">Pneus montados em eixos</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Custo Manutenção OS</span>
                        <span class="reports-summary-value">R$ ${implementsMaint.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Despesas de mecânica vinculadas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Operação Regular</span>
                        <span class="reports-summary-value">${filtered.filter(v=>v.status==='disponivel').length} Disponíveis</span>
                        <span class="reports-summary-sub">Sem avarias registradas</span>
                    </div>
                `;

                activeReportData = filtered.map(v => {
                    const listOS = maint.filter(m => m.veiculoId === v.id);
                    const totalOSCost = listOS.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                    return {
                        id: v.id,
                        placa: v.placa,
                        tipoImplemento: v.tipoImplemento || 'Reboque',
                        qtdEixos: v.qtdEixos || '2',
                        qtdPneus: `${v.qtdPneus || '8'} pneus`,
                        capacidadeCarga: v.capacidadeCarga || 'N/A',
                        seguro: v.possuiSeguro || 'Não',
                        maintCost: `R$ ${totalOSCost.toFixed(2)}`,
                        status: v.status || 'disponivel',
                        _rawTotal: totalOSCost
                    };
                });

                // Chart: Custos por implemento
                const impCosts = {};
                filtered.forEach(v => {
                    const listOS = maint.filter(m => m.veiculoId === v.id);
                    const cost = listOS.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                    if (cost > 0) impCosts[v.placa] = cost;
                });
                renderReportChart('bar', Object.keys(impCosts), Object.values(impCosts), 'Gastos Manutenção (R$)', '#8b5cf6', textMuted, borderColor);

            // ─── 🛡️ 10. INSURANCE REPORT ─────────────────────────────
            } else if (reportType === 'insurances_report') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterStatus = document.getElementById('filter-seguro-status').value;

                activeHeaders = ['Veículo (Placa)', 'Seguradora', 'Nº Apólice', 'Valor Mensal', 'Início Vigência', 'Término Vigência', 'Vencimento Situação'];

                const filtered = vehicles.filter(v => {
                    const matchVeic = !filterVeic || v.id === filterVeic;
                    
                    let matchStatus = true;
                    if (filterStatus === 'Sim') matchStatus = v.possuiSeguro === 'Sim';
                    else if (filterStatus === 'Não') matchStatus = v.possuiSeguro !== 'Sim';
                    else if (filterStatus === 'Vencido' && v.validadeContratoSeguro) {
                        const vDate = parseDate(v.validadeContratoSeguro);
                        matchStatus = vDate && vDate < new Date();
                    }
                    return matchVeic && matchStatus;
                });

                const totalSegurados = filtered.filter(v => v.possuiSeguro === 'Sim').length;
                const totalValorMensal = filtered.filter(v => v.possuiSeguro === 'Sim').reduce((acc, v) => acc + (parseFloat(v.valorMensalSeguro) || 0), 0);
                const percent = filtered.length > 0 ? (totalSegurados / filtered.length * 100).toFixed(0) : '0';

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Veículos Segurados</span>
                        <span class="reports-summary-value">${totalSegurados} Veículos</span>
                        <span class="reports-summary-sub">Apólices ativas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Custo Mensal Apólices</span>
                        <span class="reports-summary-value">R$ ${totalValorMensal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Custo mensal consolidado</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Taxa de Cobertura</span>
                        <span class="reports-summary-value">${percent}%</span>
                        <span class="reports-summary-sub">Da frota analisada</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Sem Seguro Vinculado</span>
                        <span class="reports-summary-value">${filtered.length - totalSegurados} Ativos</span>
                        <span class="reports-summary-sub">Veículos desprotegidos</span>
                    </div>
                `;

                activeReportData = filtered.map(v => {
                    const venc = parseDate(v.validadeContratoSeguro);
                    let label = 'Vigente';
                    if (v.possuiSeguro !== 'Sim') label = 'Sem Seguro';
                    else if (venc && venc < new Date()) label = 'Vencido';

                    return {
                        id: v.id,
                        placa: v.placa,
                        seguradora: v.seguradora || '-',
                        apolice: v.apolice || '-',
                        valorMensal: v.possuiSeguro === 'Sim' ? `R$ ${(parseFloat(v.valorMensalSeguro) || 0).toFixed(2)}` : 'R$ 0,00',
                        inicioContrato: v.inicioContratoSeguro ? v.inicioContratoSeguro.split('-').reverse().join('/') : '-',
                        validadeContrato: v.validadeContratoSeguro ? v.validadeContratoSeguro.split('-').reverse().join('/') : '-',
                        status: label,
                        _rawTotal: parseFloat(v.valorMensalSeguro) || 0
                    };
                });

                // Chart: Seguro por veículo
                const segCosts = {};
                filtered.filter(v=>v.possuiSeguro === 'Sim').forEach(v => {
                    segCosts[v.placa] = parseFloat(v.valorMensalSeguro) || 0;
                });
                renderReportChart('bar', Object.keys(segCosts), Object.values(segCosts), 'Mensalidade de Seguro (R$)', '#10b981', textMuted, borderColor);

            // ─── 📡 11. TRACKER REPORT ──────────────────────────────
            } else if (reportType === 'trackers_report') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterEmpresa = document.getElementById('filter-empresa').value;

                activeHeaders = ['Veículo (Placa)', 'Empresa Rastreador', 'Modelo / ID Rastreador', 'Valor Mensal', 'Início Vigência', 'Término Vigência', 'Situação'];

                const filtered = vehicles.filter(v => {
                    const matchVeic = !filterVeic || v.id === filterVeic;
                    
                    let matchEmpresa = true;
                    if (filterEmpresa === 'Outros') {
                        matchEmpresa = v.possuiRastreador === 'Sim' && !['Sascar', 'Omnilink', 'Autotrac'].includes(v.empresaRastreador);
                    } else if (filterEmpresa) {
                        matchEmpresa = v.empresaRastreador === filterEmpresa;
                    }
                    return matchVeic && matchEmpresa;
                });

                const totalRastreados = filtered.filter(v => v.possuiRastreador === 'Sim').length;
                const totalMensal = filtered.filter(v => v.possuiRastreador === 'Sim').reduce((acc, v) => acc + (parseFloat(v.valorMensalRastreador) || 0), 0);
                const percent = filtered.length > 0 ? (totalRastreados / filtered.length * 100).toFixed(0) : '0';

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #0ea5e9;">
                        <span class="reports-summary-title">Veículos Rastreados</span>
                        <span class="reports-summary-value">${totalRastreados} Veículos</span>
                        <span class="reports-summary-sub">Dispositivos GPS ativos</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Custo Consolidado GPS</span>
                        <span class="reports-summary-value">R$ ${totalMensal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Custo mensal de assinaturas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Taxa de Monitoramento</span>
                        <span class="reports-summary-value">${percent}%</span>
                        <span class="reports-summary-sub">Da frota rastreada</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Veículos Desprotegidos</span>
                        <span class="reports-summary-value">${filtered.length - totalRastreados} Ativos</span>
                        <span class="reports-summary-sub">Sem rastreamento ativado</span>
                    </div>
                `;

                activeReportData = filtered.map(v => {
                    return {
                        id: v.id,
                        placa: v.placa,
                        empresaRastreador: v.empresaRastreador || '-',
                        modeloRastreador: v.modeloRastreador ? `${v.modeloRastreador} (ID: ${v.idRastreador || ''})` : '-',
                        valorMensal: v.possuiRastreador === 'Sim' ? `R$ ${(parseFloat(v.valorMensalRastreador) || 0).toFixed(2)}` : 'R$ 0,00',
                        inicioContrato: v.inicioContratoRastreador ? v.inicioContratoRastreador.split('-').reverse().join('/') : '-',
                        validadeContrato: v.validadeContratoRastreador ? v.validadeContratoRastreador.split('-').reverse().join('/') : '-',
                        status: v.possuiRastreador === 'Sim' ? 'Ativo' : 'Desativado',
                        _rawTotal: parseFloat(v.valorMensalRastreador) || 0
                    };
                });

                // Chart: Rastreadores por Empresa
                const empCounts = {};
                filtered.filter(v=>v.possuiRastreador==='Sim').forEach(v => {
                    const e = v.empresaRastreador || 'Outras';
                    empCounts[e] = (empCounts[e] || 0) + 1;
                });
                renderReportChart('doughnut', Object.keys(empCounts), Object.values(empCounts), 'Prestadores', ['#3b82f6','#0ea5e9','#10b981','#f59e0b'], textMuted, borderColor);

            // ─── 🧯 12. EXTINGUISHERS REPORT ──────────────────────────
            } else if (reportType === 'extinguishers_report') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterStatus = document.getElementById('filter-extintor-status').value;

                activeHeaders = ['Veículo (Placa)', 'Tipo Extintor', 'Capacidade', 'Selo INMETRO', 'Data Recarga', 'Validade Carga', 'Vencimento Situação'];

                const filtered = vehicles.filter(v => {
                    if (v.tipoUnidade === 'Implemento/Reboque') return false;
                    const matchVeic = !filterVeic || v.id === filterVeic;
                    
                    let matchStatus = true;
                    if (filterStatus && v.validadeExtintor) {
                        const vDate = parseDate(v.validadeExtintor);
                        if (vDate) {
                            const diff = vDate.getTime() - new Date().getTime();
                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            if (filterStatus === 'Regular') matchStatus = days > 30;
                            else if (filterStatus === 'Vence30') matchStatus = days <= 30 && days > 0;
                            else if (filterStatus === 'Vencido') matchStatus = days <= 0;
                        } else {
                            matchStatus = false;
                        }
                    }
                    return matchVeic && matchStatus;
                });

                const totalExt = filtered.filter(v => v.possuiExtintor === 'Sim').length;
                let extVencido = 0;
                let extAviso = 0;
                filtered.filter(v => v.possuiExtintor === 'Sim').forEach(v => {
                    const vDate = parseDate(v.validadeExtintor);
                    if (vDate) {
                        const diff = vDate.getTime() - new Date().getTime();
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        if (days <= 0) extVencido++;
                        else if (days <= 30) extAviso++;
                    }
                });

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Equipados com Extintor</span>
                        <span class="reports-summary-value">${totalExt} Extintores</span>
                        <span class="reports-summary-sub">Ativos na frota</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Extintores Vencidos</span>
                        <span class="reports-summary-value">${extVencido} Vencidos</span>
                        <span class="reports-summary-sub">Requerem recarga urgente</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Vencendo em 30 dias</span>
                        <span class="reports-summary-value">${extAviso}</span>
                        <span class="reports-summary-sub">Agendar vistorias preventivas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Frota Conforme (%)</span>
                        <span class="reports-summary-value">${totalExt > 0 ? ((totalExt - extVencido) / totalExt * 100).toFixed(0) : '0'}%</span>
                        <span class="reports-summary-sub">Extintores dentro da validade</span>
                    </div>
                `;

                activeReportData = filtered.map(v => {
                    const vDate = parseDate(v.validadeExtintor);
                    let label = 'Regular';
                    if (v.possuiExtintor !== 'Sim') label = 'Sem Extintor';
                    else if (vDate) {
                        const diff = vDate.getTime() - new Date().getTime();
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        if (days <= 0) label = 'Vencido';
                        else if (days <= 30) label = 'Vence em breve';
                    }

                    return {
                        id: v.id,
                        placa: v.placa,
                        tipoExtintor: v.tipoExtintor || '-',
                        capacidadeExtintor: v.capacidadeExtintor || '-',
                        seloExtintor: v.seloExtintor || '-',
                        dataRecargaExtintor: v.dataRecargaExtintor ? v.dataRecargaExtintor.split('-').reverse().join('/') : '-',
                        validadeExtintor: v.validadeExtintor ? v.validadeExtintor.split('-').reverse().join('/') : '-',
                        status: label,
                        _rawTotal: vDate ? vDate.getTime() : 0
                    };
                });

                // Chart: Distribuição de validade
                renderReportChart('doughnut', ['Válidos', 'Vencendo', 'Vencidos'], [totalExt - extVencido - extAviso, extAviso, extVencido], 'Situação Extintores', ['#10b981','#f59e0b','#ef4444'], textMuted, borderColor);

            // ─── 💰 13. FLEET COSTS CONSOLIDATED ────────────────────
            } else if (reportType === 'fleet_costs_consolidated') {
                const filterVeic = document.getElementById('filter-veiculo').value;
                const filterImp = document.getElementById('filter-implemento').value;

                activeHeaders = ['Veículo (Placa)', 'Combustível', 'Manutenção', 'Multas', 'Pneus', 'Seguros', 'Rastreamento', 'Custo Total'];

                const filtered = vehicles.filter(v => {
                    if (v.tipoUnidade === 'Implemento/Reboque') {
                        if (filterImp) {
                            return v.id === filterImp;
                        }
                        return !filterVeic;
                    }
                    if (filterVeic) {
                        return v.id === filterVeic;
                    }
                    return true;
                });

                let costComb = 0, costMaint = 0, costMulta = 0, costPneu = 0, costSeg = 0, costRast = 0;

                const aggregatedData = filtered.map(v => {
                    const cComb = supplies.filter(a => a.veiculoId === v.id && checkPeriodRange(a.data, periodVal, dateStartVal, dateEndVal)).reduce((acc, a) => acc + a.valorTotal, 0);
                    const cMaint = maint.filter(m => m.veiculoId === v.id && checkPeriodRange(m.data, periodVal, dateStartVal, dateEndVal)).reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                    const cMulta = multas.filter(m => m.veiculoId === v.id && checkPeriodRange(m.data, periodVal, dateStartVal, dateEndVal)).reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                    const cPneu = pneus.filter(p => p.veiculoAtual === v.id && checkPeriodRange(p.dataInstalacao, periodVal, dateStartVal, dateEndVal)).reduce((acc, p) => acc + (parseFloat(p.custo) || 0), 0);
                    
                    const cSeg = v.possuiSeguro === 'Sim' ? (parseFloat(v.valorMensalSeguro) || 0) * 12 : 0;
                    const cRast = v.possuiRastreador === 'Sim' ? (parseFloat(v.valorMensalRastreador) || 0) * 12 : 0;

                    costComb += cComb;
                    costMaint += cMaint;
                    costMulta += cMulta;
                    costPneu += cPneu;
                    costSeg += cSeg;
                    costRast += cRast;

                    const total = cComb + cMaint + cMulta + cPneu + cSeg + cRast;

                    return {
                        id: v.id,
                        placa: v.placa,
                        combustivel: `R$ ${cComb.toFixed(2)}`,
                        manutencao: `R$ ${cMaint.toFixed(2)}`,
                        multas: `R$ ${cMulta.toFixed(2)}`,
                        pneus: `R$ ${cPneu.toFixed(2)}`,
                        seguros: `R$ ${cSeg.toFixed(2)}`,
                        rastreamento: `R$ ${cRast.toFixed(2)}`,
                        total: `R$ ${total.toFixed(2)}`,
                        _rawTotal: total
                    };
                });

                const totalGeral = costComb + costMaint + costMulta + costPneu + costSeg + costRast;

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Custo Consolidado da Frota</span>
                        <span class="reports-summary-value" style="font-size:1.45rem;">R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Todas as despesas acumuladas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #22c55e;">
                        <span class="reports-summary-title">Combustível Total</span>
                        <span class="reports-summary-value">R$ ${costComb.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Postos de combustível</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Manutenção Geral</span>
                        <span class="reports-summary-value">R$ ${costMaint.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Oficinas mecânicas</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #6b7280;">
                        <span class="reports-summary-title">Outros Custos</span>
                        <span class="reports-summary-value">R$ ${(costMulta + costPneu + costSeg + costRast).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Multas, pneus, seguros, rastreamento</span>
                    </div>
                `;

                activeReportData = aggregatedData;

                // Chart: Top 5 Veículos Mais Caros
                aggregatedData.sort((a,b) => b._rawTotal - a._rawTotal);
                const top5 = aggregatedData.slice(0, 5);
                const plaques = top5.map(item => item.placa);
                const values = top5.map(item => item._rawTotal);
                renderReportChart('bar', plaques, values, 'Gastos Acumulados (R$)', '#ef4444', textMuted, borderColor);

            // ─── 📈 14. VEHICLE LIFETIME REPORT ─────────────────────
            } else if (reportType === 'vehicle_lifetime') {
                const targetVeic = document.getElementById('filter-veiculo').value;
                const v = vehicles.find(item => item.id === targetVeic);

                activeHeaders = ['Data', 'Lançamento / Categoria', 'Detalhe / Observação', 'Valor Lançado', 'Odômetro Registro'];

                if (!v) {
                    summaryContainer.innerHTML = '<div style="grid-column: span 4; text-align:center; padding:20px; font-weight:700; color:var(--text-muted);">Por favor, selecione um veículo válido.</div>';
                    return;
                }

                // Gather all expenses from targetVeic
                const vehicleSupplies = supplies.filter(a => a.veiculoId === v.id && checkPeriodRange(a.data, periodVal, dateStartVal, dateEndVal));
                const vehicleMaint = maint.filter(m => m.veiculoId === v.id && checkPeriodRange(m.data, periodVal, dateStartVal, dateEndVal));
                const vehicleMultas = multas.filter(m => m.veiculoId === v.id && checkPeriodRange(m.data, periodVal, dateStartVal, dateEndVal));
                const vehicleOleos = oleos.filter(o => o.veiculoId === v.id && checkPeriodRange(o.dataTroca, periodVal, dateStartVal, dateEndVal));
                const vehiclePneus = pneus.filter(p => p.veiculoAtual === v.id && checkPeriodRange(p.dataInstalacao, periodVal, dateStartVal, dateEndVal));
                
                const cSupplies = vehicleSupplies.reduce((acc, a) => acc + a.valorTotal, 0);
                const cMaint = vehicleMaint.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                const cMultas = vehicleMultas.reduce((acc, m) => acc + (parseFloat(m.valor) || 0), 0);
                const cPneus = vehiclePneus.reduce((acc, p) => acc + (parseFloat(p.custo) || 0), 0);

                const cSeg = v.possuiSeguro === 'Sim' ? (parseFloat(v.valorMensalSeguro) || 0) * 12 : 0;
                const cRast = v.possuiRastreador === 'Sim' ? (parseFloat(v.valorMensalRastreador) || 0) * 12 : 0;

                const grandTotal = cSupplies + cMaint + cMultas + cPneus + cSeg + cRast;

                // KM rodado
                const vehicleViagens = viagens.filter(vi => vi.veiculoId === v.id && checkPeriodRange(vi.dataSaida, periodVal, dateStartVal, dateEndVal));
                const totalKMRodado = vehicleViagens.reduce((acc, vi) => acc + (parseFloat(vi.kmRodado) || 0), 0);
                const costPerKM = totalKMRodado > 0 ? (grandTotal / totalKMRodado) : 0;

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #3b82f6;">
                        <span class="reports-summary-title">Custo Acumulado Total</span>
                        <span class="reports-summary-value">R$ ${grandTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                        <span class="reports-summary-sub">Tudo que o veículo consumiu</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Quilometragem Rodada</span>
                        <span class="reports-summary-value">${totalKMRodado.toLocaleString('pt-BR')} km</span>
                        <span class="reports-summary-sub">Distância acumulada no período</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Custo por KM Rodado</span>
                        <span class="reports-summary-value">R$ ${costPerKM.toFixed(2)}/km</span>
                        <span class="reports-summary-sub">Custo operacional por quilômetro</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #8b5cf6;">
                        <span class="reports-summary-title">Eventos OS / Abastecimento</span>
                        <span class="reports-summary-value">${vehicleMaint.length + vehicleSupplies.length} Lançamentos</span>
                        <span class="reports-summary-sub">Manutenções e abastecimentos</span>
                    </div>
                `;

                // Build timeline data
                const timeline = [];

                vehicleSupplies.forEach(a => {
                    timeline.push({
                        data: a.data,
                        dataFormatted: a.data.split('-').reverse().join('/'),
                        categoria: 'Abastecimento',
                        detalhe: `${a.combustivel} - ${window.movixApp.formatDecimal(a.litros)}L no posto ${a.posto || '-'}`,
                        valor: `R$ ${a.valorTotal.toFixed(2)}`,
                        km: `${(parseFloat(a.kmAtual) || 0).toLocaleString('pt-BR')} km`,
                        _rawDate: a.data,
                        _rawTotal: a.valorTotal
                    });
                });

                vehicleMaint.forEach(m => {
                    timeline.push({
                        data: m.data,
                        dataFormatted: m.data.split('-').reverse().join('/'),
                        categoria: `Manutenção (${m.tipo})`,
                        detalhe: `${m.categoria} - ${m.descricao || ''} (${m.oficina || ''})`,
                        valor: `R$ ${(parseFloat(m.valor) || 0).toFixed(2)}`,
                        km: `${(parseFloat(m.km) || 0).toLocaleString('pt-BR')} km`,
                        _rawDate: m.data,
                        _rawTotal: parseFloat(m.valor) || 0
                    });
                });

                vehicleMultas.forEach(m => {
                    timeline.push({
                        data: m.data,
                        dataFormatted: m.data.split('-').reverse().join('/'),
                        categoria: 'Multa de Trânsito',
                        detalhe: `${m.descricao} (${m.gravidade || 'Média'})`,
                        valor: `R$ ${(parseFloat(m.valor) || 0).toFixed(2)}`,
                        km: '-',
                        _rawDate: m.data,
                        _rawTotal: parseFloat(m.valor) || 0
                    });
                });

                vehicleOleos.forEach(o => {
                    timeline.push({
                        data: o.dataTroca,
                        dataFormatted: o.dataTroca.split('-').reverse().join('/'),
                        categoria: 'Troca de Óleo',
                        detalhe: `Lubrificante ${o.tipoOleo || ''} (${o.estabelecimento || ''})`,
                        valor: '-',
                        km: `${(parseFloat(o.kmTroca) || 0).toLocaleString('pt-BR')} km`,
                        _rawDate: o.dataTroca,
                        _rawTotal: 0
                    });
                });

                vehiclePneus.forEach(p => {
                    timeline.push({
                        data: p.dataInstalacao,
                        dataFormatted: p.dataInstalacao.split('-').reverse().join('/'),
                        categoria: 'Substituição Pneu',
                        detalhe: `Pneu ${p.marca || ''} ${p.modelo || ''} na posição ${p.posicao || ''}`,
                        valor: `R$ ${(parseFloat(p.custo) || 0).toFixed(2)}`,
                        km: `${(parseFloat(p.kmInicial) || 0).toLocaleString('pt-BR')} km`,
                        _rawDate: p.dataInstalacao,
                        _rawTotal: parseFloat(p.custo) || 0
                    });
                });

                timeline.sort((a,b) => new Date(b._rawDate) - new Date(a._rawDate));
                activeReportData = timeline;

                // Chart: Distribuição de Custos por Tipo
                renderReportChart('doughnut', ['Combustível', 'Oficina OS', 'Multas', 'Pneus', 'Óleo/Filtros', 'Seguro (Proporcional)', 'Rastreador'], 
                    [cSupplies, cMaint, cMultas, cPneus, cOleos, cSeg, cRast], 'Custo', ['#22c55e','#3b82f6','#ef4444','#6b7280','#0ea5e9','#10b981','#f59e0b'], textMuted, borderColor);

            // ─── 🔔 15. EXPIRATIONS AND ALERTS REPORT ───────────────
            } else if (reportType === 'expirations_alerts') {
                const filterAlerta = document.getElementById('filter-alerta-tipo').value;

                activeHeaders = ['Data Vencimento', 'Alvo Relacionado', 'Categoria Alerta', 'Especificação / Detalhe', 'Dias Restantes', 'Gravidade'];

                const alerts = [];

                // 1. CNH expirations
                drivers.forEach(d => {
                    if (d.status === 'inativo') return;
                    if (!d.dataVencimentoCNH) return;
                    const venc = parseDate(d.dataVencimentoCNH);
                    if (!venc) return;

                    const diff = venc.getTime() - new Date().getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    const isCritical = days <= 0;
                    const isWarning = days > 0 && days <= 30;

                    if (isCritical || isWarning) {
                        alerts.push({
                            data: d.dataVencimentoCNH,
                            dataFormatted: d.dataVencimentoCNH.split('-').reverse().join('/'),
                            alvo: d.nome,
                            categoria: 'CNH',
                            descricao: `CNH do motorista ${d.nome} expirada ou próxima de expirar.`,
                            dias: days <= 0 ? `Atrasada há ${Math.abs(days)} dias` : `Vence em ${days} dias`,
                            gravidade: isCritical ? 'Crítico' : 'Atenção',
                            _rawDays: days
                        });
                    }
                });

                // 2. Insurances expirations
                vehicles.forEach(v => {
                    if (v.possuiSeguro !== 'Sim' || !v.validadeContratoSeguro) return;
                    const venc = parseDate(v.validadeContratoSeguro);
                    if (!venc) return;

                    const diff = venc.getTime() - new Date().getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    const isCritical = days <= 0;
                    const isWarning = days > 0 && days <= 30;

                    if (isCritical || isWarning) {
                        alerts.push({
                            data: v.validadeContratoSeguro,
                            dataFormatted: v.validadeContratoSeguro.split('-').reverse().join('/'),
                            alvo: v.placa,
                            categoria: 'Seguro',
                            descricao: `Contrato de seguro do veículo ${v.placa} (${v.seguradora || ''}) expira em breve.`,
                            dias: days <= 0 ? `Vencido há ${Math.abs(days)} dias` : `Vence em ${days} dias`,
                            gravidade: isCritical ? 'Crítico' : 'Atenção',
                            _rawDays: days
                        });
                    }
                });

                // 3. Extinguisher expirations
                vehicles.forEach(v => {
                    if (v.possuiExtintor !== 'Sim' || !v.validadeExtintor) return;
                    const venc = parseDate(v.validadeExtintor);
                    if (!venc) return;

                    const diff = venc.getTime() - new Date().getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    const isCritical = days <= 0;
                    const isWarning = days > 0 && days <= 30;

                    if (isCritical || isWarning) {
                        alerts.push({
                            data: v.validadeExtintor,
                            dataFormatted: v.validadeExtintor.split('-').reverse().join('/'),
                            alvo: v.placa,
                            categoria: 'Extintor',
                            descricao: `Validade de extintor do veículo ${v.placa} expirando.`,
                            dias: days <= 0 ? `Vencido há ${Math.abs(days)} dias` : `Vence em ${days} dias`,
                            gravidade: isCritical ? 'Crítico' : 'Atenção',
                            _rawDays: days
                        });
                    }
                });

                // 4. Oil changes overdue
                oleos.forEach(o => {
                    const v = vehicles.find(item => item.id === o.veiculoId);
                    if (!v) return;
                    const kmRestante = o.proximaTrocaKM - v.kmAtual;
                    if (kmRestante <= 0) {
                        alerts.push({
                            data: o.dataTroca,
                            dataFormatted: o.dataTroca.split('-').reverse().join('/'),
                            alvo: v.placa,
                            categoria: 'Oleo',
                            descricao: `Troca de óleo atrasada em ${Math.abs(kmRestante).toLocaleString('pt-BR')} km.`,
                            dias: `Atrasada (${Math.abs(kmRestante).toLocaleString('pt-BR')} km)`,
                            gravidade: 'Crítico',
                            _rawDays: -100
                        });
                    }
                });

                // 5. Maintenance overdue / schedules
                maint.filter(m => m.status === 'Agendada').forEach(m => {
                    const venc = parseDate(m.data);
                    if (!venc) return;

                    const diff = venc.getTime() - new Date().getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    const isCritical = days <= 0;

                    alerts.push({
                        data: m.data,
                        dataFormatted: m.data.split('-').reverse().join('/'),
                        alvo: vehicles.find(v=>v.id===m.veiculoId)?.placa || 'Veículo',
                        categoria: 'Manutencao',
                        descricao: `OS de manutenção agendada para ${m.data.split('-').reverse().join('/')} (${m.categoria}).`,
                        dias: days <= 0 ? `Atrasada há ${Math.abs(days)} dias` : `Agendada em ${days} dias`,
                        gravidade: isCritical ? 'Crítico' : 'Atenção',
                        _rawDays: days
                    });
                });

                // Filter by alert category select
                const filtered = alerts.filter(a => {
                    return !filterAlerta || a.categoria === filterAlerta;
                });

                filtered.sort((a,b) => a._rawDays - b._rawDays);
                activeReportData = filtered;

                const totalAlerts = filtered.length;
                const criticalCount = filtered.filter(a => a.gravidade === 'Crítico').length;
                const warningCount = filtered.filter(a => a.gravidade === 'Atenção').length;

                summaryContainer.innerHTML = `
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Total de Alertas</span>
                        <span class="reports-summary-value">${totalAlerts} Alertas</span>
                        <span class="reports-summary-sub">Identificados pelo sistema</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #ef4444;">
                        <span class="reports-summary-title">Alertas Críticos</span>
                        <span class="reports-summary-value" style="color:var(--danger);">${criticalCount} Vencidos</span>
                        <span class="reports-summary-sub">Exigem ação corretiva imediata</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #f59e0b;">
                        <span class="reports-summary-title">Alertas de Atenção</span>
                        <span class="reports-summary-value">${warningCount} A vencer</span>
                        <span class="reports-summary-sub">Próximos nos próximos 30 dias</span>
                    </div>
                    <div class="reports-summary-card" style="--card-accent-color: #10b981;">
                        <span class="reports-summary-title">Conformidade Frota</span>
                        <span class="reports-summary-value">${totalAlerts === 0 ? '100%' : `${((vehicles.length - criticalCount) / vehicles.length * 100).toFixed(0)}%`}</span>
                        <span class="reports-summary-sub">Porcentagem em dia</span>
                    </div>
                `;

                // Chart: Alertas por Categoria
                const catCounts = { 'CNH': 0, 'Seguro': 0, 'Extintor': 0, 'Oleo': 0, 'Manutencao': 0 };
                filtered.forEach(a => {
                    if (catCounts[a.categoria] !== undefined) catCounts[a.categoria]++;
                });
                renderReportChart('doughnut', ['CNH', 'Seguro', 'Extintor', 'Troca Óleo', 'OS Manutenção'], Object.values(catCounts), 'Alertas', ['#f59e0b','#3b82f6','#ef4444','#0ea5e9','#8b5cf6'], textMuted, borderColor);
            }

            // After calculating `activeReportData`, setup table layout
            if (!isInitial) {
                state.currentPage = 1;
                window.movixApp.saveListState('relatorios', state);
            }
            renderReportTable();
        }

        // TABLE RENDER ENGINE (PAGINATION, SORTING, QUICK SEARCH)
        function renderReportTable() {
            const tbody = document.getElementById('tbody-report-output');
            const thead = document.getElementById('thead-report-output');
            const searchInput = document.getElementById('report-search');
            const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

            // 1. Build Headers
            thead.innerHTML = `
                <tr>
                    ${activeHeaders.map(h => {
                        const colKey = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
                        const sortIcon = state.currentSort.column === colKey 
                            ? (state.currentSort.direction === 'asc' ? ' <i class="fa-solid fa-sort-up"></i>' : ' <i class="fa-solid fa-sort-down"></i>')
                            : ' <i class="fa-solid fa-sort text-muted" style="font-size:0.7rem;"></i>';
                        return `<th class="sortable" data-col="${colKey}" style="cursor:pointer; user-select:none;">${h}${sortIcon}</th>`;
                    }).join('')}
                </tr>
            `;

            // Bind sort handlers
            thead.querySelectorAll('th.sortable').forEach(th => {
                th.addEventListener('click', () => {
                    const col = th.getAttribute('data-col');
                    if (state.currentSort.column === col) {
                        state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        state.currentSort.column = col;
                        state.currentSort.direction = 'asc';
                    }
                    window.movixApp.saveListState('relatorios', state);
                    renderReportTable();
                });
            });

            // 2. Filter data by quick search
            let searchedData = [...activeReportData];
            if (searchVal) {
                searchedData = activeReportData.filter(row => {
                    return Object.keys(row).some(key => {
                        if (key.startsWith('_')) return false; // skip raw calculations
                        return String(row[key] || '').toLowerCase().includes(searchVal);
                    });
                });
            }

            // Update Counter
            document.getElementById('report-counter').innerText = `Mostrando ${searchedData.length} de ${activeReportData.length} registros`;

            // 3. Sort searchedData
            if (state.currentSort.column) {
                searchedData.sort((a, b) => {
                    // Try getting raw values first for numeric fields
                    let valA = a[state.currentSort.column];
                    let valB = b[state.currentSort.column];

                    // Fallback search keys mapping to actual object properties
                    if (valA === undefined) {
                        const mapping = {
                            'codigo_pneu': 'codigo',
                            'marca_/_modelo': 'marcaModelo',
                            'custo_unitario': '_rawTotal',
                            'veiculo_vinculado': 'veiculo',
                            'vida_util_estimada': '_rawTotal',
                            'veiculo_(placa)': 'placa',
                            'nº_apolice': 'apolice',
                            'no_apolice': 'apolice',
                            'valor_mensal': '_rawTotal',
                            'inicio_vigencia': 'inicioContrato',
                            'termino_vigencia': 'validadeContrato',
                            'vencimento_situacao': 'status',
                            'empresa_rastreador': 'empresaRastreador',
                            'modelo_/_id_rastreador': 'modeloRastreador',
                            'criacao_lancamento': 'categoria',
                            'valor_lancado': '_rawTotal',
                            'odometro_registro': 'km',
                            'lancamento_/_categoria': 'categoria',
                            'detalhe_/_observacao': 'detalhe',
                            'alvo_relacionado': 'alvo',
                            'categoria_alerta': 'categoria',
                            'especificacao_/_detalhe': 'descricao',
                            'dias_restantes': '_rawDays',
                            'tipo_os': 'tipo',
                            'valor_os': '_rawTotal',
                            'oficina_/_fornecedor': 'oficina',
                            'km_os': '_rawTotal',
                            'data_saida': '_dataSaida',
                            'data_retorno': '_rawDataRetorno',
                            'data_troca': '_dataTroca',
                            'km_rodado': '_rawTotal',
                            'tipo_implemento': 'tipoImplemento',
                            'pneus_ativos': 'qtdPneus',
                            'manutencoes_os_(custo)': '_rawTotal',
                            'tipo_extintor': 'tipoExtintor',
                            'selo_inmetro': 'seloExtintor',
                            'data_recarga': 'dataRecargaExtintor',
                            'validade_carga': 'validadeExtintor',
                            'cnh_status': 'situacaoVencimento',
                            'custo_total': '_rawTotal',
                            'tipo_unidade': 'tipoUnidade',
                            'km_atual': '_rawTotal',
                            'seguro?': 'seguro',
                            'rastreador?': 'rastreador',
                            'nome_motorista': 'nome',
                            'categoria_condutor': 'categoriaCondutor',
                            'categoria': 'categoriaCNH',
                            'vencimento_cnh': '_rawTotal',
                            'e-mail': 'email',
                            'eixos': 'qtdEixos',
                            'capacidade': 'capacidadeCarga',
                            'situacao': 'status',
                            'data_vencimento': 'data'
                        };
                        const mappedKey = mapping[state.currentSort.column];
                        if (mappedKey) {
                            valA = a[mappedKey];
                            valB = b[mappedKey];
                        }
                    }

                    if (typeof valA === 'string' && valA.startsWith('R$ ')) {
                        valA = parseFloat(valA.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
                        valB = parseFloat(valB.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
                    } else if (typeof valA === 'string' && valA.endsWith(' L')) {
                        valA = parseFloat(valA) || 0;
                        valB = parseFloat(valB) || 0;
                    } else if (typeof valA === 'string' && valA.endsWith(' km')) {
                        valA = parseFloat(valA.replace(/[km\s.]/g, '')) || 0;
                        valB = parseFloat(valB.replace(/[km\s.]/g, '')) || 0;
                    }

                    if (valA === undefined || valA === null) valA = '';
                    if (valB === undefined || valB === null) valB = '';

                    if (typeof valA === 'number' && typeof valB === 'number') {
                        return state.currentSort.direction === 'asc' ? valA - valB : valB - valA;
                    }

                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();

                    if (valA < valB) return state.currentSort.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return state.currentSort.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            // 4. Paginate
            const itemsPerPageVal = state.itemsPerPage === 'Todos' ? Infinity : (parseInt(state.itemsPerPage) || 10);
            const totalPages = Math.ceil(searchedData.length / itemsPerPageVal) || 1;
            if (state.currentPage > totalPages) {
                state.currentPage = totalPages;
                window.movixApp.saveListState('relatorios', state);
            }
            const startIdx = itemsPerPageVal === Infinity ? 0 : (state.currentPage - 1) * itemsPerPageVal;
            const paginated = searchedData.slice(startIdx, startIdx + itemsPerPageVal);

            tbody.innerHTML = '';
            if (paginated.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${activeHeaders.length}" class="search-no-results" style="text-align:center; padding:30px; font-weight:700;">Nenhum registro encontrado para esta seleção.</td></tr>`;
                document.getElementById('report-pagination').innerHTML = '';
                return;
            }

            paginated.forEach(row => {
                let htmlRow = '<tr>';
                // Loop properties excluding metadata keys starting with underscore
                Object.keys(row).forEach(key => {
                    if (key.startsWith('_') || key === 'id' || key === 'data') return;
                    
                    let val = row[key];
                    let cellHTML = `<td>${val}</td>`;

                    // Style status badges or special columns
                    if (key === 'status' || key === 'situacaoVencimento' || key === 'gravidade') {
                        let badgeClass = 'status-gray';
                        let displayVal = val;
                        const text = String(val).toLowerCase();
                        if (text === 'pago' || text === 'realizada' || text === 'regular' || text === 'disponivel' || text === 'vigente' || text === 'ativo' || text === 'válido' || text === 'ok') {
                            badgeClass = 'ok';
                        } else if (text === 'não pago' || text === 'corretiva' || text === 'vencido' || text === 'vencida' || text === 'crítico' || text === 'desativado' || text === 'inativo') {
                            badgeClass = 'vencido';
                        } else if (text === 'recorrendo' || text === 'em andamento' || text === 'agendada' || text === 'manutencao' || text === 'em_manutencao' || text === 'vence em breve' || text === 'atenção') {
                            badgeClass = 'em_manutencao';
                            if (text === 'em_manutencao') {
                                displayVal = 'Em Oficina';
                            }
                        }
                        cellHTML = `<td><span class="status-pill ${badgeClass}" style="font-weight:700; font-size:0.7rem; padding: 2px 6px;">${displayVal}</span></td>`;
                    } else if (key === 'veiculo' || key === 'placa') {
                        cellHTML = `<td style="font-weight:700; color:var(--primary);">${val}</td>`;
                    } else if (key === 'total' || key === 'maintCost' || key === 'valorTotal' || key === 'valor') {
                        cellHTML = `<td style="font-weight:700; color:var(--text-main);">${val}</td>`;
                    }
                    htmlRow += cellHTML;
                });
                htmlRow += '</tr>';
                tbody.innerHTML += htmlRow;
            });

            // Render Pagination controls using central helper
            window.movixApp.renderPagination({
                containerId: 'report-pagination',
                currentPage: state.currentPage,
                totalItems: searchedData.length,
                itemsPerPage: state.itemsPerPage,
                noun: 'registros',
                onPageChange: (newPage) => {
                    state.currentPage = newPage;
                    window.movixApp.saveListState('relatorios', state);
                    renderReportTable();
                },
                onItemsPerPageChange: (newLimit) => {
                    state.itemsPerPage = newLimit;
                    state.currentPage = 1;
                    window.movixApp.saveListState('relatorios', state);
                    renderReportTable();
                }
            });
        }

        // EXCEL EXPORTER HELPER (UTF-8 BOM Portuguese Compatibility)
        function triggerExcelExport() {
            const selectEl = document.getElementById('report-type-sel');
            const reportName = selectEl.options[selectEl.selectedIndex].text.replace(/[\s\W]+/g, '_');
            const filename = `relatorio_${reportName}_${new Date().toISOString().split('T')[0]}`;

            let csvContent = "\uFEFF"; // UTF-8 BOM - Crucial to load accents (pt-BR) correctly in Excel
            csvContent += activeHeaders.join(";") + "\n";

            activeReportData.forEach(row => {
                const values = [];
                Object.keys(row).forEach(key => {
                    if (key.startsWith('_') || key === 'id' || key === 'data') return;
                    let val = String(row[key] === null || row[key] === undefined ? '' : row[key]).replace(/"/g, '""');
                    if (val.includes(';') || val.includes('\n')) val = `"${val}"`;
                    values.push(val);
                });
                csvContent += values.join(";") + "\n";
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${filename}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.movixApp.showToast('Relatório exportado para Excel com sucesso!', 'success');
        }

        // CHART GENERATION
        function renderReportChart(type, labels, data, datasetLabel, backgroundColors, textMuted, borderColor) {
            const canvas = document.getElementById('reportChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            const config = {
                type: type,
                data: {
                    labels: labels,
                    datasets: [{
                        label: datasetLabel,
                        data: data,
                        backgroundColor: backgroundColors,
                        borderWidth: 1,
                        borderColor: borderColor
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: type === 'doughnut',
                            position: 'bottom',
                            labels: { color: textMuted, font: { family: 'Outfit', size: 11 } }
                        }
                    }
                }
            };

            if (type === 'bar') {
                config.options.scales = {
                    x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { family: 'Outfit' } } },
                    y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { family: 'Outfit' } } }
                };
            }

            currentChartInstance = new Chart(ctx, config);
        }

        // Setup Main Change Listener for Dynamic Filter groups
        document.getElementById('report-type-sel').addEventListener('change', () => {
            state.reportType = document.getElementById('report-type-sel').value;
            state.filters = { search: '' };
            state.currentPage = 1;
            window.movixApp.saveListState('relatorios', state);
            setupDynamicFilters(false);
        });

        // Search Input listener
        document.getElementById('view-content-wrapper').addEventListener('input', (e) => {
            if (e.target && e.target.id === 'report-search') {
                state.filters.search = e.target.value;
                state.currentPage = 1;
                window.movixApp.saveListState('relatorios', state);
                renderReportTable();
            }
        });

        // Binding Actions Buttons
        document.getElementById('btn-export-excel').addEventListener('click', triggerExcelExport);
        document.getElementById('btn-export-pdf').addEventListener('click', () => {
            const style = document.createElement('style');
            style.id = 'print-orientation-style';
            style.innerHTML = `@page { size: landscape; margin: 10mm 8mm !important; }`;
            document.head.appendChild(style);

            // Temporarily disable pagination to include all filtered items in the print DOM
            const oldItemsPerPage = state.itemsPerPage;
            state.itemsPerPage = 'Todos';
            renderReportTable();

            window.print();

            // Restore pagination to its original state
            state.itemsPerPage = oldItemsPerPage;
            renderReportTable();

            setTimeout(() => {
                const el = document.getElementById('print-orientation-style');
                if (el) el.remove();
            }, 500);
        });

        // Restore report search input value if saved
        const searchInput = document.getElementById('report-search');
        if (searchInput && state.filters.search) {
            searchInput.value = state.filters.search;
        }

        // Bootstrapping the Module
        setupDynamicFilters(true);
    }

    window.movixRouter.register('relatorios', renderRelatorios);
})();
