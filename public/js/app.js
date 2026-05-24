/* MovixFrota - Central Orchestration, Shell Controls, and Global Search */

class MovixApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupSidebar();
        this.setupNotificationCenter();
        this.setupGlobalSearch();
        this.setupModalControls();
        this.setupLoginHandler();
        
        // Connect Session Change Callback
        window.movixStore.onSessionChange = (loggedIn) => this.handleSessionState(loggedIn);
        
        // Initialize session check
        window.movixStore.init();
    }

    // --- THEME SWAP ENGINE ---
    setupTheme() {
        const themeBtn = document.getElementById('theme-toggle');
        const storedTheme = localStorage.getItem('movix_theme') || 'light';
        
        document.body.className = `theme-${storedTheme}`;
        this.updateThemeIcon(storedTheme);

        themeBtn.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.className = `theme-${newTheme}`;
            localStorage.setItem('movix_theme', newTheme);
            this.updateThemeIcon(newTheme);

            // Dynamic redraw of Chart.js charts on active view to keep contrast
            if (window.movixRouter.currentRoute === 'dashboard') {
                window.movixRouter.handleHashChange();
            } else if (window.movixRouter.currentRoute === 'relatorios') {
                window.movixRouter.handleHashChange();
            }

            this.showToast(`Modo ${newTheme === 'dark' ? 'Escuro' : 'Claro'} ativado!`, 'info');
        });
    }

    updateThemeIcon(theme) {
        const themeBtn = document.getElementById('theme-toggle');
        if (theme === 'dark') {
            themeBtn.innerHTML = '<i class="fa-solid fa-sun text-warning"></i>';
        } else {
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    // --- SIDEBAR MENU TOGGLE ---
    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('sidebar-collapsed-body');
        });
    }

    // --- REAL LOGIN FORM HANDLER ---
    setupLoginHandler() {
        const form = document.getElementById('form-login');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('login-password').value;
            const submitBtn = document.getElementById('btn-login-submit');
            
            if (!identifier || !password) {
                this.showToast('Informe seu CPF/E-mail e senha de acesso.', 'warning');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Autenticando...';
                
                await window.movixStore.login(identifier, password);
                this.showToast('Autenticado com sucesso! Bem-vindo de volta.', 'success');
            } catch (err) {
                this.showToast(err.message || 'CPF/E-mail ou senha inválidos.', 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Acessar Sistema';
            }
        });
    }

    // --- SESSION TRANSITION HANDLER ---
    handleSessionState(loggedIn) {
        if (loggedIn) {
            document.body.classList.remove('not-logged-in');
            
            const user = window.movixStore.getActiveUser();
            
            // Update all UI components
            this.updateHeaderProfileBadge();
            this.refreshAlertsCount();
            this.refreshNotificationsPanel();

            // Route user to main Dashboard
            window.movixRouter.start();
        } else {
            document.body.classList.add('not-logged-in');
            
            // Reset password input
            const passInput = document.getElementById('login-password');
            if (passInput) passInput.value = '';
            
            const submitBtn = document.getElementById('btn-login-submit');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Acessar Sistema';
            }
        }
    }

    updateHeaderProfileBadge() {
        const user = window.movixStore.getActiveUser();
        if (!user) return;
        
        // Header Update
        const roleLabel = document.getElementById('header-role-label');
        const roleBadge = document.getElementById('header-role-badge');
        const userName = document.getElementById('header-user-name');
        const userRole = document.getElementById('header-user-role');
        const avatarImg = document.getElementById('header-avatar');
        
        if (roleLabel) roleLabel.innerText = user.perfil;
        if (roleBadge) roleBadge.className = `role-badge ${user.perfil.toLowerCase()}`;
        if (userName) userName.innerText = user.nome;
        if (userRole) userRole.innerText = user.cargo;
        if (avatarImg) avatarImg.src = user.foto;
        
        // Sidebar menu users visibility
        const userMenu = document.getElementById('sidebar-usuarios-item');
        if (userMenu) {
            userMenu.style.display = user.perfil === 'Administrador' ? 'block' : 'none';
        }
        
        // Sidebar user footer render
        const userFooter = document.getElementById('sidebar-user-footer');
        if (userFooter) {
            userFooter.innerHTML = `
                <div class="sidebar-user-footer-card">
                    <img src="${user.foto}" class="sidebar-user-avatar" alt="Avatar">
                    <div class="sidebar-user-info">
                        <span class="sidebar-user-name">${user.nome}</span>
                        <span class="sidebar-user-role">${user.cargo}</span>
                    </div>
                </div>
                <button class="btn btn-secondary btn-logout" id="btn-logout" title="Sair do Sistema">
                    <i class="fa-solid fa-right-from-bracket"></i> <span>Sair do Sistema</span>
                </button>
            `;
            
            // Bind click to logout
            const logoutBtn = document.getElementById('btn-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    window.movixStore.logout();
                    this.showToast('Sessão encerrada com sucesso.', 'info');
                });
            }
        }
    }

    // --- NOTIFICATION BELL AND DYNAMIC ALERTS PANELS ---
    setupNotificationCenter() {
        const bellToggle = document.getElementById('bell-toggle');
        const panel = document.getElementById('notifications-panel');
        const markReadBtn = document.getElementById('mark-all-read');
        const list = document.getElementById('notifications-list');

        bellToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('active');
            this.refreshNotificationsPanel();
        });

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== bellToggle) {
                panel.classList.remove('active');
            }
        });

        markReadBtn.addEventListener('click', () => {
            localStorage.setItem('movix_alerts_silenced', 'true');
            this.showToast('Alertas marcados como lidos!', 'info');
            this.refreshAlertsCount();
            panel.classList.remove('active');
        });

        // Dynamic click handlers in alert links
        list.addEventListener('click', (e) => {
            const item = e.target.closest('.notification-item');
            if (item) {
                panel.classList.remove('active');
                const route = item.getAttribute('data-route');
                const targetId = item.getAttribute('data-target');
                window.movixRouter.navigateTo(route, targetId);
            }
        });
    }

    refreshAlertsCount() {
        const badge = document.getElementById('bell-badge');
        const isSilenced = localStorage.getItem('movix_alerts_silenced') === 'true';
        const alerts = window.movixStore.getAlerts();

        if (alerts.length > 0 && !isSilenced) {
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    }

    refreshNotificationsPanel() {
        const list = document.getElementById('notifications-list');
        const alerts = window.movixStore.getAlerts();

        list.innerHTML = '';
        if (alerts.length === 0) {
            list.innerHTML = `
                <li style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.8rem;">
                    Nenhum alerta ativo!
                </li>
            `;
            return;
        }

        alerts.forEach(a => {
            let colorClass = 'info';
            let icon = '<i class="fa-solid fa-circle-info"></i>';

            if (a.prioridade === 'Alta') { colorClass = 'danger'; icon = '<i class="fa-solid fa-triangle-exclamation"></i>'; }
            else if (a.prioridade === 'Média') { colorClass = 'warning'; icon = '<i class="fa-solid fa-circle-exclamation"></i>'; }

            list.innerHTML += `
                <li class="notification-item" data-route="${a.link}" data-target="${a.targetId}">
                    <div class="notification-icon-wrapper ${colorClass}">
                        ${icon}
                    </div>
                    <div class="notification-text-wrapper">
                        <span class="notification-msg" style="color:var(--text-main); font-weight:600;">${a.titulo}</span>
                        <span class="notification-time">${a.desc}</span>
                    </div>
                </li>
            `;
        });
    }

    // --- TOAST POPUP TRIGGERS ---
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '<i class="fa-solid fa-circle-check"></i>';
        if (type === 'danger') icon = '<i class="fa-solid fa-circle-xmark"></i>';
        else if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
        else if (type === 'info') icon = '<i class="fa-solid fa-circle-info"></i>';

        toast.innerHTML = `
            ${icon}
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove in 3.5 seconds
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3500);
    }

    // --- SMART GLOBAL SEARCH INDEXING ---
    setupGlobalSearch() {
        const searchInput = document.getElementById('global-search');
        const results = document.getElementById('search-results-dropdown');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                results.classList.remove('active');
                return;
            }

            // Search vehicles, drivers, pneus
            const veic = window.movixStore.getVeiculos().filter(v => v.placa.toLowerCase().includes(query) || v.marca.toLowerCase().includes(query) || v.modelo.toLowerCase().includes(query));
            const mot = window.movixStore.getMotoristas().filter(m => m.nome.toLowerCase().includes(query) || m.cnh.toLowerCase().includes(query));
            const pneu = window.movixStore.getPneus().filter(p => p.codigo.toLowerCase().includes(query) || p.marca.toLowerCase().includes(query));

            results.innerHTML = '';
            let totalMatches = 0;

            if (veic.length > 0) {
                results.innerHTML += `<div class="search-results-group"><span class="search-results-title">Veículos</span>`;
                veic.forEach(v => {
                    results.innerHTML += `
                        <div class="search-result-item" onclick="window.movixRouter.navigateTo('veiculos', '${v.id}')">
                            <div class="search-result-icon"><i class="fa-solid fa-truck"></i></div>
                            <div class="search-result-info">
                                <strong>${v.placa}</strong>
                                <span class="search-result-subtitle">${v.marca} ${v.modelo}</span>
                            </div>
                        </div>
                    `;
                    totalMatches++;
                });
                results.innerHTML += `</div>`;
            }

            if (mot.length > 0) {
                results.innerHTML += `<div class="search-results-group"><span class="search-results-title">Motoristas</span>`;
                mot.forEach(m => {
                    results.innerHTML += `
                        <div class="search-result-item" onclick="window.movixRouter.navigateTo('motoristas')">
                            <div class="search-result-icon"><i class="fa-solid fa-id-card-clip"></i></div>
                            <div class="search-result-info">
                                <strong>${m.nome}</strong>
                                <span class="search-result-subtitle">CNH: ${m.cnh} (Cat. ${m.categoriaCNH})</span>
                            </div>
                        </div>
                    `;
                    totalMatches++;
                });
                results.innerHTML += `</div>`;
            }

            if (pneu.length > 0) {
                results.innerHTML += `<div class="search-results-group"><span class="search-results-title">Pneus</span>`;
                pneu.forEach(p => {
                    results.innerHTML += `
                        <div class="search-result-item" onclick="window.movixRouter.navigateTo('pneus')">
                            <div class="search-result-icon"><i class="fa-solid fa-ring"></i></div>
                            <div class="search-result-info">
                                <strong>Pneu ${p.codigo}</strong>
                                <span class="search-result-subtitle">${p.marca} ${p.modelo} (${p.posicao || 'Estoque'})</span>
                            </div>
                        </div>
                    `;
                    totalMatches++;
                });
                results.innerHTML += `</div>`;
            }

            if (totalMatches === 0) {
                results.innerHTML = `<div class="search-no-results">Nenhum resultado encontrado para "${query}"</div>`;
            }

            results.classList.add('active');
        });

        // Close dropdown when clicking out
        document.addEventListener('click', (e) => {
            if (!results.contains(e.target) && e.target !== searchInput) {
                results.classList.remove('active');
            }
        });
    }

    // --- REUSABLE GLOBAL MODAL CLOSE LOGIC ---
    setupModalControls() {
        const overlay = document.getElementById('global-modal');
        const closeBtn = document.getElementById('close-modal-btn');
        
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
        });

        // Close modal when clicking on transparent backdrop overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    }
}

// Instantiate App Control
window.movixApp = new MovixApp();
