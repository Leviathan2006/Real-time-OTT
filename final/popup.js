// Subtitle-Translation Extension - Popup Script

class PopupManager {
  constructor() {
    this.elements = {};
    this.selectedLanguage = 'es'; // Default language
    this.init();
  }

  init() {
    this.getElements();
    this.loadSettings();
    this.setupEventListeners();
    this.setupSearchableDropdown();
  }

  getElements() {
    this.elements = {
      status: document.getElementById('status'),
      translationToggle: document.getElementById('translationToggle'),
      searchInput: document.getElementById('searchInput'),
      languageDropdown: document.getElementById('languageDropdown'),
      dropdownItems: document.querySelectorAll('.dropdown-item'),
      fontFamily: document.getElementById('fontFamily'),
      fontSize: document.getElementById('fontSize'),
      fontSizeValue: document.getElementById('fontSizeValue'),
      backgroundOpacity: document.getElementById('backgroundOpacity'),
      opacityValue: document.getElementById('opacityValue')
    };
  }

  loadSettings() {
    chrome.storage.local.get(['translationEnabled', 'targetLanguage', 'fontFamily', 'fontSize', 'backgroundOpacity'], (result) => {
      console.log('Loaded settings:', result);
      if (result.translationEnabled !== undefined) {
        this.elements.translationToggle.classList.toggle('active', result.translationEnabled);
      }
      if (result.targetLanguage) {
        this.selectedLanguage = result.targetLanguage;
        this.updateSearchInput();
      }
      if (result.fontFamily) {
        this.elements.fontFamily.value = result.fontFamily;
      }
      if (result.fontSize) {
        this.elements.fontSize.value = result.fontSize;
        this.elements.fontSizeValue.textContent = result.fontSize + 'px';
      }
      if (result.backgroundOpacity !== undefined) {
        this.elements.backgroundOpacity.value = result.backgroundOpacity;
        this.elements.opacityValue.textContent = result.backgroundOpacity + '%';
      }
    });
  }

  setupEventListeners() {
    this.elements.translationToggle.addEventListener('click', () => this.handleTranslationToggle());
    this.elements.fontFamily.addEventListener('change', () => this.handleFontFamilyChange());
    this.elements.fontSize.addEventListener('input', () => this.handleFontSizeChange());
    this.elements.backgroundOpacity.addEventListener('input', () => this.handleOpacityChange());
  }

  setupSearchableDropdown() {
    // Search input functionality
    this.elements.searchInput.addEventListener('input', (e) => {
      this.filterLanguages(e.target.value);
    });

    // Show dropdown on focus
    this.elements.searchInput.addEventListener('focus', () => {
      this.showDropdown();
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.elements.searchInput.contains(e.target) && !this.elements.languageDropdown.contains(e.target)) {
        this.hideDropdown();
      }
    });

