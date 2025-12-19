// Subtitle-Translation Extension - Content Script

class NetflixSubtitlesExtension {
  constructor() {
    this.overlay = null;
    this.lastSubtitleText = '';
    this.translationEnabled = false;
    this.targetLanguage = 'es';
    this.translationCache = new Map();
    this.pendingTranslation = null;
    this.overlayTimer = null;
    this.currentDisplayedText = '';
    this.fontFamily = 'Arial, sans-serif';
    this.fontSize = '18';
    this.backgroundOpacity = '80';
    this.commonPhrases = {
      'Previously on': true,
      'Next Episode': true,
      'Skip Intro': true,
      'Skip Recap': true,
      'Continue Watching': true,
      'Written by': true,
      'Directed by': true,
      'Created by': true,
      'Executive Producer': true,
      'Opening Credits': true,
      'Closing Credits': true
    };
    
    this.init();
  }

  init() {
    this.createOverlay();
    this.loadSettings();
    this.setupMessageListener();
    this.startMonitoring();
    this.preTranslateCommonPhrases();
    this.hideNetflixSubtitles();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'netflix-subtitles-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      bottom: 5%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,${this.backgroundOpacity / 100});
      color: white;
      padding: 20px 40px;
      font-size: ${this.fontSize}px;
      border-radius: 10px;
      z-index: 99999;
      pointer-events: none;
      max-width: 80%;
      text-align: center;
      line-height: 1.6;
      font-family: ${this.fontFamily};
      white-space: pre-line;
      word-wrap: break-word;
      overflow-wrap: break-word;
    `;
    this.overlay.innerText = 'Subtitles will appear here...';
    document.body.appendChild(this.overlay);
  }

  loadSettings() {
    chrome.storage.local.get(['translationEnabled', 'targetLanguage', 'fontFamily', 'fontSize', 'backgroundOpacity'], (result) => {
      this.translationEnabled = result.translationEnabled || false;
      this.targetLanguage = result.targetLanguage || 'es';
      this.fontFamily = result.fontFamily || 'Arial, sans-serif';
      this.fontSize = result.fontSize || '18';
      this.backgroundOpacity = result.backgroundOpacity || '80';
      
      // Apply settings to overlay if it exists
      if (this.overlay) {
        this.updateOverlayStyle();
      }
    });
  }

  findSubtitleText() {
    // First try to get all individual subtitle text spans
    const textSpans = document.querySelectorAll('.player-timedtext-text-container span');
    if (textSpans.length > 0) {
      const uniqueLines = new Set();
      textSpans.forEach(span => {
        const text = span.textContent.trim();
        if (text) uniqueLines.add(text);
      });
      
      if (uniqueLines.size > 0) {
        return Array.from(uniqueLines).join('\n');
      }
    }

    // Fallback to container if spans not found
    const container = document.querySelector('.player-timedtext-text-container');
    if (container) {
      const text = container.textContent.trim();
      if (text) {
        const uniqueLines = new Set(
          text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
        );
        return Array.from(uniqueLines).join('\n');
      }
    }

    return '';
  }

  isValidSubtitleText(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Basic validation
    if (text.length < 1 || text.length > 300) return false;
    
    // Filter out common non-subtitle patterns
    const invalidPatterns = [
      /^[\d:]+$/, // Just timestamps
      /^[A-Z\s]+$/, // All caps text (usually warnings)
      /^Season \d+/, // Season markers
      /^Episode \d+/, // Episode markers
      /Next Episode/, // Next episode prompts
      /\d+ of \d+/, // Episode counters
      /www\./, // URLs
      /http/, // URLs
      /\.com/, // URLs
      /^AD$/, // Advertisement markers
      /^[♪♫]/, // Music symbols
      /\b(CC|HD|SD|4K|UHD)\b/, // Quality/caption markers
      /\b(paused|resumed|stopped)\b/i, // Player state
      /\b(volume|muted)\b/i, // Volume state
      /\b(subtitle|caption)s?\b/i, // Caption references
      /\b(loading|buffering)\b/i, // Loading states
      /\b(warning|mature|content)\b/i, // Content warnings
      /\b(skip|intro|recap)\b/i, // Player controls
      /\b(netflix|original)\b/i, // Netflix branding
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }

    return true;
  }

  // Pre-translate common phrases
  async preTranslateCommonPhrases() {
    if (!this.translationEnabled) return;
    
    const phrases = Object.keys(this.commonPhrases);
    const batchSize = 5; // Translate 5 phrases at a time
    
    for (let i = 0; i < phrases.length; i += batchSize) {
      const batch = phrases.slice(i, i + batchSize);
      const batchText = batch.join('\n');
      
      try {
        const translatedText = await this.translateText(batchText, this.targetLanguage);
        const translatedLines = translatedText.split('\n');
        
        batch.forEach((phrase, index) => {
          const cacheKey = `${phrase}_${this.targetLanguage}`;
          this.translationCache.set(cacheKey, translatedLines[index]);
        });
      } catch (error) {
        console.error('[Subtitle-Translation] Pre-translation failed:', error);
      }
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async translateText(text, targetLang) {
    if (!text || text.trim() === '') return '';

    const cacheKey = `${text}_${targetLang}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      // Check if it's a single line or multiple lines
      const lines = text.split('\n');
      
      if (lines.length === 1) {
        // Single line - direct translation
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();
        const translatedText = data && data[0] && data[0][0] && data[0][0][0] ? data[0][0][0] : text;
        this.translationCache.set(cacheKey, translatedText);
        return translatedText;
      } else {
        // Multiple lines - batch translate
        const batchText = lines.join('\n');
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(batchText)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data[0]) {
          const translatedLines = data[0]
            .filter(item => item && item[0])
            .map(item => item[0]);
          
          const translatedText = translatedLines.join('\n');
          this.translationCache.set(cacheKey, translatedText);
          return translatedText;
        }
      }
      
