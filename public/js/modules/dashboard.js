/* MovixFrota - Redesigned Dashboard Module matching Mockups (Dynamic, Clean & Self-Updating) */

(function() {
    
    // Store active Chart.js instances globally to destroy them on refresh and avoid ghosts
    let costChartInstance = null;
    let finesChartInstance = null;
    let maintChartInstance = null;
    let autoUpdateIntervalId = null;

    function renderDashboard(container) {
        // 1. Render Base Layout Shell
        container.innerHTML = `
            <!-- ROW 1: HEADER -->
            <div class="page-header" style="margin-bottom: 24px;">
                <div class="page-title-group">
                    <h1 class="page-title">Dashboard Analítico</h1>
                    <p class="page-subtitle">Indicadores de desempenho, custos operacionais e administrativos da frota em tempo real</p>
                </div>
            </div>

            <!-- DYNAMIC DASHBOARD WIDGETS CONTENT CONTAINER -->
            <div id="dashboard-dynamic-content-area">
                <!-- Inner dashboard widgets loaded dynamically -->
            </div>
        `;

        // 2. Ensure any background intervals are cleared
        if (autoUpdateIntervalId) {
            clearInterval(autoUpdateIntervalId);
            autoUpdateIntervalId = null;
        }

        // 3. Load fresh data from API server on route entry and refresh the view
        window.movixStore.loadData().then(() => {
            refreshDashboard();
        });
    }

    function refreshDashboard() {
        const contentArea = document.getElementById('dashboard-dynamic-content-area');
        if (!contentArea) return;

        // Fetch core data and metrics dynamically from store
        const metrics = window.movixStore.getMetrics();
        const alerts = window.movixStore.getAlerts();
        const multas = window.movixStore.getMultas();
        const vehicles = window.movixStore.getVeiculos();
        const motoristas = window.movixStore.getMotoristas();
        const abastecimentos = window.movixStore.getAbastecimentos();
        const manutencoes = window.movixStore.getMaintenances();
        const pneus = window.movixStore.getPneus();

        // Color theme helpers for Chart.js
        const isDark = document.body.classList.contains('theme-dark');
        const textMuted = isDark ? '#9ca3af' : '#64748b';
        const borderColor = isDark ? '#1f293d' : '#e2e8f0';

        // 1. CALCULATE CORE METRICS DIRECTLY FROM ACTIVE DATABASE DATA VIA STORE METRICS
        const totalFuelSpent = metrics.totalGastoCombustivel;
        const totalMaintSpent = metrics.totalGastoManutencao;
        const tireCost = metrics.totalGastoPneus;
        const insuranceCost = metrics.totalGastoSeguros;
        const trackerCost = metrics.totalGastoRastreamento;
        const totalCustoVal = metrics.totalCustoOperacional;

        // Active vehicles, motoristas, O.S. and multas
        const vAtivos = metrics.veiculosAtivosCount;
        const implCount = metrics.implementosCount;
        const motCount = motoristas.length;
        const emManutCount = metrics.veiculosEmManutencao;
        const multasRegCount = metrics.totalMultas;



        // Averages
        const dailyAverage = totalCustoVal / 30;
        const monthlyProjection = dailyAverage * 30;

        // Fines categories count
        const paidFines = multas.filter(m => m.status === 'Pago').length;
        const pendingFines = multas.filter(m => m.status === 'Não Pago').length;
        const resourceFines = multas.filter(m => m.status === 'Recorrendo').length;
        const totalFines = paidFines + pendingFines + resourceFines;

        const paidPercent = totalFines > 0 ? ((paidFines / totalFines) * 100).toFixed(1) : '0.0';
        const pendingPercent = totalFines > 0 ? ((pendingFines / totalFines) * 100).toFixed(1) : '0.0';
        const resourcePercent = totalFines > 0 ? ((resourceFines / totalFines) * 100).toFixed(1) : '0.0';

        // Fuel consumption indicators
        const totalFuelLiters = abastecimentos.reduce((acc, a) => acc + (a.litros || 0), 0);
        const validKmlItems = abastecimentos.filter(a => a.kmL > 0);
        const avgKml = metrics.mediaKMLGeral || 0;

        // Maintenances types
        const maintPreventivas = manutencoes.filter(m => m.tipo === 'Preventiva').length;
        const maintCorretivas = manutencoes.filter(m => m.tipo === 'Corretiva').length;
        const maintTotal = maintPreventivas + maintCorretivas;
        const maintPreventivasPercent = maintTotal > 0 ? Math.round((maintPreventivas / maintTotal) * 100) : 0;
        const maintCorretivasPercent = maintTotal > 0 ? Math.round((maintCorretivas / maintTotal) * 100) : 0;

        const maintAtrasadasCount = manutencoes.filter(m => m.status === 'Atrasada' || m.status === 'Pendente').length;
        const maintProx7diasCount = manutencoes.filter(m => {
            if (!m.data) return false;
            const d = new Date(m.data + 'T00:00:00');
            const today = new Date();
            const diff = (d - today) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 7;
        }).length;

        // DYNAMIC FUEL CONSUMPTION RANKINGS FROM STORE
        const vehicleConsumption = {};
        abastecimentos.forEach(a => {
            if (a.veiculoId && a.kmL > 0) {
                if (!vehicleConsumption[a.veiculoId]) {
                    vehicleConsumption[a.veiculoId] = { sum: 0, count: 0 };
                }
                vehicleConsumption[a.veiculoId].sum += a.kmL;
                vehicleConsumption[a.veiculoId].count++;
            }
        });
        const sortedVehiclesCons = Object.entries(vehicleConsumption).map(([vId, data]) => {
            const vObj = vehicles.find(item => item.id === vId);
            return {
                name: vObj ? vObj.placa : 'Veículo',
                avg: data.sum / data.count
            };
        }).sort((a, b) => a.avg - b.avg); // Lowest km/l first

        const driverConsumption = {};
        abastecimentos.forEach(a => {
            if (a.motoristaId && a.kmL > 0) {
                if (!driverConsumption[a.motoristaId]) {
                    driverConsumption[a.motoristaId] = { sum: 0, count: 0 };
                }
                driverConsumption[a.motoristaId].sum += a.kmL;
                driverConsumption[a.motoristaId].count++;
            }
        });
        const sortedDriversCons = Object.entries(driverConsumption).map(([dId, data]) => {
            const dObj = motoristas.find(item => item.id === dId);
            return {
                name: dObj ? dObj.nome : 'Motorista',
                avg: data.sum / data.count
            };
        }).sort((a, b) => a.avg - b.avg); // Lowest km/l first

        // Render fuel vehicles ranking HTML
        let vehiclesRankHTML = '';
        if (sortedVehiclesCons.length === 0) {
            vehiclesRankHTML = `<div style="font-size:0.75rem; color:var(--text-muted); padding:8px 0;">Nenhum abastecimento registrado.</div>`;
        } else {
            for (let i = 0; i < Math.min(3, sortedVehiclesCons.length); i++) {
                const item = sortedVehiclesCons[i];
                const barWidth = Math.min(100, Math.round((item.avg / 15) * 100)) || 50;
                vehiclesRankHTML += `
                    <div class="horizontal-progress-item">
                        <div class="horizontal-progress-meta">
                            <span class="horizontal-progress-name">${item.name}</span>
                            <span class="horizontal-progress-val">${item.avg.toFixed(1)} KM/L</span>
                        </div>
                        <div class="horizontal-progress-track">
                            <div class="horizontal-progress-bar blue" style="width: ${barWidth}%;"></div>
                        </div>
                    </div>
                `;
            }
        }

        // Render fuel drivers ranking HTML
        let driversRankHTML = '';
        if (sortedDriversCons.length === 0) {
            driversRankHTML = `<div style="font-size:0.75rem; color:var(--text-muted); padding:8px 0;">Nenhum abastecimento registrado.</div>`;
        } else {
            for (let i = 0; i < Math.min(3, sortedDriversCons.length); i++) {
                const item = sortedDriversCons[i];
                const barWidth = Math.min(100, Math.round((item.avg / 15) * 100)) || 50;
                driversRankHTML += `
                    <div class="horizontal-progress-item">
                        <div class="horizontal-progress-meta">
                            <span class="horizontal-progress-name">${item.name}</span>
                            <span class="horizontal-progress-val">${item.avg.toFixed(1)} KM/L</span>
                        </div>
                        <div class="horizontal-progress-track">
                            <div class="horizontal-progress-bar grey" style="width: ${barWidth}%;"></div>
                        </div>
                    </div>
                `;
            }
        }

        // DYNAMIC TOP 5 VEHICLES BY OPERATIONAL COST
        const vehicleCosts = {};
        abastecimentos.forEach(a => {
            if (a.veiculoId) {
                vehicleCosts[a.veiculoId] = (vehicleCosts[a.veiculoId] || 0) + (a.valorTotal || 0);
            }
        });
        manutencoes.forEach(m => {
            if (m.veiculoId) {
                vehicleCosts[m.veiculoId] = (vehicleCosts[m.veiculoId] || 0) + (m.valor || 0);
            }
        });
        const sortedVehicleCosts = Object.entries(vehicleCosts).map(([vId, cost]) => {
            const vObj = vehicles.find(item => item.id === vId);
            return {
                name: vObj ? `${vObj.placa} (${vObj.marca} ${vObj.modelo})` : 'Veículo',
                cost: cost
            };
        }).sort((a, b) => b.cost - a.cost);

        let vehicleCostsRankHTML = '';
        if (sortedVehicleCosts.length === 0) {
            vehicleCostsRankHTML = `<div style="font-size:0.75rem; color:var(--text-muted); padding:16px; text-align:center;">Nenhum custo operacional registrado no sistema.</div>`;
        } else {
            const maxCost = sortedVehicleCosts[0] ? sortedVehicleCosts[0].cost : 1;
            for (let i = 0; i < Math.min(5, sortedVehicleCosts.length); i++) {
                const item = sortedVehicleCosts[i];
                const barWidth = maxCost > 0 ? Math.round((item.cost / maxCost) * 100) : 50;
                vehicleCostsRankHTML += `
                    <div class="horizontal-progress-item">
                        <div class="horizontal-progress-meta">
                            <span class="horizontal-progress-name">${i + 1}. ${item.name}</span>
                            <span class="horizontal-progress-val">R$ ${item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div class="horizontal-progress-track">
                            <div class="horizontal-progress-bar red" style="width: ${barWidth}%;"></div>
                        </div>
                    </div>
                `;
            }
        }

        // Compile alerts vertical list HTML
        let alertsHTML = '';
        if (alerts.length === 0) {
            alertsHTML = `
                <div class="search-no-results" style="padding: 32px;">
                    <i class="fa-solid fa-circle-check text-success" style="font-size: 2rem; margin-bottom: 12px;"></i>
                    <p style="font-weight: 500;">Nenhum alerta ativo! Sua frota está 100% regularizada.</p>
                </div>
            `;
        } else {
            const sortedAlerts = [...alerts].sort((a, b) => {
                const priorityWeight = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
                return priorityWeight[b.prioridade] - priorityWeight[a.prioridade];
            });

            sortedAlerts.forEach(a => {
                const dotClass = a.prioridade === 'Alta' ? 'high' : (a.prioridade === 'Média' ? 'medium' : 'low');
                const badgeClass = a.prioridade === 'Alta' ? 'high' : (a.prioridade === 'Média' ? 'medium' : 'low');
                
                alertsHTML += `
                    <div class="alert-item-row" onclick="window.movixRouter.navigateTo('${a.link}', '${a.targetId}')" style="cursor: pointer; margin-bottom: 2px;">
                        <span class="alert-item-dot ${dotClass}"></span>
                        <div class="alert-item-content">
                            <span class="alert-item-title">${a.titulo}</span>
                            <span class="alert-item-desc">${a.desc}</span>
                        </div>
                        <span class="alert-item-badge ${badgeClass}">${a.prioridade}</span>
                    </div>
                `;
            });
        }

        // Dynamic Calculations for Module Cards (Seguros, Rastreadores, Extintores)
        const actSeguros = vehicles.filter(v => v.possuiSeguro === 'Sim' && v.status !== 'inativo').length;
        const expiringSeguros = vehicles.filter(v => {
            if (v.possuiSeguro !== 'Sim' || !v.validadeContratoSeguro) return false;
            const d = new Date(v.validadeContratoSeguro + 'T23:59:59');
            const diff = d - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 30;
        }).length;
        const expiredSeguros = vehicles.filter(v => {
            if (v.possuiSeguro !== 'Sim' || !v.validadeContratoSeguro) return false;
            const d = new Date(v.validadeContratoSeguro + 'T23:59:59');
            return d < new Date();
        }).length;

        const countComRastreador = vehicles.filter(v => v.possuiRastreador === 'Sim').length;
        const countSemRastreador = vehicles.filter(v => v.possuiRastreador !== 'Sim').length;
        const countRastreadorInativo = vehicles.filter(v => v.possuiRastreador === 'Sim' && v.statusRastreador === 'Inativo').length;

        const extRegulares = vehicles.filter(v => {
            if (v.tipoUnidade === 'Implemento/Reboque') return false;
            if (v.possuiExtintor !== 'Sim') return false;
            if (!v.validadeExtintor) return true;
            const d = new Date(v.validadeExtintor + 'T23:59:59');
            return d >= new Date();
        }).length;
        const extProxValidade = vehicles.filter(v => {
            if (v.possuiExtintor !== 'Sim' || !v.validadeExtintor) return false;
            const d = new Date(v.validadeExtintor + 'T23:59:59');
            const diff = d - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 30;
        }).length;
        const extVencidos = vehicles.filter(v => {
            if (v.possuiExtintor === 'Sim' && v.validadeExtintor) {
                const d = new Date(v.validadeExtintor + 'T23:59:59');
                return d < new Date();
            }
            return false;
        }).length;
        const extProxRecargas = vehicles.filter(v => {
            if (v.possuiExtintor !== 'Sim' || !v.proximaRecargaExtintor) return false;
            const d = new Date(v.proximaRecargaExtintor + 'T23:59:59');
            const diff = d - new Date();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 15;
        }).length;

        // Dynamic Calculations for Categories Costs percentages
        const totalCatSum = totalFuelSpent + totalMaintSpent + tireCost + insuranceCost + trackerCost;
        const fuelPercent = totalCatSum > 0 ? Math.round((totalFuelSpent / totalCatSum) * 100) : 0;
        const maintPercent = totalCatSum > 0 ? Math.round((totalMaintSpent / totalCatSum) * 100) : 0;
        const tirePercent = totalCatSum > 0 ? Math.round((tireCost / totalCatSum) * 100) : 0;
        const insurancePercent = totalCatSum > 0 ? Math.round((insuranceCost / totalCatSum) * 100) : 0;
        const trackerPercent = totalCatSum > 0 ? Math.round((trackerCost / totalCatSum) * 100) : 0;

        // Dynamic recent activities compilation from real system logs
        const recentLogs = (window.movixStore.state.logs || []).slice(0, 5);
        let activitiesHTML = '';
        if (recentLogs.length === 0) {
            activitiesHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 24px; color:var(--text-muted);">
                        Nenhuma atividade recente registrada.
                    </td>
                </tr>
            `;
        } else {
            recentLogs.forEach(log => {
                let iconClass = 'fa-solid fa-circle-info text-primary';
                if (log.entidade === 'Abastecimento') iconClass = 'fa-solid fa-gas-pump text-success';
                else if (log.entidade === 'Manutenção') iconClass = 'fa-solid fa-screwdriver-wrench text-warning';
                else if (log.entidade === 'Multa') iconClass = 'fa-solid fa-ticket text-danger';
                else if (log.entidade === 'Seguro') iconClass = 'fa-solid fa-shield-halved text-success';
                else if (log.entidade === 'Rastreador') iconClass = 'fa-solid fa-tower-broadcast text-secondary';

                // Format Time helper
                const dateObj = new Date(log.data);
                const timeStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                activitiesHTML += `
                    <tr>
                        <td style="padding: 10px 12px;"><i class="${iconClass}"></i></td>
                        <td style="padding: 10px 12px; font-weight: 600;">${log.acao} de ${log.entidade}</td>
                        <td style="padding: 10px 12px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.detalhes}</td>
                        <td style="padding: 10px 12px;">${log.usuario}</td>
                        <td style="padding: 10px 12px; color: var(--text-muted);">${timeStr}</td>
                    </tr>
                `;
            });
        }

        // Render Dynamic Widgets HTML Layout
        contentArea.innerHTML = `
            <!-- ROW 2: Grid of 6 KPI Cards -->
            <div class="grid-6" style="margin-bottom: 24px;">
                <!-- 1. Veículos Ativos -->
                <div class="card stat-card">
                    <div class="stat-icon primary"><i class="fa-solid fa-truck"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Veículos Ativos</span>
                        <span class="stat-value">${vAtivos}</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-arrow-trend-up"></i> Ativos</span>
                    </div>
                </div>

                <!-- 2. Implementos -->
                <div class="card stat-card">
                    <div class="stat-icon" style="background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6;"><i class="fa-solid fa-trailer"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Implementos</span>
                        <span class="stat-value">${implCount}</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-arrow-trend-up"></i> Reboques</span>
                    </div>
                </div>

                <!-- 3. Motoristas -->
                <div class="card stat-card">
                    <div class="stat-icon success"><i class="fa-solid fa-user"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Motoristas</span>
                        <span class="stat-value">${motCount}</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-arrow-trend-up"></i> Cadastrados</span>
                    </div>
                </div>

                <!-- 4. Em Manutenção -->
                <div class="card stat-card">
                    <div class="stat-icon danger"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Em Oficina</span>
                        <span class="stat-value">${emManutCount}</span>
                        <span class="stat-delta text-danger"><i class="fa-solid fa-arrow-trend-up"></i> Sob Reparo</span>
                    </div>
                </div>

                <!-- 5. Multas Pendentes -->
                <div class="card stat-card">
                    <div class="stat-icon warning"><i class="fa-solid fa-file-invoice"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Multas Registradas</span>
                        <span class="stat-value">${multasRegCount}</span>
                        <span class="stat-delta text-warning"><i class="fa-solid fa-arrow-trend-up"></i> Infrações</span>
                    </div>
                </div>

                <!-- 6. Custo Operacional -->
                <div class="card stat-card">
                    <div class="stat-icon success"><i class="fa-solid fa-sack-dollar"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Custo Operacional</span>
                        <span class="stat-value" style="font-size: 1.15rem; font-weight: 800;">R$ ${totalCustoVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-arrow-trend-down"></i> Acumulado</span>
                    </div>
                </div>
            </div>

            <!-- ROW 3: Grid of 3 Cards (Costs, Financial Summary, Traffic Fines) -->
            <div class="grid-3" style="margin-bottom: 24px;">
                <!-- 1. Evolução de Custos (R$) -->
                <div class="card" style="min-height: 340px;">
                    <div class="card-header-simple">
                        <h3>Evolução de Custos (R$)</h3>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">
                            <span class="badge badge-secondary" style="border: 1px solid var(--border-color); padding: 4px 8px; border-radius: var(--border-radius-xs);">Últimos 6 meses</span>
                        </div>
                    </div>
                    <div style="flex-grow: 1; position: relative;">
                        <canvas id="costChartRedesign"></canvas>
                    </div>
                </div>

                <!-- 2. Resumo Financeiro (Mês) -->
                <div class="card" style="min-height: 340px;">
                    <div class="card-header-simple">
                        <h3>Resumo Financeiro (Mês)</h3>
                        <i class="fa-solid fa-chart-line text-muted"></i>
                    </div>
                    <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; gap: 20px; padding: 10px 0;">
                        <!-- Gasto Principal -->
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div class="stat-icon success" style="width:46px; height:46px; font-size: 1.2rem; border-radius: 50%;"><i class="fa-solid fa-dollar-sign"></i></div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Gasto</span>
                                <span style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); line-height: 1.1;">R$ ${totalCustoVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        
                        <div style="border-top: 1px dashed var(--border-color); margin: 2px 0;"></div>
                        
                        <!-- Secundary Row -->
                        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                            <!-- Média Diária -->
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div class="stat-icon warning" style="width:36px; height:36px; font-size: 0.95rem; border-radius: 50%;"><i class="fa-solid fa-receipt"></i></div>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Média Diária</span>
                                    <span style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">R$ ${dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            
                            <!-- Projeção Mensal -->
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div class="stat-icon primary" style="width:36px; height:36px; font-size: 0.95rem; border-radius: 50%; background-color: rgba(59, 130, 246, 0.15);"><i class="fa-solid fa-chart-simple"></i></div>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Projeção Mensal</span>
                                    <span style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">R$ ${monthlyProjection.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Multas por Situação -->
                <div class="card" style="min-height: 340px;">
                    <div class="card-header-simple">
                        <h3>Multas por Situação</h3>
                        <a href="#multas" onclick="window.movixRouter.navigateTo('multas')" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">Ver todas</a>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; height: 100%; gap: 12px;">
                        <!-- Canvas area -->
                        <div style="width: 50%; height: 200px; position: relative;">
                            <canvas id="finesRedesignChart"></canvas>
                        </div>
                        <!-- Custom legend side indicators -->
                        <div style="width: 50%; display: flex; flex-direction: column; gap: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--success); display: inline-block;"></span>
                                    <span style="font-weight: 500; color: var(--text-main);">Pagas</span>
                                </div>
                                <span style="font-weight: 700; color: var(--text-main);">${paidFines} (${paidPercent}%)</span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--danger); display: inline-block;"></span>
                                    <span style="font-weight: 500; color: var(--text-main);">Pendentes</span>
                                </div>
                                <span style="font-weight: 700; color: var(--text-main);">${pendingFines} (${pendingPercent}%)</span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--warning); display: inline-block;"></span>
                                    <span style="font-weight: 500; color: var(--text-main);">Em Recurso</span>
                                </div>
                                <span style="font-weight: 700; color: var(--text-main);">${resourceFines} (${resourcePercent}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ROW 4: Grid of 2 Cards (Alerts vs Refuel Performance) -->
            <div class="grid-2-1" style="grid-template-columns: 1.6fr 1fr; margin-bottom: 24px;">
                <!-- 1. Central de Alertas Rápidos -->
                <div class="card" style="height: 380px; display: flex; flex-direction: column;">
                    <div class="card-header-simple">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <h3>Central de Alertas Rápidos</h3>
                            <span class="status-pill atrasada" style="font-size: 0.75rem; padding: 2px 8px; font-weight: 700; border-radius: 4px;">• ${alerts.length} pendências</span>
                        </div>
                        <a href="#veiculos" onclick="window.movixRouter.navigateTo('veiculos')" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">Ver todos</a>
                    </div>
                    <div style="flex-grow: 1; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 8px;">
                        ${alertsHTML}
                    </div>
                </div>

                <!-- 2. Abastecimento (Mês) -->
                <div class="card" style="height: 380px; display: flex; flex-direction: column;">
                    <div class="card-header-simple">
                        <h3>Abastecimento (Mês)</h3>
                        <a href="#abastecimentos" onclick="window.movixRouter.navigateTo('abastecimentos')" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">Ver relatório</a>
                    </div>
                    <!-- Row of 3 stats indicators -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 12px; background-color: var(--bg-surface-hover); padding: 8px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-light);">
                        <!-- L -->
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <div class="stat-icon primary" style="width:22px; height:22px; font-size:0.7rem; border-radius:50%;"><i class="fa-solid fa-gas-pump"></i></div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 0.62rem; color: var(--text-muted); font-weight: 600;">Litros</span>
                                <span style="font-size: 0.75rem; font-weight: 700; color:var(--text-main);">${totalFuelLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</span>
                            </div>
                        </div>
                        <!-- Valor -->
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <div class="stat-icon warning" style="width:22px; height:22px; font-size:0.7rem; border-radius:50%;"><i class="fa-solid fa-calculator"></i></div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 0.62rem; color: var(--text-muted); font-weight: 600;">Total</span>
                                <span style="font-size: 0.75rem; font-weight: 700; color:var(--text-main);">R$ ${totalFuelSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                        <!-- KM/L -->
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <div class="stat-icon success" style="width:22px; height:22px; font-size:0.7rem; border-radius:50%;"><i class="fa-solid fa-gauge-high"></i></div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 0.62rem; color: var(--text-muted); font-weight: 600;">KM/L</span>
                                <span style="font-size: 0.75rem; font-weight: 700; color:var(--text-main);">${avgKml.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Rankings progress bars -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; flex-grow: 1; overflow: hidden;">
                        <!-- Veículos -->
                        <div class="horizontal-progress-list" style="overflow-y: auto;">
                            <span style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); display: block; border-bottom: 1px solid var(--border-light); padding-bottom: 4px; text-transform: uppercase;">Veículos Menor KM/L</span>
                            ${vehiclesRankHTML}
                        </div>

                        <!-- Motoristas -->
                        <div class="horizontal-progress-list" style="overflow-y: auto;">
                            <span style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); display: block; border-bottom: 1px solid var(--border-light); padding-bottom: 4px; text-transform: uppercase;">Motoristas Menor KM/L</span>
                            ${driversRankHTML}
                        </div>
                    </div>
                </div>
            </div>

            <!-- ROW 5: Grid of 5 Modules (Manutenções, Custos Categoria, Seguros, Rastreadores, Extintores) -->
            <div class="grid-5" style="margin-bottom: 24px;">
                <!-- 1. Manutenções -->
                <div class="card" style="min-height: 290px; padding: 16px;">
                    <div class="card-header-simple" style="padding-bottom: 8px; margin-bottom: 4px;">
                        <h3 style="font-size: 0.88rem;">Manutenções</h3>
                        <a href="#manutencoes" onclick="window.movixRouter.navigateTo('manutencoes')" style="font-size: 0.75rem; color: var(--primary); text-decoration: none; font-weight:600;">Ver todas</a>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="height: 110px; width: 100%; position: relative;">
                            <canvas id="maintRedesignChart"></canvas>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.72rem; margin-top: 4px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span><span style="width:6px; height:6px; border-radius:50%; background-color:var(--success); display:inline-block; margin-right:4px;"></span>Preventivas</span>
                                <span style="font-weight:700;">${maintPreventivas} (${maintPreventivasPercent}%)</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span><span style="width:6px; height:6px; border-radius:50%; background-color:var(--danger); display:inline-block; margin-right:4px;"></span>Corretivas</span>
                                <span style="font-weight:700;">${maintCorretivas} (${maintCorretivasPercent}%)</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span><span style="width:6px; height:6px; border-radius:50%; background-color:var(--danger); display:inline-block; margin-right:4px;"></span>Atrasadas</span>
                                <span style="font-weight:700; color:var(--danger);">${maintAtrasadasCount}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span><span style="width:6px; height:6px; border-radius:50%; background-color:var(--warning); display:inline-block; margin-right:4px;"></span>Próximos 7 dias</span>
                                <span style="font-weight:700; color:var(--warning);">${maintProx7diasCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. Custos por Categoria -->
                <div class="card" style="min-height: 290px; padding: 16px;">
                    <div class="card-header-simple" style="padding-bottom: 8px; margin-bottom: 4px;">
                        <h3 style="font-size: 0.88rem;">Custos Categoria</h3>
                        <a href="#relatorios" onclick="window.movixRouter.navigateTo('relatorios')" style="font-size: 0.75rem; color: var(--primary); text-decoration: none; font-weight:600;">Ver relatório</a>
                    </div>
                    <div class="horizontal-progress-list" style="gap: 8px; font-size: 0.7rem;">
                        <!-- Combustível -->
                        <div class="horizontal-progress-item" style="gap: 2px;">
                            <div class="horizontal-progress-meta">
                                <span style="font-weight:600;">Combustível</span>
                                <span style="font-weight:700;">${fuelPercent}% (R$ ${totalFuelSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})</span>
                            </div>
                            <div class="horizontal-progress-track" style="height:6px;">
                                <div class="horizontal-progress-bar blue" style="width: ${fuelPercent}%;"></div>
                            </div>
                        </div>
                        <!-- Manutenção -->
                        <div class="horizontal-progress-item" style="gap: 2px;">
                            <div class="horizontal-progress-meta">
                                <span style="font-weight:600;">Manutenção</span>
                                <span style="font-weight:700;">${maintPercent}% (R$ ${totalMaintSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})</span>
                            </div>
                            <div class="horizontal-progress-track" style="height:6px;">
                                <div class="horizontal-progress-bar green" style="width: ${maintPercent}%;"></div>
                            </div>
                        </div>
                        <!-- Pneus -->
                        <div class="horizontal-progress-item" style="gap: 2px;">
                            <div class="horizontal-progress-meta">
                                <span style="font-weight:600;">Pneus</span>
                                <span style="font-weight:700;">${tirePercent}% (R$ ${tireCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})</span>
                            </div>
                            <div class="horizontal-progress-track" style="height:6px;">
                                <div class="horizontal-progress-bar orange" style="width: ${tirePercent}%;"></div>
                            </div>
                        </div>
                        <!-- Seguros -->
                        <div class="horizontal-progress-item" style="gap: 2px;">
                            <div class="horizontal-progress-meta">
                                <span style="font-weight:600;">Seguros</span>
                                <span style="font-weight:700;">${insurancePercent}% (R$ ${insuranceCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})</span>
                            </div>
                            <div class="horizontal-progress-track" style="height:6px;">
                                <div class="horizontal-progress-bar purple" style="width: ${insurancePercent}%;"></div>
                            </div>
                        </div>
                        <!-- Rastreamento -->
                        <div class="horizontal-progress-item" style="gap: 2px;">
                            <div class="horizontal-progress-meta">
                                <span style="font-weight:600;">Rastreamento</span>
                                <span style="font-weight:700;">${trackerPercent}% (R$ ${trackerCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})</span>
                            </div>
                            <div class="horizontal-progress-track" style="height:6px;">
                                <div class="horizontal-progress-bar teal" style="width: ${trackerPercent}%;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Seguros -->
                <div class="card" style="min-height: 290px; padding: 16px;">
                    <div class="card-header-simple" style="padding-bottom: 8px; margin-bottom: 4px;">
                        <h3 style="font-size: 0.88rem;">Seguros</h3>
                        <a href="#veiculos" onclick="window.movixRouter.navigateTo('veiculos')" style="font-size: 0.75rem; color: var(--primary); text-decoration: none; font-weight:600;">Ver todos</a>
                    </div>
                    <div class="simple-list-widget" style="gap: 12px; font-size: 0.75rem; margin-top: 8px;">
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-shield-halved simple-list-icon green"></i>
                                <span class="simple-list-label">Contratos Ativos</span>
                            </div>
                            <span class="simple-list-value">${actSeguros}</span>
                        </div>
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-triangle-exclamation simple-list-icon orange"></i>
                                <span class="simple-list-label">Vencendo (30d)</span>
                            </div>
                            <span class="simple-list-value" style="color:var(--warning);">${expiringSeguros}</span>
                        </div>
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-circle-xmark simple-list-icon red"></i>
                                <span class="simple-list-label">Vencidos</span>
                            </div>
                            <span class="simple-list-value" style="color:var(--danger);">${expiredSeguros}</span>
                        </div>
                        <div style="background-color: var(--bg-surface-hover); padding: 8px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-light); text-align: center; margin-top: 8px;">
                            <span style="font-size: 0.65rem; color: var(--text-muted); display: block; font-weight: 500;">Mensal Total</span>
                            <span style="font-size: 0.88rem; font-weight: 800; color: var(--text-main);">R$ ${insuranceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <!-- 4. Rastreadores -->
                <div class="card" style="min-height: 290px; padding: 16px;">
                    <div class="card-header-simple" style="padding-bottom: 8px; margin-bottom: 4px;">
                        <h3 style="font-size: 0.88rem;">Rastreadores</h3>
                        <a href="#veiculos" onclick="window.movixRouter.navigateTo('veiculos')" style="font-size: 0.75rem; color: var(--primary); text-decoration: none; font-weight:600;">Ver todos</a>
                    </div>
                    <div class="simple-list-widget" style="gap: 12px; font-size: 0.75rem; margin-top: 8px;">
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-tower-broadcast simple-list-icon blue"></i>
                                <span class="simple-list-label">Com rastreador</span>
                            </div>
                            <span class="simple-list-value">${countComRastreador}</span>
                        </div>
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-slash simple-list-icon grey"></i>
                                <span class="simple-list-label">Sem rastreador</span>
                            </div>
                            <span class="simple-list-value">${countSemRastreador}</span>
                        </div>
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-triangle-exclamation simple-list-icon red"></i>
                                <span class="simple-list-label">Inativos</span>
                            </div>
                            <span class="simple-list-value" style="color:var(--danger);">${countRastreadorInativo}</span>
                        </div>
                        <div style="background-color: var(--bg-surface-hover); padding: 8px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-light); text-align: center; margin-top: 8px;">
                            <span style="font-size: 0.65rem; color: var(--text-muted); display: block; font-weight: 500;">Mensal Total</span>
                            <span style="font-size: 0.88rem; font-weight: 800; color: var(--text-main);">R$ ${trackerCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <!-- 5. Extintores -->
                <div class="card" style="min-height: 290px; padding: 16px;">
                    <div class="card-header-simple" style="padding-bottom: 8px; margin-bottom: 4px;">
                        <h3 style="font-size: 0.88rem;">Extintores</h3>
                        <a href="#veiculos" onclick="window.movixRouter.navigateTo('veiculos')" style="font-size: 0.75rem; color: var(--primary); text-decoration: none; font-weight:600;">Ver todos</a>
                    </div>
                    <div class="simple-list-widget" style="gap: 8px; font-size: 0.72rem; margin-top: 4px;">
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-circle-check simple-list-icon green"></i>
                                <span class="simple-list-label">Regulares</span>
                            </div>
                            <span class="simple-list-value">${extRegulares}</span>
                        </div>
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-triangle-exclamation simple-list-icon orange"></i>
                                <span class="simple-list-label">Próx. validade</span>
                            </div>
                            <span class="simple-list-value" style="color:var(--warning);">${extProxValidade}</span>
                        </div>
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-circle-xmark simple-list-icon red"></i>
                                <span class="simple-list-label">Vencidos</span>
                            </div>
                            <span class="simple-list-value" style="color:var(--danger);">${extVencidos}</span>
                        </div>
                        <div class="simple-list-item">
                            <div class="simple-list-label-group">
                                <i class="fa-solid fa-calendar-days simple-list-icon blue"></i>
                                <span class="simple-list-label">Recargas próx.</span>
                            </div>
                            <span class="simple-list-value">${extProxRecargas}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ROW 6: Recent Audit Logs vs top 5 operational cost vehicles -->
            <div class="grid-2-1" style="grid-template-columns: 1.6fr 1fr; margin-bottom: 24px;">
                <!-- 1. Atividades Recentes -->
                <div class="card" style="min-height: 320px;">
                    <div class="card-header-simple">
                        <h3>Atividades Recentes</h3>
                        <a href="#auditoria" onclick="window.movixRouter.navigateTo('auditoria')" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">Ver todas</a>
                    </div>
                    <div class="table-responsive" style="border: none;">
                        <table class="smart-table">
                            <thead>
                                <tr>
                                    <th style="padding: 8px 12px; font-size: 0.75rem;">Status</th>
                                    <th style="padding: 8px 12px; font-size: 0.75rem;">Ação</th>
                                    <th style="padding: 8px 12px; font-size: 0.75rem;">Detalhes</th>
                                    <th style="padding: 8px 12px; font-size: 0.75rem;">Responsável</th>
                                    <th style="padding: 8px 12px; font-size: 0.75rem;">Data/Hora</th>
                                </tr>
                            </thead>
                            <tbody id="recent-activities-tbody" style="font-size: 0.78rem;">
                                ${activitiesHTML}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2. Top 5 Veículos por Custo Operacional -->
                <div class="card" style="min-height: 320px;">
                    <div class="card-header-simple">
                        <h3>Top 5 Veículos por Custo Operacional</h3>
                        <a href="#relatorios" onclick="window.movixRouter.navigateTo('relatorios')" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">Ver relatório</a>
                    </div>
                    <div class="horizontal-progress-list" style="gap: 14px; margin-top: 8px;">
                        ${vehicleCostsRankHTML}
                    </div>
                </div>
            </div>
        `;

        // 3. Render Chart.js instances dynamically
        renderDashboardCharts(isDark, textMuted, borderColor, abastecimentos, manutencoes, multas, paidFines, pendingFines, resourceFines, maintPreventivas, maintCorretivas);
    }

    function renderDashboardCharts(isDark, textMuted, borderColor, abastecimentos, manutencoes, multas, paidFines, pendingFines, resourceFines, maintPreventivas, maintCorretivas) {
        // Destroy existing Chart.js instances to avoid duplicates/overlays
        if (costChartInstance) {
            costChartInstance.destroy();
            costChartInstance = null;
        }
        if (finesChartInstance) {
            finesChartInstance.destroy();
            finesChartInstance = null;
        }
        if (maintChartInstance) {
            maintChartInstance.destroy();
            maintChartInstance = null;
        }

        // Helper to match dates to 6 months window
        function getMonthYearData(dateStr) {
            if (!dateStr) return null;
            const d = new Date(dateStr + 'T00:00:00');
            return {
                month: d.getMonth(), // 0-11
                year: d.getFullYear()
            };
        }

        const labels = ['Dez/25', 'Jan/26', 'Fev/26', 'Mar/26', 'Abr/26', 'Mai/26'];
        const fuelMonthlyData = [0, 0, 0, 0, 0, 0];
        const maintMonthlyData = [0, 0, 0, 0, 0, 0];

        // Sum real fuel refuels monthly values
        abastecimentos.forEach(a => {
            const dateInfo = getMonthYearData(a.data);
            if (dateInfo) {
                if (dateInfo.year === 2025 && dateInfo.month === 11) fuelMonthlyData[0] += (a.valorTotal || 0);
                else if (dateInfo.year === 2026) {
                    if (dateInfo.month >= 0 && dateInfo.month <= 4) {
                        fuelMonthlyData[dateInfo.month + 1] += (a.valorTotal || 0);
                    }
                }
            }
        });

        // Sum real maintenance monthly values
        manutencoes.forEach(m => {
            const dateInfo = getMonthYearData(m.data);
            if (dateInfo) {
                if (dateInfo.year === 2025 && dateInfo.month === 11) maintMonthlyData[0] += (m.valor || 0);
                else if (dateInfo.year === 2026) {
                    if (dateInfo.month >= 0 && dateInfo.month <= 4) {
                        maintMonthlyData[dateInfo.month + 1] += (m.valor || 0);
                    }
                }
            }
        });

        // No seed/mock values. Using 100% real database statistics.

        // 1. Cost Evolution Chart
        const ctxCost = document.getElementById('costChartRedesign');
        if (ctxCost) {
            try {
                costChartInstance = new Chart(ctxCost.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Combustível',
                                data: fuelMonthlyData,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                fill: true, tension: 0.3, borderWidth: 3
                            },
                            {
                                label: 'Manutenção',
                                data: maintMonthlyData,
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                fill: true, tension: 0.3, borderWidth: 3
                            }
                        ]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false } // custom layout
                        },
                        scales: {
                            x: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } },
                            y: { grid: { color: borderColor }, ticks: { color: textMuted, font: { size: 9 } } }
                        }
                    }
                });
            } catch (err) {
                console.error("Error drawing cost chart:", err);
            }
        }

        // 2. Fines Doughnut Chart
        const ctxFines = document.getElementById('finesRedesignChart');
        if (ctxFines) {
            try {
                const datasetsData = [paidFines, pendingFines, resourceFines];
                const sumFines = paidFines + pendingFines + resourceFines;
                
                finesChartInstance = new Chart(ctxFines.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Pagas', 'Pendentes', 'Em Recurso'],
                        datasets: [{
                            data: sumFines > 0 ? datasetsData : [1, 0, 0], // draw placeholder segment if empty
                            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                            borderWidth: isDark ? 2 : 1,
                            borderColor: isDark ? '#121826' : '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false } // handled manually in side ledger
                        },
                        cutout: '70%'
                    }
                });
            } catch (err) {
                console.error("Error drawing fines chart:", err);
            }
        }

        // 3. Maintenance Doughnut Chart
        const ctxMaint = document.getElementById('maintRedesignChart');
        if (ctxMaint) {
            try {
                const totalMaint = maintPreventivas + maintCorretivas;
                maintChartInstance = new Chart(ctxMaint.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Preventivas', 'Corretivas'],
                        datasets: [{
                            data: totalMaint > 0 ? [maintPreventivas, maintCorretivas] : [1, 0],
                            backgroundColor: ['#10b981', '#ef4444'],
                            borderWidth: isDark ? 2 : 1,
                            borderColor: isDark ? '#121826' : '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        cutout: '75%'
                    }
                });
            } catch (err) {
                console.error("Error drawing maintenance chart:", err);
            }
        }
    }

    // Register into system router
    window.movixRouter.register('dashboard', renderDashboard);
})();
