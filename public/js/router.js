/* MovixFrota - SPA Hash-based Routing Engine */

class MovixRouter {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.init();
    }

    // Register dynamic page renderers
    register(route, renderFn) {
        this.routes[route] = renderFn;
    }

    init() {
        window.addEventListener('hashchange', () => this.handleHashChange());
        
        // Handle direct navigation on click
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.sidebar-link');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                if (route) {
                    this.navigateTo(route);
                }
            }
        });
    }

    navigateTo(route, targetId = null) {
        if (targetId) {
            window.location.hash = `${route}/${targetId}`;
        } else {
            window.location.hash = route;
        }
    }

    handleHashChange() {
        let hash = window.location.hash.substring(1) || 'dashboard';
        let targetId = null;

        // Check if route has an ID parameter like: #veiculos/V-1
        if (hash.includes('/')) {
            const parts = hash.split('/');
            hash = parts[0];
            targetId = parts[1];
        }

        // Highlight matching sidebar menu item
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(item => {
            const link = item.querySelector('.sidebar-link');
            if (link && link.getAttribute('data-route') === hash) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Trigger renderer
        const render = this.routes[hash];
        if (render) {
            this.currentRoute = hash;
            
            // Clean view wrapper and execute render
            const wrapper = document.getElementById('view-content-wrapper');
            if (wrapper) {
                wrapper.innerHTML = ''; // Clear prior content
                
                // Track dynamic transitions
                wrapper.style.opacity = 0;
                wrapper.style.transform = 'translateY(10px)';
                wrapper.style.transition = 'none';
                
                // Execute render function
                render(wrapper, targetId);
                
                // Animate fade-in
                setTimeout(() => {
                    wrapper.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                    wrapper.style.opacity = 1;
                    wrapper.style.transform = 'translateY(0)';
                }, 50);
            }
        } else {
            console.error(`Route "${hash}" not found. Falling back to dashboard.`);
            this.navigateTo('dashboard');
        }
        
        // Hide mobile search dropdowns or menus if opened
        const searchDropdown = document.getElementById('search-results-dropdown');
        if (searchDropdown) searchDropdown.classList.remove('active');
    }

    // Trigger router initially
    start() {
        this.handleHashChange();
    }
}

window.movixRouter = new MovixRouter();
