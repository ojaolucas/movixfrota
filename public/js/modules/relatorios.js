/* MovixFrota - Relatórios Gerenciais Module */

(function() {
    
    function renderRelatorios(container) {
        const vehicles = window.movixStore.getVeiculos();
        const drivers = window.movixStore.getMotoristas();

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Relatórios Gerenciais</h1>
                    <p class="page-subtitle">Gere relatórios executivos de custos, consumo, auditoria financeira e ranking de desempenho</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" id="btn-export-pdf">
                        <i class="fa-solid fa-file-pdf"></i> Gerar Relatório Executivo
                    </button>
                </div>
            </div>

            <!-- FILTERS PANEL -->
            <div class="filters-card">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Tipo de Relatório</label>
                        <select class="filter-input" id="report-type-sel">
                            <option value="fuel_costs">Custos Gerais com Combustível</option>
                            <option value="maint_costs">Custos Gerais com Oficina/Peças</option>
                            <option value="vehicle_costs">Ranking de Despesas por Veículo</option>
                            <option value="driver_performance">Ranking de Consumo (KM/L) por Motorista</option>
                            <option value="oil_timeline">Cronograma Histórico de Trocas de Óleo</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Filtro por Veículo</label>
                        <select class="filter-input" id="report-veic-filter">
                            <option value="">Todos os Veículos</option>
                            ${vehicles.map(v => `<option value="${v.id}">${v.placa}</option>`).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Filtro por Motorista</label>
                        <select class="filter-input" id="report-driver-filter">
                            <option value="">Todos os Motoristas</option>
                            ${drivers.map(m => `<option value="${m.id}">${m.nome}</option>`).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Período Temporal</label>
                        <select class="filter-input" id="report-period-filter">
                            <option value="12">Últimos 12 meses</option>
                            <option value="3">Últimos 3 meses</option>
                            <option value="1">Este mês</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- DYNAMIC REPORT CONTENT GRID -->
            <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; margin-top: 12px;">
                
                <!-- REPORT DATA SHEET -->
                <div class="card" style="min-height: 400px; display:flex; flex-direction:column;">
                    <div class="card-header-simple">
                        <h3 id="report-sheet-title">Custos Gerais com Combustível</h3>
                        <i class="fa-solid fa-file-invoice text-muted"></i>
                    </div>

                    <div class="table-responsive" style="border:none; box-shadow:none; flex-grow:1; margin-top:16px;">
                        <table class="smart-table" id="table-report-output">
                            <thead id="thead-report-output">
                                <!-- Dynamic -->
                            </thead>
                            <tbody id="tbody-report-output">
                                <!-- Dynamic -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- REPORT CHART WIDGET -->
                <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
                    <div class="card-header-simple">
                        <h3>Detalhamento Visual Relacionado</h3>
                        <i class="fa-solid fa-chart-bar text-muted"></i>
                    </div>
                    
                    <div style="flex-grow:1; display:flex; align-items:center; justify-content:center; position:relative; min-height:280px;">
                        <canvas id="reportChart"></canvas>
                    </div>
                </div>

            </div>
        `;

        let currentChartInstance = null;

        function generateReport() {
            const reportType = document.getElementById('report-type-sel').value;
            const veicFilter = document.getElementById('report-veic-filter').value;
            const driverFilter = document.getElementById('report-driver-filter').value;
            const periodVal = parseInt(document.getElementById('report-period-filter').value);

            const title = document.getElementById('report-sheet-title');
            const thead = document.getElementById('thead-report-output');
            const tbody = document.getElementById('tbody-report-output');

            const isDark = document.body.classList.contains('theme-dark');
            const textMuted = isDark ? '#9ca3af' : '#64748b';
            const borderColor = isDark ? '#1f293d' : '#e2e8f0';

            // Reset chart canvas
            const canvasContainer = document.getElementById('reportChart').parentElement;
            canvasContainer.innerHTML = '<canvas id="reportChart"></canvas>';
            
            // Gather state tables
            const supplies = window.movixStore.getAbastecimentos();
            const maintenance = window.movixStore.getMaintenances();
            const oleos = window.movixStore.getOleos();

            // Calculate dates limit based on periodVal
            const today = new Date();
            const limitDate = new Date();
            limitDate.setMonth(today.getMonth() - periodVal);

            // --- REPORT RENDER CASING ---
            if (reportType === 'fuel_costs') {
                title.innerText = 'Custos Gerais com Combustível';
                
                thead.innerHTML = `
                    <tr>
                        <th>Data</th>
                        <th>Veículo</th>
                        <th>Motorista</th>
                        <th>Litros</th>
                        <th>Custo Pago</th>
                        <th>Posto</th>
                    </tr>
                `;

                // Filter
                const filtered = supplies.filter(a => {
                    const matchVeic = !veicFilter || a.veiculoId === veicFilter;
                    const matchDriver = !driverFilter || a.motoristaId === driverFilter;
                    const matchDate = new Date(a.data) >= limitDate;
                    return matchVeic && matchDriver && matchDate;
                });

                if (filtered.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="search-no-results">Nenhum registro encontrado no período.</td></tr>`;
                    return;
                }

                tbody.innerHTML = filtered.map(a => `
                    <tr>
                        <td>${a.data.split('-').reverse().join('/')}</td>
                        <td style="font-weight:700; color:var(--primary);">${vehicles.find(v=>v.id===a.veiculoId)?.placa || 'Veículo'}</td>
                        <td style="font-weight:600;">${drivers.find(d=>d.id===a.motoristaId)?.nome || 'Motorista'}</td>
                        <td>${a.litros} L</td>
                        <td style="font-weight:700;">R$ ${a.valorTotal.toFixed(2)}</td>
                        <td style="font-size:0.8rem; color:var(--text-muted);">${a.posto}</td>
                    </tr>
                `).join('');

                // Render Chart: Fuel Cost Evolution per vehicle
                const plaques = [...new Set(filtered.map(a => vehicles.find(v=>v.id===a.veiculoId)?.placa || ''))].slice(0, 5);
                const values = plaques.map(p => {
                    const veicId = vehicles.find(v=>v.placa===p)?.id;
                    return filtered.filter(a => a.veiculoId === veicId).reduce((acc, a) => acc + a.valorTotal, 0);
                });

                renderReportChart('bar', plaques, values, 'Custo Combustível Acumulado (R$)', '#22c55e', textMuted, borderColor);

            } else if (reportType === 'maint_costs') {
                title.innerText = 'Custos Gerais com Oficina/Peças';
                thead.innerHTML = `
                    <tr>
                        <th>Data</th>
                        <th>Veículo</th>
                        <th>Oficina</th>
                        <th>Tipo / Categoria</th>
                        <th>Custo OS</th>
                        <th>Situação</th>
                    </tr>
                `;

                const filtered = maintenance.filter(m => {
                    const matchVeic = !veicFilter || m.veiculoId === veicFilter;
                    const matchDate = new Date(m.data) >= limitDate;
                    return matchVeic && matchDate;
                });

                if (filtered.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="search-no-results">Sem lançamentos no período.</td></tr>`;
                    return;
                }

                tbody.innerHTML = filtered.map(m => `
                    <tr>
                        <td>${m.data.split('-').reverse().join('/')}</td>
                        <td style="font-weight:700; color:var(--primary);">${vehicles.find(v=>v.id===m.veiculoId)?.placa || 'Veículo'}</td>
                        <td>${m.oficina}</td>
                        <td><span style="font-weight:600;">${m.tipo}</span> (${m.categoria})</td>
                        <td style="font-weight:700;">R$ ${m.valor.toFixed(2)}</td>
                        <td><span class="status-pill ${m.status.toLowerCase()}">${m.status}</span></td>
                    </tr>
                `).join('');

                // Chart: Expense by Maintenance Category
                const cats = ['Mecânica', 'Elétrica', 'Pneus', 'Lubrificantes', 'Freios', 'Suspensão'];
                const values = cats.map(c => filtered.filter(m => m.categoria === c).reduce((acc, m) => acc + m.valor, 0));
                
                renderReportChart('doughnut', cats, values, 'Custo por Categoria', ['#3b82f6','#ef4444','#f59e0b','#10b981','#0ea5e9','#8b5cf6'], textMuted, borderColor);

            } else if (reportType === 'vehicle_costs') {
                title.innerText = 'Ranking de Despesas por Veículo (R$)';
                thead.innerHTML = `
                    <tr>
                        <th>Posição</th>
                        <th>Veículo (Placa)</th>
                        <th>Total Combustível</th>
                        <th>Total Manutenção</th>
                        <th>Custo Total Acumulado</th>
                    </tr>
                `;

                // Calculate accumulated financial costs per vehicle
                const rankingData = vehicles.map(v => {
                    const fuelCosts = supplies.filter(a => a.veiculoId === v.id).reduce((acc, a) => acc + a.valorTotal, 0);
                    const maintCosts = maintenance.filter(m => m.veiculoId === v.id).reduce((acc, m) => acc + m.valor, 0);
                    return {
                        placa: v.placa,
                        modelo: `${v.marca} ${v.modelo}`,
                        fuel: fuelCosts,
                        maint: maintCosts,
                        total: fuelCosts + maintCosts
                    };
                });

                // Sort: Highest total expense first
                rankingData.sort((a, b) => b.total - a.total);

                tbody.innerHTML = rankingData.map((item, idx) => `
                    <tr>
                        <td style="font-weight:700; color:var(--text-muted);">${idx + 1}º</td>
                        <td><strong style="font-weight:700; color:var(--primary);">${item.placa}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${item.modelo}</span></td>
                        <td>R$ ${item.fuel.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td>R$ ${item.maint.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td style="font-weight:800; color:var(--danger);">R$ ${item.total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    </tr>
                `).join('');

                // Render Chart: Top 5 vehicles expenses comparison bar chart
                const top5 = rankingData.slice(0, 5);
                const plaques = top5.map(item => item.placa);
                const values = top5.map(item => item.total);

                renderReportChart('bar', plaques, values, 'Gasto Total Acumulado (R$)', '#ef4444', textMuted, borderColor);

            } else if (reportType === 'driver_performance') {
                title.innerText = 'Ranking de Consumo (KM/L) por Motorista';
                thead.innerHTML = `
                    <tr>
                        <th>Posição</th>
                        <th>Motorista</th>
                        <th>Qtd. Abastecimentos</th>
                        <th>Litros Abastecidos</th>
                        <th>Consumo Médio Ponderado</th>
                    </tr>
                `;

                // Calculate drivers average consumption curves
                const rankingData = drivers.map(m => {
                    const driverSupplies = supplies.filter(a => a.motoristaId === m.id && a.kmL > 0);
                    const totalL = driverSupplies.reduce((acc, a) => acc + a.litros, 0);
                    const avgKML = driverSupplies.length > 0 
                        ? driverSupplies.reduce((acc, a) => acc + a.kmL, 0) / driverSupplies.length
                        : 0;
                    return {
                        nome: m.nome,
                        count: driverSupplies.length,
                        litros: totalL,
                        avgKml: avgKML
                    };
                });

                // Sort: Highest consumption KM/L first (best driver performance!)
                rankingData.sort((a, b) => b.avgKml - a.avgKml);

                tbody.innerHTML = rankingData.map((item, idx) => `
                    <tr>
                        <td style="font-weight:700; color:var(--text-muted);">${idx + 1}º</td>
                        <td style="font-weight:600;">${item.nome}</td>
                        <td>${item.count} abastecimentos</td>
                        <td>${item.litros.toFixed(0)} L</td>
                        <td class="text-success" style="font-weight:800; font-size:1rem;">
                            ${item.avgKml > 0 ? `${item.avgKml.toFixed(2)} km/L` : 'N/A'}
                        </td>
                    </tr>
                `).join('');

                // Chart: Driver rankings comparison
                const top5 = rankingData.filter(item => item.avgKml > 0).slice(0, 5);
                const names = top5.map(item => item.nome.split(' ')[0]); // take first name to fit mobile
                const values = top5.map(item => item.avgKml);

                renderReportChart('bar', names, values, 'KM/L Médio por Motorista', '#f59e0b', textMuted, borderColor);

            } else if (reportType === 'oil_timeline') {
                title.innerText = 'Cronograma Histórico de Trocas de Óleo';
                thead.innerHTML = `
                    <tr>
                        <th>Data Troca</th>
                        <th>Veículo</th>
                        <th>KM Registro</th>
                        <th>Especificação Óleo</th>
                        <th>Próxima Troca (KM)</th>
                        <th>Valor Pago</th>
                    </tr>
                `;

                const filtered = oleos.filter(o => {
                    const matchVeic = !veicFilter || o.veiculoId === veicFilter;
                    const matchDate = new Date(o.dataTroca) >= limitDate;
                    return matchVeic && matchDate;
                });

                if (filtered.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="search-no-results">Nenhum registro no período.</td></tr>`;
                    return;
                }

                tbody.innerHTML = filtered.map(o => `
                    <tr>
                        <td>${o.dataTroca.split('-').reverse().join('/')}</td>
                        <td style="font-weight:700; color:var(--primary);">${vehicles.find(v=>v.id===o.veiculoId)?.placa || 'Veículo'}</td>
                        <td>${parseFloat(o.kmTroca).toLocaleString('pt-BR')} km</td>
                        <td style="font-weight:600;">${o.tipoOleo}</td>
                        <td style="font-weight:600;">${parseFloat(o.proximaTrocaKM).toLocaleString('pt-BR')} km</td>
                        <td style="font-weight:700;">R$ ${o.valor.toFixed(2)}</td>
                    </tr>
                `).join('');

                // Chart: Cost spent on oil changes
                const plaques = [...new Set(filtered.map(o => vehicles.find(v=>v.id===o.veiculoId)?.placa || ''))].slice(0, 5);
                const values = plaques.map(p => {
                    const vId = vehicles.find(v=>v.placa===p)?.id;
                    return filtered.filter(o => o.veiculoId === vId).reduce((acc, o) => acc + o.valor, 0);
                });

                renderReportChart('bar', plaques, values, 'Custo com Óleo/Filtros Acumulado (R$)', '#0ea5e9', textMuted, borderColor);
            }
        }

        // Dedicated helper method to generate dynamic Chart.js canvas reports
        function renderReportChart(type, labels, data, datasetLabel, backgroundColors, textMuted, borderColor) {
            const ctx = document.getElementById('reportChart').getContext('2d');
            
            const config = {
                type: type,
                data: {
                    labels: labels,
                    datasets: [{
                        label: datasetLabel,
                        data: data,
                        backgroundColor: backgroundColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: type === 'doughnut',
                            labels: { color: textMuted, font: { family: 'Inter' } }
                        }
                    }
                }
            };

            // Set grid configuration for linear bar charts
            if (type === 'bar') {
                config.options.scales = {
                    x: { grid: { color: borderColor }, ticks: { color: textMuted } },
                    y: { grid: { color: borderColor }, ticks: { color: textMuted } }
                };
            }

            currentChartInstance = new Chart(ctx, config);
        }

        // Change triggers hooks
        document.getElementById('report-type-sel').addEventListener('change', generateReport);
        document.getElementById('report-veic-filter').addEventListener('change', generateReport);
        document.getElementById('report-driver-filter').addEventListener('change', generateReport);
        document.getElementById('report-period-filter').addEventListener('change', generateReport);

        // Simulated print / PDF download
        document.getElementById('btn-export-pdf').addEventListener('click', () => {
            window.print();
        });

        generateReport(); // run initial load
    }

    window.movixRouter.register('relatorios', renderRelatorios);
})();
