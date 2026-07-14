/* MovixFrota - Central Orchestration, Shell Controls, and Global Search */

class MovixApp {
    constructor() {
        this.listStates = {};
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupSidebar();
        this.setupNotificationCenter();
        this.setupGlobalSearch();
        this.setupModalControls();
        this.setupLoginHandler();
        this.setupCurrencyMasks();
        this.setupLitrosInputHandler();
        this.setupScrollTracking();
        this.setupPrintThemeSwap();
        
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

        // Toggle password visibility click listener
        const togglePasswordBtn = document.getElementById('btn-toggle-password');
        const loginPasswordInput = document.getElementById('login-password');
        if (togglePasswordBtn && loginPasswordInput) {
            togglePasswordBtn.addEventListener('click', () => {
                const isPasswordType = loginPasswordInput.getAttribute('type') === 'password';
                loginPasswordInput.setAttribute('type', isPasswordType ? 'text' : 'password');
                
                const icon = togglePasswordBtn.querySelector('i');
                if (icon) {
                    icon.className = isPasswordType ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                }
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('login-remember') ? document.getElementById('login-remember').checked : false;
            const submitBtn = document.getElementById('btn-login-submit');
            
            if (!identifier || !password) {
                this.showToast('Informe seu CPF/E-mail e senha de acesso.', 'warning');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Autenticando...';
                
                await window.movixStore.login(identifier, password, rememberMe);
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
        if (avatarImg) {
            avatarImg.src = user.foto || '/img/avatar-default.png';
            avatarImg.onerror = function() { this.src = '/img/avatar-default.png'; };
        }
        
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
                    <img src="${user.foto || '/img/avatar-default.png'}" onerror="this.src='/img/avatar-default.png'" class="sidebar-user-avatar" alt="Avatar">
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
                    const modal = document.getElementById('global-modal');
                    const modalTitle = document.getElementById('modal-title');
                    const modalBody = document.getElementById('modal-body-content');
                    const modalFooter = document.getElementById('modal-footer-actions');

                    modalTitle.innerText = 'Confirmar Encerramento';
                    modalBody.innerHTML = `
                        <div style="text-align: center; padding: 16px;">
                            <i class="fa-solid fa-right-from-bracket text-warning" style="font-size: 3rem; margin-bottom: 16px;"></i>
                            <p style="font-size: 1.05rem; font-weight: 600;">Deseja realmente sair do sistema?</p>
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Isso encerrará a sua sessão de trabalho atual e você precisará fazer login novamente.</p>
                        </div>
                    `;

                    modalFooter.innerHTML = `
                        <button class="btn btn-secondary" id="btn-cancelar-logout">Cancelar</button>
                        <button class="btn btn-primary" id="btn-confirmar-logout" style="background-color: var(--primary); color: #fff;">Sair do Sistema</button>
                    `;

                    modal.classList.add('active');

                    document.getElementById('btn-cancelar-logout').addEventListener('click', () => modal.classList.remove('active'));
                    document.getElementById('btn-confirmar-logout').addEventListener('click', () => {
                        modal.classList.remove('active');
                        window.movixStore.logout();
                        this.showToast('Sessão encerrada com sucesso.', 'info');
                    });
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
        const alerts = window.movixStore.getAlerts();
        const unreadCount = alerts.filter(n => n.status === 'Não lida').length;

        // Se surgirem novos alertas não lidos, reativar o indicador visual
        const lastUnreadCount = parseInt(localStorage.getItem('movix_last_unread_count') || '0');
        if (unreadCount > lastUnreadCount) {
            localStorage.removeItem('movix_alerts_silenced');
        }
        localStorage.setItem('movix_last_unread_count', unreadCount.toString());

        const isSilenced = localStorage.getItem('movix_alerts_silenced') === 'true';
        if (unreadCount > 0 && !isSilenced) {
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    }

    refreshNotificationsPanel() {
        const list = document.getElementById('notifications-list');
        const alerts = window.movixStore.getAlerts();
        const recentAlerts = alerts
            .filter(n => n.status !== 'Resolvida')
            .slice(0, 5);

        list.innerHTML = '';
        if (recentAlerts.length === 0) {
            list.innerHTML = `
                <li style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.8rem;">
                    Nenhuma notificação pendente!
                </li>
            `;
            return;
        }

        recentAlerts.forEach(a => {
            let colorClass = 'info';
            let icon = '<i class="fa-solid fa-circle-info"></i>';

            if (a.prioridade === 'Crítica') { colorClass = 'danger'; icon = '<i class="fa-solid fa-triangle-exclamation"></i>'; }
            else if (a.prioridade === 'Alta') { colorClass = 'warning'; icon = '<i class="fa-solid fa-circle-exclamation"></i>'; }

            if (a.categoria === 'Veículos') icon = '<i class="fa-solid fa-truck"></i>';
            else if (a.categoria === 'Motoristas') icon = '<i class="fa-solid fa-id-card-clip"></i>';
            else if (a.categoria === 'Manutenções') icon = '<i class="fa-solid fa-screwdriver-wrench"></i>';
            else if (a.categoria === 'Troca de Óleo') icon = '<i class="fa-solid fa-oil-can"></i>';
            else if (a.categoria === 'Pneus') icon = '<i class="fa-solid fa-circle-notch"></i>';
            else if (a.categoria === 'Viagens') icon = '<i class="fa-solid fa-route"></i>';
            else if (a.categoria === 'Multas') icon = '<i class="fa-solid fa-ticket"></i>';

            list.innerHTML += `
                <li class="notification-item" data-route="${a.link || 'notificacoes'}" data-target="${a.targetId || ''}" style="cursor:pointer; ${a.status === 'Não lida' ? 'background: rgba(var(--primary-rgb), 0.04);' : ''}">
                    <div class="notification-icon-wrapper ${colorClass}">
                        ${icon}
                    </div>
                    <div class="notification-text-wrapper">
                        <span class="notification-msg" style="color:var(--text-main); font-weight:600; font-size:0.8rem;">${a.titulo}</span>
                        <span class="notification-time" style="font-size:0.75rem;">${a.descricao || a.desc || ''}</span>
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
            const pneu = window.movixStore.getPneus().filter(p => p.codigo.toLowerCase().includes(query) || p.marca.toLowerCase().includes(query) || (p.modelo && p.modelo.toLowerCase().includes(query)));

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
                    const tireInfo = window.movixApp.getTireInfo(p);
                    const labelStr = `${tireInfo.marcaModelo}${tireInfo.refMedida ? ` - ${tireInfo.refMedida}` : ''}`;
                    results.innerHTML += `
                        <div class="search-result-item" onclick="window.movixRouter.navigateTo('pneus')">
                            <div class="search-result-icon"><i class="fa-solid fa-ring"></i></div>
                            <div class="search-result-info">
                                <strong>Pneu ${p.codigo}</strong>
                                <span class="search-result-subtitle">${labelStr} (${p.posicao || 'Estoque'})</span>
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
            // Disabled to keep modal open when clicking outside. Close only via button clicks (X, Cancelar, Salvar).
        });
    }

    // --- CUSTOM CONFIRMATION DIALOG (REGRA 2 OVERLAY) ---
    showConfirmModal(message, onConfirm, onCancel) {
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.backgroundColor = 'var(--bg-backdrop, rgba(0, 0, 0, 0.6))';
        backdrop.style.backdropFilter = 'blur(4px)';
        backdrop.style.zIndex = '99999';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        backdrop.style.animation = 'fadeIn 0.2s ease-out';

        const container = document.createElement('div');
        container.style.background = 'var(--bg-surface, #fff)';
        container.style.border = '1px solid var(--border-color, #e2e8f0)';
        container.style.borderRadius = 'var(--border-radius-md, 12px)';
        container.style.padding = '24px';
        container.style.maxWidth = '420px';
        container.style.width = '90%';
        container.style.boxShadow = 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))';
        container.style.textAlign = 'center';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '16px';
        container.style.animation = 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';

        container.innerHTML = `
            <div style="font-size: 3rem; color: var(--warning, #f59e0b);">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 style="margin: 0; font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--text-main, #0f172a);">Atenção!</h3>
            <p style="margin: 0; font-size: 0.95rem; line-height: 1.5; color: var(--text-muted, #64748b);">${message}</p>
            <div style="display: flex; gap: 12px; margin-top: 8px;">
                <button id="confirm-btn-corrigir" class="btn btn-secondary" style="flex: 1; justify-content: center; font-weight: 700; height: 38px;">Corrigir</button>
                <button id="confirm-btn-continuar" class="btn btn-primary" style="flex: 1; justify-content: center; font-weight: 700; height: 38px; color: #fff;">Continuar</button>
            </div>
        `;

        backdrop.appendChild(container);
        document.body.appendChild(backdrop);

        const cleanUp = () => {
            backdrop.remove();
        };

        backdrop.querySelector('#confirm-btn-continuar').addEventListener('click', () => {
            cleanUp();
            if (onConfirm) onConfirm();
        });

        backdrop.querySelector('#confirm-btn-corrigir').addEventListener('click', () => {
            cleanUp();
            if (onCancel) onCancel();
        });
    }

    // --- CUSTOM PREMIUM KM VALIDATION MODAL ---
    showKMValidationModal({ type, baseKM, enteredKM, diff, onConfirm, onCancel }) {
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.backgroundColor = 'var(--bg-backdrop, rgba(0, 0, 0, 0.6))';
        backdrop.style.backdropFilter = 'blur(4px)';
        backdrop.style.zIndex = '99999';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        backdrop.style.animation = 'fadeIn 0.2s ease-out';

        const container = document.createElement('div');
        container.style.background = 'var(--bg-surface, #fff)';
        container.style.border = '1px solid var(--border-color, #e2e8f0)';
        container.style.borderRadius = 'var(--border-radius-md, 12px)';
        container.style.padding = '28px';
        container.style.maxWidth = '480px';
        container.style.width = '90%';
        container.style.boxShadow = 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))';
        container.style.textAlign = 'left';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '16px';
        container.style.animation = 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';

        const formatKM = (num) => parseFloat(num).toLocaleString('pt-BR') + ' km';

        let htmlContent = '';
        let confirmBtnText = 'Confirmar Registro';
        let cancelBtnText = 'Cancelar e Corrigir';

        if (type === 'menor') {
            cancelBtnText = 'Cancelar e Corrigir';
            htmlContent = `
                <div style="text-align: center; font-size: 3rem; color: var(--danger, #ef4444); margin-bottom: 8px;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3 style="margin: 0; text-align: center; font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: var(--text-main, #0f172a);">Atenção!</h3>
                <p style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-main, #0f172a); text-align: center;">O KM informado é menor que a última quilometragem registrada para este veículo.</p>
                
                <div style="background: var(--bg-main, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 12px 16px; margin: 4px 0; display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem;">
                    <div><strong style="color: var(--text-main, #0f172a);">Último KM registrado:</strong> <span style="color: var(--danger, #ef4444); font-weight: 700;">${formatKM(baseKM)}</span></div>
                    <div><strong style="color: var(--text-main, #0f172a);">KM informado:</strong> <span style="color: var(--text-main, #0f172a); font-weight: 700;">${formatKM(enteredKM)}</span></div>
                </div>
                
                <p style="margin: 0; font-size: 0.9rem; line-height: 1.5; color: var(--text-muted, #64748b);">
                    Isso pode causar inconsistências nos cálculos de consumo, manutenção, pneus e troca de óleo.
                </p>
                <p style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-main, #0f172a); text-align: center;">Deseja continuar mesmo assim?</p>
            `;
        } else if (type === 'alto') {
            cancelBtnText = 'Revisar Informação';
            htmlContent = `
                <div style="text-align: center; font-size: 3rem; color: var(--warning, #f59e0b); margin-bottom: 8px;">
                    <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <h3 style="margin: 0; text-align: center; font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: var(--text-main, #0f172a);">Atenção!</h3>
                <p style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-main, #0f172a); text-align: center;">
                    Foi identificada uma diferença de <span style="color: var(--warning, #f59e0b); font-weight: 700;">${formatKM(diff)}</span> em relação ao último registro.
                </p>
                
                <div style="background: var(--bg-main, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 12px 16px; margin: 4px 0; display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem;">
                    <div><strong style="color: var(--text-main, #0f172a);">Último KM registrado:</strong> <span style="color: var(--text-main, #0f172a); font-weight: 700;">${formatKM(baseKM)}</span></div>
                    <div><strong style="color: var(--text-main, #0f172a);">KM informado:</strong> <span style="color: var(--warning, #f59e0b); font-weight: 700;">${formatKM(enteredKM)}</span></div>
                </div>
                
                <p style="margin: 0; font-size: 0.9rem; line-height: 1.5; color: var(--text-muted, #64748b); text-align: center;">
                    Verifique se a quilometragem foi digitada corretamente.
                </p>
                <p style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-main, #0f172a); text-align: center;">Deseja continuar?</p>
            `;
        }

        container.innerHTML = `
            ${htmlContent}
            
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                <label for="validation-justificativa" style="font-size: 0.85rem; font-weight: 700; color: var(--text-main, #0f172a);">Motivo da divergência <span style="font-weight: 400; color: var(--text-muted);">(opcional)</span></label>
                <textarea id="validation-justificativa" placeholder="Digite uma justificativa para este lançamento..." style="width: 100%; min-height: 70px; padding: 10px; border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; background: var(--bg-surface-hover, #f1f5f9); color: var(--text-main, #0f172a); font-family: inherit; font-size: 0.9rem; resize: vertical; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--primary, #3b82f6)'" onblur="this.style.borderColor='var(--border-color, #e2e8f0)'"></textarea>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 12px;">
                <button id="confirm-btn-corrigir" class="btn btn-secondary" style="flex: 1; justify-content: center; font-weight: 700; height: 42px;">${cancelBtnText}</button>
                <button id="confirm-btn-continuar" class="btn btn-primary" style="flex: 1; justify-content: center; font-weight: 700; height: 42px; color: #fff;">${confirmBtnText}</button>
            </div>
        `;

        backdrop.appendChild(container);
        document.body.appendChild(backdrop);

        const cleanUp = () => {
            backdrop.remove();
        };

        backdrop.querySelector('#confirm-btn-continuar').addEventListener('click', () => {
            const justificativa = backdrop.querySelector('#validation-justificativa').value.trim();
            cleanUp();
            if (onConfirm) onConfirm(justificativa);
        });

        backdrop.querySelector('#confirm-btn-corrigir').addEventListener('click', () => {
            cleanUp();
            if (onCancel) onCancel();
        });
    }

    // --- CENTRALIZED MILEAGE VALIDATION SERVICE ---
    validateKM(veiculoId, enteredKM, onValid, isEdit = false, originalKM = 0) {
        if (!veiculoId) {
            onValid();
            return;
        }

        const vehicle = window.movixStore.getVeiculo(veiculoId);
        if (!vehicle) {
            onValid();
            return;
        }

        const currentKM = parseFloat(vehicle.kmAtual) || 0;
        const enteredKMNum = parseFloat(enteredKM) || 0;
        const originalKMNum = parseFloat(originalKM) || 0;

        const baseKM = isEdit ? originalKMNum : currentKM;

        // Regra 1 – KM menor que o último registrado (baseKM)
        if (enteredKMNum < baseKM) {
            this.showKMValidationModal({
                type: 'menor',
                baseKM,
                enteredKM: enteredKMNum,
                onConfirm: (justificativa) => {
                    onValid(justificativa);
                },
                onCancel: null
            });
            return;
        }

        // Regra 2 – Diferença muito alta de KM (acima de 5.000 km)
        const diff = enteredKMNum - baseKM;
        if (diff > 5000) {
            this.showKMValidationModal({
                type: 'alto',
                baseKM,
                enteredKM: enteredKMNum,
                diff,
                onConfirm: (justificativa) => {
                    onValid(justificativa);
                },
                onCancel: null
            });
            return;
        }

        onValid();
    }

    // --- CENTRALIZED AUTOCOMPLETE SELECT COMPONENT SERVICE ---
    initAutocomplete(selectEl, placeholder = 'Selecione ou digite para buscar...') {
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
        input.className = selectEl.className; // inherit form-control / filter-input styles
        input.placeholder = placeholder;
        input.autocomplete = 'off';
        if (selectEl.disabled) input.disabled = true;

        const chevron = document.createElement('i');
        chevron.className = 'fa-solid fa-chevron-down autocomplete-chevron';

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
        container.appendChild(wrapper);
        container.appendChild(dropdown);

        selectEl.parentNode.insertBefore(container, selectEl);

        let options = [];
        let focusedIndex = -1;

        // Function to rebuild options list from select options dynamically
        const syncOptions = () => {
            list.innerHTML = '';
            options = Array.from(selectEl.options).map((opt, index) => {
                const text = opt.text;
                const value = opt.value;
                const isSelected = opt.selected;
                const isDisabled = opt.disabled;

                if (value === "" && isDisabled) return null; // skip default placeholder option

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
                        opt.element.innerHTML = opt.text.replace(regex, '<strong style="color: var(--primary); text-decoration: underline;">$1</strong>');
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
            if (selectEl.disabled) return;
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
            input.value = selectedOpt ? selectedOpt.text : '';
            if (selectEl.disabled) {
                input.disabled = true;
            } else {
                input.disabled = false;
            }
            syncOptions();
        });

        syncOptions();
    }

    // --- CENTRALIZED LOADING INDICATOR SERVICE ---
    startLoading(button, loadingText = "Processando...") {
        if (!button) return { stop: () => {} };
        const originalHTML = button.innerHTML;
        const originalDisabled = button.disabled;
        
        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="margin-right: 6px;"></i>${loadingText}`;
        
        return {
            stop: () => {
                button.disabled = originalDisabled;
                button.innerHTML = originalHTML;
            }
        };
    }

    // --- CURRENCY UTILITIES AND MASKS ---
    formatDecimal(val) {
        if (val === null || val === undefined || val === '') return '';
        const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
        if (isNaN(num)) return '';
        return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    }

    setupLitrosInputHandler() {
        document.addEventListener('input', (e) => {
            const target = e.target;
            if (target.tagName === 'INPUT' && target.name === 'litros') {
                let val = target.value;
                let cleaned = val.replace(/\./g, ',');
                cleaned = cleaned.replace(/[^\d,]/g, '');
                const firstCommaIndex = cleaned.indexOf(',');
                if (firstCommaIndex !== -1) {
                    cleaned = cleaned.substring(0, firstCommaIndex + 1) + 
                              cleaned.substring(firstCommaIndex + 1).replace(/,/g, '');
                    const parts = cleaned.split(',');
                    if (parts[1].length > 3) {
                        cleaned = parts[0] + ',' + parts[1].substring(0, 3);
                    }
                }
                if (target.value !== cleaned) {
                    const selectionStart = target.selectionStart;
                    target.value = cleaned;
                    if (selectionStart !== null) {
                        try {
                            target.setSelectionRange(selectionStart, selectionStart);
                        } catch (err) {}
                    }
                }
            }
        });
    }

    formatCurrency(val) {
        if (val === null || val === undefined || val === '') return 'R$ 0,00';
        
        let digits = '';
        if (typeof val === 'number') {
            digits = val.toFixed(2).replace(/\D/g, '');
        } else {
            digits = val.toString().replace(/\D/g, '');
        }
        
        if (!digits) return 'R$ 0,00';
        
        // Remove zeros à esquerda
        digits = digits.replace(/^0+/, '');
        while (digits.length < 3) {
            digits = '0' + digits;
        }
        
        const cents = digits.slice(-2);
        const integerPart = digits.slice(0, -2);
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        return `R$ ${formattedInteger},${cents}`;
    }

    cleanCurrency(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        
        let cleaned = val.toString().trim();
        cleaned = cleaned.replace(/^R\$\s*/i, '');
        cleaned = cleaned.replace(/\./g, '');
        cleaned = cleaned.replace(',', '.');
        
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    parsePastedValue(text) {
        if (!text) return null;
        let cleaned = text.trim().replace(/^R\$\s*/i, '');
        
        if (cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            const parts = cleaned.split('.');
            if (parts.length === 2) {
                if (parts[1].length === 3 && parts[0].length <= 3) {
                    cleaned = cleaned.replace(/\./g, '');
                }
            } else if (parts.length > 2) {
                cleaned = cleaned.replace(/\./g, '');
            }
        }
        
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }

    setupCurrencyMasks() {
        const isFinancialInput = (target) => {
            return target.tagName === 'INPUT' && (
                target.name === 'valor' ||
                target.name === 'custo' ||
                target.name === 'custos' ||
                target.name === 'valorMensalSeguro' ||
                target.name === 'valorMensalRastreador' ||
                target.name === 'valorTotal' ||
                target.name === 'valorLitro'
            );
        };

        document.addEventListener('input', (e) => {
            const target = e.target;
            if (isFinancialInput(target)) {
                const val = target.value;
                const formatted = this.formatCurrency(val);
                if (target.value !== formatted) {
                    target.value = formatted;
                    // Força o cursor a ir para o final após alteração do valor
                    setTimeout(() => {
                        const len = target.value.length;
                        try {
                            target.setSelectionRange(len, len);
                        } catch (err) {}
                    }, 0);
                }
            }
        });

        document.addEventListener('paste', (e) => {
            const target = e.target;
            if (isFinancialInput(target)) {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const parsed = this.parsePastedValue(pastedText);
                if (parsed !== null) {
                    target.value = this.formatCurrency(parsed);
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });
    }

    getListState(moduleName) {
        if (!this.listStates) this.listStates = {};
        return this.listStates[moduleName] || null;
    }

    saveListState(moduleName, state) {
        if (!this.listStates) this.listStates = {};
        this.listStates[moduleName] = {
            ...(this.listStates[moduleName] || {}),
            ...state
        };
    }

    renderPagination({
        containerId,
        currentPage,
        totalItems,
        itemsPerPage,
        noun = 'registros',
        onPageChange,
        onItemsPerPageChange
    }) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (totalItems === 0) {
            container.innerHTML = '';
            return;
        }

        const itemsPerPageNum = itemsPerPage === 'Todos' ? Infinity : parseInt(itemsPerPage);
        const totalPages = Math.ceil(totalItems / itemsPerPageNum) || 1;
        
        let validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

        const startIdx = totalItems === 0 ? 0 : (itemsPerPageNum === Infinity ? 1 : (validCurrentPage - 1) * itemsPerPageNum + 1);
        const endIdx = itemsPerPageNum === Infinity ? totalItems : Math.min(validCurrentPage * itemsPerPageNum, totalItems);

        let pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (validCurrentPage <= 4) {
                pages = [1, 2, 3, 4, 5, '...', totalPages];
            } else if (validCurrentPage >= totalPages - 3) {
                pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages];
            }
        }

        let html = `
            <div class="pagination-limit" style="display: flex; align-items: center; gap: 8px;">
                <span>Mostrar:</span>
                <select class="pagination-select" style="padding: 4px 8px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); background-color: var(--bg-surface); color: var(--text-main); font-size: 0.8rem; cursor: pointer;">
                    <option value="10" ${itemsPerPage == 10 ? 'selected' : ''}>10 registros</option>
                    <option value="25" ${itemsPerPage == 25 ? 'selected' : ''}>25 registros</option>
                    <option value="50" ${itemsPerPage == 50 ? 'selected' : ''}>50 registros</option>
                    <option value="100" ${itemsPerPage == 100 ? 'selected' : ''}>100 registros</option>
                    <option value="Todos" ${itemsPerPage === 'Todos' ? 'selected' : ''}>Todos</option>
                </select>
                <span>por página</span>
            </div>
            <span class="pagination-info" style="font-weight: 500;">Mostrando ${startIdx} a ${endIdx} de ${totalItems} ${noun}</span>
            <div class="pagination-pages" style="display: flex; gap: 6px; align-items: center;">
                <button class="page-number-btn" id="prev-page" ${validCurrentPage === 1 ? 'disabled' : ''} style="display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-chevron-left"></i></button>
        `;

        pages.forEach(p => {
            if (p === '...') {
                html += `<span style="padding: 0 4px; color: var(--text-muted);">...</span>`;
            } else {
                html += `
                    <button class="page-number-btn ${validCurrentPage === p ? 'active' : ''}" data-page="${p}">
                        ${p}
                    </button>
                `;
            }
        });

        html += `
                <button class="page-number-btn" id="next-page" ${validCurrentPage === totalPages ? 'disabled' : ''} style="display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        `;

        container.innerHTML = html;

        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);

        newContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-number-btn');
            if (!btn || btn.disabled) return;

            let targetPage = validCurrentPage;
            if (btn.id === 'prev-page') {
                targetPage = validCurrentPage - 1;
            } else if (btn.id === 'next-page') {
                targetPage = validCurrentPage + 1;
            } else {
                targetPage = parseInt(btn.getAttribute('data-page'));
            }

            if (onPageChange && targetPage !== validCurrentPage) {
                onPageChange(targetPage);
            }
        });

