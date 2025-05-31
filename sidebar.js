/**
 * @fileOverview This script initializes and manages the sidebar application,
 * including loading sites, managing layouts, handling user interactions,
 * and providing error handling.
 */

// Global state management
let currentTheme = 'auto';
let currentLayout = 'single';
let activeSites = [];
let allSites = [];
let isResizing = false;
let panelStates = {
  1: { url: null, name: null, loaded: false },
  2: { url: null, name: null, loaded: false },
  3: { url: null, name: null, loaded: false },
  4: { url: null, name: null, loaded: false },
  5: { url: null, name: null, loaded: false },
  6: { url: null, name: null, loaded: false, },
};
let currentSelectedPanel = null;

// DOM elements
const elements = {
  sidebarTitle: document.getElementById('sidebarTitle'),
  siteSelector: document.getElementById('siteSelector'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorMessage: document.getElementById('errorMessage'),
  readerContainer: document.getElementById('readerContainer'),
  iframeContainer: document.getElementById('iframeContainer'),
  singleView: document.getElementById('singleView'),
  splitView: document.getElementById('splitView'),
  quadView: document.getElementById('quadView'),
  tabsContainer: document.getElementById('tabsContainer'),
  tabsList: document.getElementById('tabsList'),
  toastContainer: document.getElementById('toastContainer'),
  singleViewBtn: document.getElementById('singleViewBtn'),
  splitViewBtn: document.getElementById('splitViewBtn'),
  quadViewBtn: document.getElementById('quadViewBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  copyTextBtn: document.getElementById('copyTextBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  readerViewBtn: document.getElementById('readerViewBtn'),
  openInTabBtn: document.getElementById('openInTabBtn'),
  exitReaderBtn: document.getElementById('exitReaderBtn'),
  mainFrame: document.getElementById('mainFrame'),
  frame1: document.getElementById('frame1'),
  frame2: document.getElementById('frame2'),
  frame3: document.getElementById('frame3'),
  frame4: document.getElementById('frame4'),
  frame5: document.getElementById('frame5'),
  frame6: document.getElementById('frame6'),
  siteSelectionModal: document.getElementById('siteSelectionModal'),
  siteSelectionModalContent: document.getElementById(
    'siteSelectionModalContent',
  ),
  themeSelectionModal: document.getElementById('themeSelectionModal'),
  themeSelectionModalContent: document.getElementById(
    'themeSelectionModalContent',
  ),
  siteSearchInput: document.getElementById('siteSearchInput'),
  sitesList: document.getElementById('sitesList'),
  sitesLoading: document.getElementById('sitesLoading'),
  sitesEmpty: document.getElementById('sitesEmpty'),
};

/**
 * Initialize the sidebar application
 */
async function initializeSidebar() {
  try {
    await loadTheme();
    await loadSites();
    await loadLayout();
    setupEventListeners();

    const result = await chrome.storage.local.get([
      'sidebarUrl',
      'sidebarName',
      'sidebarTimestamp',
    ]);
    if (result.sidebarUrl) {
      await loadSiteInFrame(
        result.sidebarUrl,
        result.sidebarName,
        'mainFrame',
      );
      elements.sidebarTitle.textContent = result.sidebarName || 'Sidebar Anything';
      updateSiteSelector(result.sidebarUrl);
    }

    showToast('Sidebar loaded successfully!', 'success');
  } catch (error) {
    console.error('Error initializing sidebar:', error);
    showToast('Error loading sidebar', 'error');
  }
}

/**
 * Load and apply theme from storage
 */
async function loadTheme() {
  try {
    const result = await chrome.storage.sync.get(['theme']);
    currentTheme = result.theme || 'auto';
    applyTheme(currentTheme);
  } catch (error) {
    console.error('Error loading theme:', error);
    applyTheme('auto');
  }
}

/**
 * Apply theme to the sidebar
 * @param {string} theme - The theme to apply ('dark', 'light', 'auto', 'premium').
 */
function applyTheme(theme) {
  const html = document.documentElement;
  const body = document.body;

  html.classList.remove('dark');
  body.classList.remove('premium-gradient');

  switch (theme) {
    case 'dark':
      html.classList.add('dark');
      break;
    case 'auto':
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      }
      break;
    case 'premium':
      html.classList.add('dark');
      body.classList.add('premium-gradient');
      break;
    case 'light':
    default:
      break;
  }
}

/**
 * Load sites from storage
 */
async function loadSites() {
  try {
    const result = await chrome.storage.sync.get(['groups', 'entries']);
    let { groups, entries } = result;

    allSites = [];

    if (entries && entries.length > 0 && (!groups || Object.keys(groups).length === 0)) {
      allSites = entries.map((entry) => ({
        ...entry,
        groupName: 'All',
        groupId: 'all',
        siteId: `legacy_${Date.now()}_${Math.random()}`,
      }));
    } else if (groups) {
      Object.values(groups).forEach((group) => {
        group.sites.forEach((site) => {
          allSites.push({
            ...site,
            groupName: group.name,
            groupId: group.id,
            siteId: site.id,
          });
        });
      });
    }

    populateSiteSelector();
  } catch (error) {
    console.error('Error loading sites:', error);
    showToast('Error loading sites', 'error');
  }
}

/**
 * Populate the site selector dropdown
 */
function populateSiteSelector() {
  elements.siteSelector.innerHTML = '<option value="">Select a site...</option>';

  allSites.forEach((site) => {
    const option = document.createElement('option');
    option.value = site.url;
    option.textContent = `${site.name} (${site.groupName})`;
    option.dataset.name = site.name;
    elements.siteSelector.appendChild(option);
  });
}

/**
 * Update site selector to show current selection
 * @param {string} url - The URL of the currently selected site.
 */
function updateSiteSelector(url) {
  const options = elements.siteSelector.querySelectorAll('option');
  options.forEach((option) => {
    if (option.value === url) {
      option.selected = true;
    }
  });
}

/**
 * Load layout preferences from storage
 */
async function loadLayout() {
  try {
    const result = await chrome.storage.local.get(['sidebarLayout']);
    currentLayout = result.sidebarLayout || 'single';
    switchLayout(currentLayout);
  } catch (error) {
    console.error('Error loading layout:', error);
    switchLayout('single');
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  elements.singleViewBtn.addEventListener('click', () => switchLayout('single'));
  elements.splitViewBtn.addEventListener('click', () => switchLayout('split-2'));
  elements.quadViewBtn.addEventListener('click', () => switchLayout('split-4'));
  elements.themeToggleBtn.addEventListener('click', openThemeModal);
  elements.copyTextBtn.addEventListener('click', copyTextFromSidebar);
  elements.reloadBtn.addEventListener('click', reloadCurrentFrame);
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.siteSelector.addEventListener('change', handleSiteSelection);
  elements.readerViewBtn.addEventListener('click', tryReaderView);
  elements.openInTabBtn.addEventListener('click', openCurrentSiteInTab);
  elements.exitReaderBtn.addEventListener('click', exitReaderView);
  document.addEventListener('click', handleFrameControls);
  document.addEventListener('click', handlePanelActions);
  setupModalControls();
  setupResizeHandles();
  chrome.storage.onChanged.addListener(handleStorageChanges);
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (currentTheme === 'auto') {
        applyTheme('auto');
      }
    });
}

