// background.js
// Handles transcript storage and messaging

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ADD_TRANSCRIPT_ENTRY') {
    chrome.storage.local.get({transcript: []}, function(result) {
      const transcript = result.transcript;
      
      // Check if this is a new entry (avoid duplicates)
      const isNewEntry = transcript.length === 0 || 
                        transcript[transcript.length - 1].translatedText !== message.translatedText ||
                        transcript[transcript.length - 1].movieTime !== message.movieTime;
      
      if (isNewEntry) {
        const entry = {
          translatedText: message.translatedText,
          movieTime: message.movieTime, // video time in seconds
          translationDelay: message.translationDelay, // in milliseconds
          targetLanguage: message.targetLanguage
        };
        
        transcript.push(entry);
        chrome.storage.local.set({transcript});
      }
    });
  } else if (message.type === 'GET_TRANSCRIPT') {
    chrome.storage.local.get({transcript: []}, function(result) {
      sendResponse({transcript: result.transcript});
    });
    return true; // Keep the message channel open for async response
  } else if (message.type === 'CLEAR_TRANSCRIPT') {
    chrome.storage.local.set({transcript: []}, function() {
      sendResponse({success: true});
    });
    return true;
  }
}); 