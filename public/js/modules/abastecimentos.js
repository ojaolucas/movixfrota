/* MovixFrota - Abastecimentos Module */

(function() {
    
    function renderAbastecimentos(container) {
        const supplies = window.movixStore.getAbastecimentos();
        const vehicles = window.movixStore.getVeiculos();
        const drivers = window.movixStore.getMotoristas();
        const activeUser = window.movixStore.getActiveUser();
        const isVisualizador = activeUser.perfil === 'Visualizador';
        const isOperacional = activeUser.perfil === 'Operacional';

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-group">
                    <h1 class="page-title">Controle de Abastecimentos</h1>
                    <p class="page-subtitle">Monitore consumo, médias KM/L e custo por quilômetro rodado da frota</p>
                </div>
                <div class="page-actions">
                    ${(!isVisualizador) ? `
                        <button class="btn btn-primary" id="btn-novo-abastecimento">
                            <i class="fa-solid fa-gas-pump"></i> Novo Abastecimento
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- FILTERS -->
            <div class="filters-card">
                <div class="filters-row">
                    <div class="filter-group">
                        <label>Buscar Veículo (Placa)</label>
                        <select class="filter-input" id="filter-veiculo">
                            <option value="">Todos</option>
                            ${vehicles.map(v => `<option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Filtrar Motorista</label>
                        <select class="filter-input" id="filter-motorista">
                            <option value="">Todos</option>
                            ${drivers.map(m => `<option value="${m.id}">${m.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Tipo de Combustível</label>
                        <select class="filter-input" id="filter-fuel-type">
                            <option value="">Todos</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Diesel S10">Diesel S10</option>
                            <option value="Gasolina">Gasolina</option>
                            <option value="Etanol">Etanol</option>
                            <option value="GNV">GNV</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- TABLE -->
            <div class="table-responsive">
                <table class="smart-table" id="table-abastecimentos">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Veículo</th>
                            <th>Motorista</th>
                            <th>KM Odômetro</th>
                            <th>Litros / Combustível</th>
                            <th>Custo Total</th>
                            <th>Consumo KM/L</th>
                            <th>Custo por KM</th>
                            <th style="width: 120px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-abastecimentos">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
                <div class="table-pagination" id="pagination-abastecimentos"></div>
            </div>
        `;

        let filteredData = [...supplies];
        let currentPage = 1;
        const itemsPerPage = 8;

        function updateTable() {
            const tbody = document.getElementById('tbody-abastecimentos');
            if (!tbody) return;

            const veiculoVal = document.getElementById('filter-veiculo').value;
            const motoristaVal = document.getElementById('filter-motorista').value;
            const fuelVal = document.getElementById('filter-fuel-type').value;

            filteredData = supplies.filter(a => {
                const matchVeiculo = !veiculoVal || a.veiculoId === veiculoVal;
                const matchMotorista = !motoristaVal || a.motoristaId === motoristaVal;
                const matchFuel = !fuelVal || a.combustivel === fuelVal;
                return matchVeiculo && matchMotorista && matchFuel;
            });

            const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedItems = filteredData.slice(startIdx, startIdx + itemsPerPage);

            tbody.innerHTML = '';
            if (paginatedItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="search-no-results" style="text-align: center;">Nenhum registro de abastecimento encontrado</td></tr>`;
                document.getElementById('pagination-abastecimentos').innerHTML = '';
                return;
            }

            paginatedItems.forEach(a => {
                const v = vehicles.find(item => item.id === a.veiculoId);
                const m = drivers.find(item => item.id === a.motoristaId);

                const veicHTML = v 
                    ? `<span style="font-weight:700; color:var(--primary); cursor:pointer;" onclick="window.movixRouter.navigateTo('veiculos', '${v.id}')">${v.placa}</span><br><span style="font-size:0.75rem; color:var(--text-muted);">${v.marca} ${v.modelo}</span>`
                    : 'Veículo Deletado';

                tbody.innerHTML += `
                    <tr>
                        <td>${a.data.split('-').reverse().join('/')}</td>
                        <td>${veicHTML}</td>
                        <td style="font-weight:600;">${m ? m.nome : 'Motorista Deletado'}</td>
                        <td>${parseFloat(a.kmAtual).toLocaleString('pt-BR')} km</td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:600;">${a.litros} L</span>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${a.combustivel} • R$ ${a.valorLitro.toFixed(2)}/L</span>
                            </div>
                        </td>
                        <td style="font-weight:700;">R$ ${a.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td class="text-success" style="font-weight:700; font-size:0.95rem;">
                            ${a.kmL > 0 ? `${a.kmL} km/L` : 'N/A'}
                        </td>
                        <td style="font-weight:600; color:var(--text-muted);">
                            ${a.custoKM > 0 ? `R$ ${a.custoKM.toFixed(2)}/km` : 'N/A'}
                        </td>
                        <td style="text-align: center; display: flex; justify-content: center; gap: 8px;">
                            <button class="btn-icon-only btn-view" data-id="${a.id}" title="Visualizar Detalhes">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            ${!isVisualizador ? `
                                <button class="btn-icon-only btn-edit" data-id="${a.id}" title="Editar">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                ${activeUser.perfil === 'Administrador' ? `
                                    <button class="btn-icon-only danger btn-delete" data-id="${a.id}" title="Excluir">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            ` : ''}
                        </td>
                    </tr>
                `;
            });

            // Pagination UI
            let pagHTML = `<span>Mostrando ${startIdx + 1} a ${Math.min(startIdx + itemsPerPage, filteredData.length)} de ${filteredData.length} abastecimentos</span>`;
            pagHTML += `<div class="pagination-pages">`;
            pagHTML += `<button class="page-number-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
            for (let i = 1; i <= totalPages; i++) {
                pagHTML += `<button class="page-number-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            pagHTML += `<button class="page-number-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
            pagHTML += `</div>`;
            document.getElementById('pagination-abastecimentos').innerHTML = pagHTML;
        }

        // Filters events hooks
        document.getElementById('filter-veiculo').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-motorista').addEventListener('change', () => { currentPage = 1; updateTable(); });
        document.getElementById('filter-fuel-type').addEventListener('change', () => { currentPage = 1; updateTable(); });

        // Pagination buttons
        document.getElementById('pagination-abastecimentos').addEventListener('click', (e) => {
            const btn = e.target.closest('.page-number-btn');
            if (!btn || btn.disabled) return;
            if (btn.id === 'prev-page') currentPage--;
            else if (btn.id === 'next-page') currentPage++;
            else currentPage = parseInt(btn.getAttribute('data-page'));
            updateTable();
        });

        // Add supply Trigger
        if (document.getElementById('btn-novo-abastecimento')) {
            document.getElementById('btn-novo-abastecimento').addEventListener('click', () => openAbastecimentoModal());
        }

        // Deletion and Editing Triggers
        document.querySelector('.table-responsive').addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.btn-view');
            const editBtn = e.target.closest('.btn-edit');
            const delBtn = e.target.closest('.btn-delete');
            
            if (viewBtn) {
                const id = viewBtn.getAttribute('data-id');
                openAbastecimentoDetailModal(id);
            }
            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                openAbastecimentoModal(id);
            }
            if (delBtn) {
                const id = delBtn.getAttribute('data-id');
                confirmDeleteAbastecimento(id);
            }
        });

        function openAbastecimentoModal(id = null) {
            const isEdit = id !== null;
            const ab = isEdit ? supplies.find(x => x.id === id) : null;

            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = isEdit ? `Editar Abastecimento: ${id}` : 'Lançar Abastecimento de Veículo';

            modalBody.innerHTML = `
                <form id="form-abastecimento" class="form-grid">
                    <div class="form-group">
                        <label>Data <span class="required">*</span></label>
                        <input type="date" class="form-control" name="data" required value="${isEdit ? ab.data : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="form-group">
                        <label>Selecione o Veículo <span class="required">*</span></label>
                        <select class="form-control" name="veiculoId" id="ab-veiculo-sel" required ${isEdit ? 'disabled' : ''}>
                            ${vehicles.map(v => `<option value="${v.id}" data-km="${v.kmAtual}" data-fuel="${v.combustivel}" ${isEdit && ab.veiculoId === v.id ? 'selected' : ''}>${v.placa} - ${v.marca} ${v.modelo} (KM: ${v.kmAtual})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Selecione o Motorista <span class="required">*</span></label>
                        <select class="form-control" name="motoristaId" required>
                            ${drivers.map(m => `<option value="${m.id}" ${isEdit && ab.motoristaId === m.id ? 'selected' : ''}>${m.nome}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>KM Odômetro no Abastecimento <span class="required">*</span></label>
                        <input type="number" class="form-control" name="kmAtual" id="ab-km-input" required placeholder="Ex: 145000" min="0" value="${isEdit ? ab.kmAtual : ''}">
                        <span style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;" id="ab-km-hint"></span>
                    </div>

                    <div class="form-group">
                        <label>Litros Abastecidos <span class="required">*</span></label>
                        <input type="number" class="form-control" name="litros" id="ab-litros-input" required placeholder="Ex: 50" step="0.01" min="0" value="${isEdit ? ab.litros : ''}">
                    </div>

                    <div class="form-group">
                        <label>Valor Pago Total (R$) <span class="required">*</span></label>
                        <input type="text" class="form-control" name="valorTotal" id="ab-total-input" required placeholder="Calculado automaticamente ou manual" value="${isEdit && ab.valorTotal ? window.movixApp.formatCurrency(ab.valorTotal) : ''}">
                    </div>

                    <div class="form-group">
                        <label>Valor por Litro (R$) <span class="required">*</span></label>
                        <input type="text" class="form-control" name="valorLitro" id="ab-litro-input" required placeholder="Ex: 6.20" value="${isEdit && ab.valorLitro ? window.movixApp.formatCurrency(ab.valorLitro) : ''}">
                    </div>

                    <div class="form-group">
                        <label>Combustível <span class="required">*</span></label>
                        <select class="form-control" name="combustivel" id="ab-fuel-sel" required>
                            <option value="Diesel" ${isEdit && ab.combustivel === 'Diesel' ? 'selected' : ''}>Diesel</option>
                            <option value="Diesel S10" ${isEdit && ab.combustivel === 'Diesel S10' ? 'selected' : ''}>Diesel S10</option>
                            <option value="Gasolina" ${isEdit && ab.combustivel === 'Gasolina' ? 'selected' : ''}>Gasolina</option>
                            <option value="Etanol" ${isEdit && ab.combustivel === 'Etanol' ? 'selected' : ''}>Etanol</option>
                            <option value="GNV" ${isEdit && ab.combustivel === 'GNV' ? 'selected' : ''}>GNV</option>
                        </select>
                    </div>

                    <div class="form-group full-width">
                        <label>Posto / Estabelecimento <span class="required">*</span></label>
                        <input type="text" class="form-control" name="posto" required placeholder="Ex: Posto BR - Av. Central" value="${isEdit ? ab.posto : ''}">
                    </div>

                    <div class="form-group full-width">
                        <label>Observações</label>
                        <textarea class="form-control" name="observacoes" placeholder="Anotações gerais...">${isEdit && ab.observacoes ? ab.observacoes : ''}</textarea>
                    </div>
                </form>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-salvar-modal">${isEdit ? 'Salvar Alterações' : 'Lançar Combustível'}</button>
            `;

            modal.classList.add('active');

            const veicSel = document.getElementById('ab-veiculo-sel');
            const kmInput = document.getElementById('ab-km-input');
            const kmHint = document.getElementById('ab-km-hint');
            const fuelSel = document.getElementById('ab-fuel-sel');
            const litrosInput = document.getElementById('ab-litros-input');
            const totalInput = document.getElementById('ab-total-input');
            const litroInput = document.getElementById('ab-litro-input');

            function syncVehicle() {
                if (isEdit) return;
                const opt = veicSel.options[veicSel.selectedIndex];
                const lastKM = opt.getAttribute('data-km');
                const fuelType = opt.getAttribute('data-fuel');
                
                kmHint.innerText = `KM atual do veículo: ${parseFloat(lastKM).toLocaleString('pt-BR')} km. Lançamentos com KM menor serão validados como retroativos.`;
                kmInput.removeAttribute('min');
                kmInput.value = parseInt(lastKM) + 100;

                if (fuelType === 'Diesel') fuelSel.value = 'Diesel';
                else if (fuelType === 'Diesel S10') fuelSel.value = 'Diesel S10';
                else if (fuelType === 'Gasolina') fuelSel.value = 'Gasolina';
                else if (fuelType === 'Etanol') fuelSel.value = 'Etanol';
                else if (fuelType === 'GNV') fuelSel.value = 'GNV';
                else fuelSel.value = 'Gasolina';
            }

            function autoCalculate() {
                const active = document.activeElement;
                const litros = parseFloat(litrosInput.value) || 0;
                const total = window.movixApp.cleanCurrency(totalInput.value);
                const litro = window.movixApp.cleanCurrency(litroInput.value);

                if (active === litrosInput) {
                    if (litro > 0) {
                        totalInput.value = window.movixApp.formatCurrency(litros * litro);
                    } else if (total > 0 && litros > 0) {
                        litroInput.value = window.movixApp.formatCurrency(total / litros);
                    }
                } else if (active === litroInput) {
                    if (litros > 0) {
                        totalInput.value = window.movixApp.formatCurrency(litros * litro);
                    } else if (total > 0 && litro > 0) {
                        litrosInput.value = (total / litro).toFixed(2);
                    }
                } else if (active === totalInput) {
                    if (litros > 0) {
                        litroInput.value = window.movixApp.formatCurrency(total / litros);
                    } else if (litro > 0) {
                        litrosInput.value = (total / litro).toFixed(2);
                    }
                }
            }

            veicSel.addEventListener('change', syncVehicle);
            litrosInput.addEventListener('input', autoCalculate);
            litroInput.addEventListener('input', autoCalculate);
            totalInput.addEventListener('input', autoCalculate);

            if (!isEdit) syncVehicle();

            document.getElementById('btn-cancelar-modal').addEventListener('click', () => modal.classList.remove('active'));

            document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
                const form = document.getElementById('form-abastecimento');
                
                const litros = parseFloat(litrosInput.value) || 0;
                const litro = window.movixApp.cleanCurrency(litroInput.value);
                if (!window.movixApp.cleanCurrency(totalInput.value) && litros > 0 && litro > 0) {
                    totalInput.value = window.movixApp.formatCurrency(litros * litro);
                }

                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const veiculoId = isEdit ? ab.veiculoId : veicSel.value;
                const enteredKM = parseFloat(kmInput.value) || 0;
                const originalKM = isEdit ? parseFloat(ab.kmAtual) || 0 : 0;

                const saveAction = async (justificativa) => {
                    const saveBtn = document.getElementById('btn-salvar-modal');
                    const loader = window.movixApp.startLoading(saveBtn, isEdit ? "Atualizando..." : "Salvando...");
                    const formData = new FormData(form);
                    const data = {};
                    formData.forEach((value, key) => data[key] = value);
                    if (isEdit) {
                        data.veiculoId = ab.veiculoId;
                    }

                    if (justificativa) {
                        data.observacoes = (data.observacoes || '') + (data.observacoes ? '\n' : '') + `Motivo da divergência de KM: ${justificativa}`;
                    }

                    try {
                        if (isEdit) {
                            await window.movixStore.updateAbastecimento(id, data);
                            window.movixApp.showToast('Abastecimento atualizado com sucesso!', 'success');
                        } else {
                            await window.movixStore.addAbastecimento(data);
                            window.movixApp.showToast('Abastecimento registrado com sucesso!', 'success');
                        }
                        modal.classList.remove('active');
                        renderAbastecimentos(container);
                    } catch (e) {
                        console.error(e);
                        window.movixApp.showToast(e.message || 'Erro ao salvar abastecimento.', 'danger');
                    } finally {
                        loader.stop();
                    }
                };

                window.movixApp.validateKM(veiculoId, enteredKM, saveAction, isEdit, originalKM);
            });
        }

    function openAbastecimentoDetailModal(id) {
        const ab = supplies.find(x => x.id === id);
        if (!ab) return;

        const v = vehicles.find(item => item.id === ab.veiculoId);
        const m = drivers.find(item => item.id === ab.motoristaId);

        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');

        modalTitle.innerText = `Detalhes do Abastecimento: ${ab.id}`;

        modalBody.innerHTML = `
            <div style="padding: 10px;">
                <h4 style="font-family:var(--font-heading); color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i> Informações do Abastecimento</h4>
                <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Veículo</span><strong style="color:var(--primary);">${v ? `${v.placa} (${v.marca} ${v.modelo})` : 'Deletado'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Motorista</span><strong>${m ? m.nome : 'Deletado'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Data</span><strong>${ab.data.split('-').reverse().join('/')}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Combustível</span><strong>${ab.combustivel}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Volume Abastecido</span><strong>${ab.litros} Litros</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Valor por Litro</span><strong>R$ ${(parseFloat(ab.valorLitro) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Custo Total</span><strong style="font-size:1.05rem; color:var(--text-main);">R$ ${(parseFloat(ab.valorTotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Quilometragem (KM)</span><strong>${parseFloat(ab.kmAtual || 0).toLocaleString('pt-BR')} km</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Posto de Combustível</span><strong>${ab.posto || '-'}</strong></li>
                </ul>

                <h4 style="font-family:var(--font-heading); color:var(--primary); margin-top:20px; margin-bottom:12px;"><i class="fa-solid fa-chart-line"></i> Indicadores de Eficiência</h4>
                <ul class="detail-sidebar-info-list" style="border:none; padding:0; font-size:0.85rem; display:flex; flex-direction:column; gap:10px;">
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Consumo Médio</span><strong class="text-success">${ab.kmL > 0 ? `${ab.kmL} km/L` : 'N/A'}</strong></li>
                    <li class="detail-sidebar-info-item" style="padding:4px 0;"><span>Custo por KM Rodado</span><strong>${ab.custoKM > 0 ? `R$ ${ab.custoKM.toFixed(2)}/km` : 'N/A'}</strong></li>
                </ul>

                ${ab.observacoes ? `
                <div style="margin-top:20px;">
                    <h5 style="font-weight:700; margin-bottom:6px; font-size:0.85rem;">Observações / Detalhes:</h5>
                    <p style="font-size:0.8rem; line-height:1.5; color:var(--text-muted); background:var(--bg-surface-hover); padding:10px; border-radius:6px; border-left:3px solid var(--primary); white-space:pre-wrap;">${ab.observacoes}</p>
                </div>` : ''}

                ${ab.comprovante ? `
                <div style="margin-top:20px; display:flex; gap:12px;">
                    <a href="${ab.comprovante}" target="_blank" class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-eye text-primary"></i> Visualizar Comprovante
                    </a>
                    <a href="${ab.comprovante}" download class="btn btn-secondary" style="font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-download"></i> Baixar Comprovante
                    </a>
                </div>` : ''}
            </div>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="btn-fechar-detalhe">Fechar</button>
        `;

        modal.classList.add('active');
        document.getElementById('btn-fechar-detalhe').addEventListener('click', () => modal.classList.remove('active'));
    }

        function confirmDeleteAbastecimento(id) {
            const modal = document.getElementById('global-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body-content');
            const modalFooter = document.getElementById('modal-footer-actions');

            modalTitle.innerText = 'Remover Abastecimento';
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Excluir este abastecimento da base operacional?</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Os gastos relacionados serão deduzidos do financeiro do veículo e dashboard.</p>
                </div>
            `;

            modalFooter.innerHTML = `
                <button class="btn btn-secondary" id="btn-cancelar-del">Cancelar</button>
                <button class="btn btn-danger" id="btn-confirmar-del">Excluir Abastecimento</button>
            `;

            modal.classList.add('active');

            document.getElementById('btn-cancelar-del').addEventListener('click', () => modal.classList.remove('active'));
            document.getElementById('btn-confirmar-del').addEventListener('click', async () => {
                const delBtn = document.getElementById('btn-confirmar-del');
                const loader = window.movixApp.startLoading(delBtn, "Excluindo...");
                try {
                    await window.movixStore.deleteAbastecimento(id);
                    window.movixApp.showToast('Abastecimento removido com sucesso.', 'success');
                    modal.classList.remove('active');
                    renderAbastecimentos(container);
                } catch (e) {
                    console.error(e);
                    window.movixApp.showToast(e.message || 'Erro ao remover abastecimento.', 'danger');
                } finally {
                    loader.stop();
                }
            });
        }

        updateTable();
    }

    window.movixRouter.register('abastecimentos', renderAbastecimentos);
})();