/**
 * Handle site selection from dropdown
 * @param {Event} event - The change event from the site selector dropdown.
 */
async function handleSiteSelection(event) {
  const url = event.target.value;
  const selectedOption = event.target.selectedOptions[0];
  const name = selectedOption?.dataset.name || 'Unknown Site';

  if (url) {
    await loadSiteInFrame(url, name, getCurrentActiveFrame());
    elements.sidebarTitle.textContent = name;

    chrome.storage.local.set({
      sidebarUrl: url,
      sidebarName: name,
      sidebarTimestamp: Date.now(),
    });
  }
}

/**
 * Get the currently active frame ID based on layout
 * @returns {string} The ID of the currently active frame.
 */
function getCurrentActiveFrame() {
  switch (currentLayout) {
    case 'single':
      return 'mainFrame';
    case 'split-2':
      return 'frame1';
    case 'split-4':
      return 'frame3';
    default:
      return 'mainFrame';
  }
}

/**
 * Switch between different layout modes
 * @param {string} layout - The layout to switch to ('single', 'split-2', 'split-4').
 */
async function switchLayout(layout) {
  currentLayout = layout;

  document.querySelectorAll('.layout-btn').forEach((btn) => {
    btn.classList.remove('bg-blue-500', 'text-white');
    btn.classList.add(
      'text-gray-600',
      'dark:text-gray-400',
      'hover:bg-gray-200',
      'dark:hover:bg-gray-700',
    );
  });

  elements.singleView.classList.add('hidden');
  elements.splitView.classList.add('hidden');
  elements.quadView.classList.add('hidden');
  elements.tabsContainer.classList.add('hidden');

  switch (layout) {
    case 'single':
      elements.singleView.classList.remove('hidden');
      elements.singleViewBtn.classList.remove(
        'text-gray-600',
        'dark:text-gray-400',
        'hover:bg-gray-200',
        'dark:hover:bg-gray-700',
      );
      elements.singleViewBtn.classList.add('bg-blue-500', 'text-white');
      if (activeSites.length > 1) {
        elements.tabsContainer.classList.remove('hidden');
        updateTabs();
      }
      break;
    case 'split-2':
      elements.splitView.classList.remove('hidden');
      elements.splitViewBtn.classList.remove(
        'text-gray-600',
        'dark:text-gray-400',
        'hover:bg-gray-200',
        'dark:hover:bg-gray-700',
      );
      elements.splitViewBtn.classList.add('bg-blue-500', 'text-white');
      break;
    case 'split-4':
      elements.quadView.classList.remove('hidden');
      elements.quadViewBtn.classList.remove(
        'text-gray-600',
        'dark:text-gray-400',
        'hover:bg-gray-200',
        'dark:hover:bg-gray-700',
      );
      elements.quadViewBtn.classList.add('bg-blue-500', 'text-white');
      break;
  }

  chrome.storage.local.set({ sidebarLayout: layout });

  elements.iframeContainer.classList.add('animate-fade-in');
  setTimeout(() => {
    elements.iframeContainer.classList.remove('animate-fade-in');
  }, 300);
}

