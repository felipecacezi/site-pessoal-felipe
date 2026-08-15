import { TranslationServicePort } from '../ports/translation-service.port.js';
import { pt } from '../languages/pt.js';
import { en } from '../languages/en.js';

const dictionaries = { pt, en };

export class LocalTranslationAdapter extends TranslationServicePort {
  constructor() {
    super();
    this.currentLang = localStorage.getItem('preferred-language') || (navigator.language.startsWith('en') ? 'en' : 'pt');
  }

  translate(key) {
    const dictionary = dictionaries[this.currentLang];
    return dictionary?.[key] || key;
  }

  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('preferred-language', lang);
  }

  getCurrentLanguage() {
    return this.currentLang;
  }
}