        const newSelect = newContainer.querySelector('.pagination-select');
        newSelect.addEventListener('change', (e) => {
            if (onItemsPerPageChange) {
                onItemsPerPageChange(e.target.value);
            }
        });
    }

    setupScrollTracking() {
        window.addEventListener('scroll', () => {
            if (window.movixRouter && window.movixRouter.currentRoute) {
                const route = window.movixRouter.currentRoute;
                const state = this.getListState(route);
                if (state) {
                    state.scroll = window.scrollY;
                }
            }
        });
    }

    setupPrintThemeSwap() {
        let themeRestore = null;

        window.addEventListener('beforeprint', () => {
            if (document.body.classList.contains('theme-dark')) {
                themeRestore = 'theme-dark';
                document.body.classList.remove('theme-dark');
                document.body.classList.add('theme-light');
            }
        });

        window.addEventListener('afterprint', () => {
            if (themeRestore) {
                document.body.classList.remove('theme-light');
                document.body.classList.add(themeRestore);
                themeRestore = null;
            }
        });
    }
}

// Instantiate App Control
window.movixApp = new MovixApp();

window.movixApp.getTireInfo = function(p) {
    if (!p) return { marcaModelo: '', refMedida: '' };
    const m = p.modelo || '';
    const isMeasure = typeof m === 'string' && /^[0-9]/.test(m.trim()) && (m.includes('/') || /R[0-9]/i.test(m));
    if (isMeasure) {
        return {
            marcaModelo: p.marca || '',
            refMedida: m
        };
    } else {
        return {
            marcaModelo: p.modelo ? `${p.marca || ''} ${p.modelo}`.trim() : (p.marca || ''),
            refMedida: p.medida || ''
        };
    }
};
