/**
 * @fileOverview This script manages the options page for the Sidebar Anything
 * extension, allowing users to manage groups, sites, and themes.
 */

// Global state
let currentGroups = {};
let editingGroupId = null;
let editingSiteId = null;
let editingSiteGroupId = null;

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
  await initializeExtension();
  setupEventListeners();
  await loadAndRenderGroups();
  applyTheme();
});

/**
 * Initialize the extension with default data and migration
 */
async function initializeExtension() {
  try {
    const result = await chrome.storage.sync.get(['entries', 'groups', 'theme']);

    if (result.entries && !result.groups) {
      await migrateOldEntries(result.entries);
    } else if (!result.groups) {
      await initializeDefaultGroups();
    }

    if (!result.theme) {
      await chrome.storage.sync.set({ theme: 'auto' });
    }
  } catch (error) {
    console.error('Error initializing extension:', error);
    showFeedback('Error initializing extension', true);
  }
}

/**
 * Migrate old entries format to new groups format
 * @param {Array} oldEntries - An array of old entry objects to migrate.
 */
async function migrateOldEntries(oldEntries) {
  const groups = {
    'all': {
      id: 'all',
      name: 'All',
      sites: oldEntries.map((entry, index) => ({
        id: `site_${Date.now()}_${index}`,
        name: entry.name,
        url: entry.url,
      })),
    },
  };

  groups['ai'] = createAIGroup();

  await chrome.storage.sync.set({ groups });
  await chrome.storage.sync.remove(['entries']);

  showFeedback('Successfully migrated your data to the new group format!', false);
}

/**
 * Initialize with default groups including the hardcoded AI group
 */
async function initializeDefaultGroups() {
  const groups = {
    'all': {
      id: 'all',
      name: 'All',
      sites: [],
    },
    'ai': createAIGroup(),
  };

  await chrome.storage.sync.set({ groups });
}

/**
 * Create the hardcoded AI group with predefined sites
 * @returns {Object} The AI group object with predefined sites.
 */
function createAIGroup() {
  return {
    id: 'ai',
    name: 'AI',
    sites: [
      {
        id: 'grok',
        name: 'Grok',
        url: 'https://grok.com/chat/',
      },
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        url: 'https://chatgpt.com/',
      },
      {
        id: 'gemini',
        name: 'Gemini',
        url: 'https://gemini.google.com/',
      },
      {
        id: 'claude',
        name: 'Claude',
        url: 'https://claude.ai/new',
      },
      {
        id: 'perplexity',
        name: 'Perplexity',
        url: 'https://www.perplexity.ai/',
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        url: 'https://openrouter.ai/chat',
      },
    ],
  };
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  document
    .getElementById('themeSelect')
    .addEventListener('change', handleThemeChange);
  document
    .getElementById('addGroupBtn')
    .addEventListener('click', () => openGroupModal());
  document
    .getElementById('addSiteBtn')
    .addEventListener('click', () => openSiteModal());
  document
    .getElementById('importBtn')
    .addEventListener('click', () => document.getElementById('importFile').click());
  document
    .getElementById('importFile')
    .addEventListener('change', handleImport);
  document
    .getElementById('exportDropdownBtn')
    .addEventListener('click', toggleExportDropdown);
  document.addEventListener('click', (e) => {
    if (
      !e.target.closest('#exportDropdownBtn') &&
      !e.target.closest('#exportDropdown')
    ) {
      document.getElementById('exportDropdown').classList.add('hidden');
    }
  });
  document
    .getElementById('closeGroupModal')
    .addEventListener('click', closeGroupModal);
  document
    .getElementById('cancelGroupModal')
    .addEventListener('click', closeGroupModal);
  document
    .getElementById('groupForm')
    .addEventListener('submit', handleGroupSubmit);
  document
    .getElementById('closeSiteModal')
    .addEventListener('click', closeSiteModal);
  document
    .getElementById('cancelSiteModal')
    .addEventListener('click', closeSiteModal);
  document
    .getElementById('siteForm')
    .addEventListener('submit', handleSiteSubmit);
  document
    .getElementById('confirmNo')
    .addEventListener('click', closeConfirmModal);
  document.getElementById('groupModal').addEventListener('click', (e) => {
    if (e.target.id === 'groupModal') closeGroupModal();
  });
  document.getElementById('siteModal').addEventListener('click', (e) => {
    if (e.target.id === 'siteModal') closeSiteModal();
  });
  document.getElementById('confirmModal').addEventListener('click', (e) => {
    if (e.target.id === 'confirmModal') closeConfirmModal();
  });
}

