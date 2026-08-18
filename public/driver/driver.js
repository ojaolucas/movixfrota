/* 
   MovixFrota - Portal do Motorista SPA Core Engine (Versão Completa & Oficial)
*/

(function() {
    // Estado Global do Aplicativo
    const AppState = {
        activeUser: null,
        activeMotorista: null,
        activeTrip: null,
        veiculos: [],
        viagensHistorico: [],
        allViagens: [],
        solicitacoes: [],
        currentTab: 'inicio',
        tempPhotoUrl: null,
        tempPhotoBase64: null
    };

    // Formatador de Moeda Local
    function formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    }

    // Formatador de Data de Rota Defensivo
    function formatRouteDate(dt) {
        if (!dt) return '';
        const dateOnly = dt.includes('T') ? dt.split('T')[0] : dt;
        return dateOnly.includes('-') ? dateOnly.split('-').reverse().join('/') : dateOnly;
    }

    // Aplicador de Máscara de Telefone Celular
    function applyPhoneMask(inputElement) {
        if (!inputElement) return;
        inputElement.addEventListener("input", (e) => {
            let v = e.target.value.replace(/\D/g, "");
            if (v.length > 11) v = v.substring(0, 11);
            
            if (v.length > 10) {
                v = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
            } else if (v.length > 6) {
                v = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
            } else if (v.length > 2) {
                v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
            } else if (v.length > 0) {
                v = `(${v.substring(0, 2)}`;
            }
            e.target.value = v;
        });
    }

    // Formatadores e Máscaras de Moeda Local (R$)
    function formatCurrencyValue(val) {
        if (val === null || val === undefined || val === '') return 'R$ 0,00';
        let digits = '';
        if (typeof val === 'number') {
            digits = val.toFixed(2).replace(/\D/g, '');
        } else {
            digits = val.toString().replace(/\D/g, '');
        }
        if (!digits) return 'R$ 0,00';
        digits = digits.replace(/^0+/, '');
        while (digits.length < 3) {
            digits = '0' + digits;
        }
        const cents = digits.slice(-2);
        const integerPart = digits.slice(0, -2);
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `R$ ${formattedInteger},${cents}`;
    }

    function cleanCurrencyValue(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        let cleaned = val.toString().trim();
        cleaned = cleaned.replace(/^R\$\s*/i, '');
        cleaned = cleaned.replace(/\./g, '');
        cleaned = cleaned.replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    function applyCurrencyMask(inputElement) {
        if (!inputElement) return;
        inputElement.addEventListener("input", (e) => {
            const val = e.target.value;
            const formatted = formatCurrencyValue(val);
            if (e.target.value !== formatted) {
                e.target.value = formatted;
                setTimeout(() => {
                    const len = e.target.value.length;
                    try { e.target.setSelectionRange(len, len); } catch (err) {}
                }, 0);
            }
        });
    }

    // Componente Centralizado de Autocomplete (Digitável e Selecionável)
    function initAutocomplete(selectEl, placeholder = 'Selecione ou digite para buscar...') {
        if (!selectEl || selectEl.dataset.autocompleteInitialized) return;
        selectEl.dataset.autocompleteInitialized = 'true';

        // 1. Hide the original select
        selectEl.style.display = 'none';

        // 2. Create the container structure
        const container = document.createElement('div');
        container.className = 'movix-autocomplete-container';
        if (selectEl.id) container.id = selectEl.id + '-autocomplete';

        const wrapper = document.createElement('div');
        wrapper.className = 'movix-autocomplete-wrapper';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = selectEl.className; // inherit styles
        input.placeholder = placeholder;
        input.autocomplete = 'off';
        if (selectEl.disabled) input.disabled = true;

        const chevron = document.createElement('i');
        chevron.className = 'fa-solid fa-chevron-down autocomplete-chevron';

        const clearBtn = document.createElement('i');
        clearBtn.className = 'fa-solid fa-xmark autocomplete-clear';
        clearBtn.style.display = 'none';

        const dropdown = document.createElement('div');
        dropdown.className = 'movix-autocomplete-dropdown';

        const noResults = document.createElement('div');
        noResults.className = 'movix-autocomplete-no-results';
        noResults.innerText = 'Nenhum registro foi encontrado.';
        noResults.style.display = 'none';

        const list = document.createElement('ul');
        list.className = 'movix-autocomplete-list';

        dropdown.appendChild(noResults);
        dropdown.appendChild(list);
        wrapper.appendChild(input);
        wrapper.appendChild(chevron);
        wrapper.appendChild(clearBtn);
        container.appendChild(wrapper);
        container.appendChild(dropdown);

        selectEl.parentNode.insertBefore(container, selectEl);

        let options = [];
        let focusedIndex = -1;
        let isClearing = false;

        const updateClearButtonVisibility = () => {
            if (selectEl.value !== "") {
                clearBtn.style.display = 'block';
                chevron.style.display = 'none';
            } else {
                clearBtn.style.display = 'none';
                chevron.style.display = 'block';
            }
        };

        // Function to rebuild options list from select options dynamically
        const syncOptions = () => {
            list.innerHTML = '';
            options = Array.from(selectEl.options).map((opt, index) => {
                const text = opt.text;
                const value = opt.value;
                const isSelected = opt.selected;
                const isDisabled = opt.disabled;

                 if (value === "" || isDisabled) return null; // skip default placeholder option

                const li = document.createElement('li');
                li.className = 'movix-autocomplete-item';
                if (isSelected) {
                    li.classList.add('selected');
                    input.value = text;
                }
                li.innerText = text;
                li.dataset.value = value;
                li.dataset.index = index;

                li.addEventListener('click', () => {
                    selectOption(opt);
                });

                list.appendChild(li);
                return { element: li, text, value, selectOpt: opt };
            }).filter(x => x !== null);
            updateClearButtonVisibility();
        };

        const selectOption = (opt) => {
            selectEl.value = opt.value;
            input.value = opt.text;
            closeDropdown();
            // Dispatch native change event
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            syncOptions();
        };

        const filterOptions = () => {
            const query = input.value.toLowerCase().trim();
            let matches = 0;
            options.forEach(opt => {
                const match = opt.text.toLowerCase().includes(query);
                if (match) {
                    opt.element.style.display = 'block';
                    opt.element.classList.remove('focused');
                    matches++;
                    
                    if (query) {
                        const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
                        opt.element.innerHTML = opt.text.replace(regex, '<strong style="color: var(--accent-color); text-decoration: underline;">$1</strong>');
                    } else {
                        opt.element.innerText = opt.text;
                    }
                } else {
                    opt.element.style.display = 'none';
                    opt.element.classList.remove('focused');
                }
            });
            noResults.style.display = matches === 0 ? 'block' : 'none';
            focusedIndex = -1;
        };

        const openDropdown = () => {
            if (selectEl.disabled || isClearing) return;
            container.classList.add('active');
            filterOptions();
        };

        const closeDropdown = () => {
            container.classList.remove('active');
            focusedIndex = -1;
            // Restore input text to selected option text if left unmatched
            const selectedOpt = Array.from(selectEl.options).find(o => o.selected);
            if (selectedOpt && selectedOpt.value !== "") {
                input.value = selectedOpt.text;
            } else {
                input.value = '';
            }
        };

        // Clear button handler
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            isClearing = true;
            selectEl.value = "";
            input.value = "";
            closeDropdown();
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            syncOptions();
            input.focus();
            
            setTimeout(() => {
                isClearing = false;
            }, 50);
        });

        // Event listeners
        input.addEventListener('focus', openDropdown);
        input.addEventListener('input', () => {
            if (!container.classList.contains('active')) {
                container.classList.add('active');
            }
            filterOptions();
        });

        // Click outside handler
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                closeDropdown();
            }
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (!container.classList.contains('active')) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                    openDropdown();
                    e.preventDefault();
                }
                return;
            }

            const visibleItems = options.filter(opt => opt.element.style.display !== 'none');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (visibleItems.length === 0) return;
                focusedIndex = (focusedIndex + 1) % visibleItems.length;
                updateFocus(visibleItems);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (visibleItems.length === 0) return;
                focusedIndex = (focusedIndex - 1 + visibleItems.length) % visibleItems.length;
                updateFocus(visibleItems);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < visibleItems.length) {
                    selectOption(visibleItems[focusedIndex].selectOpt);
                } else if (visibleItems.length > 0) {
                    selectOption(visibleItems[0].selectOpt);
                }
            } else if (e.key === 'Escape') {
                closeDropdown();
                input.blur();
            }
        });

        const updateFocus = (visibleItems) => {
            visibleItems.forEach((item, idx) => {
                if (idx === focusedIndex) {
                    item.element.classList.add('focused');
                    item.element.scrollIntoView({ block: 'nearest' });
                } else {
                    item.element.classList.remove('focused');
                }
            });
        };

        // Listen for programmatic updates
        const observer = new MutationObserver((mutations) => {
            let optionsChanged = false;
            let disabledChanged = false;
            mutations.forEach(m => {
                if (m.type === 'childList') optionsChanged = true;
                if (m.type === 'attributes' && m.attributeName === 'disabled') disabledChanged = true;
            });
            if (optionsChanged) syncOptions();
            if (disabledChanged) {
                input.disabled = selectEl.disabled;
            }
        });
        observer.observe(selectEl, { childList: true, attributes: true, attributeFilter: ['disabled'] });

        // Listen to native change event (sync from other modules or edits)
        selectEl.addEventListener('change', () => {
             const selectedOpt = Array.from(selectEl.options).find(o => o.selected);
             input.value = (selectedOpt && selectedOpt.value !== "") ? selectedOpt.text : '';
            if (selectEl.disabled) {
                input.disabled = true;
            } else {
                input.disabled = false;
            }
            syncOptions();
        });

        syncOptions();
    }

    // Inicializador
    document.addEventListener("DOMContentLoaded", () => {
        setupTheme();
        injectOfflineIndicator();

        // Inicializa hash padrão se não houver
        if (!window.location.hash) {
            window.location.hash = AppState.currentTab; // '#inicio'
        } else {
            const hash = window.location.hash.replace('#', '');
            if (['inicio', 'viagens', 'solicitacoes', 'perfil'].includes(hash)) {
                AppState.currentTab = hash;
            } else if (hash.startsWith('viagem-detalhe/')) {
                AppState.currentTab = 'viagens';
            }
        }

        checkSession();
        
        // Registrar escutas de status de rede
        window.addEventListener('online', syncOfflineQueue);
        window.addEventListener('offline', updateNetworkStatus);
        
        // Registrar mudança de hash globalmente
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            if (['inicio', 'viagens', 'solicitacoes', 'perfil'].includes(hash)) {
                if (AppState.currentTab !== hash) {
                    AppState.currentTab = hash;
                    const dropdownMenu = document.getElementById("driver-dropdown-menu");
                    if (dropdownMenu) dropdownMenu.style.display = "none";
                    
                    // Se estivermos logados e o dashboard estiver ativo, renderiza a aba correspondente
                    const contentEl = document.getElementById("dashboard-content");
                    if (contentEl) {
                        // Atualiza as classes ativas nas abas do topo e rodapé
                        document.querySelectorAll(".nav-tab-dropdown").forEach(btn => {
                            btn.classList.toggle("active", btn.getAttribute("data-tab") === hash);
                        });
                        document.querySelectorAll(".nav-tab-bottom").forEach(btn => {
                            btn.classList.toggle("active", btn.getAttribute("data-tab") === hash);
                        });
                        renderTabContent(hash);
                    }
                }
            } else if (hash.startsWith('viagem-detalhe/')) {
                const tripId = hash.split('viagem-detalhe/')[1];
                const contentEl = document.getElementById("dashboard-content");
                if (contentEl) {
                    // Atualiza as classes ativas nas abas do topo e rodapé para Viagens
                    document.querySelectorAll(".nav-tab-dropdown").forEach(btn => {
                        btn.classList.toggle("active", btn.getAttribute("data-tab") === 'viagens');
                    });
                    document.querySelectorAll(".nav-tab-bottom").forEach(btn => {
                        btn.classList.toggle("active", btn.getAttribute("data-tab") === 'viagens');
                    });
                    renderPastTripDetail(tripId);
                }
            }
        });

        // Verificar fila offline periodicamente (a cada 30 segundos)
        setInterval(syncOfflineQueue, 30000);
    });

    // --- GERENCIAMENTO DE TEMA ---
    function setupTheme() {
        const storedTheme = localStorage.getItem("movix_theme") || "light";
        document.body.className = `theme-${storedTheme}`;
    }

    function toggleTheme() {
        const currentTheme = document.body.classList.contains("theme-dark") ? "dark" : "light";
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.body.className = `theme-${newTheme}`;
        localStorage.setItem("movix_theme", newTheme);
        showToast(`Modo ${newTheme === "dark" ? "Escuro" : "Claro"} ativado!`, "info");
        
        const themeBtn = document.getElementById("btn-theme-toggle");
        if (themeBtn) {
            themeBtn.innerHTML = newTheme === "dark" ? '<i class="fa-solid fa-sun text-warning"></i>' : '<i class="fa-solid fa-moon"></i>';
        }
    }

    // --- BANNER DE REDE / OFFLINE ---
    function injectOfflineIndicator() {
        if (!document.getElementById("offline-indicator")) {
            const banner = document.createElement("div");
            banner.id = "offline-indicator";
            banner.className = "offline-banner";
            banner.style.display = "none";
            banner.innerHTML = `
                <i class="fa-solid fa-wifi-slash animate-pulse"></i>
                <span>Você está offline. Lançamentos serão salvos localmente.</span>
            `;
            document.body.insertBefore(banner, document.body.firstChild);
        }
        updateNetworkStatus();
    }

    function updateNetworkStatus() {
        const indicator = document.getElementById("offline-indicator");
        const container = document.querySelector(".driver-container");
        if (indicator) {
            if (navigator.onLine) {
                indicator.style.display = "none";
                if (container) container.classList.remove("offline-active");
            } else {
                indicator.className = "offline-banner";
                indicator.innerHTML = `
                    <i class="fa-solid fa-wifi-slash"></i>
                    <span>Você está offline. Lançamentos serão salvos localmente.</span>
                `;
                indicator.style.display = "flex";
                if (container) container.classList.add("offline-active");
            }
        }
    }

    // --- CONTROLE DE SESSÃO ---
    async function checkSession() {
        showLoading(true);
        try {
            // Tenta obter sessão do servidor
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                AppState.activeUser = await res.json();
                await loadMotoristaInfo();
                await loadAppData();
                renderDashboard();
                syncOfflineQueue(); // Sincroniza pendências se houver
            } else {
                renderLogin();
            }
        } catch (err) {
            console.error("Erro na verificação de sessão (tentando restaurar offline):", err);
            // Se offline, tenta restaurar última sessão salva em localStorage
            const cachedUser = localStorage.getItem("movix_cached_user");
            const cachedMotorista = localStorage.getItem("movix_cached_motorista");
            if (cachedUser && cachedMotorista) {
                AppState.activeUser = JSON.parse(cachedUser);
                AppState.activeMotorista = JSON.parse(cachedMotorista);
                loadOfflineAppData();
                renderDashboard();
                showToast("Modo Offline: Carregando dados locais.", "info");
            } else {
                renderLogin();
            }
        } finally {
            showLoading(false);
        }
    }

    async function loadMotoristaInfo() {
        try {
            const res = await fetch('/api/motoristas');
            if (res.ok) {
                const motoristas = await res.json();
                const userCpfClean = AppState.activeUser.cpf ? AppState.activeUser.cpf.replace(/\D/g, '') : '';
                
                // Filter all matching motoristas first by ID, CPF, or Email
                const matches = motoristas.filter(m => {
                    if (AppState.activeUser.id === m.id) return true;

                    const mCpfClean = m.cpf ? m.cpf.replace(/\D/g, '') : '';
                    const matchCpf = userCpfClean && mCpfClean && mCpfClean === userCpfClean;
                    
                    const userEmail = AppState.activeUser.email ? AppState.activeUser.email.trim().toLowerCase() : '';
                    const mEmail = m.email ? m.email.trim().toLowerCase() : '';
                    const matchEmail = userEmail && mEmail && mEmail === userEmail;
                    
                    return matchCpf || matchEmail;
                });

                if (matches.length > 0) {
                    // Prioritize matches to resolve duplicates (e.g. same CPF/email under different categories)
                    // 1. Direct ID match
                    // 2. Motorista Efetivo
                    // 3. Motorista Temporário (Diarista)
                    // 4. Condutor Interno / Others
                    matches.sort((a, b) => {
                        if (a.id === AppState.activeUser.id) return -1;
                        if (b.id === AppState.activeUser.id) return 1;

                        const rank = (m) => {
                            const cat = String(m.categoria || '').toLowerCase();
                            if (cat.includes('efetivo')) return 1;
                            if (cat.includes('temporário') || cat.includes('diarista')) return 2;
                            if (cat.includes('interno')) return 3;
                            return 4;
                        };
                        return rank(a) - rank(b);
                    });

                    AppState.activeMotorista = matches[0];
                } else {
                    AppState.activeMotorista = null;
                }

                if (AppState.activeMotorista) {
                    localStorage.setItem("movix_cached_user", JSON.stringify(AppState.activeUser));
                    localStorage.setItem("movix_cached_motorista", JSON.stringify(AppState.activeMotorista));
                }
            }
        } catch (e) {
            console.error("Falha ao obter dados do motorista:", e);
        }
    }

    async function loadAppData() {
        if (!navigator.onLine) {
            loadOfflineAppData();
            return;
        }

        // Tenta sincronizar a fila offline antes de carregar do servidor
        const queue = JSON.parse(localStorage.getItem("movix_offline_queue") || "[]");
        if (queue.length > 0) {
            try {
                await syncOfflineQueue(true);
            } catch (err) {
                console.error("Erro durante a sincronização automática no load:", err);
            }
        }

        try {
            // Veículos
            const veicRes = await fetch('/api/veiculos');
            if (veicRes.ok) {
                AppState.veiculos = await veicRes.json();
                localStorage.setItem("movix_cached_veiculos", JSON.stringify(AppState.veiculos));
            }
            
            // Viagens do motorista
            if (AppState.activeMotorista) {
                const viagensRes = await fetch('/api/viagens');
                if (viagensRes.ok) {
                    const viagens = await viagensRes.json();
                    
                    AppState.allViagens = viagens;
                    
                    // Separa a viagem ativa do motorista
                    AppState.activeTrip = viagens.find(v => 
                        v.motoristaId === AppState.activeMotorista.id && 
                        (v.status && v.status.toLowerCase() === 'em andamento')
                    );

                    // Histórico de viagens dele
                    AppState.viagensHistorico = viagens.filter(v => 
                        v.motoristaId === AppState.activeMotorista.id &&
                        (v.status && v.status.toLowerCase() === 'realizada')
                    );

                    // Mesclar estado da fila offline pendente se a sincronização falhou/está pendente
                    const pendingQueue = JSON.parse(localStorage.getItem("movix_offline_queue") || "[]");
                    const startItem = pendingQueue.find(item => item.action === 'start_trip');
                    if (startItem) {
                        AppState.activeTrip = {
                            id: 'TEMP-VIA',
                            veiculoId: startItem.payload.veiculoId,
                            motoristaId: startItem.payload.motoristaId,
                            dataSaida: startItem.payload.dataSaida,
                            horaSaida: startItem.payload.horaSaida,
                            kmInicial: startItem.payload.kmInicial,
                            origem: startItem.payload.origem,
                            destino: startItem.payload.destino,
                            observacoes: startItem.payload.observacoes,
                            status: 'Em Andamento',
                            custos: 0,
                            ocorrencias: []
                        };
                    }
                    const endItem = pendingQueue.find(item => item.action === 'end_trip');
                    if (endItem && AppState.activeTrip) {
                        AppState.activeTrip = null;
                    }

                    localStorage.setItem("movix_cached_active_trip", JSON.stringify(AppState.activeTrip || null));
                    localStorage.setItem("movix_cached_viagens_hist", JSON.stringify(AppState.viagensHistorico));
                }

                // Solicitações de manutenção
                const solRes = await fetch(`/api/solicitacoes-manutencao?motoristaId=${AppState.activeMotorista.id}`);
                if (solRes.ok) {
                    AppState.solicitacoes = await solRes.json();
                    localStorage.setItem("movix_cached_solicitacoes", JSON.stringify(AppState.solicitacoes));
                }
            }
        } catch (e) {
            console.error("Erro ao sincronizar dados cadastrais do servidor:", e);
            loadOfflineAppData();
        }
    }

    function loadOfflineAppData() {
        AppState.veiculos = JSON.parse(localStorage.getItem("movix_cached_veiculos") || "[]");
        AppState.activeTrip = JSON.parse(localStorage.getItem("movix_cached_active_trip") || "null");
        AppState.viagensHistorico = JSON.parse(localStorage.getItem("movix_cached_viagens_hist") || "[]");
        AppState.solicitacoes = JSON.parse(localStorage.getItem("movix_cached_solicitacoes") || "[]");
        
        // Mesclar itens pendentes da fila offline para exibir na interface local imediatamente
        const queue = JSON.parse(localStorage.getItem("movix_offline_queue") || "[]");
        
        // Simular viagem ativa iniciada offline
        const startItem = queue.find(item => item.action === 'start_trip');
        if (startItem) {
            AppState.activeTrip = {
                id: 'TEMP-VIA',
                veiculoId: startItem.payload.veiculoId,
                motoristaId: startItem.payload.motoristaId,
                dataSaida: startItem.payload.dataSaida,
                horaSaida: startItem.payload.horaSaida,
                kmInicial: startItem.payload.kmInicial,
                origem: startItem.payload.origem,
                destino: startItem.payload.destino,
                observacoes: startItem.payload.observacoes,
                status: 'Em Andamento',
                custos: 0,
                ocorrencias: []
            };
        }

        // Se finalizou viagem offline
        const endItem = queue.find(item => item.action === 'end_trip');
        if (endItem && AppState.activeTrip) {
            AppState.activeTrip = null;
        }
    }

    // --- MÉTODOS DE RENDERIZAÇÃO DA SPA ---
    const rootEl = document.getElementById("driver-app");

    function showLoading(show) {
        if (show) {
            rootEl.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Processando...</p>
                </div>
            `;
        }
    }

    function renderLogin() {
        const theme = localStorage.getItem("movix_theme") || "light";
        document.body.className = `theme-${theme}`;

        rootEl.innerHTML = `
            <div class="login-view animate-fade-in">
                <div class="login-brand">
                    <i class="fa-solid fa-truck-steering"></i>
                    <h1>MovixFrota</h1>
                    <p>Portal do Motorista</p>
                </div>
                
                <div class="card-glass">
                    <div class="card-title">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>Acesse sua Conta</span>
                    </div>
                    
                    <form id="driver-login-form">
                        <div class="form-group">
                            <label for="login-identifier">CPF ou E-mail</label>
                            <input type="text" id="login-identifier" class="input-control" placeholder="Digite seu CPF ou E-mail corporativo" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="login-password">Senha de Acesso</label>
                            <div class="password-input-container">
                                <input type="password" id="login-password" class="input-control" placeholder="Digite sua senha de acesso" required>
                                <button type="button" class="toggle-password-btn" id="btn-toggle-password" title="Visualizar Senha">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="checkbox-group">
                            <input type="checkbox" id="login-remember">
                            <label for="login-remember">Manter Conectado</label>
                        </div>
                        
                        <button type="submit" class="btn-driver btn-driver-primary">
                            <i class="fa-solid fa-right-to-bracket"></i> Acessar Portal
                        </button>
                    </form>
                </div>
                
                <div style="text-align:center; margin-top: 16px;">
                    <button id="btn-theme-login" class="header-icon-btn" style="margin: 0 auto;">
                        ${theme === 'dark' ? '<i class="fa-solid fa-sun text-warning"></i>' : '<i class="fa-solid fa-moon"></i>'}
                    </button>
                </div>
            </div>
        `;

        document.getElementById("btn-theme-login").addEventListener("click", () => {
            toggleTheme();
            const newTheme = document.body.classList.contains("theme-dark") ? "dark" : "light";
            document.getElementById("btn-theme-login").innerHTML = newTheme === "dark" ? '<i class="fa-solid fa-sun text-warning"></i>' : '<i class="fa-solid fa-moon"></i>';
        });

        // Toggle Visualização de Senha
        const toggleBtn = document.getElementById("btn-toggle-password");
        const passwordInput = document.getElementById("login-password");
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener("click", () => {
                const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
                passwordInput.setAttribute("type", type);
                toggleBtn.innerHTML = type === "password" ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
            });
        }

        // Formatação CPF/Máscara no login
        const loginIdentifierInput = document.getElementById("login-identifier");
        if (loginIdentifierInput) {
            loginIdentifierInput.addEventListener("input", (e) => {
                let v = e.target.value.replace(/\D/g, "");
                if (v.length > 0 && /^\d+$/.test(v)) {
                    if (v.length > 11) v = v.substring(0, 11);
                    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
                    else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
                    e.target.value = v;
                }
            });
        }

        document.getElementById("driver-login-form").addEventListener("submit", handleLoginSubmit);
    }

    async function handleLoginSubmit(e) {
        e.preventDefault();
        const identifier = document.getElementById("login-identifier").value.trim();
        const password = document.getElementById("login-password").value;
        const rememberMe = document.getElementById("login-remember").checked;
        
        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner" style="width:20px; height:20px; border-width:2px;"></div> Autenticando...';
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, senha: password, rememberMe })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Credenciais inválidas.');
            }

            const data = await res.json();
            AppState.activeUser = data.user;

            showToast("Login efetuado com sucesso!", "success");
            
            await loadMotoristaInfo();
            await loadAppData();
            renderDashboard();

        } catch (err) {
            showToast(err.message, "danger");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Acessar Portal';
        }
    }

    function renderDashboard() {
        const user = AppState.activeUser;
        const driver = AppState.activeMotorista;
        const isDark = document.body.classList.contains("theme-dark");

        if (!driver) {
            rootEl.innerHTML = `
                <div class="login-view animate-fade-in">
                    <div class="card-glass text-center" style="padding: 30px; text-align: center;">
                        <i class="fa-solid fa-circle-exclamation text-warning" style="font-size: 3rem; margin-bottom: 16px;"></i>
                        <h2 style="margin-bottom: 12px;">Vínculo Não Encontrado</h2>
                        <p style="font-size: 0.95rem; line-height: 1.5; color: var(--text-secondary); margin-bottom: 24px;">
                            Olá, <strong>${user.nome}</strong>. O seu CPF (<strong>${user.cpf}</strong>) ou e-mail de usuário não está cadastrado na base de <strong>Motoristas</strong>.
                        </p>
                        <a href="/" class="btn-driver btn-driver-primary" style="margin-bottom:12px;">
                            <i class="fa-solid fa-chart-line"></i> Acessar Painel Principal
                        </a>
                        <button id="btn-driver-logout" class="btn-driver btn-driver-secondary">
                            <i class="fa-solid fa-right-from-bracket"></i> Sair do Sistema
                        </button>
                    </div>
                </div>
            `;
            document.getElementById("btn-driver-logout").addEventListener("click", handleLogout);
            return;
        }

        // Renderiza estrutura com menu sanduíche/três pontinhos no topo
        rootEl.innerHTML = `
            <!-- Cabeçalho -->
            <header class="driver-header">
                <div class="driver-profile-info">
                    <img src="${driver.foto || '../img/avatar-default.png'}" class="driver-avatar" alt="Avatar">
                    <div class="driver-meta">
                        <h2>Olá, ${driver.nome.split(' ')[0]}</h2>
                        <p>${driver.categoria || 'Motorista'}</p>
                    </div>
                </div>
                <div class="driver-header-actions" style="position: relative; display: flex; align-items: center; gap: 8px;">
                    ${['Administrador', 'Gestor', 'Logística'].includes(user.perfil) ? `
                        <a href="/" class="header-icon-btn" title="Voltar ao Painel">
                            <i class="fa-solid fa-laptop-code"></i>
                        </a>
                    ` : ''}
                    <button id="btn-theme-toggle" class="header-icon-btn">
                        ${isDark ? '<i class="fa-solid fa-sun text-warning"></i>' : '<i class="fa-solid fa-moon"></i>'}
                    </button>
                    <button id="btn-logout" class="header-icon-btn" title="Sair">
                        <i class="fa-solid fa-right-from-bracket text-danger"></i>
                    </button>
                    <button id="btn-driver-menu" class="header-icon-btn" title="Menu" style="margin-left: 4px;">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                    <!-- Dropdown Menu de Navegação -->
                    <div id="driver-dropdown-menu" class="card-glass" style="display:none; position:absolute; top:48px; right:0; width:180px; z-index:1000; padding:8px 0; border-radius:12px; box-shadow: 0 10px 25px rgba(0,0,0,0.35); border:1px solid var(--border-color); background: var(--card-bg, rgba(20, 20, 25, 0.98)); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
                        <button class="dropdown-item nav-tab-dropdown ${AppState.currentTab === 'inicio' ? 'active' : ''}" data-tab="inicio" style="display:flex; align-items:center; gap:12px; width:100%; padding:12px 16px; background:none; border:none; color:var(--text-primary); text-align:left; font-size:0.92rem; font-weight:600; cursor:pointer; transition: background 0.2s;">
                            <i class="fa-solid fa-house" style="width:18px; color:var(--accent-color);"></i> Início
                        </button>
                        <button class="dropdown-item nav-tab-dropdown ${AppState.currentTab === 'viagens' ? 'active' : ''}" data-tab="viagens" style="display:flex; align-items:center; gap:12px; width:100%; padding:12px 16px; background:none; border:none; color:var(--text-primary); text-align:left; font-size:0.92rem; font-weight:600; cursor:pointer; transition: background 0.2s;">
                            <i class="fa-solid fa-route" style="width:18px; color:var(--accent-color);"></i> Viagens
                        </button>
                        <button class="dropdown-item nav-tab-dropdown ${AppState.currentTab === 'solicitacoes' ? 'active' : ''}" data-tab="solicitacoes" style="display:flex; align-items:center; gap:12px; width:100%; padding:12px 16px; background:none; border:none; color:var(--text-primary); text-align:left; font-size:0.92rem; font-weight:600; cursor:pointer; transition: background 0.2s;">
                            <i class="fa-solid fa-screwdriver-wrench" style="width:18px; color:var(--accent-color);"></i> Solicitações
                        </button>
                        <button class="dropdown-item nav-tab-dropdown ${AppState.currentTab === 'perfil' ? 'active' : ''}" data-tab="perfil" style="display:flex; align-items:center; gap:12px; width:100%; padding:12px 16px; background:none; border:none; color:var(--text-primary); text-align:left; font-size:0.92rem; font-weight:600; cursor:pointer; transition: background 0.2s;">
                            <i class="fa-solid fa-user-check" style="width:18px; color:var(--accent-color);"></i> Perfil
                        </button>
                    </div>
                </div>
            </header>

            <!-- Área de Conteúdo SPA -->
            <main id="dashboard-content" class="animate-fade-in" style="padding-top: 8px; padding-bottom: 24px;"></main>
            
            <div class="footer-spacing"></div>

            <!-- Rodapé de Abas Móvel Premium -->
            <nav class="driver-bottom-nav">
                <button class="nav-tab-bottom ${AppState.currentTab === 'inicio' ? 'active' : ''}" data-tab="inicio">
                    <i class="fa-solid fa-house"></i>
                    <span>Início</span>
                </button>
                <button class="nav-tab-bottom ${AppState.currentTab === 'viagens' ? 'active' : ''}" data-tab="viagens">
                    <i class="fa-solid fa-route"></i>
                    <span>Viagens</span>
                </button>
                <button class="nav-tab-bottom ${AppState.currentTab === 'solicitacoes' ? 'active' : ''}" data-tab="solicitacoes">
                    <i class="fa-solid fa-screwdriver-wrench"></i>
                    <span>Solicitações</span>
                </button>
                <button class="nav-tab-bottom ${AppState.currentTab === 'perfil' ? 'active' : ''}" data-tab="perfil">
                    <i class="fa-solid fa-user-check"></i>
                    <span>Perfil</span>
                </button>
            </nav>
        `;

        // Binds do Cabeçalho
        document.getElementById("btn-theme-toggle").addEventListener("click", toggleTheme);
        document.getElementById("btn-logout").addEventListener("click", handleLogout);

        // Bind para abrir o perfil ao clicar nas informações do motorista no topo
        const profileInfo = document.querySelector(".driver-profile-info");
        if (profileInfo) {
            profileInfo.style.cursor = "pointer";
            profileInfo.addEventListener("click", () => {
                simulateTabClick('perfil');
            });
        }

        // Atualização de UI sincronizada para as abas
        const updateActiveTabUI = (tabName) => {
            document.querySelectorAll(".nav-tab-dropdown").forEach(btn => {
                btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
            });
            document.querySelectorAll(".nav-tab-bottom").forEach(btn => {
                btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
            });
        };

        // Bind do Controle do Dropdown Menu
        const menuBtn = document.getElementById("btn-driver-menu");
        const dropdownMenu = document.getElementById("driver-dropdown-menu");
        if (menuBtn && dropdownMenu) {
            menuBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isVisible = dropdownMenu.style.display === "block";
                dropdownMenu.style.display = isVisible ? "none" : "block";
            });

            document.addEventListener("click", (e) => {
                if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
                    dropdownMenu.style.display = "none";
                }
            });
        }

        // Bind das abas no dropdown
        const dropdownTabs = document.querySelectorAll(".nav-tab-dropdown");
        dropdownTabs.forEach(tab => {
            tab.addEventListener("click", (e) => {
                const targetTab = e.currentTarget.getAttribute("data-tab");
                window.location.hash = targetTab;
            });
        });

        // Bind das abas no rodapé
        const bottomTabs = document.querySelectorAll(".nav-tab-bottom");
        bottomTabs.forEach(tab => {
            tab.addEventListener("click", (e) => {
                const targetTab = e.currentTarget.getAttribute("data-tab");
                window.location.hash = targetTab;
            });
        });

        // Carrega aba atual ou sub-view com base na URL
        const hash = window.location.hash.replace('#', '');
        if (hash.startsWith('viagem-detalhe/')) {
            const tripId = hash.split('viagem-detalhe/')[1];
            renderPastTripDetail(tripId);
        } else {
            renderTabContent(AppState.currentTab);
        }
        updateNetworkStatus();
    }

    function renderTabContent(tabName) {
        const contentEl = document.getElementById("dashboard-content");
        if (!contentEl) return;

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (tabName === 'inicio') {
            renderInicioTab(contentEl);
        } else if (tabName === 'viagens') {
            renderViagensTab(contentEl);
        } else if (tabName === 'solicitacoes') {
            renderSolicitacoesTab(contentEl);
        } else if (tabName === 'perfil') {
            renderPerfilTab(contentEl);
        }
    }

    // --- TAB: INÍCIO (DASHBOARD GERAL) ---
    function renderInicioTab(container) {
        const trip = AppState.activeTrip;
        const driver = AppState.activeMotorista;
        
        let activeVehicleHTML = '';
        let tripStatusHTML = '';

        if (trip) {
            const veic = AppState.veiculos.find(v => v.id === trip.veiculoId);
            activeVehicleHTML = `
                <div class="card-glass text-success" style="border-left:4px solid #10b981; display:flex; align-items:center; gap:16px;">
                    <div style="font-size:2.2rem;"><i class="fa-solid fa-truck"></i></div>
                    <div style="flex-grow: 1;">
                        <h4 style="font-size:0.95rem; margin-bottom:2px;">Veículo em Condução</h4>
                        <p style="font-weight:700; font-size:1.15rem; color:var(--text-primary);">${veic ? veic.placa : 'N/A'}</p>
                        <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">${veic ? `${veic.marca} ${veic.modelo}` : ''}</p>
                        ${veic && veic.docVeiculoAnexo ? `
                            <a href="#" id="btn-crlv-inicio" style="font-size:0.76rem; font-weight:600; color:var(--accent-color); text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:2px;">
                                <i class="fa-solid fa-file-invoice"></i> Ver CRLV Digital
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;

            tripStatusHTML = `
                <div class="card-glass" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span style="font-size:0.8rem; font-weight:700; color:#10b981; text-transform:uppercase; display:flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-route animate-pulse"></i> Viagem Ativa
                        </span>
                        <span style="font-size:0.75rem; color:var(--text-secondary);">${formatRouteDate(trip.dataSaida)} às ${trip.horaSaida}</span>
                    </div>
                    <h3 style="font-size:1.1rem; font-weight:700; margin-bottom:4px;">${trip.origem} ➔ ${trip.destino}</h3>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">
                        Saída registrada com ${parseInt(trip.kmInicial).toLocaleString()} KM.
                    </p>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px dashed var(--border-color); padding-top:12px; font-size:0.85rem;">
                        <span class="detail-label">Custo Acumulado:</span>
                        <strong style="color:var(--text-primary); font-size:1.05rem;">${formatCurrency(trip.custos)}</strong>
                    </div>
                </div>
            `;
        } else {
            activeVehicleHTML = `
                <div class="card-glass" style="border-left:4px solid var(--border-color); display:flex; align-items:center; gap:16px; color:var(--text-secondary);">
                    <div style="font-size:2.2rem;"><i class="fa-solid fa-truck-monster"></i></div>
                    <div>
                        <h4 style="font-size:0.95rem; margin-bottom:2px;">Nenhum veículo ativo</h4>
                        <p style="font-size:0.78rem;">Inicie uma viagem para registrar o veículo.</p>
                    </div>
                </div>
            `;

            tripStatusHTML = `
                <div class="card-glass" style="background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i class="fa-solid fa-circle-exclamation text-warning" style="font-size:1.8rem;"></i>
                        <div>
                            <h3 style="font-size:0.95rem; font-weight:700; margin-bottom:2px; color:var(--text-primary);">Aguardando Início de Viagem</h3>
                            <p style="font-size:0.8rem; color:var(--text-secondary);">Você precisa abrir uma rota de viagem antes de lançar custos ou ocorrências.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Fila offline pendente
        const queue = JSON.parse(localStorage.getItem("movix_offline_queue") || "[]");
        let offlineWarningHTML = '';
        if (queue.length > 0) {
            offlineWarningHTML = `
                <div class="card-glass" style="background:rgba(245, 158, 11, 0.08); border:1px solid #f59e0b; color:#d97706; margin-bottom:16px; padding:12px 16px;">
                    <div style="display:flex; align-items:center; gap:10px; font-weight:700; font-size:0.88rem; margin-bottom:4px;">
                        <i class="fa-solid fa-circle-nodes animate-pulse"></i> Sincronização Pendente
                    </div>
                    <p style="font-size:0.78rem; line-height:1.4; color:var(--text-primary);">
                        Existem <strong>${queue.length} lançamentos offline</strong> no navegador aguardando rede para gravação no banco de dados. Eles sincronizarão automaticamente.
                    </p>
                </div>
            `;
        }

        container.innerHTML = `
            ${offlineWarningHTML}
            ${tripStatusHTML}
            ${activeVehicleHTML}

            <!-- Atalhos Rápidos -->
            <div style="margin-top:20px; margin-bottom:12px;">
                <h3 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-left:4px; margin-bottom:12px;"><i class="fa-solid fa-star"></i> Funções Rápidas</h3>
                
                <div class="action-grid">
                    <div class="action-card" id="shortcut-viagem">
                        <i class="fa-solid fa-route"></i>
                        <h3>Acessar Viagem</h3>
                    </div>
                    <div class="action-card" id="shortcut-abastecer" style="pointer-events:${trip ? 'auto' : 'none'}; opacity:${trip ? '1' : '0.45'};">
                        <i class="fa-solid fa-gas-pump text-warning"></i>
                        <h3>Registrar Abastecimento</h3>
                    </div>
                    <div class="action-card" id="shortcut-despesa" style="pointer-events:${trip ? 'auto' : 'none'}; opacity:${trip ? '1' : '0.45'};">
                        <i class="fa-solid fa-receipt text-success"></i>
                        <h3>Registrar Despesa</h3>
                    </div>
                    <div class="action-card" id="shortcut-ocorrencia" style="pointer-events:${trip ? 'auto' : 'none'}; opacity:${trip ? '1' : '0.45'};">
                        <i class="fa-solid fa-triangle-exclamation text-danger"></i>
                        <h3>Relatar Ocorrência</h3>
                    </div>
                </div>
            </div>
        `;

        // Binds dos atalhos
        document.getElementById("shortcut-viagem").addEventListener("click", () => {
            simulateTabClick('viagens');
        });
        
        if (trip) {
            document.getElementById("shortcut-abastecer").addEventListener("click", () => {
                simulateTabClick('viagens');
                setTimeout(() => document.getElementById("btn-modal-fuel").click(), 200);
            });
            document.getElementById("shortcut-despesa").addEventListener("click", () => {
                simulateTabClick('viagens');
                setTimeout(() => document.getElementById("btn-modal-expense").click(), 200);
            });
            document.getElementById("shortcut-ocorrencia").addEventListener("click", () => {
                simulateTabClick('viagens');
                setTimeout(() => document.getElementById("btn-modal-incident").click(), 200);
            });

            const crlvBtn = document.getElementById("btn-crlv-inicio");
            const veic = AppState.veiculos.find(v => v.id === trip.veiculoId);
            if (crlvBtn && veic) {
                crlvBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    openDocZoomModal(veic.docVeiculoAnexo);
                });
            }
        }
    }

    function simulateTabClick(tabName) {
        const tabs = document.querySelectorAll(".nav-tab-dropdown");
        const tabEl = Array.from(tabs).find(t => t.getAttribute("data-tab") === tabName);
        if (tabEl) tabEl.click();
    }

    // --- TAB: VIAGENS (CONTROLE DA ATIVA E HISTÓRICO) ---
    function renderViagensTab(container) {
        const trip = AppState.activeTrip;
        
        if (trip) {
            renderActiveTripDetailView(container, trip);
        } else {
            renderNoActiveTripFormView(container);
        }
    }

    function renderNoActiveTripFormView(container) {
        container.innerHTML = `
            <div class="card-glass animate-fade-in">
                <div class="card-title">
                    <i class="fa-solid fa-circle-play"></i>
                    <span>Iniciar Nova Viagem</span>
                </div>
                
                <form id="start-trip-form">
                    <div class="form-group">
                        <label for="trip-veiculo">Veículo da Frota</label>
                        <select id="trip-veiculo" class="input-control" required>
                            <option value="" disabled selected>Selecione o Veículo...</option>
                            ${AppState.veiculos.map(v => `
                                <option value="${v.id}" data-km="${v.kmAtual}">${v.placa} - ${v.marca} ${v.modelo} (KM: ${parseInt(v.kmAtual).toLocaleString()})</option>
                            `).join('')}
                        </select>
                    </div>

                    <div id="start-trip-warning-container" style="display:none; margin: 16px 0;"></div>

                    <div id="start-trip-fields">
                        <div class="form-group">
                            <label for="trip-km-inicial">Quilometragem Inicial (KM)</label>
                            <input type="number" id="trip-km-inicial" class="input-control" placeholder="Aguardando veículo..." required readonly>
                        </div>
                        
                        <div class="form-group">
                            <label for="trip-origem">Origem da Rota</label>
                            <input type="text" id="trip-origem" class="input-control" placeholder="Cidade ou Local de Origem (Ex: Sede, Garagem, etc.)" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="trip-destino">Destino Final</label>
                            <input type="text" id="trip-destino" class="input-control" placeholder="Cidade ou Cliente de Destino" required>
                        </div>

                        <div class="form-group">
                            <label for="trip-observacao">Objetivo / Observações</label>
                            <textarea id="trip-observacao" class="input-control" rows="2" placeholder="Descreva a finalidade da viagem..."></textarea>
                        </div>

                        <div class="form-group">
                            <label>Foto do Painel / Odômetro (Opcional)</label>
                            <input type="file" id="trip-photo-input" accept="image/*" style="display:none;">
                            
                            <div id="trip-photo-uploader" class="photo-uploader">
                                <i class="fa-solid fa-camera"></i>
                                <p>Tirar Foto ou Escolher Arquivo</p>
                            </div>
                            
                            <div id="trip-photo-preview-container" class="photo-preview-container">
                                <img id="trip-photo-preview" class="photo-preview" src="#" alt="Preview">
                                <button type="button" id="btn-remove-trip-photo" class="photo-remove-btn">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="btn-driver btn-driver-primary" style="margin-top: 8px;">
                            <i class="fa-solid fa-circle-check"></i> Abrir Viagem
                        </button>
                    </div>
                </form>
            </div>

            <!-- MODAL: ASSUMIR CONDUÇÃO -->
            <div id="modal-assume-conduction" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Assumir Condução da Viagem</h2>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:16px; line-height:1.4;">
                        <p style="margin-bottom:8px;">Você está assumindo o veículo <strong id="assume-veic-placa" style="color:var(--accent-color);"></strong> na viagem ativa:</p>
                        <div class="card-glass" style="padding:12px; background:rgba(255,255,255,0.02); border-color:var(--border-color); font-size:0.8rem; margin-bottom:8px;">
                            <div style="margin-bottom:4px;"><strong>Motorista anterior:</strong> <span id="assume-mot-nome"></span></div>
                            <div style="margin-bottom:4px;"><strong>Destino:</strong> <span id="assume-destino"></span></div>
                            <div><strong>Partida:</strong> <span id="assume-data-hora"></span></div>
                        </div>
                    </div>
                    <form id="form-assume-conduction">
                        <div class="form-group">
                            <label for="assume-km">Quilometragem Atual no Momento da Troca (KM)</label>
                            <input type="number" id="assume-km" class="input-control" required placeholder="Ex: 275">
                        </div>
                        <div class="form-group">
                            <label for="assume-obs">Observações Adicionais (Opcional)</label>
                            <textarea id="assume-obs" class="input-control" rows="2" placeholder="Ex: Recebi o veículo do outro condutor na BR 316..."></textarea>
                        </div>
                        <button type="submit" class="btn-driver btn-driver-primary">
                            <i class="fa-solid fa-circle-check"></i> Confirmar e Assumir Condução
                        </button>
                    </form>
                </div>
            </div>

            <!-- MODAL: ESCOLHAS DE CONFLITO -->
            <div id="modal-conflict-choices" class="modal-overlay">
                <div class="modal-content" style="max-width: 480px;">
                    <div class="modal-header">
                        <h2>Veículo com Viagem Aberta</h2>
                        <button class="modal-close" type="button" id="btn-choice-close">&times;</button>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:20px; line-height:1.5;">
                        <p style="margin-bottom:12px; font-weight:600; color:var(--warning);">Este veículo possui uma viagem em andamento.</p>
                        <div class="card-glass" style="padding:14px; background:rgba(255,255,255,0.02); border-color:var(--border-color); font-size:0.8rem; margin-bottom:16px;">
                            <div style="margin-bottom:6px;"><strong>Iniciada por:</strong> <span id="choice-mot-nome" style="color:var(--text-primary); font-weight:600;"></span></div>
                            <div style="margin-bottom:6px;"><strong>Início:</strong> <span id="choice-data-hora" style="color:var(--text-primary);"></span></div>
                            <div style="margin-bottom:6px;"><strong>KM inicial:</strong> <span id="choice-km-inicial" style="color:var(--text-primary);"></span> km</div>
                            <div><strong>Destino:</strong> <span id="choice-destino" style="color:var(--text-primary);"></span></div>
                        </div>
                        <p style="font-weight:600; color:var(--text-primary); margin-top:12px;">Você recebeu este veículo de outro motorista?</p>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button type="button" class="btn-driver btn-driver-primary" id="choice-assume" style="justify-content:center; gap:6px;">
                            <i class="fa-solid fa-people-arrows"></i> Assumir condução
                        </button>
                        <button type="button" class="btn-driver btn-driver-warning" id="choice-force-close" style="justify-content:center; gap:6px; background-color:var(--warning); color:#000;">
                            <i class="fa-solid fa-rectangle-xmark"></i> Encerrar viagem anterior e iniciar nova
                        </button>
                        <button type="button" class="btn-driver btn-driver-secondary" id="choice-back" style="justify-content:center; gap:6px;">
                            Voltar
                        </button>
                    </div>
                </div>
            </div>

            <!-- MODAL: CONFIRMAR ENCERRAMENTO FORÇADO -->
            <div id="modal-force-close" class="modal-overlay">
                <div class="modal-content" style="max-width: 440px;">
                    <div class="modal-header">
                        <h2>Encerrar Viagem Anterior</h2>
                        <button class="modal-close" type="button" id="btn-force-close-close">&times;</button>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:16px; line-height:1.4;">
                        <p>Você está encerrando a viagem iniciada por <strong id="force-mot-nome"></strong> para liberar o veículo.</p>
                        <p style="margin-top:8px; font-weight:600; color:var(--warning);">A viagem anterior será encerrada com a data e hora atuais do sistema.</p>
                    </div>
                    <form id="form-force-close">
                        <div class="form-group">
                            <label for="force-km-final">Quilometragem no Momento do Recebimento (KM)</label>
                            <input type="number" id="force-km-final" class="input-control" required placeholder="Ex: 10120">
                        </div>
                        <button type="submit" class="btn-driver btn-driver-primary" style="background-color:var(--warning); color:#000;">
                            <i class="fa-solid fa-circle-check"></i> Confirmar Encerramento
                        </button>
                    </form>
                </div>
            </div>

            <!-- Seção de Histórico de Viagens Concluídas -->
            <div id="historico-viagens-container" style="margin-top: 24px;"></div>
        `;

        const veicSelect = document.getElementById("trip-veiculo");
        initAutocomplete(veicSelect, "Selecione o Veículo...");
        const kmInput = document.getElementById("trip-km-inicial");
        const uploader = document.getElementById("trip-photo-uploader");
        const fileInput = document.getElementById("trip-photo-input");
        const previewContainer = document.getElementById("trip-photo-preview-container");
        const previewImg = document.getElementById("trip-photo-preview");
        const removePhotoBtn = document.getElementById("btn-remove-trip-photo");

        const modal = document.getElementById("modal-assume-conduction");
        const closeModal = () => modal.classList.remove("active");
        modal.querySelector(".modal-close").addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });

        const modalChoices = document.getElementById("modal-conflict-choices");
        const modalForceClose = document.getElementById("modal-force-close");
        const formForceClose = document.getElementById("form-force-close");

        const closeChoices = () => modalChoices.classList.remove("active");
        const closeForceClose = () => modalForceClose.classList.remove("active");

        // Choices Modal close listeners
        document.getElementById("btn-choice-close").addEventListener("click", () => {
            veicSelect.value = "";
            veicSelect.dispatchEvent(new Event('change', { bubbles: true }));
            closeChoices();
        });
        modalChoices.addEventListener("click", (e) => {
            if (e.target === modalChoices) {
                veicSelect.value = "";
                veicSelect.dispatchEvent(new Event('change', { bubbles: true }));
                closeChoices();
            }
        });

        // Choice button actions
        document.getElementById("choice-back").addEventListener("click", () => {
            veicSelect.value = "";
            veicSelect.dispatchEvent(new Event('change', { bubbles: true }));
            closeChoices();
        });

        const formAssume = document.getElementById("form-assume-conduction");
        let activeConflictTrip = null;

        document.getElementById("choice-assume").addEventListener("click", () => {
            closeChoices();
            if (activeConflictTrip) {
                const selectedVeh = AppState.veiculos.find(v => v.id === activeConflictTrip.veiculoId);
                document.getElementById("assume-veic-placa").innerText = selectedVeh ? `${selectedVeh.marca} ${selectedVeh.modelo} (${selectedVeh.placa})` : '';
                document.getElementById("assume-mot-nome").innerText = activeConflictTrip.motoristaNome;
                document.getElementById("assume-destino").innerText = activeConflictTrip.destino;
                document.getElementById("assume-data-hora").innerText = `${formatRouteDate(activeConflictTrip.dataSaida)} às ${activeConflictTrip.horaSaida || '-'}`;
                
                document.getElementById("assume-km").value = selectedVeh ? selectedVeh.kmAtual : '';
                document.getElementById("assume-obs").value = '';
                modal.classList.add("active");
            }
        });

        document.getElementById("choice-force-close").addEventListener("click", () => {
            closeChoices();
            if (activeConflictTrip) {
                const selectedVeh = AppState.veiculos.find(v => v.id === activeConflictTrip.veiculoId);
                document.getElementById("force-mot-nome").innerText = activeConflictTrip.motoristaNome;
                document.getElementById("force-km-final").value = selectedVeh ? selectedVeh.kmAtual : '';
                modalForceClose.classList.add("active");
            }
        });

        // Force Close Modal close listeners
        document.getElementById("btn-force-close-close").addEventListener("click", closeForceClose);
        modalForceClose.addEventListener("click", (e) => {
            if (e.target === modalForceClose) closeForceClose();
        });

        veicSelect.addEventListener("change", () => {
            const selectedOpt = veicSelect.options[veicSelect.selectedIndex];
            const selectedVehicleId = veicSelect.value;
            
            const warningContainer = document.getElementById("start-trip-warning-container");
            const fieldsWrapper = document.getElementById("start-trip-fields");

            const conflictTrip = selectedVehicleId && AppState.allViagens
                ? AppState.allViagens.find(v => v.veiculoId === selectedVehicleId && (v.status && v.status.toLowerCase() === 'em andamento'))
                : null;

            activeConflictTrip = conflictTrip;

            if (conflictTrip) {
                const selectedVeh = AppState.veiculos.find(v => v.id === selectedVehicleId);

                warningContainer.innerHTML = `
                    <div class="card-glass text-warning" style="border-left: 4px solid var(--warning); padding: 14px 18px;">
                        <p style="font-size:0.85rem; line-height:1.4; margin-bottom: 12px; text-align: left;">
                            <strong>Atenção!</strong> Este veículo já está em uma viagem ativa iniciada por <strong>${conflictTrip.motoristaNome || 'Outro Motorista'}</strong> com destino a <strong>${conflictTrip.destino}</strong> (Saída: ${formatRouteDate(conflictTrip.dataSaida)} às ${conflictTrip.horaSaida || '-'}).
                        </p>
                        <button type="button" class="btn-driver btn-driver-primary" id="btn-show-choices" style="font-size:0.8rem; padding: 8px 12px; height:auto; width:auto; display:inline-flex;">
                            <i class="fa-solid fa-people-arrows"></i> Opções de Conflito
                        </button>
                    </div>
                `;
                warningContainer.style.display = "block";
                fieldsWrapper.style.display = "none";

                // Populate choices modal
                document.getElementById("choice-mot-nome").innerText = conflictTrip.motoristaNome || 'Outro Motorista';
                document.getElementById("choice-data-hora").innerText = `${formatRouteDate(conflictTrip.dataSaida)} às ${conflictTrip.horaSaida || '-'}`;
                document.getElementById("choice-km-inicial").innerText = parseInt(conflictTrip.kmInicial).toLocaleString();
                document.getElementById("choice-destino").innerText = conflictTrip.destino;

                // Open choices modal automatically
                modalChoices.classList.add("active");

                // Bind choice button click from warning card
                document.getElementById("btn-show-choices").addEventListener("click", () => {
                    modalChoices.classList.add("active");
                });

            } else {
                warningContainer.innerHTML = "";
                warningContainer.style.display = "none";
                fieldsWrapper.style.display = "block";

                if (selectedOpt && selectedOpt.value) {
                    const km = selectedOpt.getAttribute("data-km");
                    kmInput.value = km;
                    kmInput.removeAttribute("readonly");
                } else {
                    kmInput.value = "";
                    kmInput.setAttribute("readonly", true);
                }
            }
        });

        formAssume.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!activeConflictTrip) return;

            const kmTroca = parseFloat(document.getElementById("assume-km").value) || 0;
            const observacoes = document.getElementById("assume-obs").value.trim();

            if (kmTroca < parseFloat(activeConflictTrip.kmInicial)) {
                showToast(`O KM de troca não pode ser menor do que a saída (${activeConflictTrip.kmInicial} KM).`, "danger");
                return;
            }

            const submitBtn = formAssume.querySelector("button[type='submit']");
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gravando...';

            const now = new Date();
            const dataTroca = now.toISOString().split('T')[0];
            const horaTroca = now.toTimeString().split(' ')[0].substring(0, 5);

            if (navigator.onLine) {
                try {
                    const res = await fetch(`/api/viagens/${activeConflictTrip.id}/troca-motorista`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            novoMotoristaId: AppState.activeMotorista.id,
                            dataTroca,
                            horaTroca,
                            kmTroca,
                            localTroca: "Troca assumida diretamente pelo motorista",
                            observacoes
                        })
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Erro ao registrar troca de condução.');
                    }

                    showToast("Condução da viagem assumida com sucesso!", "success");
                    closeModal();
                    await loadAppData();
                    renderDashboard();
                } catch (err) {
                    showToast(err.message, "danger");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirmar e Assumir Condução';
                }
            } else {
                showToast("A troca de motorista precisa de rede de internet e não pode ser feita offline.", "warning");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirmar e Assumir Condução';
            }
        });

        formForceClose.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!activeConflictTrip) return;

            const kmFinal = parseFloat(document.getElementById("force-km-final").value) || 0;

            if (kmFinal < parseFloat(activeConflictTrip.kmInicial)) {
                showToast(`O KM final não pode ser menor do que a saída da viagem anterior (${activeConflictTrip.kmInicial} KM).`, "danger");
                return;
            }

            const submitBtn = formForceClose.querySelector("button[type='submit']");
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Finalizando...';

            const now = new Date();
            const dataRetorno = now.toISOString().split('T')[0];
            const horaRetorno = now.toTimeString().split(' ')[0].substring(0, 5);
            
            const appendObs = (activeConflictTrip.observacoes ? activeConflictTrip.observacoes + "\n" : "") + 
                `[Viagem finalizada automaticamente por ${AppState.activeMotorista.nome} — motorista anterior não finalizou a viagem.]`;

            if (navigator.onLine) {
                try {
                    const res = await fetch(`/api/viagens/${activeConflictTrip.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: "Realizada",
                            dataRetorno,
                            horaRetorno,
                            kmFinal,
                            observacoes: appendObs,
                            finalizadaPorOutroMotorista: true
                        })
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Erro ao encerrar viagem anterior.');
                    }

                    showToast("Viagem anterior finalizada com sucesso!", "success");
                    closeForceClose();
                    
                    const savedVehId = activeConflictTrip.veiculoId;
                    
                    // Reload system data to clear the previous trip and load new vehicle list/KMs
                    await loadAppData();
                    
                    // Restore form display state
                    document.getElementById("start-trip-warning-container").style.display = "none";
                    document.getElementById("start-trip-fields").style.display = "block";
                    
                    // Prefill new trip start KM with the final KM entered
                    veicSelect.value = savedVehId;
                    veicSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    kmInput.value = kmFinal;
                    kmInput.removeAttribute("readonly");
                    
                    // Clear other fields to start fresh
                    document.getElementById("trip-origem").value = "";
                    document.getElementById("trip-destino").value = "";
                    document.getElementById("trip-observacao").value = "";
                    
                    document.getElementById("trip-origem").focus();
                } catch (err) {
                    showToast(err.message, "danger");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirmar Encerramento';
                }
            } else {
                showToast("Esta ação precisa de rede de internet e não pode ser feita offline.", "warning");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirmar Encerramento';
            }
        });

        uploader.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async (e) => {
            if (e.target.files && e.target.files[0]) {
                uploader.style.display = "none";
                previewContainer.classList.add("active");
                previewImg.src = URL.createObjectURL(e.target.files[0]);
                
                showToast("Carregando foto...", "info");
                try {
                    if (navigator.onLine) {
                        const url = await uploadFile(e.target.files[0]);
                        AppState.tempPhotoUrl = url;
                        showToast("Foto anexada!", "success");
                    } else {
                        const b64 = await readFileAsBase64(e.target.files[0]);
                        AppState.tempPhotoBase64 = b64;
                        showToast("Foto armazenada localmente (offline)", "info");
                    }
                } catch(err) {
                    showToast("Erro ao processar foto.", "danger");
                    resetFileUploader(uploader, previewContainer, fileInput);
                }
            }
        });

        removePhotoBtn.addEventListener("click", () => {
            resetFileUploader(uploader, previewContainer, fileInput);
            AppState.tempPhotoBase64 = null;
        });

        document.getElementById("start-trip-form").addEventListener("submit", handleStartTripSubmit);
        
        renderTripsHistory(document.getElementById("historico-viagens-container"));
    }

    async function handleStartTripSubmit(e) {
        e.preventDefault();
        const veiculoId = document.getElementById("trip-veiculo").value;
        const kmInicial = parseFloat(document.getElementById("trip-km-inicial").value) || 0;
        const origem = document.getElementById("trip-origem").value.trim();
        const destino = document.getElementById("trip-destino").value.trim();
        const observacoes = document.getElementById("trip-observacao").value.trim();
        
        const now = new Date();
        const dataSaida = now.toISOString().split("T")[0];
        const horaSaida = now.toTimeString().split(" ")[0].substring(0, 5);

        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando Saída...';

        const payload = {
            veiculoId,
            motoristaId: AppState.activeMotorista.id,
            dataSaida,
            horaSaida,
            kmInicial,
            origem,
            destino,
            observacoes,
            status: 'Em Andamento',
            fotoInicial: AppState.tempPhotoUrl
        };

        if (navigator.onLine) {
            try {
                const res = await fetch('/api/viagens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Erro ao iniciar viagem.');
                }

                AppState.tempPhotoUrl = null;
                showToast("Viagem iniciada com sucesso!", "success");
                await loadAppData();
                renderDashboard();
            } catch (err) {
                showToast(err.message, "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Abrir Viagem';
            }
        } else {
            const item = {
                id: 'OFF-' + Date.now(),
                action: 'start_trip',
                payload,
                tempPhotoBase64: AppState.tempPhotoBase64
            };
            saveOfflineAction(item);
            AppState.tempPhotoBase64 = null;
            showToast("Viagem aberta em Modo Offline!", "info");
            
            loadOfflineAppData();
            renderDashboard();
        }
    }

    function renderActiveTripDetailView(container, trip) {
        const veic = AppState.veiculos.find(v => v.id === trip.veiculoId);
        
        container.innerHTML = `
            <div class="card-glass animate-fade-in">
                <div class="card-title" style="justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <span><i class="fa-solid fa-route text-success"></i> Detalhes da Rota Ativa</span>
                    <span class="status-pill em_andamento" style="font-size:0.7rem;">Em Andamento</span>
                </div>
                <div class="trip-detail-row">
                    <span class="detail-label">Veículo</span>
                    <span class="detail-value" style="color:var(--accent-color); display:flex; flex-direction:column; align-items:flex-end;">
                        ${veic ? `${veic.marca} ${veic.modelo} (${veic.placa})` : 'N/A'}
                        ${veic && veic.docVeiculoAnexo ? `
                            <a href="#" id="btn-crlv-viagens" style="font-size:0.75rem; font-weight:600; color:var(--success); margin-top:4px; display:inline-flex; align-items:center; gap:4px; text-decoration:none;">
                                <i class="fa-solid fa-file-invoice"></i> Ver CRLV Digital
                            </a>
                        ` : ''}
                    </span>
                </div>
                <div class="trip-detail-row">
                    <span class="detail-label">Origem</span>
                    <span class="detail-value">${trip.origem}</span>
                </div>
                <div class="trip-detail-row">
                    <span class="detail-label">Destino</span>
                    <span class="detail-value">${trip.destino}</span>
                </div>
                <div class="trip-detail-row">
                    <span class="detail-label">Partida</span>
                    <span class="detail-value">${formatRouteDate(trip.dataSaida)} às ${trip.horaSaida}</span>
                </div>
                <div class="trip-detail-row">
                    <span class="detail-label">KM Inicial</span>
                    <span class="detail-value">${parseFloat(trip.kmInicial).toLocaleString('pt-BR')} km</span>
                </div>
                <div class="trip-detail-row" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
                    <span class="detail-label">Custos Lançados</span>
                    <span class="detail-value" style="color:var(--success);">${formatCurrency(trip.custos)}</span>
                </div>
            </div>

            <!-- Grade de Ações -->
            <div class="action-grid">
                <div class="action-card" id="btn-modal-fuel">
                    <i class="fa-solid fa-gas-pump text-warning"></i>
                    <h3>Registrar Abastecimento</h3>
                </div>
                <div class="action-card" id="btn-modal-expense">
                    <i class="fa-solid fa-receipt text-success"></i>
                    <h3>Registrar Despesa</h3>
                </div>
                <div class="action-card" id="btn-modal-incident">
                    <i class="fa-solid fa-triangle-exclamation text-danger"></i>
                    <h3>Registrar Ocorrência</h3>
                </div>
                <div class="action-card" id="btn-modal-swap">
                    <i class="fa-solid fa-people-arrows text-info"></i>
                    <h3>Trocar Motorista</h3>
                </div>
            </div>

            <!-- Concluir -->
            <button id="btn-modal-close-trip" class="btn-driver btn-driver-danger" style="margin-bottom: 24px;">
                <i class="fa-solid fa-flag-checkered"></i> Concluir Viagem Atual
            </button>

            <!-- MODAIS DA VIAGEM ATIVA -->
            
            <!-- MODAL 1: ABASTECIMENTO -->
            <div id="modal-fuel" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Registrar Abastecimento</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="form-refuel">
                        <div class="form-group">
                            <label for="fuel-posto">Posto de Combustível</label>
                            <input type="text" id="fuel-posto" class="input-control" placeholder="Ex: Posto BR Trevo" required>
                        </div>
                        <div class="form-group">
                            <label for="fuel-tipo">Tipo de Combustível</label>
                            <select id="fuel-tipo" class="input-control" required>
                                <option value="" disabled selected>Selecione o combustível...</option>
                                <option value="Diesel S10">Diesel S10</option>
                                <option value="Diesel S500">Diesel S500</option>
                                <option value="Gasolina Comum">Gasolina Comum</option>
                                <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                                <option value="Etanol">Etanol</option>
                                <option value="Arla 32">Arla 32</option>
                            </select>
                        </div>
                        <div class="btn-group-row" style="margin-top:0;">
                            <div class="form-group">
                                <label for="fuel-preco-litro">Valor por Litro (R$)</label>
                                <input type="text" id="fuel-preco-litro" class="input-control" placeholder="Ex: R$ 6,89" required>
                            </div>
                            <div class="form-group">
                                <label for="fuel-litros">Litros Abastecidos</label>
                                <input type="number" step="0.001" id="fuel-litros" class="input-control" placeholder="Ex: 104,776" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="fuel-valor">Valor Pago Total (R$)</label>
                            <input type="text" id="fuel-valor" class="input-control" placeholder="Calculado automaticamente" readonly style="background: rgba(255,255,255,0.03); color: #10b981; font-weight: 700;">
                        </div>
                        <div class="form-group">
                            <label for="fuel-km">Odômetro Atual (KM)</label>
                            <input type="number" id="fuel-km" class="input-control" required placeholder="Deve ser maior ou igual a ${trip.kmInicial}">
                        </div>
                        <div class="form-group">
                            <label>Foto da Nota Fiscal / Cupom</label>
                            <input type="file" id="fuel-photo-input" accept="image/*" style="display:none;">
                            <div id="fuel-photo-uploader" class="photo-uploader">
                                <i class="fa-solid fa-file-invoice-dollar"></i>
                                <p>Fotografar Comprovante</p>
                            </div>
                            <div id="fuel-photo-preview-container" class="photo-preview-container">
                                <img id="fuel-photo-preview" class="photo-preview" src="#" alt="Preview">
                                <button type="button" id="btn-remove-fuel-photo" class="photo-remove-btn"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>
                        <button type="submit" class="btn-driver btn-driver-primary">
                            <i class="fa-solid fa-save"></i> Enviar Abastecimento
                        </button>
                    </form>
                </div>
            </div>

            <!-- MODAL 2: REGISTRAR CUSTO/DESPESA -->
            <div id="modal-expense" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Registrar Custo da Viagem</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="form-expense">
                        <div class="form-group">
                            <label for="exp-tipo">Tipo de Custo</label>
                            <select id="exp-tipo" class="input-control" required>
                                <option value="" disabled selected>Selecione o tipo de custo...</option>
                                <option value="Pedágio">Pedágio</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Hospedagem">Hospedagem</option>
                                <option value="Estacionamento">Estacionamento</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="exp-valor">Valor Pago (R$)</label>
                            <input type="text" id="exp-valor" class="input-control" placeholder="Ex: R$ 45,50" required>
                        </div>
                        <div class="form-group">
                            <label for="exp-desc">Descrição / Comentários</label>
                            <input type="text" id="exp-desc" class="input-control" placeholder="Ex: Almoço churrascaria BR, Pedágio Km 120" required>
                        </div>
                        <button type="submit" class="btn-driver btn-driver-primary">
                            <i class="fa-solid fa-floppy-disk"></i> Confirmar Custo
                        </button>
                    </form>
                </div>
            </div>

            <!-- MODAL 3: REGISTRAR OCORRÊNCIA -->
            <div id="modal-incident" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Relatar Ocorrência de Rota</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="form-incident">
                        <div class="form-group">
                            <label for="incident-desc">Relatório do Acontecido</label>
                            <textarea id="incident-desc" class="input-control" rows="3" placeholder="Descreva o incidente ou problema ocorrido na rota..." required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Foto do Acontecido (Opcional)</label>
                            <input type="file" id="inc-photo-input" accept="image/*" style="display:none;">
                            <div id="inc-photo-uploader" class="photo-uploader">
                                <i class="fa-solid fa-camera-retro"></i>
                                <p>Capturar Foto do Local</p>
                            </div>
                            <div id="inc-photo-preview-container" class="photo-preview-container">
                                <img id="inc-photo-preview" class="photo-preview" src="#" alt="Preview">
                                <button type="button" id="btn-remove-inc-photo" class="photo-remove-btn"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>
                        <button type="submit" class="btn-driver btn-driver-primary">
                            <i class="fa-solid fa-paper-plane"></i> Enviar Ocorrência
                        </button>
                    </form>
                </div>
            </div>

            <!-- MODAL 4: TROCA DE MOTORISTA -->
            <div id="modal-swap" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Registrar Troca de Motorista</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="form-swap">
                        <div style="background:rgba(59,130,246,0.08); padding:10px; border-radius:6px; font-size:0.78rem; color:var(--accent-color); margin-bottom:14px; line-height:1.4;">
                            <i class="fa-solid fa-info-circle"></i> Após a confirmação, o controle deste veículo será transferido para o novo motorista e sua viagem será encerrada localmente.
                        </div>
                        <div class="form-group">
                            <label for="swap-driver">Novo Motorista Responsável</label>
                            <select id="swap-driver" class="input-control" required></select>
                        </div>
                        <div class="form-group">
                            <label for="swap-km">KM Atual de Troca</label>
                            <input type="number" id="swap-km" class="input-control" required placeholder="Odômetro na troca de condutor">
                        </div>
                        <div class="form-group">
                            <label for="swap-local">Local de Troca (Opcional)</label>
                            <input type="text" id="swap-local" class="input-control" placeholder="Cidade, posto ou KM da rodovia">
                        </div>
                        <div class="form-group">
                            <label for="swap-obs">Observações adicionais</label>
                            <textarea id="swap-obs" class="input-control" rows="2" placeholder="Qualquer observação sobre a entrega do veículo"></textarea>
                        </div>
                        <button type="submit" class="btn-driver btn-driver-primary">
                            <i class="fa-solid fa-people-arrows"></i> Confirmar e Entregar Controle
                        </button>
                    </form>
                </div>
            </div>

            <!-- MODAL 5: FINALIZAR VIAGEM -->
            <div id="modal-close-trip" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Finalizar Rota de Viagem</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="form-end-trip">
                        <div class="form-group">
                            <label for="end-km-final">Quilometragem Final no Painel (KM)</label>
                            <input type="number" id="end-km-final" class="input-control" required placeholder="Deve ser maior que ${trip.kmInicial}">
                        </div>
                        <div class="form-group">
                            <label for="end-observacoes">Observações Finais</label>
                            <textarea id="end-observacoes" class="input-control" rows="2" placeholder="Resumo de retorno ou pendências do veículo..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>Foto do Painel no Retorno</label>
                            <input type="file" id="end-photo-input" accept="image/*" style="display:none;">
                            <div id="end-photo-uploader" class="photo-uploader">
                                <i class="fa-solid fa-camera"></i>
                                <p>Fotografar Odômetro Final</p>
                            </div>
                            <div id="end-photo-preview-container" class="photo-preview-container">
                                <img id="end-photo-preview" class="photo-preview" src="#" alt="Preview">
                                <button type="button" id="btn-remove-end-photo" class="photo-remove-btn"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>
                        <button type="submit" class="btn-driver btn-driver-danger">
                            <i class="fa-solid fa-circle-check"></i> Encerrar e Fechar Viagem
                        </button>
                    </form>
                </div>
            </div>
        `;

        setupModalTriggers("btn-modal-fuel", "modal-fuel");
        setupModalTriggers("btn-modal-expense", "modal-expense");
        setupModalTriggers("btn-modal-incident", "modal-incident");
        setupModalTriggers("btn-modal-swap", "modal-swap");
        setupModalTriggers("btn-modal-close-trip", "modal-close-trip");

        setupModalUploader("fuel-photo-uploader", "fuel-photo-input", "fuel-photo-preview-container", "fuel-photo-preview", "btn-remove-fuel-photo");
        setupModalUploader("inc-photo-uploader", "inc-photo-input", "inc-photo-preview-container", "inc-photo-preview", "btn-remove-inc-photo");
        setupModalUploader("end-photo-uploader", "end-photo-input", "end-photo-preview-container", "end-photo-preview", "btn-remove-end-photo");

        loadSwapDriversOptions();

        // Cálculo Automático de Abastecimento (Valor por Litro * Litros Abastecidos)
        const precoInput = document.getElementById("fuel-preco-litro");
        const litrosInput = document.getElementById("fuel-litros");
        const valorInput = document.getElementById("fuel-valor");

        const calcTotal = () => {
            const p = cleanCurrencyValue(precoInput.value) || 0;
            const l = parseFloat(litrosInput.value) || 0;
            const total = p * l;
            if (total > 0) {
                valorInput.value = formatCurrencyValue(total);
            } else {
                valorInput.value = '';
            }
        };

        if (precoInput && litrosInput && valorInput) {
            precoInput.addEventListener("input", calcTotal);
            litrosInput.addEventListener("input", calcTotal);
        }

        applyCurrencyMask(precoInput);
        applyCurrencyMask(document.getElementById("exp-valor"));
        initAutocomplete(document.getElementById("swap-driver"), "Selecione o novo motorista...");

        document.getElementById("form-refuel").addEventListener("submit", (e) => handleRefuelSubmit(e, trip));
        document.getElementById("form-expense").addEventListener("submit", (e) => handleExpenseSubmit(e, trip));
        document.getElementById("form-incident").addEventListener("submit", (e) => handleIncidentSubmit(e, trip));
        document.getElementById("form-swap").addEventListener("submit", (e) => handleSwapSubmit(e, trip));
        document.getElementById("form-end-trip").addEventListener("submit", (e) => handleEndTripSubmit(e, trip));

        const crlvViagensBtn = document.getElementById("btn-crlv-viagens");
        if (crlvViagensBtn && veic) {
            crlvViagensBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openDocZoomModal(veic.docVeiculoAnexo);
            });
        }
    }

    async function loadSwapDriversOptions() {
        const select = document.getElementById("swap-driver");
        if (!select) return;
        try {
            const res = await fetch('/api/motoristas');
            if (res.ok) {
                const list = await res.json();
                const filtered = list.filter(m => m.id !== AppState.activeMotorista.id && m.status === 'ativo');
                select.innerHTML = '<option value="" disabled selected>Selecione o novo motorista...</option>' + filtered.map(m => `
                    <option value="${m.id}">${m.nome} (${m.categoria})</option>
                `).join('');
            }
        } catch(err) {
            select.innerHTML = '<option value="">Erro ao carregar condutores...</option>';
        }
    }

    function setupModalTriggers(btnId, modalId) {
        const btn = document.getElementById(btnId);
        const modal = document.getElementById(modalId);
        if (!btn || !modal) return;
        const closeBtn = modal.querySelector(".modal-close");

        btn.addEventListener("click", () => {
            modal.classList.add("active");
        });

        const closeModal = () => {
            modal.classList.remove("active");
            AppState.tempPhotoUrl = null;
            AppState.tempPhotoBase64 = null;
        };

        closeBtn.addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function setupModalUploader(uploaderId, inputId, previewContId, previewImgId, removeBtnId) {
        const uploader = document.getElementById(uploaderId);
        const fileInput = document.getElementById(inputId);
        const previewContainer = document.getElementById(previewContId);
        const previewImg = document.getElementById(previewImgId);
        const removeBtn = document.getElementById(removeBtnId);
        if (!uploader) return;

        uploader.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async (e) => {
            if (e.target.files && e.target.files[0]) {
                uploader.style.display = "none";
                previewContainer.classList.add("active");
                previewImg.src = URL.createObjectURL(e.target.files[0]);
                
                showToast("Carregando comprovante...", "info");
                try {
                    if (navigator.onLine) {
                        const url = await uploadFile(e.target.files[0]);
                        AppState.tempPhotoUrl = url;
                        showToast("Comprovante anexado!", "success");
                    } else {
                        const b64 = await readFileAsBase64(e.target.files[0]);
                        AppState.tempPhotoBase64 = b64;
                        showToast("Foto salva localmente (offline)", "info");
                    }
                } catch(err) {
                    showToast("Erro no upload do anexo.", "danger");
                    resetFileUploader(uploader, previewContainer, fileInput);
                }
            }
        });

        removeBtn.addEventListener("click", () => {
            resetFileUploader(uploader, previewContainer, fileInput);
            AppState.tempPhotoBase64 = null;
        });
    }

    // --- ENVIOS DA VIAGEM ---
    async function handleRefuelSubmit(e, trip) {
        e.preventDefault();
        const posto = document.getElementById("fuel-posto").value.trim();
        const combustivel = document.getElementById("fuel-tipo").value;
        const precoLitro = cleanCurrencyValue(document.getElementById("fuel-preco-litro").value) || 0;
        const litros = parseFloat(document.getElementById("fuel-litros").value) || 0;
        const valorTotal = precoLitro * litros;
        const kmAtual = parseFloat(document.getElementById("fuel-km").value) || 0;

        if (kmAtual < parseFloat(trip.kmInicial)) {
            showToast(`O KM não pode ser menor do que a saída (${trip.kmInicial} KM).`, "danger");
            return;
        }

        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';

        const payload = {
            veiculoId: trip.veiculoId,
            motoristaId: AppState.activeMotorista.id,
            data: new Date().toISOString().split("T")[0],
            combustivel,
            litros,
            valorTotal,
            kmAtual,
            posto,
            comprovante: AppState.tempPhotoUrl,
            observacoes: `Abastecimento inserido via Portal do Motorista (Viagem: ${trip.id}).`,
            status: 'Pendente'
        };

        if (navigator.onLine) {
            try {
                const res = await fetch('/api/abastecimentos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Erro ao salvar abastecimento.');
                }
                showToast("Abastecimento registrado! Aguardando aprovação.", "success");
                document.getElementById("modal-fuel").classList.remove("active");
                await loadAppData();
                renderDashboard();
            } catch(err) {
                showToast(err.message, "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Enviar Abastecimento';
            }
        } else {
            const item = {
                id: 'OFF-' + Date.now(),
                action: 'refuel',
                payload,
                tempPhotoBase64: AppState.tempPhotoBase64
            };
            saveOfflineAction(item);
            AppState.tempPhotoBase64 = null;
            showToast("Abastecimento salvo offline!", "info");
            document.getElementById("modal-fuel").classList.remove("active");
            loadOfflineAppData();
            renderDashboard();
        }
    }

    async function handleExpenseSubmit(e, trip) {
        e.preventDefault();
        const tipo = document.getElementById("exp-tipo").value;
        const valor = cleanCurrencyValue(document.getElementById("exp-valor").value) || 0;
        const desc = document.getElementById("exp-desc").value.trim();

        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando custo...';

        const novoCusto = parseFloat(trip.custos || 0) + valor;
        const obs = (trip.observacoes || '') + (trip.observacoes ? '\n' : '') + `[Despesa lançada pelo Motorista: R$ ${valor.toFixed(2)} - ${tipo} (${desc})]`;

        if (navigator.onLine) {
            try {
                const res = await fetch(`/api/viagens/${trip.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ custos: novoCusto, observacoes: obs })
                });
                if (!res.ok) throw new Error('Erro ao salvar despesa.');
                
                showToast("Custo adicionado com sucesso!", "success");
                document.getElementById("modal-expense").classList.remove("active");
                await loadAppData();
                renderDashboard();
            } catch (err) {
                showToast(err.message, "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Confirmar Custo';
            }
        } else {
            const item = {
                id: 'OFF-' + Date.now(),
                action: 'expense',
                payload: {
                    viagemId: trip.id,
                    custos: novoCusto,
                    observacoes: obs
                }
            };
            saveOfflineAction(item);
            showToast("Gasto salvo offline!", "info");
            document.getElementById("modal-expense").classList.remove("active");
            
            if (AppState.activeTrip) {
                AppState.activeTrip.custos = novoCusto;
            }
            renderDashboard();
        }
    }

    async function handleIncidentSubmit(e, trip) {
        e.preventDefault();
        const desc = document.getElementById("incident-desc").value.trim();
        
        const now = new Date();
        const data = now.toLocaleDateString("pt-BR").split('/').reverse().join('-');
        const hora = now.toTimeString().split(" ")[0].substring(0, 5);

        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Relatando...';

        const payload = {
            viagemId: trip.id,
            motoristaId: AppState.activeMotorista.id,
            data,
            hora,
            descricao: desc,
            fotos: AppState.tempPhotoUrl ? [AppState.tempPhotoUrl] : [],
            status: 'Pendente'
        };

        if (navigator.onLine) {
            try {
                const res = await fetch('/api/ocorrencias-viagem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Erro ao registrar ocorrência.');
                
                showToast("Ocorrência enviada! Aguardando aprovação.", "success");
                document.getElementById("modal-incident").classList.remove("active");
                await loadAppData();
                renderDashboard();
            } catch (err) {
                showToast(err.message, "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Ocorrência';
            }
        } else {
            const item = {
                id: 'OFF-' + Date.now(),
                action: 'incident',
                payload,
                tempPhotoBase64: AppState.tempPhotoBase64
            };
            saveOfflineAction(item);
            AppState.tempPhotoBase64 = null;
            showToast("Ocorrência salva offline!", "info");
            document.getElementById("modal-incident").classList.remove("active");
            loadOfflineAppData();
            renderDashboard();
        }
    }

    async function handleSwapSubmit(e, trip) {
        e.preventDefault();
        const novoMotoristaId = document.getElementById("swap-driver").value;
        const kmTroca = parseFloat(document.getElementById("swap-km").value) || 0;
        const localTroca = document.getElementById("swap-local").value.trim();
        const observacoes = document.getElementById("swap-obs").value.trim();

        if (kmTroca < parseFloat(trip.kmInicial)) {
            showToast(`O KM de troca não pode ser menor do que a saída (${trip.kmInicial} KM).`, "danger");
            return;
        }

        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando Troca...';

        const now = new Date();
        const dataTroca = now.toISOString().split('T')[0];
        const horaTroca = now.toTimeString().split(' ')[0].substring(0, 5);

        if (navigator.onLine) {
            try {
                const res = await fetch(`/api/viagens/${trip.id}/troca-motorista`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ novoMotoristaId, dataTroca, horaTroca, kmTroca, localTroca, observacoes })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Erro ao registrar troca.');
                }

                showToast("Troca de motorista registrada com sucesso!", "success");
                document.getElementById("modal-swap").classList.remove("active");
                await loadAppData();
                renderDashboard();
            } catch (err) {
                showToast(err.message, "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-people-arrows"></i> Confirmar e Entregar Controle';
            }
        } else {
            showToast("A troca de motorista precisa de rede de internet e não pode ser feita offline.", "warning");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-people-arrows"></i> Confirmar e Entregar Controle';
        }
    }

    async function handleEndTripSubmit(e, trip) {
        e.preventDefault();
        const kmFinal = parseFloat(document.getElementById("end-km-final").value) || 0;
        const obsFinais = document.getElementById("end-observacoes").value.trim();

        if (kmFinal <= parseFloat(trip.kmInicial)) {
            showToast(`O KM final deve ser maior do que o inicial (${trip.kmInicial} KM).`, "danger");
            return;
        }

        const now = new Date();
        const dataRetorno = now.toISOString().split("T")[0];
        const horaRetorno = now.toTimeString().split(" ")[0].substring(0, 5);

        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Concluindo viagem...';

        const mergedObs = trip.observacoes 
            ? `${trip.observacoes}\n\n[Retorno]: ${obsFinais}` 
            : obsFinais;

        const payload = {
            viagemId: trip.id,
            status: 'Realizada',
            dataRetorno,
            horaRetorno,
            kmFinal,
            observacoes: mergedObs,
            fotoFinal: AppState.tempPhotoUrl
        };

        if (navigator.onLine) {
            try {
                const res = await fetch(`/api/viagens/${trip.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Erro ao encerrar viagem.');
                
                AppState.tempPhotoUrl = null;
                showToast("Viagem concluída com sucesso! Bom descanso.", "success");
                document.getElementById("modal-close-trip").classList.remove("active");
                await loadAppData();
                renderDashboard();
            } catch (err) {
                showToast(err.message, "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Encerrar e Concluir';
            }
        } else {
            const item = {
                id: 'OFF-' + Date.now(),
                action: 'end_trip',
                payload,
                tempPhotoBase64: AppState.tempPhotoBase64
            };
            saveOfflineAction(item);
            AppState.tempPhotoBase64 = null;
            showToast("Finalização de viagem agendada para sincronização!", "info");
            document.getElementById("modal-close-trip").classList.remove("active");
            loadOfflineAppData();
            renderDashboard();
        }
    }

    // --- TAB: VIAGENS ANTERIORES HISTÓRICO ---
    function renderTripsHistory(container) {
        const hist = AppState.viagensHistorico;
        if (!container) return;

        if (hist.length === 0) {
            container.innerHTML = `
                <div class="card-glass" style="text-align: center; color: var(--text-secondary); padding: 30px;">
                    <i class="fa-solid fa-route" style="font-size: 2.2rem; margin-bottom:12px;"></i>
                    <p style="font-size:0.85rem;">Você não possui viagens encerradas no histórico.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3 style="font-size:1rem; font-weight:700; margin-left:4px; margin-bottom:12px; color:var(--text-primary);">
                <i class="fa-solid fa-clock-rotate-left"></i> Histórico de Viagens
            </h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
                ${hist.map(v => {
                    const kmRodado = v.kmFinal > v.kmInicial ? v.kmFinal - v.kmInicial : 0;
                    return `
                        <div class="card-glass trip-history-item" data-id="${v.id}" style="cursor:pointer; padding:14px 18px; transition:border-color 0.2s;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <strong style="font-size:0.92rem; color:var(--text-primary);">${v.origem} ➔ ${v.destino}</strong>
                                <span class="status-pill realizada" style="font-size:0.65rem; padding:2px 8px;">Encerrada</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-secondary);">
                                <span>Período: ${formatRouteDate(v.dataSaida)} até ${formatRouteDate(v.dataRetorno)}</span>
                                <strong>${kmRodado} km rodados</strong>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.querySelectorAll(".trip-history-item").forEach(item => {
            item.addEventListener("click", (e) => {
                const id = e.currentTarget.getAttribute("data-id");
                renderPastTripDetail(id);
            });
        });
    }

    async function renderPastTripDetail(tripId) {
        const root = document.getElementById("dashboard-content");
        if (!root) return;

        root.innerHTML = `
            <div class="loading-state" style="height: 200px;">
                <div class="spinner"></div>
                <p>Processando...</p>
            </div>
        `;

        try {
            const res = await fetch('/api/viagens');
            if (!res.ok) throw new Error();
            const list = await res.json();
            const t = list.find(x => x.id === tripId);
            if (!t) return;
            
            // Buscar ocorrências desta viagem concluída
            let occurrences = [];
            const ocRes = await fetch(`/api/ocorrencias-viagem?viagemId=${t.id}`);
            if (ocRes.ok) occurrences = await ocRes.json();

            // Buscar abastecimentos desta viagem
            let refuels = [];
            const abRes = await fetch(`/api/abastecimentos?motoristaId=${AppState.activeMotorista.id}`);
            if (abRes.ok) {
                const allAb = await abRes.json();
                refuels = allAb.filter(ab => ab.data >= t.dataSaida && ab.data <= t.dataRetorno && ab.veiculoId === t.veiculoId);
            }

            const veic = AppState.veiculos.find(v => v.id === t.veiculoId);
            const kmRodado = t.kmFinal > t.kmInicial ? t.kmFinal - t.kmInicial : 0;

            const root = document.getElementById("dashboard-content");
            root.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button id="btn-back-history" class="btn-driver btn-driver-secondary" style="width:auto; padding:6px 14px; font-size:0.8rem;">
                        <i class="fa-solid fa-arrow-left"></i> Voltar ao Histórico
                    </button>
                </div>

                <div class="card-glass animate-fade-in">
                    <div class="card-title">
                        <i class="fa-solid fa-route"></i>
                        <span>Resumo da Rota</span>
                    </div>
                    <div class="trip-detail-row">
                        <span class="detail-label">Código</span>
                        <span class="detail-value">${t.id}</span>
                    </div>
                    <div class="trip-detail-row">
                        <span class="detail-label">Veículo</span>
                        <span class="detail-value">${veic ? `${veic.marca} ${veic.modelo} (${veic.placa})` : 'N/A'}</span>
                    </div>
                    <div class="trip-detail-row">
                        <span class="detail-label">Rota</span>
                        <span class="detail-value" style="font-weight:700;">${t.origem} ➔ ${t.destino}</span>
                    </div>
                    <div class="trip-detail-row">
                        <span class="detail-label">Saída</span>
                        <span class="detail-value">${formatRouteDate(t.dataSaida)} às ${t.horaSaida || ''}</span>
                    </div>
                    <div class="trip-detail-row">
                        <span class="detail-label">Retorno</span>
                        <span class="detail-value">${formatRouteDate(t.dataRetorno)} às ${t.horaRetorno || ''}</span>
                    </div>
                    <div class="trip-detail-row">
                        <span class="detail-label">Odômetro</span>
                        <span class="detail-value">${parseFloat(t.kmInicial).toLocaleString()} ➔ ${parseFloat(t.kmFinal).toLocaleString()} km</span>
                    </div>
                    <div class="trip-detail-row">
                        <span class="detail-label">Km Rodados</span>
                        <span class="detail-value" style="color:var(--accent-color); font-weight:700;">${kmRodado} km</span>
                    </div>
                    <div class="trip-detail-row" style="border-bottom:none; margin-bottom:0; padding-bottom:0;">
                        <span class="detail-label">Custo Total de Rota</span>
                        <span class="detail-value" style="color:var(--success); font-weight:700;">${formatCurrency(t.custos)}</span>
                    </div>
                </div>

                <!-- Ocorrências Reportadas -->
                <div class="card-glass">
                    <div class="card-title">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Ocorrências (${occurrences.length})</span>
                    </div>
                    ${occurrences.length === 0 ? '<p style="font-size:0.8rem; color:var(--text-secondary); font-style:italic;">Nenhuma ocorrência registrada.</p>' : `
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            ${occurrences.map(o => `
                                <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid var(--border-color); font-size:0.8rem;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:600; color:var(--text-secondary);">
                                        <span>${formatRouteDate(o.data)} às ${o.hora}</span>
                                        <span style="text-transform:uppercase; font-size:0.7rem; color:${o.status === 'Aprovada' ? 'var(--success)' : o.status === 'Rejeitada' ? 'var(--danger)' : 'var(--warning)'}">${o.status}</span>
                                    </div>
                                    <p>${o.descricao}</p>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Abastecimentos na Viagem -->
                <div class="card-glass">
                    <div class="card-title">
                        <i class="fa-solid fa-gas-pump"></i>
                        <span>Abastecimentos (${refuels.length})</span>
                    </div>
                    ${refuels.length === 0 ? '<p style="font-size:0.8rem; color:var(--text-secondary); font-style:italic;">Nenhum abastecimento associado.</p>' : `
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            ${refuels.map(r => `
                                <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid var(--border-color); font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <strong style="color:var(--text-primary); display:block; margin-bottom:2px;">${r.posto}</strong>
                                        <span style="font-size:0.74rem; color:var(--text-secondary);">${formatRouteDate(r.data)} • ${r.combustivel} • ${r.litros} L</span>
                                    </div>
                                    <strong style="color:var(--success); font-size:0.9rem;">${formatCurrency(r.valorTotal)}</strong>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;

            document.getElementById("btn-back-history").addEventListener("click", () => {
                renderTabContent('viagens');
            });

        } catch (err) {
            console.error("Erro detalhado ao carregar viagem anterior:", err);
            showToast("Erro ao abrir detalhes.", "danger");
            renderTabContent('viagens');
        }
    }

    // --- TAB: SOLICITAÇÕES (MANUTENÇÃO) ---
    function renderSolicitacoesTab(container) {
        const list = AppState.solicitacoes;

        container.innerHTML = `
            <div class="card-glass animate-fade-in">
                <div class="card-title">
                    <i class="fa-solid fa-wrench"></i>
                    <span>Nova Solicitação de Manutenção</span>
                </div>
                <form id="form-sol-manutencao">
                    <div class="form-group">
                        <label for="sol-veiculo">Veículo com Problema</label>
                        <select id="sol-veiculo" class="input-control" required>
                            <option value="" disabled selected>Selecione o Veículo...</option>
                            ${AppState.veiculos.map(v => `
                                <option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="sol-tipo">Qual a Categoria do Problema?</label>
                        <select id="sol-tipo" class="input-control" required>
                            <option value="" disabled selected>Selecione a Categoria...</option>
                            <option value="Mecânica">Mecânica Geral</option>
                            <option value="Elétrica">Elétrica / Bateria</option>
                            <option value="Pneus">Pneus / Alinhamento / Balanceamento</option>
                            <option value="Lubrificantes">Lubrificantes / Filtros</option>
                            <option value="Freios">Freios / Segurança</option>
                            <option value="Suspensão">Suspensão / Direção</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="sol-desc">Descreva detalhadamente o sintoma</label>
                        <textarea id="sol-desc" class="input-control" rows="3" placeholder="Ex: Ao frear acima de 60km/h, o pedal treme bastante e faz barulho de metal..." required></textarea>
                    </div>

                    <div class="form-group">
                        <label>Foto da Avaria / Painel (Opcional)</label>
                        <input type="file" id="sol-photo-input" accept="image/*" style="display:none;">
                        
                        <div id="sol-photo-uploader" class="photo-uploader">
                            <i class="fa-solid fa-camera"></i>
                            <p>Anexar Foto da Avaria</p>
                        </div>
                        
                        <div id="sol-photo-preview-container" class="photo-preview-container">
                            <img id="sol-photo-preview" class="photo-preview" src="#" alt="Preview">
                            <button type="button" id="btn-remove-sol-photo" class="photo-remove-btn">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" class="btn-driver btn-driver-primary">
                        <i class="fa-solid fa-paper-plane"></i> Enviar Solicitação
                    </button>
                </form>
            </div>

            <!-- Listagem de Solicitações Efetuadas -->
            <div style="margin-top: 24px;">
                <h3 style="font-size:1rem; font-weight:700; margin-left:4px; margin-bottom:12px; color:var(--text-primary);">
                    <i class="fa-solid fa-list-check"></i> Minhas Solicitações
                </h3>
                <div style="display:flex; flex-direction:column; gap:12px;" id="list-minhas-solicitacoes">
                    ${list.length === 0 ? `
                        <div class="card-glass" style="text-align: center; color: var(--text-secondary); padding: 24px;">
                            <p style="font-size:0.82rem;">Nenhuma solicitação de manutenção relatada.</p>
                        </div>
                    ` : list.map(s => {
                        const isPending = s.status === 'Pendente';
                        const badgeClass = s.status === 'Aprovado' ? 'realizada' : s.status === 'Rejeitado' ? 'inativo' : 'em_andamento';
                        return `
                            <div class="card-glass" style="padding:14px 18px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <strong style="font-size:0.9rem; color:var(--text-primary);">${s.veiculoPlaca}</strong>
                                    <span class="status-pill ${badgeClass}" style="font-size:0.65rem; padding:2px 8px;">${s.status}</span>
                                </div>
                                <div style="font-size:0.82rem; font-weight:700; color:var(--danger); margin-bottom:6px;">${s.tipo}</div>
                                <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4; margin-bottom:8px;">${s.descricao}</p>
                                ${s.observacoes ? `
                                    <div style="background:var(--bg-surface-hover); border-left:2px solid var(--accent-color); padding:6px 10px; font-size:0.75rem; border-radius:4px; color:var(--text-primary);">
                                        <strong>Retorno Gestor:</strong> ${s.observacoes}
                                    </div>
                                ` : ''}
                                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:6px;">
                                    Enviada em: ${formatRouteDate(s.data)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        const uploader = document.getElementById("sol-photo-uploader");
        const fileInput = document.getElementById("sol-photo-input");
        const previewContainer = document.getElementById("sol-photo-preview-container");
        const previewImg = document.getElementById("sol-photo-preview");
        const removePhotoBtn = document.getElementById("btn-remove-sol-photo");

        uploader.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async (e) => {
            if (e.target.files && e.target.files[0]) {
                uploader.style.display = "none";
                previewContainer.classList.add("active");
                previewImg.src = URL.createObjectURL(e.target.files[0]);
                
                showToast("Fazendo upload da imagem...", "info");
                try {
                    if (navigator.onLine) {
                        const url = await uploadFile(e.target.files[0]);
                        AppState.tempPhotoUrl = url;
                        showToast("Foto salva com sucesso!", "success");
                    } else {
                        const b64 = await readFileAsBase64(e.target.files[0]);
                        AppState.tempPhotoBase64 = b64;
                        showToast("Foto salva localmente (offline)", "info");
                    }
                } catch(err) {
                    showToast("Erro no processamento da imagem.", "danger");
                    resetFileUploader(uploader, previewContainer, fileInput);
                }
            }
        });

        removePhotoBtn.addEventListener("click", () => {
            resetFileUploader(uploader, previewContainer, fileInput);
            AppState.tempPhotoBase64 = null;
        });

        initAutocomplete(document.getElementById("sol-veiculo"), "Selecione o Veículo...");
        document.getElementById("form-sol-manutencao").addEventListener("submit", handleSolManutencaoSubmit);
    }

    async function handleSolManutencaoSubmit(e) {
        e.preventDefault();
        const veiculoId = document.getElementById("sol-veiculo").value;
        const tipo = document.getElementById("sol-tipo").value;
        const desc = document.getElementById("sol-desc").value.trim();

        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

        const payload = {
            veiculoId,
            motoristaId: AppState.activeMotorista.id,
            data: new Date().toISOString().split("T")[0],
            descricao: desc,
            tipo,
            status: 'Pendente',
            anexo: AppState.tempPhotoUrl
        };

        if (navigator.onLine) {
            try {
                const res = await fetch('/api/solicitacoes-manutencao', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error();
                
                AppState.tempPhotoUrl = null;
                showToast("Solicitação enviada com sucesso!", "success");
                await loadAppData();
                renderTabContent('solicitacoes');
            } catch (err) {
                showToast("Falha ao registrar solicitação.", "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Solicitação';
            }
        } else {
            const item = {
                id: 'OFF-' + Date.now(),
                action: 'maintenance_request',
                payload,
                tempPhotoBase64: AppState.tempPhotoBase64
            };
            saveOfflineAction(item);
            AppState.tempPhotoBase64 = null;
            showToast("Solicitação salva em Modo Offline!", "info");
            
            loadOfflineAppData();
            renderTabContent('solicitacoes');
        }
    }

    // --- TAB: PERFIL & DOCUMENTOS ---
    function renderPerfilTab(container) {
        const m = AppState.activeMotorista;
        const v = AppState.activeTrip ? AppState.veiculos.find(ve => ve.id === AppState.activeTrip.veiculoId) : null;
        
        const dateVenc = new Date(m.dataVencimentoCNH);
        const vencFmt = formatRouteDate(m.dataVencimentoCNH);
        
        const diffTime = dateVenc.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let cnhAlertHTML = '';
        if (diffDays < 0) {
            cnhAlertHTML = `<div style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; color:#ef4444; font-size:0.75rem; padding:8px; border-radius:6px; margin-top:6px;"><i class="fa-solid fa-circle-exclamation"></i> CNH VENCIDA há ${Math.abs(diffDays)} dias. Regularize!</div>`;
        } else if (diffDays <= 30) {
            cnhAlertHTML = `<div style="background:rgba(245,158,11,0.1); border:1px solid #f59e0b; color:#d97706; font-size:0.75rem; padding:8px; border-radius:6px; margin-top:6px;"><i class="fa-solid fa-triangle-exclamation"></i> CNH vence em ${diffDays} dias (${vencFmt}).</div>`;
        }

        container.innerHTML = `
            <!-- Informações Gerais do Condutor -->
            <div class="card-glass animate-fade-in">
                <div class="card-title">
                    <i class="fa-solid fa-id-card"></i>
                    <span>Dados de Habilitação</span>
                </div>
                <div class="trip-detail-row">
                    <span class="detail-label">Nome Completo</span>
                    <span class="detail-value">${m.nome}</span>
                </div>
                <div class="trip-detail-row">
                    <span class="detail-label">CPF</span>
                    <span class="detail-value">${m.cpf}</span>
                </div>
                <div class="trip-detail-row">
                    <span class="detail-label">Registro CNH</span>
                    <span class="detail-value">${m.cnh} (Cat. ${m.categoriaCNH})</span>
                </div>
                <div class="trip-detail-row" style="border-bottom:none; margin-bottom:0; padding-bottom:0;">
                    <span class="detail-label">Vencimento</span>
                    <span class="detail-value">${vencFmt}</span>
                </div>
                ${cnhAlertHTML}
            </div>

            <!-- Dados Editáveis do Perfil -->
            <div class="card-glass">
                <div class="card-title">
                    <i class="fa-solid fa-user-pen"></i>
                    <span>Atualizar Meus Contatos</span>
                </div>
                <form id="form-perfil-edit">
                    <div class="form-group">
                        <label for="perf-telefone">Telefone / Celular</label>
                        <input type="text" id="perf-telefone" class="input-control" value="${m.telefone || ''}" placeholder="Ex: (11) 99999-9999" required>
                    </div>
                    <div class="form-group">
                        <label for="perf-email">E-mail Cadastrado</label>
                        <input type="email" id="perf-email" class="input-control" value="${m.email || ''}" placeholder="Ex: motorista@empresa.com" required>
                    </div>
                    <div class="form-group">
                        <label for="perf-endereco">Endereço de Residência</label>
                        <input type="text" id="perf-endereco" class="input-control" value="${m.endereco || ''}" placeholder="Rua, Número, Cidade - UF" required>
                    </div>
                    <div class="form-group">
                        <label for="perf-obs">Contatos de Emergência (Nome / Telefone)</label>
                        <textarea id="perf-obs" class="input-control" rows="2" placeholder="Ex: Esposa Maria (11) 98888-8888">${m.observacoes || ''}</textarea>
                    </div>
                    <button type="submit" class="btn-driver btn-driver-primary">
                        <i class="fa-solid fa-floppy-disk"></i> Salvar Alterações
                    </button>
                </form>
            </div>

            <!-- Consulta de Documentos Digitais -->
            <div style="margin-top:20px;">
                <h3 style="font-size:1rem; font-weight:700; margin-left:4px; margin-bottom:12px; color:var(--text-primary);">
                    <i class="fa-solid fa-file-pdf"></i> Documentos da Condução
                </h3>
                <div class="docs-grid">
                    <!-- CNH -->
                    <div class="doc-card" id="btn-doc-cnh" style="pointer-events:${m.cnhAnexo ? 'auto' : 'none'}; opacity:${m.cnhAnexo ? '1' : '0.45'};">
                        <i class="fa-solid fa-address-card"></i>
                        <div class="doc-info">
                            <h3>Minha Habilitação (CNH Anexo)</h3>
                            <p>${m.cnhAnexo ? 'Disponível para visualização' : 'Nenhuma imagem cadastrada'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("form-perfil-edit").addEventListener("submit", handlePerfilUpdateSubmit);

        if (m.cnhAnexo) {
            document.getElementById("btn-doc-cnh").addEventListener("click", () => openDocZoomModal(m.cnhAnexo));
        }

        applyPhoneMask(document.getElementById("perf-telefone"));
    }

    async function handlePerfilUpdateSubmit(e) {
        e.preventDefault();
        const telefone = document.getElementById("perf-telefone").value.trim();
        const email = document.getElementById("perf-email").value.trim();
        const endereco = document.getElementById("perf-endereco").value.trim();
        const observacoes = document.getElementById("perf-obs").value.trim();

        const submitBtn = e.target.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

        if (navigator.onLine) {
            try {
                const m = AppState.activeMotorista;
                const body = {
                    nome: m.nome,
                    cpf: m.cpf,
                    rg: m.rg,
                    cnh: m.cnh,
                    categoriaCNH: m.categoriaCNH,
                    dataVencimentoCNH: m.dataVencimentoCNH,
                    status: m.status,
                    foto: m.foto,
                    telefone,
                    email,
                    endereco,
                    observacoes,
                    cnhAnexo: m.cnhAnexo,
                    comprovanteResidenciaAnexo: m.comprovanteResidenciaAnexo,
                    historico: m.historico,
                    dataNascimento: m.dataNascimento,
                    categoria: m.categoria
                };

                const res = await fetch(`/api/motoristas/${m.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!res.ok) throw new Error();
                
                showToast("Dados atualizados com sucesso!", "success");
                await loadMotoristaInfo();
                await loadAppData();
                renderTabContent('perfil');
            } catch (err) {
                showToast("Erro ao salvar alterações no servidor.", "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';
            }
        } else {
            showToast("A atualização do cadastro de perfil necessita de internet ativa.", "warning");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';
        }
    }

    function openDocZoomModal(url) {
        if (!url) return;

        // Se for um arquivo PDF, abre em uma nova aba diretamente
        if (url.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf')) {
            window.open(url, '_blank');
            return;
        }

        // Se for imagem, abre o modal de Zoom nativo
        const modal = document.createElement("div");
        modal.className = "zoom-modal animate-fade-in";
        modal.innerHTML = `
            <button class="zoom-close">&times;</button>
            <img src="${url}" alt="Zoom">
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelector(".zoom-close").addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // --- MÉTODOS DE FILA OFFLINE (LÓGICA CORE) ---
    function saveOfflineAction(item) {
        const queue = JSON.parse(localStorage.getItem("movix_offline_queue") || "[]");
        queue.push(item);
        localStorage.setItem("movix_offline_queue", JSON.stringify(queue));
    }

    async function syncOfflineQueue(isCalledFromLoadAppData = false) {
        if (!navigator.onLine) return;
        const queue = JSON.parse(localStorage.getItem("movix_offline_queue") || "[]");
        if (queue.length === 0) return;

        showToast("Conexão reestabelecida. Sincronizando dados offline...", "info");
        
        const newQueue = [];
        
        for (const item of queue) {
            try {
                if (item.tempPhotoBase64) {
                    const realUrl = await uploadBase64File(item.tempPhotoBase64);
                    if (item.action === 'start_trip') {
                        item.payload.fotoInicial = realUrl;
                    } else if (item.action === 'refuel') {
                        item.payload.comprovante = realUrl;
                    } else if (item.action === 'incident') {
                        item.payload.fotos = [realUrl];
                    } else if (item.action === 'end_trip') {
                        item.payload.fotoFinal = realUrl;
                    } else if (item.action === 'maintenance_request') {
                        item.payload.anexo = realUrl;
                    }
                }
                
                if (item.action === 'start_trip') {
                    const res = await fetch('/api/viagens', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload)
                    });
                    if (!res.ok) {
                        if (res.status === 400) {
                            const errData = await res.json().catch(() => ({}));
                            if (errData.conflictTripId) {
                                const realViagemId = errData.conflictTripId;
                                // Propagar o ID real da viagem já existente no servidor
                                for (const subItem of queue) {
                                    if (subItem.payload && subItem.payload.viagemId === 'TEMP-VIA') {
                                        subItem.payload.viagemId = realViagemId;
                                    }
                                }
                                continue; // Sucesso alternativo: a viagem já existia
                            }
                            console.warn("Descartando viagem inválida da fila (400):", item, errData.error);
                            continue; // Descarta erro de cliente
                        }
                        throw new Error();
                    }
                    const createdTrip = await res.json();
                    const realViagemId = createdTrip.id;

                    // Propagar o ID real da viagem criada offline para os itens subsequentes na fila
                    for (const subItem of queue) {
                        if (subItem.payload && subItem.payload.viagemId === 'TEMP-VIA') {
                            subItem.payload.viagemId = realViagemId;
                        }
                    }
                } else if (item.action === 'refuel') {
                    const res = await fetch('/api/abastecimentos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload)
                    });
                    if (!res.ok) {
                        if (res.status === 400) {
                            console.warn("Descartando abastecimento inválido da fila (400):", item);
                            continue; // Descarta erro de cliente
                        }
                        throw new Error();
                    }
                } else if (item.action === 'incident') {
                    const res = await fetch('/api/ocorrencias-viagem', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload)
                    });
                    if (!res.ok) {
                        if (res.status === 400) {
                            console.warn("Descartando ocorrência inválida da fila (400):", item);
                            continue; // Descarta erro de cliente
                        }
                        throw new Error();
                    }
                } else if (item.action === 'expense') {
                    const res = await fetch(`/api/viagens/${item.payload.viagemId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ custos: item.payload.custos, observacoes: item.payload.observacoes })
                    });
                    if (!res.ok) {
                        if (res.status === 400 || res.status === 404) {
                            console.warn("Descartando despesa inválida da fila (400/404):", item);
                            continue; // Descarta erro de cliente
                        }
                        throw new Error();
                    }
                } else if (item.action === 'end_trip') {
                    const res = await fetch(`/api/viagens/${item.payload.viagemId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload)
                    });
                    if (!res.ok) {
                        if (res.status === 400 || res.status === 404) {
                            console.warn("Descartando encerramento inválido da fila (400/404):", item);
                            continue; // Descarta erro de cliente
                        }
                        throw new Error();
                    }
                } else if (item.action === 'maintenance_request') {
                    const res = await fetch('/api/solicitacoes-manutencao', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload)
                    });
                    if (!res.ok) {
                        if (res.status === 400) {
                            console.warn("Descartando solicitação de manutenção inválida da fila (400):", item);
                            continue; // Descarta erro de cliente
                        }
                        throw new Error();
                    }
                }
            } catch (err) {
                console.error("Falha ao sincronizar item offline. Re-enfileirando:", item, err);
                newQueue.push(item);
            }
        }
        
        localStorage.setItem("movix_offline_queue", JSON.stringify(newQueue));
        
        if (newQueue.length === 0) {
            showToast("Sincronização offline concluída com sucesso!", "success");
            if (!isCalledFromLoadAppData) {
                await loadAppData();
                renderDashboard();
            }
        } else {
            showToast("Alguns registros offline aguardam nova tentativa de rede.", "warning");
        }
    }

    async function uploadBase64File(base64Data, filename = 'photo.png') {
        const blob = dataURLtoBlob(base64Data);
        const file = new File([blob], filename, { type: blob.type });
        return await uploadFile(file);
    }

    function dataURLtoBlob(dataurl) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    // --- ENVIOS E AUXILIARES ---
    async function uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            throw new Error("Erro no upload do arquivo");
        }

        const data = await res.json();
        return data.url;
    }

    function resetFileUploader(uploader, previewContainer, fileInput) {
        fileInput.value = "";
        previewContainer.classList.remove("active");
        uploader.style.display = "block";
        AppState.tempPhotoUrl = null;
    }

    async function handleLogout() {
        showLoading(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch(e) {
            console.error("Erro no logout:", e);
        }
        AppState.activeUser = null;
        AppState.activeMotorista = null;
        AppState.activeTrip = null;
        AppState.veiculos = [];
        localStorage.clear();
        renderLogin();
        showLoading(false);
    }

    function showToast(message, type = "success") {
        const toast = document.getElementById("driver-toast");
        if (!toast) return;

        toast.className = `toast ${type === 'danger' ? 'danger' : type === 'info' ? 'info' : type === 'warning' ? 'warning' : ''} active`;
        toast.innerText = message;

        setTimeout(() => {
            toast.classList.remove("active");
        }, 3500);
    }

})();
