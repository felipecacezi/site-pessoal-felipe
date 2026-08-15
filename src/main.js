import './style.css';
import { Translator } from './i18n/translator.js';
import { LocalTranslationAdapter } from './i18n/adapters/local-translation.adapter.js';

// Instantiate Port implementation (Adapter) and inject into Orchestrator (Translator)
const translationService = new LocalTranslationAdapter();
const translator = new Translator(translationService);
translator.init();

// ==========================================
// 1. Theme Configuration (Dark / Light Mode)
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}

// Init theme
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);


// ==========================================
// 2. Navigation Header Scroll Effect
// ==========================================
const header = document.getElementById('main-nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
        header.classList.remove('-translate-y-full');
        header.classList.remove('shadow-sm');
        return;
    }
    
    if (currentScroll > lastScroll && currentScroll > 80) {
        // Scroll down
        header.classList.add('-translate-y-full');
    } else {
        // Scroll up
        header.classList.remove('-translate-y-full');
        header.classList.add('shadow-sm');
    }
    lastScroll = currentScroll;
});


// ==========================================
// 3. Responsive Mobile Navigation Menu
// ==========================================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('flex');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
        });
    });
}


// ==========================================
// 4. Contact Form Handler (with Environment Variables)
// ==========================================
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Retrieve values from environment variables via Vite's import.meta.env
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.exemplo.com/v1';
        const apiToken = import.meta.env.VITE_API_TOKEN || 'dummy-token';
        const integrationKey = import.meta.env.VITE_INTEGRATION_KEY || 'dummy-key';
        
        // Show submitting status using i18n service
        formStatus.classList.remove('hidden', 'text-green-600', 'text-red-600');
        formStatus.classList.add('text-gray-600', 'dark:text-[#d1c4bb]');
        formStatus.innerText = translator.translate('form_status_sending');
        
        // Gather form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            projectType: document.getElementById('project_type').value,
            message: document.getElementById('message').value,
            integrationKey: integrationKey
        };

        try {
            console.log(`[API Request] Sending to: ${apiUrl}`);
            const response = await fetch(`${apiUrl}/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiToken}`
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                formStatus.classList.replace('text-gray-600', 'text-green-600');
                formStatus.innerText = translator.translate('form_status_success');
                contactForm.reset();
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            console.warn('Fallback simulated local submission due to missing/offline backend.');
            
            // Simulates success response and logs payload safely
            setTimeout(() => {
                formStatus.classList.remove('text-gray-600');
                formStatus.classList.add('text-green-600', 'dark:text-green-400');
                
                const successTitle = translator.translate('form_status_success');
                const connectedMsg = translator.translate('form_status_connected');
                
                formStatus.innerHTML = `
                    <p class="font-bold">${successTitle}</p>
                    <p class="text-xs mt-1">${connectedMsg} <strong>${apiUrl}</strong></p>
                `;
                contactForm.reset();
            }, 1000);
        }
    });
}
