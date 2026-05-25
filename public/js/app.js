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
        
        let backdrop = document.getElementById('sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'sidebar-backdrop';
            backdrop.className = 'sidebar-backdrop';
            document.body.appendChild(backdrop);
        }

        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                sidebar.classList.toggle('active');
                backdrop.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
                document.body.classList.toggle('sidebar-collapsed-body');
            }
        });

        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('active');
            backdrop.classList.remove('active');
        });

        sidebar.addEventListener('click', (e) => {
            if (window.innerWidth <= 992 && e.target.closest('.sidebar-link')) {
                sidebar.classList.remove('active');
                backdrop.classList.remove('active');
            }
        });
    }

    // --- REAL LOGIN FORM HANDLER ---
    setupLoginHandler() {
        const form = document.getElementById('form-login');
        if (!form) return;

        const loginIdentifier = document.getElementById('login-identifier');
        if (loginIdentifier) {
            loginIdentifier.addEventListener('input', (e) => {
                let value = e.target.value;
                if (/^\d/.test(value.trim())) {
                    let v = value.replace(/\D/g, "");
                    if (v.length > 11) v = v.substring(0, 11);
                    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
                    else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
                    e.target.value = v;
                }
            });
        }

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
        
        // Make header avatar clickable for profile update
        const avatarContainer = document.querySelector('.user-avatar-container');
        if (avatarContainer) {
            avatarContainer.style.cursor = 'pointer';
            if (!avatarContainer.dataset.listenerBound) {
                avatarContainer.dataset.listenerBound = 'true';
                avatarContainer.addEventListener('click', () => this.openProfileModal());
            }
        }
        
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
            
            // Click footer card to edit profile
            const footerCard = userFooter.querySelector('.sidebar-user-footer-card');
            if (footerCard) {
                footerCard.style.cursor = 'pointer';
                footerCard.addEventListener('click', () => this.openProfileModal());
            }
            
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

    openProfileModal() {
        const user = window.movixStore.getActiveUser();
        if (!user) return;

        const modal = document.getElementById('global-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        const modalFooter = document.getElementById('modal-footer-actions');

        modalTitle.innerText = 'Meu Perfil Corporativo';

        modalBody.innerHTML = `
            <form id="form-meu-perfil" class="form-grid" onsubmit="return false;">
                <!-- AVATAR UPLOAD -->
                <div class="form-group full-width" style="display:flex; flex-direction:column; gap:8px;">
                    <label style="font-weight: 600;">Foto de Perfil</label>
                    <div style="display:flex; align-items:center; gap:20px; background:var(--bg-surface-hover); padding:16px; border-radius:var(--border-radius-md); border:1px dashed var(--border-color);">
                        <img id="profile-upload-preview" src="${user.foto || '/img/avatar-default.png'}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); background:#ffffff;">
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <span style="font-size:0.75rem; color:var(--text-muted);">Formatos aceitos: JPG, PNG, WebP (Máx. 5MB)</span>
                            <button type="button" class="btn btn-secondary" id="btn-profile-trigger-upload" style="height:36px; padding:0 16px;">
                                <i class="fa-solid fa-cloud-arrow-up text-primary"></i> Selecionar Imagem
                            </button>
                            <input type="file" id="profile-file-uploader" accept="image/*" style="display:none;">
                            <input type="hidden" name="foto" id="profile-foto-url" value="${user.foto || '/img/avatar-default.png'}">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Nome Completo <span class="required">*</span></label>
                    <input type="text" class="form-control" name="nome" required value="${user.nome}">
                </div>
                <div class="form-group">
                    <label>CPF <span class="required">*</span></label>
                    <input type="text" class="form-control" name="cpf" required value="${user.cpf}" id="profile-cpf-mask">
                </div>
                <div class="form-group">
                    <label>E-mail Corporativo <span class="required">*</span></label>
                    <input type="email" class="form-control" name="email" required value="${user.email}">
                </div>
                <div class="form-group">
                    <label>Cargo <span class="required">*</span></label>
                    <input type="text" class="form-control" name="cargo" required value="${user.cargo}">
                </div>
                
                <div class="form-group full-width" style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 8px;">
                    <label style="font-weight: 700; color: var(--primary);"><i class="fa-solid fa-key"></i> Segurança de Acesso</label>
                </div>
                
                <div class="form-group full-width">
                    <label>Alterar Senha <span style="color:var(--text-muted); font-weight:normal;">(Deixe em branco para manter a atual)</span></label>
                    <input type="password" class="form-control" name="senha" placeholder="Digite uma nova senha se desejar mudar" minlength="4">
                </div>
            </form>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="btn-profile-cancel">Cancelar</button>
            <button class="btn btn-primary" id="btn-profile-save">
                <i class="fa-solid fa-floppy-disk"></i> Salvar Perfil
            </button>
        `;

        modal.classList.add('active');

        // Uploader hooks
        const fileUploader = document.getElementById('profile-file-uploader');
        const triggerBtn = document.getElementById('btn-profile-trigger-upload');
        const previewImg = document.getElementById('profile-upload-preview');
        const hiddenUrlInput = document.getElementById('profile-foto-url');

        triggerBtn.addEventListener('click', () => fileUploader.click());

        fileUploader.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('foto', file);

            try {
                triggerBtn.disabled = true;
                triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
                
                const response = await fetch('/api/upload/foto', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Erro no upload.');
                }

                const result = await response.json();
                previewImg.src = result.url;
                hiddenUrlInput.value = result.url;

                this.showToast('Sua foto de perfil foi enviada!', 'success');
            } catch (err) {
                console.error(err);
                this.showToast(err.message || 'Falha no upload da foto.', 'danger');
            } finally {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-primary"></i> Selecionar Imagem';
            }
        });

        // Mask
        const cpfInput = document.getElementById('profile-cpf-mask');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, "");
                if (v.length > 11) v = v.substring(0, 11);
                if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
                else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
                e.target.value = v;
            });
        }

        document.getElementById('btn-profile-cancel').addEventListener('click', () => modal.classList.remove('active'));
        document.getElementById('close-modal-btn').addEventListener('click', () => modal.classList.remove('active'));

        const saveBtn = document.getElementById('btn-profile-save');
        saveBtn.addEventListener('click', async () => {
            const form = document.getElementById('form-meu-perfil');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => data[key] = value);

            try {
                await window.movixStore.updatePerfil(data);
                this.showToast('Seu perfil foi atualizado com sucesso!', 'success');
                modal.classList.remove('active');
            } catch (err) {
                console.error(err);
                this.showToast(err.message || 'Erro ao atualizar perfil.', 'danger');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Perfil';
            }
        });
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