/**
 * Load a site in the specified iframe
 * @param {string} url - The URL of the site to load.
 * @param {string} name - The name of the site.
 * @param {string} frameId - The ID of the iframe to load the site into.
 */
async function loadSiteInFrame(url, name, frameId) {
  const frame = elements[frameId];
  if (!frame) return;

  showLoading(true);
  hideError();

  try {
    frame.src = url;

    frame.onload = () => {
      showLoading(false);
      showToast(`Loaded ${name}`, 'success');
    };

    frame.onerror = () => {
      showLoading(false);
      handleFrameError(url, name);
    };

    setTimeout(() => {
      if (frame.src === url) {
        showLoading(false);
      }
    }, 10000);
  } catch (error) {
    console.error('Error loading site:', error);
    showLoading(false);
    handleFrameError(url, name);
  }
}

/**
 * Handle frame loading errors
 * @param {string} url - The URL that failed to load.
 * @param {string} name - The name of the site that failed to load.
 */
function handleFrameError(url, name) {
  showError();

  elements.openInTabBtn.onclick = () => openUrlInTab(url);
  elements.readerViewBtn.onclick = () => tryReaderView(url);

  showToast(`Failed to load ${name}`, 'error');
}

/**
 * Try to load site in reader view
 * @param {string} [url=null] - The URL to load in reader view.
 */
