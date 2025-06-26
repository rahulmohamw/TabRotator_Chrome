let isRunning = false;

// Load saved settings
chrome.storage.sync.get(['interval', 'isRunning', 'refreshEnabled'], (result) => {
  if (result.interval) {
    document.getElementById('interval').value = result.interval;
  }
  if (result.refreshEnabled) {
    document.getElementById('refreshEnabled').checked = result.refreshEnabled;
  }
  if (result.isRunning) {
    isRunning = result.isRunning;
    updateUI();
  }
});

document.getElementById('startBtn').addEventListener('click', () => {
  const interval = parseInt(document.getElementById('interval').value);
  const refreshEnabled = document.getElementById('refreshEnabled').checked;
  
  if (interval < 1) {
    alert('Please enter a valid interval (1 second or more)');
    return;
  }
  
  chrome.runtime.sendMessage({
    action: 'startRotation',
    interval: interval,
    refreshEnabled: refreshEnabled
  });
  
  isRunning = true;
  updateUI();
  
  // Save settings
  chrome.storage.sync.set({
    interval: interval,
    refreshEnabled: refreshEnabled,
    isRunning: true
  });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'stopRotation'
  });
  
  isRunning = false;
  updateUI();
  
  // Save settings
  chrome.storage.sync.set({
    isRunning: false
  });
});

function updateUI() {
  const status = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const refreshCheckbox = document.getElementById('refreshEnabled');
  
  if (isRunning) {
    const refreshText = refreshCheckbox.checked ? ' & refreshing tabs...' : ' tabs...';
    status.textContent = `Running - Rotating${refreshText}`;
    status.className = 'status running';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    refreshCheckbox.disabled = true;
  } else {
    status.textContent = 'Stopped';
    status.className = 'status stopped';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    refreshCheckbox.disabled = false;
  }
}

// Listen for status updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'statusUpdate') {
    isRunning = message.isRunning;
    updateUI();
  }
});

// Initial UI update
updateUI();