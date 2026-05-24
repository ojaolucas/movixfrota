/* MovixFrota - Dashboard Module */

(function() {
    
    function renderDashboard(container) {
        const metrics = window.movixStore.getMetrics();
        const alerts = window.movixStore.getAlerts();
        
        // Define color helpers for active theme
        const isDark = document.body.classList.contains('theme-dark');
        const textMuted = isDark ? '#9ca3af' : '#64748b';
        const borderColor = isDark ? '#1f293d' : '#e2e8f0';

        // 1. Compile Alertas HTML
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
                    <div class="alert-item-row" onclick="window.movixRouter.navigateTo('${a.link}', '${a.targetId}')" style="cursor: pointer;">
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

        // 2. Render Page Frame
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Dashboard Analítico</h1>
                    <p class="page-subtitle">Indicadores de desempenho e custos em tempo real</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="window.print()">
                        <i class="fa-solid fa-print"></i> Imprimir Painel
                    </button>
                </div>
            </div>

            <!-- DYNAMIC STATS GRID (INDICADORES) -->
            <div class="grid-4">
                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">KM Rodado Frota</span>
                        <span class="stat-value">${metrics.kmTotalFrota.toLocaleString('pt-BR')} km</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-arrow-trend-up"></i> +8.2% este mês</span>
                    </div>
                    <div class="stat-icon primary"><i class="fa-solid fa-route"></i></div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Custo Combustível</span>
                        <span class="stat-value">R$ ${metrics.totalGastoCombustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-danger"><i class="fa-solid fa-arrow-trend-up"></i> +4.5% este mês</span>
                    </div>
                    <div class="stat-icon success"><i class="fa-solid fa-gas-pump"></i></div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Custo Manutenção</span>
                        <span class="stat-value">R$ ${metrics.totalGastoManutencao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="stat-delta text-success"><i class="fa-solid fa-arrow-trend-down"></i> -1.2% este mês</span>
                    </div>
                    <div class="stat-icon danger"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                </div>

                <div class="card stat-card">
                    <div class="stat-info">
                        <span class="stat-label">Veículos Operando</span>
                        <span class="stat-value">${window.movixStore.getVeiculos().length - metrics.veiculosEmManutencao} / ${window.movixStore.getVeiculos().length}</span>
                        <span class="stat-delta text-warning">${metrics.veiculosEmManutencao} em oficina</span>
                    </div>
                    <div class="stat-icon info"><i class="fa-solid fa-truck"></i></div>
                </div>
            </div>

            <!-- SECOND STAT ROW (COMPUTED ITEMS) -->
            <div class="grid-4" style="margin-top: -12px;">
                <div class="card stat-card" style="padding: 14px 20px;">
                    <div class="stat-info" style="gap: 2px;">
                        <span class="stat-label" style="font-size: 0.75rem;">Consumo Médio Geral</span>
                        <span class="stat-value" style="font-size: 1.3rem;">${metrics.mediaKMLGeral.toFixed(2)} KM/L</span>
                    </div>
                    <div class="stat-icon info" style="width:38px; height:38px; font-size:1rem;"><i class="fa-solid fa-gauge-high"></i></div>
                </div>
                
                <div class="card stat-card" style="padding: 14px 20px;">
                    <div class="stat-info" style="gap: 2px;">
                        <span class="stat-label" style="font-size: 0.75rem;">Média Gasto Manutenção</span>
                        <span class="stat-value" style="font-size: 1.3rem;">R$ ${metrics.mediaCustoManutencao.toFixed(0)}</span>
                    </div>
                    <div class="stat-icon danger" style="width:38px; height:38px; font-size:1rem;"><i class="fa-solid fa-calculator"></i></div>
                </div>

                <div class="card stat-card" style="padding: 14px 20px;">
                    <div class="stat-info" style="gap: 2px;">
                        <span class="stat-label" style="font-size: 0.75rem;">CNHs Expiradas</span>
                        <span class="stat-value ${metrics.cnhsVencidas > 0 ? 'text-danger' : ''}" style="font-size: 1.3rem;">${metrics.cnhsVencidas}</span>
                    </div>
                    <div class="stat-icon warning" style="width:38px; height:38px; font-size:1rem;"><i class="fa-solid fa-user-xmark"></i></div>
                </div>

                <div class="card stat-card" style="padding: 14px 20px;">
                    <div class="stat-info" style="gap: 2px;">
                        <span class="stat-label" style="font-size: 0.75rem;">Trocas Óleo Pendentes</span>
                        <span class="stat-value ${metrics.oleosVencidos > 0 ? 'text-danger' : ''}" style="font-size: 1.3rem;">${metrics.oleosVencidos} vencidas</span>
                    </div>
                    <div class="stat-icon primary" style="width:38px; height:38px; font-size:1rem;"><i class="fa-solid fa-oil-can"></i></div>
                </div>
            </div>

            <!-- CHARTS AND ALERTS AREA -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-top: 12px;">
                
                <!-- Main Cost Chart -->
                <div class="card" style="min-height: 380px;">
                    <div class="card-header-simple">
                        <h3>Evolução Mensal de Custos (R$)</h3>
                        <i class="fa-solid fa-dollar-sign text-muted"></i>
                    </div>
                    <div style="flex-grow: 1; position: relative;">
                        <canvas id="costChart"></canvas>
                    </div>
                </div>

                <!-- Active Alertas Widget -->
                <div class="card" style="max-height: 440px; overflow-y: auto;">
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

            <!-- OTHER INTERACTIVE CHARTS -->
            <div class="grid-3" style="margin-top: 12px;">
                <!-- Category Doughnut -->
                <div class="card" style="min-height: 320px;">
                    <div class="card-header-simple">
                        <h3>Gastos por Categoria</h3>
                        <i class="fa-solid fa-chart-pie text-muted"></i>
                    </div>
                    <div style="flex-grow: 1; display:flex; align-items:center; justify-content:center; position: relative;">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>

                <!-- Monthly Fuel Consumption -->
                <div class="card" style="min-height: 320px;">
                    <div class="card-header-simple">
                        <h3>Consumo Combustível (Litros)</h3>
                        <i class="fa-solid fa-gas-pump text-muted"></i>
                    </div>
                    <div style="flex-grow: 1; position: relative;">
                        <canvas id="fuelChart"></canvas>
                    </div>
                </div>

                <!-- Driver performance ranking -->
                <div class="card" style="min-height: 320px;">
                    <div class="card-header-simple">
                        <h3>Comparativo KM/L por Veículo</h3>
                        <i class="fa-solid fa-truck-monster text-muted"></i>
                    </div>
                    <div style="flex-grow: 1; position: relative;">
                        <canvas id="vehiclePerformanceChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // 3. Render Chart.js instances
        renderDashboardCharts(isDark, textMuted, borderColor, metrics);
    }

    function renderDashboardCharts(isDark, textMuted, borderColor, metrics) {
        // Mocking Monthly historical data for Chart.js
        const labels = ['Dez/25', 'Jan/26', 'Fev/26', 'Mar/26', 'Abr/26', 'Mai/26'];
        
        // 1. Costs evolution
        const ctxCost = document.getElementById('costChart');
        if (ctxCost) {
            new Chart(ctxCost.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Combustível',
                            data: [3200, 3600, 3100, 3800, 3700, metrics.totalGastoCombustivel],
                            borderColor: '#22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3
                        },
                        {
                            label: 'Manutenção',
                            data: [1500, 800, 2200, 1800, 3900, metrics.totalGastoManutencao],
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: textMuted, font: { family: 'Inter' } } }
                    },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted } }
                    }
                }
            });
        }

        // 2. Category Doughnut Chart
        const ctxCat = document.getElementById('categoryChart');
        if (ctxCat) {
            new Chart(ctxCat.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Combustível', 'Manutenção', 'Pneus', 'Óleo/Filtros'],
                    datasets: [{
                        data: [
                            metrics.totalGastoCombustivel,
                            metrics.totalGastoManutencao,
                            metrics.totalGastoPneus || 4500, // seed fallback
                            metrics.totalGastoLubrificantes || 1890
                        ],
                        backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#0ea5e9'],
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#121826' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: textMuted, font: { family: 'Inter', size: 10 } }
                        }
                    }
                }
            });
        }

        // 3. Monthly Fuel Consumption Chart
        const ctxFuel = document.getElementById('fuelChart');
        if (ctxFuel) {
            new Chart(ctxFuel.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Litros Consumidos',
                        data: [580, 620, 540, 670, 660, 628],
                        backgroundColor: 'rgba(14, 165, 233, 0.75)',
                        borderColor: '#0ea5e9',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { grid: { color: borderColor }, ticks: { color: textMuted } },
                        y: { grid: { color: borderColor }, ticks: { color: textMuted } }
                    }
                }
            });
        }

        // 4. Vehicle KM/L comparative performance bar chart
        const ctxPerf = document.getElementById('vehiclePerformanceChart');
        if (ctxPerf) {
            // Pull real vehicles plaques
            const vehicles = window.movixStore.getVeiculos().slice(0, 5);
            const plaques = vehicles.map(v => v.placa);
            const kmLValues = vehicles.map((v, i) => {
                // Return seeded consumption average or mock realistic curves
                if (v.combustivel === 'Flex') return 12.5;
                if (v.tipo === 'Utilitário') return 10.2;
                return (4.2 + (i * 0.5)); // trucks 4-5 km/l
            });

            new Chart(ctxPerf.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: plaques,
                    datasets: [{
                        label: 'KM/L Médio',
                        data: kmLValues,
                        backgroundColor: 'rgba(245, 158, 11, 0.75)',
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
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