      return text;
    } catch (error) {
      console.error('[Subtitle-Translation] Translation failed:', error);
      return text;
    }
  }

  clearOverlayTimer() {
    if (this.overlayTimer) {
      clearTimeout(this.overlayTimer);
      this.overlayTimer = null;
    }
  }

  setOverlayTimer() {
    this.clearOverlayTimer();
    this.overlayTimer = setTimeout(() => {
      this.overlay.innerText = '';
      this.currentDisplayedText = '';
    }, 3000);
  }

  updateOverlay() {
    const text = this.findSubtitleText();
    
    if (text && text !== this.lastSubtitleText) {
      // New subtitle text detected - but don't update overlay yet
      this.lastSubtitleText = text;
      
      // Handle translation if enabled
      if (this.translationEnabled) {
        // For English, show the original text immediately
        if (this.targetLanguage === 'en') {
          this.overlay.innerText = text;
          this.currentDisplayedText = text;
          this.setOverlayTimer();
        } else {
          // For other languages, start translation but don't update overlay yet
          this.handleTranslation(text);
        }
      } else {
        // Translation disabled, show original text
        this.overlay.innerText = text;
        this.currentDisplayedText = text;
        this.setOverlayTimer();
      }
    } else if (!text && this.lastSubtitleText) {
      // No subtitle text, but we had text before
      this.lastSubtitleText = '';
      // Don't clear overlay immediately, let timer handle it
    }
  }

  async handleTranslation(text, isPriority = false) {
    if (this.pendingTranslation) {
      this.pendingTranslation = null;
    }

    // Add a small delay for non-priority translations to avoid overwhelming the API
    if (!isPriority) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.pendingTranslation = this.translateText(text, this.targetLanguage)
      .then(translatedText => {
        if (this.pendingTranslation === null) return;
        
        if (translatedText && translatedText !== text) {
          // Only update overlay when translation is complete
          this.overlay.innerText = translatedText;
          this.currentDisplayedText = translatedText;
          this.setOverlayTimer();
        }
        
        this.pendingTranslation = null;
      })
      .catch(() => {
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
            this.currentDisplayedText = this.lastSubtitleText;
            this.setOverlayTimer();
          } else {
            this.updateOverlay();
          }
        }
      } else if (request.type === 'UPDATE_SUBTITLE_SETTINGS') {
        this.fontFamily = request.fontFamily || this.fontFamily;
        this.fontSize = request.fontSize || this.fontSize;
        this.backgroundOpacity = request.backgroundOpacity || this.backgroundOpacity;
        
        this.updateOverlayStyle();
      }
      
      sendResponse({ success: true });
    });
  }

  startMonitoring() {
    setInterval(() => this.updateOverlay(), 200);
    
    // Also monitor for DOM changes that might indicate new subtitles
    const observer = new MutationObserver(() => {
      this.updateOverlay();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Add debug trigger (press Ctrl+Shift+D to debug)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        console.log('=== DEBUG MODE TRIGGERED ===');
        this.debugSubtitleDetection();
      }
    });
  }

  // Add a debug method to show what's being filtered
  debugSubtitleDetection() {
    console.log('=== DEBUG: Checking all text elements ===');
    const allElements = document.querySelectorAll('*');
    
    for (const el of allElements) {
      if (el.offsetParent !== null && el.innerText && el.innerText.trim()) {
        const text = el.innerText.trim();
        if (text.length > 0 && text.length < 100) {
          const isValid = this.isValidSubtitleText(text);
          console.log(`Text: "${text}" | Valid: ${isValid} | Class: ${el.className}`);
        }
      }
    }
  }

  hideNetflixSubtitles() {
    const style = document.createElement('style');
    style.textContent = `
      .player-timedtext-text-container {
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  updateOverlayStyle() {
    if (this.overlay) {
      this.overlay.style.fontFamily = this.fontFamily;
      this.overlay.style.fontSize = this.fontSize + 'px';
      this.overlay.style.background = `rgba(0,0,0,${this.backgroundOpacity / 100})`;
    }
  }
}

// Initialize the extension
console.log('[Subtitle-Translation] Content script starting...');
new NetflixSubtitlesExtension();

// Additional debugging for subtitle detection
setInterval(() => {
  const video = document.querySelector('video');
  if (video && video.currentTime > 0) {
    console.log('[Subtitle-Translation] Video playing, checking for subtitles...');
  }
}, 5000);

console.log('[Subtitle-Translation] Content script fully loaded and initialized'); 