/**
 * Load groups from storage and render them
 */
async function loadAndRenderGroups() {
  try {
    const result = await chrome.storage.sync.get(['groups']);
    currentGroups = result.groups || {};
    renderGroups();
    updateExportDropdown();
  } catch (error) {
    console.error('Error loading groups:', error);
    showFeedback('Error loading groups', true);
  }
}

/**
 * Render all groups in the UI
 */
function renderGroups() {
  const container = document.getElementById('groupsContainer');
  const emptyState = document.getElementById('emptyState');

  if (Object.keys(currentGroups).length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = '';

  Object.values(currentGroups).forEach((group) => {
    const groupElement = createGroupElement(group);
    container.appendChild(groupElement);
  });
}

/**
 * Create a group element
 * @param {Object} group - The group object to create an element for.
 * @returns {HTMLElement} The created group element.
 */
function createGroupElement(group) {
  const groupDiv = document.createElement('div');
  groupDiv.className =
    'group-card bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in';

  const isExpanded = localStorage.getItem(`group_${group.id}_expanded`) !== 'false';

  groupDiv.innerHTML = `
    <div class="group-header p-6 border-b border-gray-200 dark:border-gray-700 cursor-pointer" data-group-id="${group.id}">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-r ${getGroupGradient(group.id)} flex items-center justify-center">
            <span class="material-symbols-outlined text-white text-xl">${getGroupIcon(group.id)}</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${escapeHtml(group.name)}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">${group.sites.length} site${group.sites.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          ${group.id !== 'all'
            ? `
            <button class="edit-group-btn p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-group-id="${group.id}" title="Edit Group">
              <span class="material-symbols-outlined text-gray-500">edit</span>
            </button>
            <button class="delete-group-btn p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-group-id="${group.id}" title="Delete Group">
              <span class="material-symbols-outlined text-red-500">delete</span>
            </button>
          `
            : ''}
          <button class="expand-btn p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105" 
                  aria-expanded="${isExpanded}" 
                  aria-controls="group-content-${group.id}"
                  aria-label="Toggle ${escapeHtml(group.name)} group"
                  title="${isExpanded ? 'Collapse' : 'Expand'} group">
            <span class="material-symbols-outlined text-gray-500 hover:text-indigo-500 transform transition-all duration-200 ${isExpanded ? 'rotate-180' : ''}" id="expand-icon-${group.id}">expand_more</span>
          </button>
        </div>
      </div>
    </div>
    
    <div class="group-content ${isExpanded ? '' : 'hidden'}" id="group-content-${group.id}">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Sites in this group</h4>
          <button class="add-site-btn flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105" data-group-id="${group.id}">
            <span class="material-symbols-outlined text-sm">add</span>
            <span>Add Site</span>
          </button>
        </div>
        
        <div class="space-y-3" id="sites-${group.id}">
          ${group.sites.length === 0
            ? `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
              <span class="material-symbols-outlined text-4xl mb-2 block">web</span>
              <p>No sites in this group yet</p>
            </div>
          `
            : group.sites.map(site => createSiteElement(site, group.id)).join('')}
        </div>
      </div>
    </div>
  `;

  const groupHeader = groupDiv.querySelector('.group-header');
  groupHeader.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
      toggleGroup(group.id);
    }
  });

  const expandBtn = groupDiv.querySelector('.expand-btn');
  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleGroup(group.id);
    });

    expandBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleGroup(group.id);
      }
    });
  }

  const editBtn = groupDiv.querySelector('.edit-group-btn');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editGroup(group.id);
    });
  }

  const deleteBtn = groupDiv.querySelector('.delete-group-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGroup(group.id);
    });
  }

  const addSiteBtn = groupDiv.querySelector('.add-site-btn');
  if (addSiteBtn) {
    addSiteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addSiteToGroup(group.id);
    });
  }

  const siteItems = groupDiv.querySelectorAll('.site-item');
  siteItems.forEach((siteItem) => {
    const openBtn = siteItem.querySelector('.open-site-btn');
    const editBtn = siteItem.querySelector('.edit-site-btn');
    const deleteBtn = siteItem.querySelector('.delete-site-btn');

    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = openBtn.dataset.url;
        const name = openBtn.dataset.name;
        openSiteInSidebar(url, name);
      });
    }

    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const siteId = editBtn.dataset.siteId;
        const groupId = editBtn.dataset.groupId;
        editSite(siteId, groupId);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const siteId = deleteBtn.dataset.siteId;
        const groupId = deleteBtn.dataset.groupId;
        deleteSite(siteId, groupId);
      });
    }
  });

  return groupDiv;
}

