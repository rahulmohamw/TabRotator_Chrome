let isRunning = false;
let currentTabs = [];
let selectedTabsForRefresh = new Set();

// Load saved settings
chrome.storage.sync.get(['interval', 'isRunning', 'refreshEnabled', 'selectedTabsForRefresh'], (result) => {
  if (result.interval) {
    document.getElementById('interval').value = result.interval;
  }
  if (result.refreshEnabled) {
    document.getElementById('refreshEnabled').checked = result.refreshEnabled;
    showTabSelection(result.refreshEnabled);
  }
  if (result.selectedTabsForRefresh) {
    selectedTabsForRefresh = new Set(result.selectedTabsForRefresh);
  }
  if (result.isRunning) {
    isRunning = result.isRunning;
    updateUI();
  }
  
  // Load tabs for selection
  loadTabs();
});

// Handle refresh checkbox change
document.getElementById('refreshEnabled').addEventListener('change', (e) => {
  showTabSelection(e.target.checked);
});

document.getElementById('startBtn').addEventListener('click', () => {
  const interval = parseInt(document.getElementById('interval').value);
  const refreshEnabled = document.getElementById('refreshEnabled').checked;
  
  if (interval < 1) {
    alert('Please enter a valid interval (1 second or more)');
    return;
  }
  
  // Send selected tabs to background script
  chrome.runtime.sendMessage({
    action: 'updateSelectedTabs',
    selectedTabs: Array.from(selectedTabsForRefresh)
  });
  
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
    selectedTabsForRefresh: Array.from(selectedTabsForRefresh),
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

function loadTabs() {
  chrome.runtime.sendMessage({ action: 'getTabs' }, (response) => {
    if (response && response.tabs) {
      currentTabs = response.tabs;
      renderTabSelection();
    }
  });
}

function showTabSelection(show) {
  const tabSelection = document.getElementById('tabSelection');
  tabSelection.style.display = show ? 'block' : 'none';
  if (show) {
    loadTabs();
  }
}

function renderTabSelection() {
  const container = document.getElementById('tabList');
  container.innerHTML = '';
  
  currentTabs.forEach(tab => {
    const tabItem = document.createElement('div');
    tabItem.className = 'tab-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `tab-${tab.id}`;
    checkbox.checked = selectedTabsForRefresh.has(tab.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedTabsForRefresh.add(tab.id);
      } else {
        selectedTabsForRefresh.delete(tab.id);
      }
    });
    
    const label = document.createElement('label');
    label.htmlFor = `tab-${tab.id}`;
    label.textContent = tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title;
    
    tabItem.appendChild(checkbox);
    tabItem.appendChild(label);
    container.appendChild(tabItem);
  });
}

function updateUI() {
  const status = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const refreshCheckbox = document.getElementById('refreshEnabled');
  const tabSelection = document.getElementById('tabSelection');
  
  if (isRunning) {
    const refreshText = refreshCheckbox.checked ? 
      ` & refreshing ${selectedTabsForRefresh.size} selected tabs...` : 
      ' tabs...';
    status.textContent = `Running - Rotating${refreshText}`;
    status.className = 'status running';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    refreshCheckbox.disabled = true;
    tabSelection.style.pointerEvents = 'none';
    tabSelection.style.opacity = '0.6';
  } else {
    status.textContent = 'Stopped';
    status.className = 'status stopped';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    refreshCheckbox.disabled = false;
    tabSelection.style.pointerEvents = 'auto';
    tabSelection.style.opacity = '1';
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