async function tryReaderView(url = null) {
  if (!url) {
    const currentFrame = elements[getCurrentActiveFrame()];
    url = currentFrame.src;
  }

  showLoading(true, 'Loading Reader View...');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'bypassFrameRestriction',
      url: url,
    });

    if (response && response.success && response.data) {
      displayReaderView(response.data, url);
    } else {
      showLoading(false);
      showToast('Reader View not available for this site', 'error');
    }
  } catch (error) {
    console.error('Error loading reader view:', error);
    showLoading(false);
    showToast('Error loading Reader View', 'error');
  }
}

/**
 * Display content in reader view
 * @param {object} data - The data to display in reader view, containing 'title' and 'content'.
 * @param {string} originalUrl - The original URL of the content.
 */
function displayReaderView(data, originalUrl) {
  showLoading(false);
  hideError();

  elements.iframeContainer.classList.add('hidden');
  elements.readerContainer.classList.remove('hidden');

  document.getElementById('readerTitle').textContent = data.title || 'Untitled';
  document.getElementById(
    'readerSource',
  ).innerHTML = `Source: <a href="${originalUrl}" target="_blank" class="text-blue-500 hover:text-blue-600">${originalUrl}</a>`;
  document.getElementById('readerContent').innerHTML =
    data.content || 'No content available';

  showToast('Reader View loaded', 'success');
}

/**
 * Exit reader view and return to iframe
 */
function exitReaderView() {
  elements.readerContainer.classList.add('hidden');
  elements.iframeContainer.classList.remove('hidden');
  showError();
}

/**
 * Open URL in new tab
 * @param {string} url - The URL to open in a new tab.
 */
function openUrlInTab(url) {
  window.open(url, '_blank');
  showToast('Opened in new tab', 'success');
}

/**
 * Open current site in new tab
 */
function openCurrentSiteInTab() {
  const currentFrame = elements[getCurrentActiveFrame()];
  if (currentFrame && currentFrame.src && currentFrame.src !== 'about:blank') {
    openUrlInTab(currentFrame.src);
  }
}

/**
 * Reload current frame
 */
function reloadCurrentFrame() {
  const currentFrame = elements[getCurrentActiveFrame()];
  if (currentFrame && currentFrame.src && currentFrame.src !== 'about:blank') {
    const currentSrc = currentFrame.src;
    currentFrame.src = 'about:blank';
    setTimeout(() => {
      currentFrame.src = currentSrc;
    }, 100);
    showToast('Reloading...', 'info');
  }
}

/**
 * Handle frame control buttons (reload, popout, close)
 * @param {Event} event - The click event from the frame control button.
 */
function handleFrameControls(event) {
  const button = event.target.closest('.frame-control');
  if (!button) return;

  const action = button.dataset.action;
  const frameId = button.dataset.frame;
  const frame = elements[frameId];

  if (!frame) return;

  switch (action) {
    case 'reload':
      if (frame.src && frame.src !== 'about:blank') {
        const currentSrc = frame.src;
        frame.src = 'about:blank';
        setTimeout(() => {
          frame.src = currentSrc;
        }, 100);
        showToast('Reloading frame...', 'info');
      }
      break;
    case 'popout':
      if (frame.src && frame.src !== 'about:blank') {
        window.open(frame.src, '_blank', 'width=800,height=600');
        showToast('Opened in popup window', 'success');
      }
      break;
    case 'close':
      const panelNumber = getPanelNumberFromFrameId(frameId);
      if (panelNumber) {
        closePanelSite(panelNumber);
      }
      break;
  }
}

/**
 * Handle panel actions (add site, etc.)
 * @param {Event} event - The click event from the panel action button.
 */
function handlePanelActions(event) {
  const addButton = event.target.closest('.add-site-to-panel');
  if (addButton) {
    const panelNumber = parseInt(addButton.dataset.panel);
    currentSelectedPanel = panelNumber;
    openSiteSelectionModal();
    return;
  }
}

/**
 * Get panel number from frame ID
 * @param {string} frameId - The ID of the frame.
 * @returns {number} The panel number.
 */
function getPanelNumberFromFrameId(frameId) {
  const frameNumber = frameId.replace('frame', '');
  return parseInt(frameNumber);
}

