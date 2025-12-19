// Netflix Subtitles Extension - Popup Script
// Clean, organized version

class PopupManager {
  constructor() {
    this.elements = {};
    this.init();
  }

  init() {
    this.getElements();
    this.loadSettings();
    this.setupEventListeners();
  }

  getElements() {
    this.elements = {
      deleteBtn: document.getElementById('deleteBtn'),
      saveBtn: document.getElementById('saveBtn'),
      status: document.getElementById('status'),
      translationToggle: document.getElementById('translationToggle'),
      targetLanguage: document.getElementById('targetLanguage')
    };
  }

  loadSettings() {
    chrome.storage.local.get(['translationEnabled', 'targetLanguage'], (result) => {
      if (result.translationEnabled !== undefined) {
        this.elements.translationToggle.classList.toggle('active', result.translationEnabled);
      }
      if (result.targetLanguage) {
        this.elements.targetLanguage.value = result.targetLanguage;
      }
    });
  }

  setupEventListeners() {
    this.elements.translationToggle.onclick = () => this.handleTranslationToggle();
    this.elements.targetLanguage.onchange = () => this.handleLanguageChange();
    this.elements.deleteBtn.onclick = () => this.handleDelete();
    this.elements.saveBtn.onclick = () => this.handleSave();
  }

  handleTranslationToggle() {
    const isActive = this.elements.translationToggle.classList.toggle('active');
    chrome.storage.local.set({ translationEnabled: isActive });
    this.sendMessageToContentScript({
      type: 'UPDATE_TRANSLATION_SETTINGS',
      translationEnabled: isActive,
      targetLanguage: this.elements.targetLanguage.value
    });
    this.showStatus('Translation ' + (isActive ? 'enabled' : 'disabled'), 'success');
  }

  handleLanguageChange() {
    const selectedLanguage = this.elements.targetLanguage.value;
    chrome.storage.local.set({ targetLanguage: selectedLanguage });
    
    this.sendMessageToContentScript({
      type: 'UPDATE_TRANSLATION_SETTINGS',
      translationEnabled: this.elements.translationToggle.classList.contains('active'),
      targetLanguage: selectedLanguage
    });
    
    this.showStatus('Language changed to ' + this.elements.targetLanguage.options[this.elements.targetLanguage.selectedIndex].text, 'info');
  }

  sendMessageToContentScript(message) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs && tabs[0]) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
            this.showStatus('Extension needs to be refreshed on Netflix page', 'error');
          });
        } catch (error) {
          this.showStatus('Extension needs to be refreshed', 'error');
        }
      } else {
        this.showStatus('No Netflix tab found', 'error');
      }
    });
  }

  handleDelete() {
    try {
      chrome.runtime.sendMessage({type: 'CLEAR_TRANSCRIPT'}, (response) => {
        if (chrome.runtime.lastError) {
          this.showStatus('Extension needs to be refreshed', 'error');
        } else {
          this.showStatus('Transcript deleted!', 'success');
        }
      });
    } catch (error) {
      this.showStatus('Extension needs to be refreshed', 'error');
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  handleSave() {
    try {
      chrome.runtime.sendMessage({type: 'GET_TRANSCRIPT'}, (response) => {
        if (chrome.runtime.lastError) {
          this.showStatus('Extension needs to be refreshed', 'error');
          return;
        }
        
        const transcript = response.transcript || [];
        if (transcript.length === 0) {
          this.showStatus('Transcript is empty!', 'error');
          return;
        }
        
        const txt = transcript.map(entry => {
          const movieTime = this.formatTime(entry.movieTime);
          const delay = entry.translationDelay;
          const text = entry.translatedText;
          return `[${movieTime}] || [${delay}ms] || ${text}`;
        }).join('\n');
        
        this.downloadFile(txt, 'netflix_transcript.txt');
        this.showStatus('Transcript saved in compact format!', 'success');
      });
    } catch (error) {
      this.showStatus('Extension needs to be refreshed', 'error');
    }
  }

  downloadFile(content, filename) {
    const blob = new Blob([content], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
  new PopupManager();
}); 