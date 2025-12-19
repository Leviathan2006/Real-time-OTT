// Netflix Subtitles Extension - Content Script
// Clean, organized version

class NetflixSubtitlesExtension {
  constructor() {
    this.overlay = null;
    this.lastSubtitleText = '';
    this.translationEnabled = false;
    this.targetLanguage = 'es';
    this.translationCache = new Map();
    this.pendingTranslation = null;
    
    this.init();
  }

  init() {
    this.createOverlay();
    this.loadSettings();
    this.setupMessageListener();
    this.startMonitoring();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'netflix-subtitles-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 5%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px 40px;
      font-size: 1.8em;
      border-radius: 10px;
      z-index: 99999;
      pointer-events: none;
      max-width: 80%;
      text-align: center;
      line-height: 1.4;
    `;
    this.overlay.innerText = 'Subtitles will appear here...';
    document.body.appendChild(this.overlay);
  }

  loadSettings() {
    chrome.storage.local.get(['translationEnabled', 'targetLanguage'], (result) => {
      this.translationEnabled = result.translationEnabled || false;
      this.targetLanguage = result.targetLanguage || 'es';
    });
  }

  getCurrentVideoTime() {
    const video = document.querySelector('video');
    return video && !isNaN(video.currentTime) ? video.currentTime : 0;
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

  findSubtitleText() {
    const selectors = [
      '.player-timedtext-text-container',
      '.player-timedtext',
      '[data-uia="player-supplemental-subtitle-renderer"]',
      '.player-timedtext-text'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim()) {
        return el.innerText.trim();
      }
    }

    const lines = document.querySelectorAll('.player-timedtext-text');
    if (lines.length > 0) {
      return Array.from(lines).map(e => e.innerText.trim()).join(' ');
    }

    return '';
  }

  async translateText(text, targetLang) {
    if (!text || text.trim() === '') return '';

    const cacheKey = `${text}_${targetLang}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const translatedText = data[0][0][0];
        this.translationCache.set(cacheKey, translatedText);
        return translatedText;
      }
      return text;
    } catch (error) {
      console.error('[Netflix Subtitles] Translation failed:', error);
      return text;
    }
  }

  storeTranscript(text, movieTime, translationDelay) {
    try {
      chrome.runtime.sendMessage({
        type: 'ADD_TRANSCRIPT_ENTRY',
        translatedText: text,
        movieTime: movieTime,
        translationDelay: translationDelay,
        targetLanguage: this.targetLanguage
      }).catch(() => {
        // Ignore storage errors
      });
    } catch (error) {
      // Ignore extension context errors
    }
  }

  updateOverlay() {
    const text = this.findSubtitleText();
    
    if (text && text !== this.lastSubtitleText) {
      const movieTime = this.getCurrentVideoTime();
      
      // Show original text immediately
      this.overlay.innerText = text;
      this.lastSubtitleText = text;
      
      // Store original text if translation is disabled
      if (!this.translationEnabled) {
        this.storeTranscript(text, movieTime, 0);
        return;
      }
      
      // Handle translation
      this.handleTranslation(text, movieTime);
    } else if (!text && this.lastSubtitleText) {
      this.overlay.innerText = '';
      this.lastSubtitleText = '';
      this.pendingTranslation = null;
    }
  }

  async handleTranslation(text, movieTime) {
    if (this.pendingTranslation) {
      this.pendingTranslation = null;
    }

    const startTime = Date.now();
    this.pendingTranslation = this.translateText(text, this.targetLanguage)
      .then(translatedText => {
        if (this.pendingTranslation === null) return;

        const delay = Date.now() - startTime;
        
        if (translatedText && translatedText !== text) {
          this.overlay.innerText = `${text}\n\n${translatedText}`;
          this.storeTranscript(translatedText, movieTime, delay);
        } else {
          this.storeTranscript(text, movieTime, 0);
        }
        
        this.pendingTranslation = null;
      })
      .catch(() => {
        this.storeTranscript(text, movieTime, 0);
        this.pendingTranslation = null;
      });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'UPDATE_TRANSLATION_SETTINGS') {
        this.translationEnabled = request.translationEnabled;
        this.targetLanguage = request.targetLanguage;
        
        if (this.translationCache.size > 100) {
          this.translationCache.clear();
        }
        
        if (this.lastSubtitleText) {
          if (!this.translationEnabled) {
            this.overlay.innerText = this.lastSubtitleText;
          } else {
            this.updateOverlay();
          }
        }
      }
      
      sendResponse({ success: true });
    });
  }

  startMonitoring() {
    setInterval(() => this.updateOverlay(), 200);
  }
}

// Initialize the extension
new NetflixSubtitlesExtension();

// Monkey-patch XMLHttpRequest to log subtitle-related requests and responses
(function() {
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._netflix_subtitle_url = url;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      const url = this._netflix_subtitle_url || '';
      // Only log if the URL or response looks like subtitle data
      if (/sub|caption|timedtext|\.vtt|\.xml|\.dfxp|\.ttml/i.test(url) || (this.responseText && /<tt|<timedtext|WEBVTT|<transcript/i.test(this.responseText))) {
        console.log('[Netflix Subtitles Extension][XHR] URL:', url);
        console.log('[Netflix Subtitles Extension][XHR] Response snippet:', this.responseText ? this.responseText.slice(0, 500) : '');
      }
    });
    return origSend.apply(this, args);
  };
})();

console.log('[Netflix Subtitles] Content script fully loaded and initialized'); 