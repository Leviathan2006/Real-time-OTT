// background.js
// Handles basic messaging for the extension

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Basic message handling for future features
  if (message.type === 'PING') {
    sendResponse({ success: true });
  }
}); 