/**
 * Close site in panel
 * @param {number} panelNumber - The panel number to close the site in.
 */
function closePanelSite(panelNumber) {
  const frameId = `frame${panelNumber}`;
  const frame = elements[frameId];
  const panelContainer = document.querySelector(`[data-panel="${panelNumber}"]`);

  if (frame && panelContainer) {
    frame.src = 'about:blank';
    panelStates[panelNumber] = { url: null, name: null, loaded: false };

    const emptyState = panelContainer.querySelector('.panel-empty');
    const controls = panelContainer.querySelector('.panel-controls');

    if (emptyState) emptyState.classList.remove('hidden');
    if (controls) controls.classList.add('opacity-0');

    showToast('Panel cleared', 'success');
  }
}

/**
 * Load site in specific panel
 * @param {string} url - The URL of the site to load.
 * @param {string} name - The name of the site.
 * @param {number} panelNumber - The panel number to load the site into.
 */
async function loadSiteInPanel(url, name, panelNumber) {
  const frameId = `frame${panelNumber}`;
  const frame = elements[frameId];
  const panelContainer = document.querySelector(`[data-panel="${panelNumber}"]`);

  if (!frame || !panelContainer) return;

  panelStates[panelNumber] = { url, name, loaded: false };

  const emptyState = panelContainer.querySelector('.panel-empty');
  const controls = panelContainer.querySelector('.panel-controls');

  if (emptyState) emptyState.classList.add('hidden');
  if (controls) controls.classList.remove('opacity-0');

  showLoading(true, `Loading ${name}...`);

  try {
    frame.src = url;

    frame.onload = () => {
      panelStates[panelNumber].loaded = true;
      showLoading(false);
      showToast(`Loaded ${name} in panel ${panelNumber}`, 'success');
    };

    frame.onerror = () => {
      showLoading(false);
      showToast(`Failed to load ${name}`, 'error');
    };

    setTimeout(() => {
      if (!panelStates[panelNumber].loaded) {
        showLoading(false);
      }
    }, 10000);
  } catch (error) {
    console.error('Error loading site in panel:', error);
    showLoading(false);
    showToast(`Error loading ${name}`, 'error');
  }
}

/**
 * Setup resize handles for split views
 */
function setupResizeHandles() {
  const resizeHandle = document.querySelector('.resize-handle');
  if (!resizeHandle) return;

  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    const leftPanel = resizeHandle.previousElementSibling;
    startWidth = leftPanel.offsetWidth;

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);

    e.preventDefault();
  });

  function handleResize(e) {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    const container = resizeHandle.parentElement;
    const maxWidth = container.offsetWidth - 100;

    if (newWidth > 100 && newWidth < maxWidth) {
      const leftPanel = resizeHandle.previousElementSibling;
      const rightPanel = resizeHandle.nextElementSibling;

      leftPanel.style.width = `${newWidth}px`;
      rightPanel.style.width = `${
        container.offsetWidth - newWidth - resizeHandle.offsetWidth
      }px`;
    }
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }
}

/**
 * Update tabs for single view when multiple sites are loaded
 */
function updateTabs() {
  elements.tabsList.innerHTML = '';

  activeSites.forEach((site, index) => {
    const tab = document.createElement('button');
    tab.className = `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      index === 0
        ? 'tab-active'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`;
    tab.textContent = site.name;
    tab.onclick = () => switchToTab(index);

    elements.tabsList.appendChild(tab);
  });
}

/**
 * Switch to a specific tab in single view
 * @param {number} index - The index of the tab to switch to.
 */
function switchToTab(index) {
  if (activeSites[index]) {
    const site = activeSites[index];
    loadSiteInFrame(site.url, site.name, 'mainFrame');
    elements.sidebarTitle.textContent = site.name;
    updateSiteSelector(site.url);

    elements.tabsList.querySelectorAll('button').forEach((tab, i) => {
      if (i === index) {
        tab.className =
          'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 tab-active';
      } else {
        tab.className =
          'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';
      }
    });
  }
}

/**
 * Copy text from sidebar
 */