    // Handle language selection
    this.elements.dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const languageCode = item.getAttribute('data-value');
        const languageName = item.textContent;
        this.selectLanguage(languageCode, languageName);
      });
    });

    // Handle keyboard navigation
    this.elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const visibleItems = Array.from(this.elements.dropdownItems).filter(item => !item.classList.contains('hidden'));
        if (visibleItems.length > 0) {
          const firstItem = visibleItems[0];
          const languageCode = firstItem.getAttribute('data-value');
          const languageName = firstItem.textContent;
          this.selectLanguage(languageCode, languageName);
        }
      }
    });
  }

  filterLanguages(searchTerm) {
    const items = this.elements.dropdownItems;
    const term = searchTerm.toLowerCase();

    items.forEach(item => {
      const languageName = item.textContent.toLowerCase();
      const languageCode = item.getAttribute('data-value').toLowerCase();
      
      if (languageName.includes(term) || languageCode.includes(term)) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });

    // Show dropdown if there are visible items
    const visibleItems = Array.from(items).filter(item => !item.classList.contains('hidden'));
    if (visibleItems.length > 0) {
      this.showDropdown();
    } else {
      this.hideDropdown();
    }
  }

  showDropdown() {
    this.elements.languageDropdown.classList.add('show');
  }

  hideDropdown() {
    this.elements.languageDropdown.classList.remove('show');
  }

  selectLanguage(languageCode, languageName) {
    this.selectedLanguage = languageCode;
    this.elements.searchInput.value = languageName;
    this.hideDropdown();
    
    // Update selected state in dropdown
    this.elements.dropdownItems.forEach(item => {
      item.classList.remove('selected');
      if (item.getAttribute('data-value') === languageCode) {
        item.classList.add('selected');
      }
    });

    this.handleLanguageChange();
  }

  updateSearchInput() {
    const selectedItem = Array.from(this.elements.dropdownItems).find(item => 
      item.getAttribute('data-value') === this.selectedLanguage
    );
    if (selectedItem) {
      this.elements.searchInput.value = selectedItem.textContent;
      selectedItem.classList.add('selected');
    }
  }

  handleTranslationToggle() {
    const isActive = this.elements.translationToggle.classList.toggle('active');
    console.log('Translation toggle clicked, new state:', isActive);
    
    chrome.storage.local.set({ translationEnabled: isActive }, () => {
      console.log('Settings saved:', { translationEnabled: isActive });
    });
    
    this.sendMessageToContentScript({
      type: 'UPDATE_TRANSLATION_SETTINGS',
      translationEnabled: isActive,
      targetLanguage: this.selectedLanguage
    });
    
    this.showStatus('Translation ' + (isActive ? 'enabled' : 'disabled'), 'success');
  }

  handleLanguageChange() {
    console.log('Language changed to:', this.selectedLanguage);
    
    chrome.storage.local.set({ targetLanguage: this.selectedLanguage }, () => {
      console.log('Language setting saved:', this.selectedLanguage);
    });
    
    this.sendMessageToContentScript({
      type: 'UPDATE_TRANSLATION_SETTINGS',
      translationEnabled: this.elements.translationToggle.classList.contains('active'),
      targetLanguage: this.selectedLanguage
    });
    
    this.showStatus('Language changed to ' + this.elements.searchInput.value, 'info');
  }

  handleFontFamilyChange() {
    const fontFamily = this.elements.fontFamily.value;
    console.log('Font family changed to:', fontFamily);
    
    chrome.storage.local.set({ fontFamily: fontFamily }, () => {
      console.log('Font family setting saved:', fontFamily);
    });
    
    this.sendMessageToContentScript({
      type: 'UPDATE_SUBTITLE_SETTINGS',
      fontFamily: fontFamily,
      fontSize: this.elements.fontSize.value,
      backgroundOpacity: this.elements.backgroundOpacity.value
    });
    
    this.showStatus('Font family changed to ' + fontFamily, 'info');
  }

  handleFontSizeChange() {
    const fontSize = this.elements.fontSize.value;
    console.log('Font size changed to:', fontSize);
    
    chrome.storage.local.set({ fontSize: fontSize }, () => {
      console.log('Font size setting saved:', fontSize);
    });
    
    this.elements.fontSizeValue.textContent = fontSize + 'px';
    
    this.sendMessageToContentScript({
      type: 'UPDATE_SUBTITLE_SETTINGS',
      fontFamily: this.elements.fontFamily.value,
      fontSize: fontSize,
      backgroundOpacity: this.elements.backgroundOpacity.value
    });
    
    this.showStatus('Font size changed to ' + fontSize + 'px', 'info');
  }

  handleOpacityChange() {
    const opacity = this.elements.backgroundOpacity.value;
    console.log('Background opacity changed to:', opacity);
    
    chrome.storage.local.set({ backgroundOpacity: opacity }, () => {
      console.log('Background opacity setting saved:', opacity);
    });
    
    this.elements.opacityValue.textContent = opacity + '%';
    
    this.sendMessageToContentScript({
      type: 'UPDATE_SUBTITLE_SETTINGS',
      fontFamily: this.elements.fontFamily.value,
      fontSize: this.elements.fontSize.value,
      backgroundOpacity: opacity
    });
    
    this.showStatus('Background opacity changed to ' + opacity + '%', 'info');
  }

  sendMessageToContentScript(message) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs && tabs[0]) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, message).catch((error) => {
            console.error('Error sending message:', error);
            this.showStatus('Extension needs to be refreshed on Netflix page', 'error');
          });
        } catch (error) {
          console.error('Error sending message:', error);
          this.showStatus('Extension needs to be refreshed', 'error');
        }
      } else {
        this.showStatus('No Netflix tab found', 'error');
      }
    });
  }

  showStatus(message, type) {
    this.elements.status.innerText = message;
    this.elements.status.className = type;
    setTimeout(() => {
      this.elements.status.innerText = '';
      this.elements.status.className = '';
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded, initializing...');
  new PopupManager();
}); 