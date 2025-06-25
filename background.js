let rotationTimer = null;
let currentTabIndex = 0;
let allTabs = [];
let isRunning = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startRotation') {
    startTabRotation(message.interval);
  } else if (message.action === 'stopRotation') {
    stopTabRotation();
  }
});

async function startTabRotation(intervalSeconds) {
  if (rotationTimer) {
    clearInterval(rotationTimer);
  }
  
  isRunning = true;
  console.log(`Starting tab rotation with ${intervalSeconds} second interval`);
  
  // Get all tabs in current window
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    allTabs = tabs;
    currentTabIndex = 0;
    
    if (allTabs.length <= 1) {
      console.log('Not enough tabs to rotate');
      stopTabRotation();
      return;
    }
    
    // Start rotation
    rotationTimer = setInterval(async () => {
      try {
        // Get fresh tab list in case tabs were added/removed
        const currentTabs = await chrome.tabs.query({ currentWindow: true });
        
        if (currentTabs.length <= 1) {
          console.log('Not enough tabs to rotate, stopping');
          stopTabRotation();
          return;
        }
        
        allTabs = currentTabs;
        
        // Move to next tab
        currentTabIndex = (currentTabIndex + 1) % allTabs.length;
        const nextTab = allTabs[currentTabIndex];
        
        if (nextTab && nextTab.id) {
          await chrome.tabs.update(nextTab.id, { active: true });
          console.log(`Switched to tab: ${nextTab.title}`);
        }
      } catch (error) {
        console.error('Error during tab rotation:', error);
        stopTabRotation();
      }
    }, intervalSeconds * 1000);
    
  } catch (error) {
    console.error('Error starting tab rotation:', error);
    stopTabRotation();
  }
}

function stopTabRotation() {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
  
  isRunning = false;
  console.log('Tab rotation stopped');
  
  // Notify popup about status change
  chrome.runtime.sendMessage({
    action: 'statusUpdate',
    isRunning: false
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

// Stop rotation when extension is disabled or browser closes
chrome.runtime.onSuspend.addListener(() => {
  stopTabRotation();
});

// Handle tab removal - if we're rotating and tabs get closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (isRunning && allTabs.length <= 2) {
    // If we have 1 or fewer tabs after removal, stop rotation
    setTimeout(() => {
      chrome.tabs.query({ currentWindow: true }).then(tabs => {
        if (tabs.length <= 1) {
          stopTabRotation();
        }
      });
    }, 100);
  }
});

// Initialize from storage on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['isRunning', 'interval'], (result) => {
    if (result.isRunning && result.interval) {
      // Auto-restart if it was running before
      startTabRotation(result.interval);
    }
  });
});