let isRunning = false;
let currentTabs = [];
let selectedTabsForRefresh = new Set();
let individualTabTimings = new Map();

// Load saved settings
chrome.storage.sync.get(['interval', 'isRunning', 'refreshEnabled', 'selectedTabsForRefresh', 'individualTabTimings', 'useIndividualTiming'], (result) => {
  if (result.interval) {
    document.getElementById('interval').value = result.interval;
  }
  if (result.refreshEnabled) {
    document.getElementById('refreshEnabled').checked = result.refreshEnabled;
    showTabSelection(result.refreshEnabled);
  }
  if (result.useIndividualTiming) {
    document.getElementById('useIndividualTiming').checked = result.useIndividualTiming;
    showTimingOptions(result.useIndividualTiming);
  }
  if (result.selectedTabsForRefresh) {
    selectedTabsForRefresh = new Set(result.selectedTabsForRefresh);
  }
  if (result.individualTabTimings) {
    individualTabTimings = new Map(result.individualTabTimings);
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

// Handle individual timing checkbox change
document.getElementById('useIndividualTiming').addEventListener('change', (e) => {
  showTimingOptions(e.target.checked);
});

document.getElementById('startBtn').addEventListener('click', () => {
  const interval = parseInt(document.getElementById('interval').value);
  const refreshEnabled = document.getElementById('refreshEnabled').checked;
  const useIndividualTiming = document.getElementById('useIndividualTiming').checked;
  
  if (!useIndividualTiming && interval < 1) {
    alert('Please enter a valid interval (1 second or more)');
    return;
  }
  
  if (useIndividualTiming) {
    // Validate individual timings
    let hasValidTimings = false;
    for (let tab of currentTabs) {
      const timing = individualTabTimings.get(tab.id);
      if (timing && timing >= 1) {
        hasValidTimings = true;
        break;
      }
    }
    if (!hasValidTimings) {
      alert('Please set at least one valid timing (1 second or more) for individual tab timing mode');
      return;
    }
  }
  
  // Send selected tabs to background script
  chrome.runtime.sendMessage({
    action: 'updateSelectedTabs',
    selectedTabs: Array.from(selectedTabsForRefresh)
  });
  
  // Send individual timings to background script
  chrome.runtime.sendMessage({
    action: 'updateIndividualTimings',
    individualTimings: Array.from(individualTabTimings.entries())
  });
  
  chrome.runtime.sendMessage({
    action: 'startRotation',
    interval: interval,
    refreshEnabled: refreshEnabled,
    useIndividualTiming: useIndividualTiming
  });
  
  isRunning = true;
  updateUI();
  
  // Save settings
  chrome.storage.sync.set({
    interval: interval,
    refreshEnabled: refreshEnabled,
    useIndividualTiming: useIndividualTiming,
    selectedTabsForRefresh: Array.from(selectedTabsForRefresh),
    individualTabTimings: Array.from(individualTabTimings.entries()),
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

function showTimingOptions(show) {
  const uniformTiming = document.getElementById('uniformTiming');
  const individualTimingSection = document.getElementById('individualTimingSection');
  
  uniformTiming.style.display = show ? 'none' : 'block';
  individualTimingSection.style.display = show ? 'block' : 'none';
  
  if (show) {
    loadTabs();
  }
}

function renderTabSelection() {
  const container = document.getElementById('tabList');
  const timingContainer = document.getElementById('individualTimingList');
  
  // Clear existing content
  container.innerHTML = '';
  timingContainer.innerHTML = '';
  
  currentTabs.forEach(tab => {
    // Render refresh selection checkboxes
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
    
    // Render individual timing controls
    const timingItem = document.createElement('div');
    timingItem.className = 'timing-item';
    
    const timingLabel = document.createElement('label');
    timingLabel.textContent = tab.title.length > 25 ? tab.title.substring(0, 25) + '...' : tab.title;
    timingLabel.className = 'timing-label';
    
    const timingInput = document.createElement('input');
    timingInput.type = 'number';
    timingInput.min = '1';
    timingInput.max = '3600';
    timingInput.value = individualTabTimings.get(tab.id) || 5;
    timingInput.className = 'timing-input';
    timingInput.addEventListener('input', () => {
      const value = parseInt(timingInput.value);
      if (value >= 1) {
        individualTabTimings.set(tab.id, value);
      } else {
        individualTabTimings.delete(tab.id);
      }
    });
    
    const secondsLabel = document.createElement('span');
    secondsLabel.textContent = 's';
    secondsLabel.className = 'seconds-label';
    
    timingItem.appendChild(timingLabel);
    timingItem.appendChild(timingInput);
    timingItem.appendChild(secondsLabel);
    timingContainer.appendChild(timingItem);
    
    // Initialize timing map
    if (!individualTabTimings.has(tab.id)) {
      individualTabTimings.set(tab.id, 5);
    }
  });
}

function updateUI() {
  const status = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const refreshCheckbox = document.getElementById('refreshEnabled');
  const individualTimingCheckbox = document.getElementById('useIndividualTiming');
  const tabSelection = document.getElementById('tabSelection');
  const individualTimingSection = document.getElementById('individualTimingSection');
  
  if (isRunning) {
    const timingMode = individualTimingCheckbox.checked ? 'individual timing' : 'uniform timing';
    const refreshText = refreshCheckbox.checked ? 
      ` & refreshing ${selectedTabsForRefresh.size} selected tabs...` : 
      ' tabs...';
    status.textContent = `Running - Rotating with ${timingMode}${refreshText}`;
    status.className = 'status running';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    refreshCheckbox.disabled = true;
    individualTimingCheckbox.disabled = true;
    tabSelection.style.pointerEvents = 'none';
    tabSelection.style.opacity = '0.6';
    individualTimingSection.style.pointerEvents = 'none';
    individualTimingSection.style.opacity = '0.6';
  } else {
    status.textContent = 'Stopped';
    status.className = 'status stopped';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    refreshCheckbox.disabled = false;
    individualTimingCheckbox.disabled = false;
    tabSelection.style.pointerEvents = 'auto';
    tabSelection.style.opacity = '1';
    individualTimingSection.style.pointerEvents = 'auto';
    individualTimingSection.style.opacity = '1';
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