function copyTextFromSidebar() {
  if (!elements.readerContainer.classList.contains('hidden')) {
    copyFromReaderView();
    return;
  }

  copyFromIframe();
}

/**
 * Copy text from reader view
 */
function copyFromReaderView() {
  const selection = window.getSelection();
  const selectedText = selection.toString();

  if (selectedText) {
    copyTextToClipboard(selectedText);
  } else {
    showToast('Please select some text first', 'warning');
  }
}

/**
 * Copy text from iframe
 */
function copyFromIframe() {
  const currentFrame = elements[getCurrentActiveFrame()];

  try {
    const iframeDoc =
      currentFrame.contentDocument || currentFrame.contentWindow.document;
    const selection = iframeDoc.getSelection();
    const selectedText = selection.toString();

    if (selectedText) {
      copyTextToClipboard(selectedText);
    } else {
      showToast('Please select some text first', 'warning');
    }
  } catch (error) {
    showToast('Use Ctrl+C to copy selected text', 'info');
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - The text to copy to the clipboard.
 */
async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Text copied to clipboard!', 'success');
  } catch (error) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      showToast('Text copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy text', 'error');
    }

    document.body.removeChild(textArea);
  }
}

/**
 * Open settings page
 */
function openSettings() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open('options.html', '_blank');
  }
}

/**
 * Show loading overlay
 * @param {boolean} show - Whether to show the loading overlay.
 * @param {string} [message='Loading site...'] - The message to display on the loading overlay.
 */
function showLoading(show, message = 'Loading site...') {
  if (show) {
    elements.loadingOverlay.classList.remove('hidden');
    elements.loadingOverlay.querySelector('p').textContent = message;
  } else {
    elements.loadingOverlay.classList.add('hidden');
  }
}

/**
 * Show error message
 */
function showError() {
  elements.errorMessage.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
  elements.errorMessage.classList.add('hidden');
}

/**
 * Show toast notification
 * @param {string} message - The message to display in the toast.
 * @param {string} [type='info'] - The type of toast ('info', 'success', 'error', 'warning').
 * @param {number} [duration=3000] - The duration in milliseconds to show the toast.
 */
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `animate-slide-in px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium max-w-sm ${getToastColor(
    type,
  )}`;
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => {
      if (elements.toastContainer.contains(toast)) {
        elements.toastContainer.removeChild(toast);
      }
    }, 300);
  }, duration);
}

/**
 * Get toast color based on type
 * @param {string} type - The type of toast ('info', 'success', 'error', 'warning').
 * @returns {string} The CSS class for the toast color.
 */
function getToastColor(type) {
  switch (type) {
    case 'success':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'info':
    default:
      return 'bg-blue-500';
  }
}

/**
 * Handle storage changes
 * @param {object} changes - The changes in storage.
 * @param {string} namespace - The namespace of the storage ('sync', 'local').
 */
