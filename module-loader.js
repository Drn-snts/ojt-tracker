// ============================================================
//  MODULE LOADER
// ============================================================
// Dynamically load content sections for each module
const moduleLoader = {
    modules: ['dashboard', 'entries', 'weekly', 'profile', 'holidays', 'export'],
    mainContent: null,

    async init() {
        this.mainContent = document.querySelector('main.main-content');
        if (!this.mainContent) return;

        for (const module of this.modules) {
            await this.loadModule(module);
        }
    },

    async loadModule(name) {
        try {
            const response = await fetch(`modules/${name}.html`);
            const html = await response.text();
            const section = document.createElement('div');
            section.innerHTML = html;
            
            // Extract the section element and append to main content
            const sectionEl = section.querySelector('section');
            if (sectionEl) {
                this.mainContent.appendChild(sectionEl);
            }
        } catch (err) {
            console.error(`Failed to load module: ${name}`, err);
        }
    }
};

// Initialize module loader when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => moduleLoader.init());
} else {
    moduleLoader.init();
}
