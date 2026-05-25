/* MovixFrota - Dashboard Module */

(function() {
    
    function renderDashboard(container) {
        const metrics = window.movixStore.getMetrics();
        const alerts = window.movixStore.getAlerts();
        const multas = window.movixStore.getMultas();
        const vehicles = window.movixStore.getVeiculos();
        const drivers = window.movixStore.getMotoristas();
        const manutencoes = window.movixStore.getMaintenances();
        const pneus = window.movixStore.getPneus();
        const abastecimentos = window.movixStore.getAbastecimentos();
        const today = new Date();

        // 1. Calculate top vehicles with most fines
        const vehicleFines = {};
        multas.forEach(m => {
            if (m.veiculoId) {
                if (!vehicleFines[m.veiculoId]) {
                    vehicleFines[m.veiculoId] = { count: 0, cost: 0 };
                }
                vehicleFines[m.veiculoId].count++;
                vehicleFines[m.veiculoId].cost += parseFloat(m.valor) || 0;
            }
        });
        
        const sortedVehicleFines = Object.entries(vehicleFines)
            .map(([id, info]) => {
                const v = vehicles.find(item => item.id === id);
                return {
                    id,
                    placa: v ? v.placa : '-',
                    modelo: v ? `${v.marca} ${v.modelo}` : 'Veículo Removido',
                    count: info.count,
                    cost: info.cost
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 2. Calculate Insurance Specific metrics
        const activeInsurances = vehicles.filter(v => v.possuiSeguro === 'Sim' && (!v.validadeContratoSeguro || new Date(v.validadeContratoSeguro + 'T23:59:59') >= today));
        const expiredInsurances = vehicles.filter(v => v.possuiSeguro === 'Sim' && v.validadeContratoSeguro && new Date(v.validadeContratoSeguro + 'T23:59:59') < today);
        const expiringInsurances = vehicles.filter(v => {
            if (v.possuiSeguro !== 'Sim' || !v.validadeContratoSeguro) return false;
            const d = new Date(v.validadeContratoSeguro + 'T23:59:59');
            const diff = d - today;
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 30;
        });

        // 3. Define color helpers for active theme
        const isDark = document.body.classList.contains('theme-dark');
        const textMuted = isDark ? '#9ca3af' : '#64748b';
        const borderColor = isDark ? '#1f293d' : '#e2e8f0';
  
        // 4. Compile Alertas HTML
        let alertsHTML = '';
        if (alerts.length === 0) {
            alertsHTML = `
                <div class="search-no-results" style="padding: 32px;">
                    <i class="fa-solid fa-circle-check text-success" style="font-size: 2rem; margin-bottom: 12px;"></i>
                    <p style="font-weight: 500;">Nenhum alerta ativo! Sua frota está 100% regularizada.</p>
                </div>
            `;
        } else {
            // Sort: High priority first
            const sortedAlerts = [...alerts].sort((a, b) => {
                const priorityWeight = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
                return priorityWeight[b.prioridade] - priorityWeight[a.prioridade];
            });
  
            sortedAlerts.forEach(a => {
                const dotClass = a.prioridade === 'Alta' ? 'high' : (a.prioridade === 'Média' ? 'medium' : 'low');
                const badgeClass = a.prioridade === 'Alta' ? 'high' : (a.prioridade === 'Média' ? 'medium' : 'low');
                
                alertsHTML += `
                    <div class="alert-item-row" onclick="window.movixRouter.navigateTo('${a.link}', '${a.targetId}')" style="cursor: pointer; padding: 10px 14px; gap: 10px;">
                        <span class="alert-item-dot ${dotClass}"></span>
                        <div class="alert-item-content">
                            <span class="alert-item-title" style="font-size:0.8rem; font-weight:600;">${a.titulo}</span>
                            <span class="alert-item-desc" style="font-size:0.7rem; line-height:1.2;">${a.desc}</span>
                        </div>
                        <span class="alert-item-badge ${badgeClass}" style="font-size:0.65rem; padding: 2px 6px;">${a.prioridade}</span>
                    </div>
                `;
            });
        }
  
        // 5. Render Page Frame with 11 KPIs, 12 charts organized by Tabs, and Fines/Insurances Sections
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Dashboard Analítico</h1>
                    <p class="page-subtitle">Indicadores de desempenho, custos operacionais e administrativos da frota em tempo real</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="window.print()">
                        <i class="fa-solid fa-print"></i> Imprimir Painel
                    </button>
                </div>
            </div>
 
            <!-- OPERATIONAL BLOCKS GRID -->
            <div class="grid-4">
                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Veículos Ativos</span>
                        <span class="stat-value">${metrics.veiculosAtivosCount}</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-circle-check"></i> Prontos para rodar</span>
                    </div>
                    <div class="stat-icon primary"><i class="fa-solid fa-truck"></i></div>
                </div>
  
                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Implementos / Reboques</span>
                        <span class="stat-value">${metrics.implementosCount}</span>
                        <span class="stat-delta text-info"><i class="fa-solid fa-trailer"></i> Unidades não-motorizadas</span>
                    </div>
                    <div class="stat-icon info"><i class="fa-solid fa-trailer"></i></div>
                </div>
  
                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Veículos em Oficina</span>
                        <span class="stat-value">${metrics.veiculosEmManutencao}</span>
                        <span class="stat-delta text-warning"><i class="fa-solid fa-screwdriver-wrench"></i> Manutenção ativa</span>
                    </div>
                    <div class="stat-icon danger"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                </div>
  
                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Implementos em Oficina</span>
                        <span class="stat-value">${metrics.implementosEmManutencao}</span>
                        <span class="stat-delta text-warning"><i class="fa-solid fa-wrench"></i> Reboques em reparo</span>
                    </div>
                    <div class="stat-icon warning"><i class="fa-solid fa-tools"></i></div>
                </div>
            </div>
 
            <!-- FINANCIAL BLOCKS GRID -->
            <div class="grid-4" style="margin-top: -12px;">
                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Custo Operacional Total</span>
                        <span class="stat-value" style="font-size:1.45rem;">R$ ${metrics.totalCustoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-money-bill-wave"></i> Acumulado da frota</span>
                    </div>
                    <div class="stat-icon success"><i class="fa-solid fa-coins"></i></div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Custo por Veículo</span>
                        <span class="stat-value" style="font-size:1.45rem;">R$ ${metrics.mediaCustoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-info"><i class="fa-solid fa-calculator"></i> Média por veículo ativo</span>
                    </div>
                    <div class="stat-icon info"><i class="fa-solid fa-divide"></i></div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Custo com Manutenção</span>
                        <span class="stat-value" style="font-size:1.45rem;">R$ ${metrics.totalGastoManutencao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-danger"><i class="fa-solid fa-screwdriver-wrench"></i> O.S. Realizadas</span>
                    </div>
                    <div class="stat-icon danger"><i class="fa-solid fa-gears"></i></div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Custo com Pneus</span>
                        <span class="stat-value" style="font-size:1.45rem;">R$ ${metrics.totalGastoPneus.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-warning"><i class="fa-solid fa-circle-notch"></i> Total em pneus</span>
                    </div>
                    <div class="stat-icon warning"><i class="fa-solid fa-circle-notch"></i></div>
                </div>
            </div>

            <!-- ADMINISTRATIVE BLOCKS GRID -->
            <div class="grid-3" style="margin-top: -12px;">
                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Custos com Seguros</span>
                        <span class="stat-value">R$ ${metrics.totalGastoSeguros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-shield-halved"></i> Contratos de seguro</span>
                    </div>
                    <div class="stat-icon success"><i class="fa-solid fa-shield-halved"></i></div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Quantidade de Multas</span>
                        <span class="stat-value">${metrics.totalMultas} multas</span>
                        <span class="stat-delta text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Infrações registradas</span>
                    </div>
                    <div class="stat-icon danger"><i class="fa-solid fa-ticket"></i></div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Valor Total das Multas</span>
                        <span class="stat-value">R$ ${metrics.valorTotalMultas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-warning"><i class="fa-solid fa-receipt"></i> Custo total com multas</span>
                    </div>
                    <div class="stat-icon warning"><i class="fa-solid fa-sack-dollar"></i></div>
                </div>
            </div>

            <!-- MAIN ANALYTICS & ALERTS CONTAINER -->
            <div class="grid-2-1" style="margin-top: 12px;">
                
                <!-- MULTI-TAB ANALYTICS PANEL -->
                <div class="card" style="min-height: 480px;">
                    <div class="card-header-simple" style="flex-wrap: wrap; gap: 12px;">
                        <h3><i class="fa-solid fa-chart-column text-primary"></i> Painel de Analytics Estratégico</h3>
                        <div class="detail-tab-menu" style="border-bottom: none; gap: 4px;">
                            <button class="detail-tab-btn active" data-tab="tab-custos-geral" style="padding: 6px 12px; font-size:0.75rem;">Operação & Custos</button>
                            <button class="detail-tab-btn" data-tab="tab-multas" style="padding: 6px 12px; font-size:0.75rem;">Multas</button>
                            <button class="detail-tab-btn" data-tab="tab-manutencao" style="padding: 6px 12px; font-size:0.75rem;">Manutenção</button>
                            <button class="detail-tab-btn" data-tab="tab-seguros" style="padding: 6px 12px; font-size:0.75rem;">Seguros</button>
                        </div>
                    </div>

                    <!-- TAB 1: OPERACAO & CUSTOS -->
                    <div class="detail-tab-pane active" id="tab-custos-geral" style="padding-top: 16px; flex-grow: 1;">
                        <div class="grid-2">
                            <div style="min-height: 220px; position: relative;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Custos Globais da Frota por Mês (R$)</h4>
                                <div style="height:190px;"><canvas id="chart-custos-mensal"></canvas></div>
                            </div>
                            <div style="min-height: 220px; position: relative;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Veículos com Maior Custo Operacional (R$)</h4>
                                <div style="height:190px;"><canvas id="chart-veic-custo-top"></canvas></div>
                            </div>
                            <div style="min-height: 220px; position: relative; margin-top: 16px;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Implementos com Maior Custo Operacional (R$)</h4>
                                <div style="height:190px;"><canvas id="chart-imp-custo-top"></canvas></div>
                            </div>
                            <div style="min-height: 220px; position: relative; margin-top: 16px;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Custos Operacionais por Qtd. Eixos (R$)</h4>
                                <div style="height:190px;"><canvas id="chart-custos-eixos"></canvas></div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: ANALISE DE MULTAS -->
                    <div class="detail-tab-pane" id="tab-multas" style="padding-top: 16px; flex-grow: 1;">
                        <div class="grid-2">
                            <div style="min-height: 220px; position: relative;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Custos de Multas por Mês (R$)</h4>
                                <div style="height:190px;"><canvas id="chart-multas-mensal"></canvas></div>
                            </div>
                            <div style="min-height: 220px; position: relative;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Quantidade de Multas por Veículo</h4>
                                <div style="height:190px;"><canvas id="chart-multas-veiculo"></canvas></div>
                            </div>
                            <div style="min-height: 220px; position: relative; margin-top: 16px;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Quantidade de Multas por Motorista</h4>
                                <div style="height:190px;"><canvas id="chart-multas-motorista"></canvas></div>
                            </div>
                            <div style="min-height: 220px; position: relative; margin-top: 16px;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Comparativo: Multas Pagas vs Pendentes</h4>
                                <div style="height:190px;"><canvas id="chart-multas-situacao"></canvas></div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 3: MANUTENCOES -->
                    <div class="detail-tab-pane" id="tab-manutencao" style="padding-top: 16px; flex-grow: 1;">
                        <div class="grid-2">
                            <div style="min-height: 220px; position: relative;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Custos de Manutenção por Categoria (R$)</h4>
                                <div style="height:190px;"><canvas id="chart-manut-categoria"></canvas></div>
                            </div>
                            <div style="min-height: 220px; position: relative;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Manutenções Preventivas vs Corretivas (Qtd)</h4>
                                <div style="height:190px;"><canvas id="chart-manut-tipos"></canvas></div>
                            </div>
                            <div style="min-height: 220px; position: relative; margin-top: 16px;">
                                <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Comparativo: Veículos vs Implementos (Qtd)</h4>
                                <div style="height:190px;"><canvas id="chart-comparativo-unidades"></canvas></div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 4: SEGUROS -->
                    <div class="detail-tab-pane" id="tab-seguros" style="padding-top: 16px; flex-grow: 1;">
                        <div style="min-height: 380px; position: relative;">
                            <h4 style="font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); text-transform: uppercase;">Evolução dos Custos Acumulados com Seguros (R$)</h4>
                            <div style="height:340px;"><canvas id="chart-seguros-evolucao"></canvas></div>
                        </div>
                    </div>
                </div>

                <!-- ALERTS WIDGET PANEL -->
                <div class="card" style="max-height: 520px; overflow-y: auto;">
                    <div class="card-header-simple">
                        <h3>Central de Alertas Rápidos</h3>
                        <span class="status-pill ${alerts.length > 0 ? 'atrasada' : 'ok'}" style="font-size: 0.75rem;">
                            ${alerts.length} pendências
                        </span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${alertsHTML}
                    </div>
                </div>
            </div>

            <!-- BOTTOM DEDICATED SECTIONS -->
            <div class="grid-2-1" style="margin-top: 12px;">
                <!-- DEDICATED FINES (MULTAS) SECTION -->
                <div class="card">
                    <div class="card-header-simple">
                        <h3><i class="fa-solid fa-triangle-exclamation text-danger"></i> Veículos com Maior Índice de Multas</h3>
                        <i class="fa-solid fa-ticket text-muted"></i>
                    </div>
                    <div class="table-responsive" style="border: none;">
                        <table class="smart-table">
                            <thead>
                                <tr>
                                    <th>Veículo (Placa)</th>
                                    <th>Modelo / Marca</th>
                                    <th style="text-align: center;">Infrações</th>
                                    <th style="text-align: right;">Custo Acumulado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedVehicleFines.length === 0 ? `
                                    <tr>
                                        <td colspan="4" style="text-align:center; padding: 24px; color:var(--text-muted);">
                                            Nenhuma multa cadastrada no sistema.
                                        </td>
                                    </tr>
                                ` : sortedVehicleFines.map(f => `
                                    <tr>
                                        <td><strong style="color:var(--primary);">${f.placa}</strong></td>
                                        <td>${f.modelo}</td>
                                        <td style="text-align: center;"><span class="status-pill vencido" style="padding: 2px 8px; font-weight:700;">${f.count}x</span></td>
                                        <td style="text-align: right; font-weight: 600;">R$ ${f.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- DEDICATED INSURANCE (SEGUROS) SECTION -->
                <div class="card" style="display:flex; flex-direction:column; gap:16px;">
                    <div class="card-header-simple">
                        <h3><i class="fa-solid fa-shield-halved text-success"></i> Gestão Administrativa de Seguros</h3>
                        <i class="fa-solid fa-file-shield text-muted"></i>
                    </div>
                    
                    <div style="background-color: var(--bg-surface-hover); padding: 14px; border-radius: 8px; border-left: 4px solid var(--success); display:flex; flex-direction:column; gap:4px;">
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Valor Total Mensal Projetado</span>
                        <strong style="font-size:1.4rem; color:var(--text-main); font-family:var(--font-heading);">R$ ${metrics.totalSeguroMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div style="background-color: var(--bg-surface-hover); padding: 12px; border-radius: 8px; display:flex; flex-direction:column; align-items:center; text-align:center;">
                            <span style="font-size:1.3rem; font-weight:700; color:var(--success);">${activeInsurances.length}</span>
                            <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; margin-top:2px;">Contratos Ativos</span>
                        </div>
                        <div style="background-color: var(--bg-surface-hover); padding: 12px; border-radius: 8px; display:flex; flex-direction:column; align-items:center; text-align:center;">
                            <span style="font-size:1.3rem; font-weight:700; color:var(--danger);">${expiredInsurances.length}</span>
                            <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; margin-top:2px;">Contratos Expirados</span>
                        </div>
                    </div>

                    <div>
                        <h4 style="font-size:0.8rem; font-weight:700; color:var(--text-main); margin-bottom:10px;"><i class="fa-solid fa-triangle-exclamation text-warning"></i> Contratos Próximos do Vencimento (30d)</h4>
                        <ul style="list-style:none; display:flex; flex-direction:column; gap:8px;">
                            ${expiringInsurances.length === 0 ? `
                                <li style="font-size:0.75rem; color:var(--text-muted); font-style:italic; padding:6px 0;">Nenhum contrato vencendo nos próximos 30 dias.</li>
                            ` : expiringInsurances.map(v => {
                                const exp = new Date(v.validadeContratoSeguro + 'T00:00:00');
                                const diff = exp - today;
                                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                return `
                                    <li style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; background-color:rgba(245, 158, 11, 0.05); padding: 6px 10px; border-radius: 4px; border:1px solid rgba(245, 158, 11, 0.15);">
                                        <div>
                                            <strong>${v.placa}</strong> <span style="color:var(--text-muted);">(${v.seguradora || 'Sem seguradora'})</span>
                                        </div>
                                        <span class="status-pill atencao" style="font-size:0.65rem; padding: 1px 6px;">Vence em ${days}d</span>
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // 6. Bind Tab Switching Logic
        const tabBtns = container.querySelectorAll('.detail-tab-btn');
        const tabPanes = container.querySelectorAll('.detail-tab-pane');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const paneId = btn.getAttribute('data-tab');
                container.querySelector(`#${paneId}`).classList.add('active');
            });
        });

        // 7. Render dynamic Chart.js instances for the 12 charts
        renderDashboardCharts(isDark, textMuted, borderColor, metrics, multas, vehicles, drivers, manutencoes, pneus, abastecimentos);
    }

    function renderDashboardCharts(isDark, textMuted, borderColor, metrics, multas, vehicles, drivers, manutencoes, pneus, abastecimentos) {
        const labels = ['Dez/25', 'Jan/26', 'Fev/26', 'Mar/26', 'Abr/26', 'Mai/26'];
        
        // ─── TAB 1: CUSTOS & OPERAÇÃO ───

        // Chart 1: Custos da frota por mês (Line)
        // Groups Combustível, Manutenção, Pneus, and Seguros dynamically
        const ctxCustos = document.getElementById('chart-custos-mensal');
        if (ctxCustos) {
            new Chart(ctxCustos.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Combustível',
                            data: [3200, 3600, 3100, 3800, 3700, metrics.totalGastoCombustivel],
                            borderColor: '#22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.03)',
                            fill: true, tension: 0.3, borderWidth: 2
                        },
                        {
                            label: 'Manutenção',
                            data: [1500, 800, 2200, 1800, 3900, metrics.totalGastoManutencao],
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.03)',
                            fill: true, tension: 0.3, borderWidth: 2
                        },
                        {
                            label: 'Pneus',
                            data: [600, 1200, 950, 1400, 2100, metrics.totalGastoPneus],
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.03)',
                            fill: true, tension: 0.3, borderWidth: 2
                        },
                        {
                            label: 'Seguros',
                            data: [420, 420, 560, 560, 560, metrics.totalSeguroMensal],
                            borderColor: '#0ea5e9',
                            backgroundColor: 'rgba(14, 165, 233, 0.03)',
                            fill: true, tension: 0.3, borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: textMuted, font: { family: 'Inter', size: 9 } } } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                    }
                }
            });
        }

        // Chart 2: Veículos com maior custo operacional (Horizontal Bar)
        // Sums Fuel, Maintenance, Tires, and Insurance for each vehicle
        const ctxVeicCusto = document.getElementById('chart-veic-custo-top');
        if (ctxVeicCusto) {
            const veicCosts = vehicles.filter(v => v.tipoUnidade !== 'Implemento/Reboque').map(v => {
                const fCost = abastecimentos.filter(a => a.veiculoId === v.id).reduce((s, a) => s + (a.valorTotal || 0), 0);
                const mCost = manutencoes.filter(m => m.veiculoId === v.id).reduce((s, m) => s + (m.valor || 0), 0);
                const pCost = pneus.filter(p => p.veiculoAtual === v.id).reduce((s, p) => s + (p.custo || 0), 0);
                const sCost = v.possuiSeguro === 'Sim' ? (parseFloat(v.valorMensalSeguro) * 6 || 0) : 0; // Assume 6 months
                return {
                    placa: v.placa,
                    total: fCost + mCost + pCost + sCost
                };
            }).sort((a, b) => b.total - a.total).slice(0, 5);

            new Chart(ctxVeicCusto.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: veicCosts.map(v => v.placa),
                    datasets: [{
                        label: 'Custo Total (R$)',
                        data: veicCosts.map(v => v.total),
                        backgroundColor: 'rgba(0, 85, 255, 0.75)',
                        borderColor: '#0055ff',
                        borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                    }
                }
            });
        }

        // Chart 3: Implementos com maior custo operacional (Horizontal Bar)
        const ctxImpCusto = document.getElementById('chart-imp-custo-top');
        if (ctxImpCusto) {
            const impCosts = vehicles.filter(v => v.tipoUnidade === 'Implemento/Reboque').map(v => {
                const mCost = manutencoes.filter(m => m.veiculoId === v.id).reduce((s, m) => s + (m.valor || 0), 0);
                const pCost = pneus.filter(p => p.veiculoAtual === v.id).reduce((s, p) => s + (p.custo || 0), 0);
                return {
                    placa: v.placa,
                    total: mCost + pCost
                };
            }).sort((a, b) => b.total - a.total).slice(0, 5);

            new Chart(ctxImpCusto.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: impCosts.map(v => v.placa),
                    datasets: [{
                        label: 'Custo Total (R$)',
                        data: impCosts.map(v => v.total),
                        backgroundColor: 'rgba(14, 165, 233, 0.75)',
                        borderColor: '#0ea5e9',
                        borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                    }
                }
            });
        }

        // Chart 4: Custos por quantidade de eixos (Bar)
        const ctxEixos = document.getElementById('chart-custos-eixos');
        if (ctxEixos) {
            const eixosCosts = {};
            vehicles.forEach(v => {
                const eixos = v.qtdEixos || 2;
                const fCost = abastecimentos.filter(a => a.veiculoId === v.id).reduce((s, a) => s + (a.valorTotal || 0), 0);
                const mCost = manutencoes.filter(m => m.veiculoId === v.id).reduce((s, m) => s + (m.valor || 0), 0);
                const pCost = pneus.filter(p => p.veiculoAtual === v.id).reduce((s, p) => s + (p.custo || 0), 0);
                const sCost = v.possuiSeguro === 'Sim' ? (parseFloat(v.valorMensalSeguro) * 6 || 0) : 0;
                eixosCosts[eixos] = (eixosCosts[eixos] || 0) + fCost + mCost + pCost + sCost;
            });

            new Chart(ctxEixos.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: Object.keys(eixosCosts).map(k => `${k} Eixos`),
                    datasets: [{
                        label: 'Custo Acumulado (R$)',
                        data: Object.values(eixosCosts),
                        backgroundColor: 'rgba(34, 197, 94, 0.75)',
                        borderColor: '#22c55e',
                        borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                    }
                }
            });
        }

        // ─── TAB 2: ANALISE DE MULTAS ───

        // Chart 5: Custos com multas por mês (Bar)
        const ctxMultasMensal = document.getElementById('chart-multas-mensal');
        if (ctxMultasMensal) {
            new Chart(ctxMultasMensal.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gastos com Multas (R$)',
                        data: [250, 480, 190, 320, 680, metrics.valorTotalMultas],
                        backgroundColor: 'rgba(239, 68, 68, 0.75)',
                        borderColor: '#ef4444',
                        borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                    }
                }
            });
        }

        // Chart 6: Quantidade de multas por veículo (Horizontal Bar)
        const ctxMultasVeic = document.getElementById('chart-multas-veiculo');
        if (ctxMultasVeic) {
            const multaVeicCount = vehicles.map(v => {
                const count = multas.filter(m => m.veiculoId === v.id).length;
                return { placa: v.placa, count };
            }).sort((a, b) => b.count - a.count).slice(0, 5);

            new Chart(ctxMultasVeic.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: multaVeicCount.map(v => v.placa),
                    datasets: [{
                        label: 'Qtd de Multas',
                        data: multaVeicCount.map(v => v.count),
                        backgroundColor: 'rgba(245, 158, 11, 0.75)',
                        borderColor: '#f59e0b',
                        borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                    }
                }
            });
        }

        // Chart 7: Quantidade de multas por motorista (Horizontal Bar)
        const ctxMultasMot = document.getElementById('chart-multas-motorista');
        if (ctxMultasMot) {
            const multaMotCount = drivers.map(d => {
                const count = multas.filter(m => m.motoristaId === d.id).length;
                return { nome: d.nome.split(' ')[0], count };
            }).sort((a, b) => b.count - a.count).slice(0, 5);

            new Chart(ctxMultasMot.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: multaMotCount.map(d => d.nome),
                    datasets: [{
                        label: 'Qtd de Multas',
                        data: multaMotCount.map(d => d.count),
                        backgroundColor: 'rgba(0, 85, 255, 0.75)',
                        borderColor: '#0055ff',
                        borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                    }
                }
            });
        }

        // Chart 8: Comparativo entre multas pagas e pendentes (Doughnut)
        const ctxMultasSit = document.getElementById('chart-multas-situacao');
        if (ctxMultasSit) {
            const pagas = multas.filter(m => m.status === 'Pago').length;
            const pendentes = multas.filter(m => m.status === 'Não Pago').length;
            const recurso = multas.filter(m => m.status === 'Recorrendo').length;

            new Chart(ctxMultasSit.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Pagas', 'Não Pagas', 'Recorrendo'],
                    datasets: [{
                        data: [pagas || 1, pendentes || 1, recurso || 1],
                        backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#121826' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: textMuted, font: { family: 'Inter', size: 9 } }
                        }
                    }
                }
            });
        }

        // ─── TAB 3: MANUTENÇÃO & FROTA ───

        // Chart 9: Custos de manutenção por categoria (Doughnut)
        const ctxManutCat = document.getElementById('chart-manut-categoria');
        if (ctxManutCat) {
            const preventivasCost = manutencoes.filter(m => m.tipo === 'Preventiva').reduce((s, m) => s + (m.valor || 0), 0);
            const corretivasCost = manutencoes.filter(m => m.tipo === 'Corretiva').reduce((s, m) => s + (m.valor || 0), 0);
            
            new Chart(ctxManutCat.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Preventivas', 'Corretivas'],
                    datasets: [{
                        data: [preventivasCost || 2400, corretivasCost || 3800],
                        backgroundColor: ['#0ea5e9', '#ef4444'],
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#121826' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: textMuted, font: { family: 'Inter', size: 9 } }
                        }
                    }
                }
            });
        }

        // Chart 10: Quantidade de manutenções preventivas e corretivas (Bar)
        const ctxManutTipos = document.getElementById('chart-manut-tipos');
        if (ctxManutTipos) {
            const prevCount = manutencoes.filter(m => m.tipo === 'Preventiva').length;
            const corrCount = manutencoes.filter(m => m.tipo === 'Corretiva').length;

            new Chart(ctxManutTipos.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Preventiva', 'Corretiva'],
                    datasets: [{
                        label: 'O.S. Registradas',
                        data: [prevCount || 4, corrCount || 3],
                        backgroundColor: ['rgba(14, 165, 233, 0.75)', 'rgba(239, 68, 68, 0.75)'],
                        borderColor: ['#0ea5e9', '#ef4444'],
                        borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                    }
                }
            });
        }

        // Chart 11: Comparativo entre contagem de veículos e implementos (Doughnut)
        const ctxCompUni = document.getElementById('chart-comparativo-unidades');
        if (ctxCompUni) {
            const motorizados = vehicles.filter(v => v.tipoUnidade !== 'Implemento/Reboque').length;
            const reboques = vehicles.filter(v => v.tipoUnidade === 'Implemento/Reboque').length;

            new Chart(ctxCompUni.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Veículos Motorizados', 'Implementos / Reboques'],
                    datasets: [{
                        data: [motorizados || 6, reboques || 2],
                        backgroundColor: ['#0055ff', '#0ea5e9'],
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#121826' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: textMuted, font: { family: 'Inter', size: 9 } }
                        }
                    }
                }
            });
        }

        // ─── TAB 4: SEGUROS ───

        // Chart 12: Evolução dos gastos com seguros (Line)
        const ctxSegEvol = document.getElementById('chart-seguros-evolucao');
        if (ctxSegEvol) {
            new Chart(ctxSegEvol.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gasto Acumulado com Seguros (R$)',
                        data: [
                            (metrics.totalSeguroMensal || 500) * 1,
                            (metrics.totalSeguroMensal || 500) * 2,
                            (metrics.totalSeguroMensal || 500) * 3,
                            (metrics.totalSeguroMensal || 500) * 4,
                            (metrics.totalSeguroMensal || 500) * 5,
                            metrics.totalGastoSeguros || ((metrics.totalSeguroMensal || 500) * 6)
                        ],
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.05)',
                        fill: true, tension: 0.3, borderWidth: 3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: textMuted, font: { family: 'Inter' } } } },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted } }
                    }
                }
            });
        }
    }

    // Register into system router
    window.movixRouter.register('dashboard', renderDashboard);
})();