function handleStorageChanges(changes, namespace) {
  if (namespace === 'sync' && changes.theme) {
    currentTheme = changes.theme.newValue;
    applyTheme(currentTheme);
  }

  if (namespace === 'sync' && changes.groups) {
    loadSites();
  }

  if (namespace === 'local' && changes.sidebarUrl) {
    const { newValue } = changes.sidebarUrl;
    if (newValue) {
      chrome.storage.local.get(['sidebarName'], (result) => {
        loadSiteInFrame(
          newValue,
          result.sidebarName || 'Unknown Site',
          getCurrentActiveFrame(),
        );
        elements.sidebarTitle.textContent = result.sidebarName || 'Sidebar Anything';
        updateSiteSelector(newValue);
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', initializeSidebar);

window.addEventListener('resize', () => {
  if (currentLayout === 'split-2' && !isResizing) {
    const leftPanel = elements.splitView.querySelector('.flex-1:first-child');
    const rightPanel = elements.splitView.querySelector('.flex-1:last-child');
    if (leftPanel && rightPanel) {
      leftPanel.style.width = '50%';
      rightPanel.style.width = '50%';
    }
  }
});

/**
 * Setup modal controls
 */
function setupModalControls() {
  const closeSiteModal = document.getElementById('closeSiteSelectionModal');
  if (closeSiteModal) {
    closeSiteModal.addEventListener('click', closeSiteSelectionModal);
  }

  const closeThemeModal = document.getElementById('closeThemeSelectionModal');
  if (closeThemeModal) {
    closeThemeModal.addEventListener('click', closeThemeSelectionModal);
  }

  document.addEventListener('click', (e) => {
    const themeOption = e.target.closest('.theme-option');
    if (themeOption) {
      const theme = themeOption.dataset.theme;
      setTheme(theme);
      closeThemeSelectionModal();
    }
  });

  if (elements.siteSearchInput) {
    elements.siteSearchInput.addEventListener('input', handleSiteSearch);
  }

  const addCustomUrlBtn = document.getElementById('addCustomUrlBtn');
  if (addCustomUrlBtn) {
    addCustomUrlBtn.addEventListener('click', handleCustomUrl);
  }

  elements.siteSelectionModal?.addEventListener('click', (e) => {
    if (e.target === elements.siteSelectionModal) {
      closeSiteSelectionModal();
    }
  });

  elements.themeSelectionModal?.addEventListener('click', (e) => {
    if (e.target === elements.themeSelectionModal) {
      closeThemeSelectionModal();
    }
  });
}

/**
 * Open theme selection modal
 */
function openThemeModal() {
  if (!elements.themeSelectionModal) return;

  elements.themeSelectionModal.classList.remove('hidden');

  requestAnimationFrame(() => {
    elements.themeSelectionModalContent.classList.remove('scale-95', 'opacity-0');
    elements.themeSelectionModalContent.classList.add('scale-100', 'opacity-100');
  });

  updateThemeSelection();
}

/**
 * Close theme selection modal
 */
function closeThemeSelectionModal() {
  if (!elements.themeSelectionModal) return;

  elements.themeSelectionModalContent.classList.remove('scale-100', 'opacity-100');
  elements.themeSelectionModalContent.classList.add('scale-95', 'opacity-0');

  setTimeout(() => {
    elements.themeSelectionModal.classList.add('hidden');
  }, 300);
}
/**
 * Update theme selection UI.
 */
function updateThemeSelection() {
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    const theme = option.dataset.theme;
    if (theme === currentTheme) {
      option.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
    } else {
      option.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
    }
  });
}

/**
 * Set theme and save to storage.
 * @param {string} theme - The theme to set.
 */
async function setTheme(theme) {
  currentTheme = theme;
  applyTheme(theme);

  try {
    await chrome.storage.sync.set({ theme });
    showToast(`Theme changed to ${theme}`, 'success');
  } catch (error) {
    console.error('Error saving theme:', error);
  }
}

/**
 * Open site selection modal.
 */
function openSiteSelectionModal() {
  if (!elements.siteSelectionModal) return;

  elements.siteSelectionModal.classList.remove('hidden');

  requestAnimationFrame(() => {
    elements.siteSelectionModalContent.classList.remove('scale-95', 'opacity-0');
    elements.siteSelectionModalContent.classList.add('scale-100', 'opacity-100');
  });

  loadSitesForModal();

  if (elements.siteSearchInput) {
    elements.siteSearchInput.focus();
  }
}

/**
 * Close site selection modal.
 */
function closeSiteSelectionModal() {
  if (!elements.siteSelectionModal) return;

  elements.siteSelectionModalContent.classList.remove('scale-100', 'opacity-100');
  elements.siteSelectionModalContent.classList.add('scale-95', 'opacity-0');

  setTimeout(() => {
    elements.siteSelectionModal.classList.add('hidden');
  }, 300);

  if (elements.siteSearchInput) {
    elements.siteSearchInput.value = '';
  }
}

/**
 * Load sites for modal.
 */
async function loadSitesForModal() {
  if (!elements.sitesList) return;

  elements.sitesLoading?.classList.remove('hidden');
  elements.sitesList.classList.add('hidden');
  elements.sitesEmpty?.classList.add('hidden');

  try {
    const result = await chrome.storage.sync.get(['groups', 'entries']);
    let { groups, entries } = result;

    const sites = [];

    if (entries && entries.length > 0 && (!groups || Object.keys(groups).length === 0)) {
      sites.push(...entries.map(entry => ({
        ...entry,
        groupName: 'All',
        groupId: 'all',
        siteId: `legacy_${Date.now()}_${Math.random()}`
      })));
    } else if (groups) {
      Object.values(groups).forEach(group => {
        if (group.sites && group.sites.length > 0) {
          group.sites.forEach(site => {
            sites.push({
              ...site,
              groupName: group.name,
              groupId: group.id,
              siteId: site.id
            });
          });
        }
      });
    }

    elements.sitesLoading?.classList.add('hidden');

    if (sites.length === 0) {
      elements.sitesEmpty?.classList.remove('hidden');
      return;
    }

    renderSitesInModal(sites);
    elements.sitesList.classList.remove('hidden');

  } catch (error) {
    console.error('Error loading sites for modal:', error);
    elements.sitesLoading?.classList.add('hidden');
    elements.sitesEmpty?.classList.remove('hidden');
  }
}

/**
 * Render sites in modal.
 * @param {array} sites - The array of site objects to render.
 */
function renderSitesInModal(sites) {
  if (!elements.sitesList) return;

  elements.sitesList.innerHTML = sites.map(site => `
    <button class="site-option w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all duration-200 flex items-center space-x-3 text-left" data-url="${escapeHtml(site.url)}" data-name="${escapeHtml(site.name)}">
      <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <img src="${getFaviconUrl(site.url)}" alt="" class="w-5 h-5 rounded" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <span class="material-symbols-outlined text-gray-500 text-sm hidden">language</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-medium text-gray-900 dark:text-white truncate">${escapeHtml(site.name)}</div>
        <div class="text-sm text-gray-500 dark:text-gray-400 truncate">${escapeHtml(site.url)}</div>
        <div class="text-xs text-teal-600 dark:text-teal-400">${escapeHtml(site.groupName)}</div>
      </div>
    </button>
  `).join('');

  elements.sitesList.addEventListener('click', (e) => {
    const siteOption = e.target.closest('.site-option');
    if (siteOption && currentSelectedPanel) {
      const url = siteOption.dataset.url;
      const name = siteOption.dataset.name;
      loadSiteInPanel(url, name, currentSelectedPanel);
      closeSiteSelectionModal();
    }
  });
}

/**
 * Handle site search.
 * @param {Event} e - The input event.
 */
function handleSiteSearch(e) {
  const query = e.target.value.toLowerCase();
  const siteOptions = elements.sitesList?.querySelectorAll('.site-option');

  if (!siteOptions) return;

  siteOptions.forEach(option => {
    const name = option.dataset.name.toLowerCase();
    const url = option.dataset.url.toLowerCase();

    if (name.includes(query) || url.includes(query)) {
      option.classList.remove('hidden');
    } else {
      option.classList.add('hidden');
    }
  });
}

/**
 * Handle custom URL input.
 */
function handleCustomUrl() {
  const url = prompt('Enter URL (e.g., https://example.com):');
  if (url && currentSelectedPanel) {
    try {
      const urlObj = new URL(url);
      const name = urlObj.hostname.replace('www.', '');

      loadSiteInPanel(url, name, currentSelectedPanel);
      closeSiteSelectionModal();

      showToast(`Loading ${name} in panel ${currentSelectedPanel}`, 'info');
    } catch (error) {
      showToast('Please enter a valid URL (e.g., https://example.com)', 'error');
    }
  }
}

/**
 * Get favicon URL for a site.
 * @param {string} url - The URL of the site.
 * @returns {string} - The favicon URL.
 */
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="gray" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
  }
}

/**
 * Escape HTML to prevent XSS.
 * @param {string} text - The text to escape.
 * @returns {string} - The escaped text.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
