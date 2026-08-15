/**
 * Port representing the translation contract (Ports and Adapters architecture)
 * In Vanilla JS, we simulate an interface/abstract class.
 */
export class TranslationServicePort {
  translate(key) {
    throw new Error("Method 'translate(key)' must be implemented by the Adapter.");
  }

  setLanguage(lang) {
    throw new Error("Method 'setLanguage(lang)' must be implemented by the Adapter.");
  }

  getCurrentLanguage() {
    throw new Error("Method 'getCurrentLanguage()' must be implemented by the Adapter.");
  }
}
