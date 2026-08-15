export class Translator {
  /**
   * @param {TranslationServicePort} translationService 
   */
  constructor(translationService) {
    this.translationService = translationService;
    this.listeners = [];
  }

  getCurrentLanguage() {
    return this.translationService.getCurrentLanguage();
  }

  setLanguage(lang) {
    this.translationService.setLanguage(lang);
    this.translateDOM();
    this.updateLanguageButtons();
    // Notify listeners of the language change
    this.listeners.forEach(callback => callback(lang));
  }

  onLanguageChange(callback) {
    this.listeners.push(callback);
  }

  translate(key) {
    return this.translationService.translate(key);
  }

  translateDOM() {
    // Translate text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.translate(key);
      if (text !== null) {
        el.innerHTML = text;
      }
    });

    // Translate placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const placeholder = this.translate(key);
      if (placeholder !== null) {
        el.placeholder = placeholder;
      }
    });
  }

  updateLanguageButtons() {
    const ptBtn = document.getElementById('lang-pt-btn');
    const enBtn = document.getElementById('lang-en-btn');
    const currentLang = this.getCurrentLanguage();

    if (ptBtn && enBtn) {
      if (currentLang === 'pt') {
        ptBtn.className = 'px-2.5 py-1.5 bg-primary text-on-primary font-bold';
        enBtn.className = 'px-2.5 py-1.5 bg-surface-container dark:bg-inverse-surface text-primary dark:text-[#fcf9f4] hover:bg-secondary/20';
      } else {
        enBtn.className = 'px-2.5 py-1.5 bg-primary text-on-primary font-bold';
        ptBtn.className = 'px-2.5 py-1.5 bg-surface-container dark:bg-inverse-surface text-primary dark:text-[#fcf9f4] hover:bg-secondary/20';
      }
    }
  }

  init() {
    const ptBtn = document.getElementById('lang-pt-btn');
    const enBtn = document.getElementById('lang-en-btn');

    if (ptBtn && enBtn) {
      ptBtn.addEventListener('click', () => this.setLanguage('pt'));
      enBtn.addEventListener('click', () => this.setLanguage('en'));
    }

    this.translateDOM();
    this.updateLanguageButtons();
  }
}