/**
 * Create a site element
 * @param {Object} site - The site object to create an element for.
 * @param {string} groupId - The ID of the group the site belongs to.
 * @returns {string} The HTML string for the site element.
 */
function createSiteElement(site, groupId) {
  return `
    <div class="site-item flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
      <div class="flex items-center space-x-3 flex-1 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-white text-sm">language</span>
        </div>
        <div class="flex-1 min-w-0">
          <h5 class="font-medium text-gray-900 dark:text-white truncate">${escapeHtml(site.name)}</h5>
          <p class="text-sm text-gray-600 dark:text-gray-400 truncate">${escapeHtml(site.url)}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2 flex-shrink-0">
        <button class="open-site-btn p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors" data-url="${escapeHtml(site.url)}" data-name="${escapeHtml(site.name)}" title="Open in Sidebar">
          <span class="material-symbols-outlined text-blue-500">side_navigation</span>
        </button>
        <button class="edit-site-btn p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors" data-site-id="${site.id}" data-group-id="${groupId}" title="Edit Site">
          <span class="material-symbols-outlined text-gray-500">edit</span>
        </button>
        <button class="delete-site-btn p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors" data-site-id="${site.id}" data-group-id="${groupId}" title="Delete Site">
          <span class="material-symbols-outlined text-red-500">delete</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Get gradient class for group based on ID
 * @param {string} groupId - The ID of the group.
 * @returns {string} The gradient CSS class.
 */
function getGroupGradient(groupId) {
  const gradients = {
    'all': 'from-blue-500 to-blue-600',
    'ai': 'from-purple-500 to-pink-600',
    'work': 'from-green-500 to-teal-600',
    'social': 'from-orange-500 to-red-600',
    'news': 'from-indigo-500 to-purple-600',
  };
  return gradients[groupId] || 'from-gray-500 to-gray-600';
}

/**
 * Get icon for group based on ID
 * @param {string} groupId - The ID of the group.
 * @returns {string} The icon name.
 */
function getGroupIcon(groupId) {
  const icons = {
    'all': 'folder',
    'ai': 'psychology',
    'work': 'work',
    'social': 'groups',
    'news': 'newspaper',
  };
  return icons[groupId] || 'folder';
}

/**
 * Toggle group expansion with smooth animations
 * @param {string} groupId - The ID of the group to toggle.
 */
function toggleGroup(groupId) {
  const content = document.getElementById(`group-content-${groupId}`);
  const icon = document.getElementById(`expand-icon-${groupId}`);
  const button = icon.closest('button');

  if (!content || !icon) return;

  const isExpanded = !content.classList.contains('hidden');

  button.setAttribute('aria-expanded', !isExpanded);
  button.setAttribute('aria-controls', `group-content-${groupId}`);

  if (isExpanded) {
    content.style.maxHeight = content.scrollHeight + 'px';
    content.style.overflow = 'hidden';
    content.style.transition =
      'max-height 300ms ease-in-out, opacity 200ms ease-in-out';

    content.offsetHeight;

    content.style.maxHeight = '0px';
    content.style.opacity = '0.7';

    setTimeout(() => {
      content.classList.add('hidden');
      content.style.maxHeight = '';
      content.style.overflow = '';
      content.style.transition = '';
      content.style.opacity = '';
    }, 300);

    icon.classList.remove('rotate-180');
    icon.style.transform = 'rotate(0deg)';

    localStorage.setItem(`group_${groupId}_expanded`, 'false');
  } else {
    content.classList.remove('hidden');
    content.style.maxHeight = '0px';
    content.style.overflow = 'hidden';
    content.style.opacity = '0.7';
    content.style.transition =
      'max-height 300ms ease-in-out, opacity 200ms ease-in-out';

    content.offsetHeight;

    content.style.maxHeight = content.scrollHeight + 'px';
    content.style.opacity = '1';

    setTimeout(() => {
      content.style.maxHeight = '';
      content.style.overflow = '';
      content.style.transition = '';
      content.style.opacity = '';
    }, 300);

    icon.classList.add('rotate-180');
    icon.style.transform = 'rotate(180deg)';

    localStorage.setItem(`group_${groupId}_expanded`, 'true');
  }

  button.style.transform = 'scale(0.95)';
  setTimeout(() => {
    button.style.transform = '';
  }, 150);
}

/**
 * Open group modal for adding or editing
 * @param {string} [groupId=null] - The ID of the group to edit, or null to add a new group.
 */
function openGroupModal(groupId = null) {
  editingGroupId = groupId;
  const modal = document.getElementById('groupModal');
  const modalContent = document.getElementById('groupModalContent');
  const title = document.getElementById('groupModalTitle');
  const submitText = document.getElementById('groupSubmitText');
  const nameInput = document.getElementById('groupNameInput');

  if (groupId) {
    const group = currentGroups[groupId];
    title.textContent = 'Edit Group';
    submitText.textContent = 'Save Changes';
    nameInput.value = group.name;
  } else {
    title.textContent = 'Add Group';
    submitText.textContent = 'Create Group';
    nameInput.value = '';
  }

  modal.classList.remove('hidden');
  setTimeout(() => {
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  }, 10);

  nameInput.focus();
}

/**
 * Close group modal
 */
function closeGroupModal() {
  const modal = document.getElementById('groupModal');
  const modalContent = document.getElementById('groupModalContent');

  modalContent.classList.remove('scale-100', 'opacity-100');
  modalContent.classList.add('scale-95', 'opacity-0');

  setTimeout(() => {
    modal.classList.add('hidden');
    editingGroupId = null;
  }, 300);
}

/**
 * Handle group form submission
 * @param {Event} e - The submit event.
 */
async function handleGroupSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('groupNameInput');
  const name = nameInput.value.trim();

  if (!name) {
    showFeedback('Please enter a group name', true);
    return;
  }

  try {
    if (editingGroupId) {
      currentGroups[editingGroupId].name = name;
      showFeedback('Group updated successfully!', false);
    } else {
      const groupId = `group_${Date.now()}`;
      currentGroups[groupId] = {
        id: groupId,
        name: name,
        sites: [],
      };
      showFeedback('Group created successfully!', false);
    }

    await chrome.storage.sync.set({ groups: currentGroups });
    renderGroups();
    updateExportDropdown();
    closeGroupModal();
  } catch (error) {
    console.error('Error saving group:', error);
    showFeedback('Error saving group', true);
  }
}

/**
 * Edit group
 * @param {string} groupId - The ID of the group to edit.
 */
function editGroup(groupId) {
  openGroupModal(groupId);
}

/**
 * Delete group with confirmation
 * @param {string} groupId - The ID of the group to delete.
 */
function deleteGroup(groupId) {
  const group = currentGroups[groupId];
  showConfirmModal(
    `Are you sure you want to delete the group "${group.name}"? This will also delete all ${group.sites.length} sites in this group.`,
    () => confirmDeleteGroup(groupId),
  );
}

/**
 * Confirm group deletion
 * @param {string} groupId - The ID of the group to delete.
 */
async function confirmDeleteGroup(groupId) {
  try {
    delete currentGroups[groupId];
    await chrome.storage.sync.set({ groups: currentGroups });
    renderGroups();
    updateExportDropdown();
    showFeedback('Group deleted successfully!', false);
    closeConfirmModal();
  } catch (error) {
    console.error('Error deleting group:', error);
    showFeedback('Error deleting group', true);
  }
}

/**
 * Open site modal for adding or editing
 * @param {string} [siteId=null] - The ID of the site to edit, or null to add a new site.
 * @param {string} [groupId=null] - The ID of the group to add the site to.
 */
function openSiteModal(siteId = null, groupId = null) {
  editingSiteId = siteId;
  editingSiteGroupId = groupId;

  const modal = document.getElementById('siteModal');
  const modalContent = document.getElementById('siteModalContent');
  const title = document.getElementById('siteModalTitle');
  const submitText = document.getElementById('siteSubmitText');
  const nameInput = document.getElementById('siteNameInput');
  const urlInput = document.getElementById('siteUrlInput');
  const groupSelect = document.getElementById('siteGroupSelect');

  groupSelect.innerHTML = '';
  Object.values(currentGroups).forEach((group) => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    groupSelect.appendChild(option);
  });

  if (siteId && groupId) {
    const group = currentGroups[groupId];
    const site = group.sites.find((s) => s.id === siteId);
    title.textContent = 'Edit Site';
    submitText.textContent = 'Save Changes';
    nameInput.value = site.name;
    urlInput.value = site.url;
    groupSelect.value = groupId;
  } else {
    title.textContent = 'Add Site';
    submitText.textContent = 'Add Site';
    nameInput.value = '';
    urlInput.value = '';
    groupSelect.value = groupId || 'all';
  }

  modal.classList.remove('hidden');
  setTimeout(() => {
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  }, 10);

  nameInput.focus();
}

/**
 * Close site modal
 */
function closeSiteModal() {
  const modal = document.getElementById('siteModal');
  const modalContent = document.getElementById('siteModalContent');

  modalContent.classList.remove('scale-100', 'opacity-100');
  modalContent.classList.add('scale-95', 'opacity-0');

  setTimeout(() => {
    modal.classList.add('hidden');
    editingSiteId = null;
    editingSiteGroupId = null;
  }, 300);
}

/**
 * Handle site form submission
 * @param {Event} e - The submit event.
 */
async function handleSiteSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('siteNameInput');
  const urlInput = document.getElementById('siteUrlInput');
  const groupSelect = document.getElementById('siteGroupSelect');

  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  const targetGroupId = groupSelect.value;

  if (!name || !url) {
    showFeedback('Please enter both site name and URL', true);
    return;
  }

  if (!isValidUrl(url)) {
    showFeedback('Please enter a valid URL', true);
    return;
  }

  try {
    if (editingSiteId && editingSiteGroupId) {
      const oldGroup = currentGroups[editingSiteGroupId];
      const siteIndex = oldGroup.sites.findIndex((s) => s.id === editingSiteId);

      if (targetGroupId === editingSiteGroupId) {
        oldGroup.sites[siteIndex] = {
          id: editingSiteId,
          name: name,
          url: url,
        };
      } else {
        const site = oldGroup.sites[siteIndex];
        oldGroup.sites.splice(siteIndex, 1);
        currentGroups[targetGroupId].sites.push({
          id: editingSiteId,
          name: name,
          url: url,
        });
      }
      showFeedback('Site updated successfully!', false);
    } else {
      const siteId = `site_${Date.now()}`;
      currentGroups[targetGroupId].sites.push({
        id: siteId,
        name: name,
        url: url,
      });
      showFeedback('Site added successfully!', false);
    }

    await chrome.storage.sync.set({ groups: currentGroups });
    renderGroups();
    closeSiteModal();
  } catch (error) {
    console.error('Error saving site:', error);
    showFeedback('Error saving site', true);
  }
}

/**
 * Add site to specific group
 * @param {string} groupId - The ID of the group to add the site to.
 */
function addSiteToGroup(groupId) {
  openSiteModal(null, groupId);
}

/**
 * Edit site
 * @param {string} siteId - The ID of the site to edit.
 * @param {string} groupId - The ID of the group the site belongs to.
 */
function editSite(siteId, groupId) {
  openSiteModal(siteId, groupId);
}

/**
 * Delete site with confirmation
 * @param {string} siteId - The ID of the site to delete.
 * @param {string} groupId - The ID of the group the site belongs to.
 */
function deleteSite(siteId, groupId) {
  const group = currentGroups[groupId];
  const site = group.sites.find((s) => s.id === siteId);
  showConfirmModal(
    `Are you sure you want to delete "${site.name}"?`,
    () => confirmDeleteSite(siteId, groupId),
  );
}

/**
 * Confirm site deletion
 * @param {string} siteId - The ID of the site to delete.
 * @param {string} groupId - The ID of the group the site belongs to.
 */
async function confirmDeleteSite(siteId, groupId) {
  try {
    const group = currentGroups[groupId];
    group.sites = group.sites.filter((s) => s.id !== siteId);
    await chrome.storage.sync.set({ groups: currentGroups });
    renderGroups();
    showFeedback('Site deleted successfully!', false);
    closeConfirmModal();
  } catch (error) {
    console.error('Error deleting site:', error);
    showFeedback('Error deleting site', true);
  }
}

/**
 * Open site in sidebar
 * @param {string} url - The URL of the site to open.
 * @param {string} name - The name of the site to open.
 */
function openSiteInSidebar(url, name) {
  chrome.storage.local.set({
    sidebarUrl: url,
    sidebarName: name,
    sidebarTimestamp: Date.now(),
  }, () => {
    if (chrome.sidePanel) {
      chrome.windows.getCurrent((window) => {
        chrome.sidePanel.open({ windowId: window.id }).then(() => {
          showFeedback(`Opening "${name}" in sidebar...`, false);
        }).catch((error) => {
          console.error('Error opening sidebar:', error);
          showFeedback(`Failed to open sidebar: ${error.message}`, true);
        });
      });
    } else {
      showFeedback('Sidebar not supported in this browser', true);
    }
  });
}

/**
 * Show confirmation modal
 * @param {string} message - The message to display in the modal.
 * @param {Function} onConfirm - The function to call when the confirm button is clicked.
 */
function showConfirmModal(message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const modalContent = document.getElementById('confirmModalContent');
  const messageEl = document.getElementById('confirmMessage');
  const yesBtn = document.getElementById('confirmYes');

  messageEl.textContent = message;

  const newYesBtn = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);

  newYesBtn.addEventListener('click', onConfirm);

  modal.classList.remove('hidden');
  setTimeout(() => {
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  }, 10);
}

/**
 * Close confirmation modal
 */
function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  const modalContent = document.getElementById('confirmModalContent');

  modalContent.classList.remove('scale-100', 'opacity-100');
  modalContent.classList.add('scale-95', 'opacity-0');

  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

/**
 * Toggle export dropdown
 */
function toggleExportDropdown() {
  const dropdown = document.getElementById('exportDropdown');
  dropdown.classList.toggle('hidden');
}

function updateExportDropdown() {
  /**
   * Update export dropdown with current groups
   */
  const container = document.getElementById('groupExportOptions');
  container.innerHTML = '';

  Object.values(currentGroups).forEach((group) => {
    const jsonBtn = document.createElement('button');
    jsonBtn.className =
      'export-option w-full text-left px-4 py-3 rounded-lg hover:bg-white/20 dark:hover:bg-gray-700/50 transition-colors';
    jsonBtn.setAttribute('data-type', 'group');
    jsonBtn.setAttribute('data-group', group.id);
    jsonBtn.setAttribute('data-format', 'json');
    jsonBtn.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="material-symbols-outlined text-green-500">folder</span>
        <div>
          <div class="font-medium text-gray-900 dark:text-white">${escapeHtml(
            group.name
          )} (JSON)</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">${
            group.sites.length
          } sites</div>
        </div>
      </div>
    `;

    const base64Btn = document.createElement('button');
    base64Btn.className =
      'export-option w-full text-left px-4 py-3 rounded-lg hover:bg-white/20 dark:hover:bg-gray-700/50 transition-colors';
    base64Btn.setAttribute('data-type', 'group');
    base64Btn.setAttribute('data-group', group.id);
    base64Btn.setAttribute('data-format', 'base64');
    base64Btn.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="material-symbols-outlined text-yellow-500">folder</span>
        <div>
          <div class="font-medium text-gray-900 dark:text-white">${escapeHtml(
            group.name
          )} (Base64)</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">${
            group.sites.length
          } sites</div>
        </div>
      </div>
    `;

    container.appendChild(jsonBtn);
    container.appendChild(base64Btn);
  });

  document.querySelectorAll('.export-option').forEach((btn) => {
    btn.addEventListener('click', handleExport);
  });
}

function handleExport(e) {
  /**
   * Handle export functionality
   * @param {Event} e - The event object.
   */
  const type = e.currentTarget.getAttribute('data-type');
  const format = e.currentTarget.getAttribute('data-format');
  const groupId = e.currentTarget.getAttribute('data-group');

  let data;
  let filename;

  if (type === 'all') {
    data = currentGroups;
    filename = `sidebar-anything-all-groups.${
      format === 'json' ? 'json' : 'txt'
    }`;
  } else if (type === 'group') {
    data = { [groupId]: currentGroups[groupId] };
    filename = `sidebar-anything-${currentGroups[
      groupId
    ].name
      .toLowerCase()
      .replace(/\s+/g, '-')}.${format === 'json' ? 'json' : 'txt'}`;
  }

  let content;
  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
  } else {
    content = btoa(JSON.stringify(data));
  }

  downloadFile(content, filename);
  document.getElementById('exportDropdown').classList.add('hidden');
  showFeedback(
    `Exported ${type === 'all' ? 'all groups' : currentGroups[groupId].name
    } successfully!`,
    false
  );
}

async function handleImport(e) {
  /**
   * Handle import functionality
   * @param {Event} e - The event object.
   */
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      let data;
      const content = event.target.result;

      try {
        data = JSON.parse(content);
      } catch {
        try {
          const decoded = atob(content);
          data = JSON.parse(decoded);
        } catch {
          throw new Error(
            'Invalid file format. Please upload a valid JSON or Base64 file.'
          );
        }
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure in file.');
      }

      Object.assign(currentGroups, data);

      await chrome.storage.sync.set({ groups: currentGroups });
      renderGroups();
      updateExportDropdown();
      showFeedback('Data imported successfully!', false);
    } catch (error) {
      console.error('Import error:', error);
      showFeedback(error.message || 'Error importing file', true);
    }
  };

  reader.readAsText(file);
  e.target.value = '';
}

function downloadFile(content, filename) {
  /**
   * Download file helper
   * @param {string} content - The content of the file.
   * @param {string} filename - The name of the file.
   */
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleThemeChange(e) {
  /**
   * Handle theme changes
   * @param {Event} e - The event object.
   */
  const theme = e.target.value;
  await chrome.storage.sync.set({ theme });
  applyTheme(theme);
  showFeedback(`Theme changed to ${theme}!`, false);
}

function applyTheme(theme = null) {
  /**
   * Apply theme to the page
   * @param {string | null} theme - The theme to apply.
   */
  if (!theme) {
    chrome.storage.sync.get(['theme'], (result) => {
      applyTheme(result.theme || 'auto');
    });
    return;
  }

  const html = document.documentElement;
  const themeSelect = document.getElementById('themeSelect');

  if (themeSelect) {
    themeSelect.value = theme;
  }

  html.classList.remove('dark');
  document.body.classList.remove('premium-gradient');

  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'auto') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark');
    }
  } else if (theme === 'premium') {
    html.classList.add('dark');
    document.body.classList.add('premium-gradient');
  }
}

function showFeedback(message, isError = false) {
  /**
   * Show feedback message
   * @param {string} message - The message to display.
   * @param {boolean} isError - Whether the message is an error message.
   */
  const feedback = document.getElementById('feedback');
  feedback.textContent = message;
  feedback.className = `mb-6 p-4 rounded-xl border-l-4 animate-slide-in ${isError
      ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
      : 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400'
    }`;
  feedback.classList.remove('hidden');

  setTimeout(() => {
    feedback.classList.add('hidden');
  }, 3000);
}

function isValidUrl(url) {
  /**
   * Validate URL
   * @param {string} url - The URL to validate.
   */
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function escapeHtml(text) {
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - The text to escape.
   */
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    chrome.storage.sync.get(['theme'], (result) => {
      if (result.theme === 'auto') {
        applyTheme('auto');
      }
    });
  });
