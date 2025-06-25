let isRunning = false;

// Load saved settings
chrome.storage.sync.get(['interval', 'isRunning'], (result) => {
  if (result.interval) {
    document.getElementById('interval').value = result.interval;
  }
  if (result.isRunning) {
    isRunning = result.isRunning;
    updateUI();
  }
});

document.getElementById('startBtn').addEventListener('click', () => {
  const interval = parseInt(document.getElementById('interval').value);
  if (interval < 1) {
    alert('Please enter a valid interval (1 second or more)');
    return;
  }
  
  chrome.runtime.sendMessage({
    action: 'startRotation',
    interval: interval
  });
  
  isRunning = true;
  updateUI();
  
  // Save settings
  chrome.storage.sync.set({
    interval: interval,
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
  
  if (isRunning) {
    status.textContent = 'Running - Rotating tabs...';
    status.className = 'status running';
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    status.textContent = 'Stopped';
    status.className = 'status stopped';
    startBtn.disabled = false;
    stopBtn.disabled = true;
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