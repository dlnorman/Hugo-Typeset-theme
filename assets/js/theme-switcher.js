document.addEventListener('DOMContentLoaded', () => {
    const html = document.documentElement;
    const themeMenuToggle = document.getElementById('theme-menu-toggle');
    const themeMenu = document.getElementById('theme-menu');
    const themeCurrentIcon = document.getElementById('theme-current-icon');
    const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');


    // Apply theme CSS and data attribute without saving
    function applyTheme(theme) {
        html.dataset.theme = theme;

        const oldLink = document.getElementById('theme-css');
        if (oldLink) oldLink.remove();

        if (window.themeCSS && window.themeCSS[theme]) {
            const link = document.createElement('link');
            link.id = 'theme-css';
            link.rel = 'stylesheet';
            link.href = window.themeCSS[theme];
            document.head.appendChild(link);
        }
    }

    // Set and save theme
    function setTheme(theme) {
        applyTheme(theme);
        localStorage.setItem('theme', theme);
        updateActiveOption(theme);
        closeMenu();
    }

    // Clear saved theme and revert to system auto
    function clearTheme() {
        localStorage.removeItem('theme');
        const systemTheme = systemThemeMedia.matches ? 'dark' : 'light';
        applyTheme(systemTheme);
        updateActiveOption(null);
        closeMenu();
    }

    // Toggle: clicking the active theme deselects back to auto
    function toggleTheme(theme) {
        if (localStorage.getItem('theme') === theme) {
            clearTheme();
        } else {
            setTheme(theme);
        }
    }

    // Update the active highlight and toggle button icon
    function updateActiveOption(activeTheme) {
        document.querySelectorAll('.theme-option').forEach(btn => btn.classList.remove('active'));
        const btn = activeTheme
            ? document.querySelector(`.theme-option[data-theme="${activeTheme}"]`)
            : null;
        if (btn) btn.classList.add('active');
        if (themeCurrentIcon) {
            const iconEl = btn ? btn.querySelector('.theme-icon') : null;
            themeCurrentIcon.textContent = iconEl ? iconEl.textContent : '🎨';
        }
    }

    function openMenu() {
        if (themeMenu) themeMenu.classList.add('open');
        if (themeMenuToggle) themeMenuToggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        if (themeMenu) themeMenu.classList.remove('open');
        if (themeMenuToggle) themeMenuToggle.setAttribute('aria-expanded', 'false');
    }

    // Initialize theme on page load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
        updateActiveOption(savedTheme);
    } else {
        const systemTheme = systemThemeMedia.matches ? 'dark' : 'light';
        applyTheme(systemTheme);
        updateActiveOption(null);
    }

    // Respond to OS theme changes only when no theme is pinned
    systemThemeMedia.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // Toggle button opens/closes the menu
    if (themeMenuToggle) {
        themeMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            themeMenu.classList.contains('open') ? closeMenu() : openMenu();
        });
    }

    // Theme option clicks
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            if (theme) toggleTheme(theme);
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (themeMenu && themeMenuToggle &&
            !themeMenu.contains(e.target) &&
            !themeMenuToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // Close menu on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    // ============================================
    // Mobile Menu Functionality
    // ============================================
    const hamburgerButton = document.querySelector('.hamburger-button');
    const mainNav = document.querySelector('.main-nav');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    if (hamburgerButton && mainNav) {
        if (window.innerWidth <= 768) {
            mainNav.setAttribute('aria-hidden', 'true');
        }

        hamburgerButton.addEventListener('click', () => {
            const isExpanded = hamburgerButton.getAttribute('aria-expanded') === 'true';
            hamburgerButton.setAttribute('aria-expanded', !isExpanded);
            hamburgerButton.classList.toggle('active');
            mainNav.classList.toggle('active');
            mainNav.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
            document.body.style.overflow = isExpanded ? '' : 'hidden';
        });

        document.addEventListener('click', (e) => {
            if (
                mainNav.classList.contains('active') &&
                !mainNav.contains(e.target) &&
                !hamburgerButton.contains(e.target)
            ) {
                mainNav.classList.remove('active');
                hamburgerButton.classList.remove('active');
                hamburgerButton.setAttribute('aria-expanded', 'false');
                mainNav.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }
        });
    }

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const dropdown = toggle.closest('.dropdown');
                const isActive = dropdown.classList.contains('active');

                if (isActive) return;

                e.preventDefault();

                document.querySelectorAll('.dropdown').forEach(item => {
                    if (item !== dropdown) item.classList.remove('active');
                });

                dropdown.classList.add('active');
            }
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            if (mainNav) {
                mainNav.classList.remove('active');
                mainNav.removeAttribute('aria-hidden');
            }
            if (hamburgerButton) {
                hamburgerButton.classList.remove('active');
                hamburgerButton.setAttribute('aria-expanded', 'false');
            }
            document.body.style.overflow = '';
        } else {
            if (mainNav && !mainNav.classList.contains('active')) {
                mainNav.setAttribute('aria-hidden', 'true');
            }
        }
    });
});
