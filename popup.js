const nameInput = document.getElementById('name');
const urlInput = document.getElementById('url');
const addBtn = document.getElementById('add');
const addBtnText = addBtn.querySelector('.text');
const entriesList = document.getElementById('entriesList');
const openBtn = document.getElementById('open');
const feedback = document.getElementById('feedback');

let editingIdx = null;
let selectedIdx = 0;
let allSites = [];

function showFeedback(msg, isError = true) {
  /**
   * Displays feedback message to the user.
   * @param {string} msg - The message to display.
   * @param {boolean} isError - Indicates if the message is an error (true) or success (false).
   */
  feedback.textContent = msg;
  feedback.className = 'feedback visible';
  feedback.style.color = isError ? '#d93025' : '#43a047';
  setTimeout(() => {
    feedback.className = 'feedback';
  }, 2200);
}

function isValidUrl(url) {
  /**
   * Checks if a given URL is valid (http or https).
   * @param {string} url - The URL to validate.
   * @returns {boolean} - True if the URL is valid, false otherwise.
   */
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function renderEntries(sites) {
  /**
   * Renders the list of sites in the UI.
   * @param {Array<object>} sites - An array of site objects with name, url, and groupName properties.
   */
  entriesList.innerHTML = '';
  if (sites.length === 0) {
    entriesList.innerHTML =
      '<div style="text-align: center; color: #607d8b; padding: 20px;">No sites available. Add one in Settings!</div>';
    return;
  }

  sites.forEach((site, idx) => {
    const row = document.createElement('div');
    row.className = 'entry-card' + (selectedIdx === idx ? ' selected' : '');
    row.dataset.idx = idx;
    row.innerHTML = `
            <div class="entry-info">
                <div class="entry-name">${escapeHtml(site.name)}</div>
                <div class="entry-url">${escapeHtml(site.url)}</div>
                <div class="entry-group" style="font-size: 0.8em; color: #888; margin-top: 2px;">${escapeHtml(
                  site.groupName
                )}</div>
            </div>
            <div class="entry-actions">
                <button data-action="open" data-idx="${idx}" title="Open in Sidebar"><span class="material-symbols-outlined">side_navigation</span></button>
                <button data-action="edit" data-idx="${idx}" title="Edit"><span class="material-symbols-outlined">edit</span></button>
                <button data-action="delete" data-idx="${idx}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
            </div>
        `;
    row.onclick = (e) => {
      if (!e.target.closest('button')) {
        selectedIdx = idx;
        renderEntries(sites);
      }
    };
    entriesList.appendChild(row);
  });
}

function loadEntries() {
  /**
   * Loads sites from Chrome storage (groups format) and renders them.
   */
  chrome.storage.sync.get({ groups: {}, entries: [] }, (result) => {
    let { groups, entries } = result;

    if (entries.length > 0 && Object.keys(groups).length === 0) {
      allSites = entries.map((entry) => ({
        ...entry,
        groupName: 'All',
        groupId: 'all',
        siteId: `legacy_${Date.now()}_${Math.random()}`,
      }));
    } else {
      allSites = [];
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

    renderEntries(allSites);
  });
}

function openSidebar(site) {
  /**
   * Opens a site in the sidebar.
   * @param {object} site - The site object with name and url properties.
   */
  chrome.storage.local.set(
    {
      sidebarUrl: site.url,
      sidebarName: site.name,
      sidebarTimestamp: Date.now(),
    },
    () => {
      if (chrome.sidePanel) {
        chrome.windows.getCurrent((window) => {
          chrome.sidePanel
            .open({ windowId: window.id })
            .then(() => {
              showFeedback(`Opening "${site.name}" in sidebar...`, false);
              setTimeout(() => {
                window.close();
              }, 500);
            })
            .catch((error) => {
              console.error('Error opening sidebar:', error);
              showFeedback(`Failed to open sidebar: ${error.message}`, true);
            });
        });
      } else {
        showFeedback('Sidebar not supported in this browser', true);
      }
    }
  );
}

addBtn.onclick = () => {
  /**
   * Handles the click event of the add button.
   */
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  if (!name || !url) {
    showFeedback('Please enter both name and URL');
    return;
  }
  if (!isValidUrl(url)) {
    showFeedback('Please enter a valid URL (http/https)');
    return;
  }

  chrome.storage.sync.get({ groups: {} }, ({ groups }) => {
    if (editingIdx !== null) {
      const site = allSites[editingIdx];
      const group = groups[site.groupId];
      if (group) {
        const siteIndex = group.sites.findIndex((s) => s.id === site.siteId);
        if (siteIndex !== -1) {
          group.sites[siteIndex] = { ...group.sites[siteIndex], name, url };
          chrome.storage.sync.set({ groups }, () => {
            editingIdx = null;
            addBtnText.textContent = 'Add Entry';
            addBtn.querySelector('.material-symbols-outlined').textContent =
              'save';
            showFeedback('Entry updated!', false);
            loadEntries();
            nameInput.value = '';
            urlInput.value = '';
          });
        }
      }
    } else {
      if (!groups['all']) {
        groups['all'] = { id: 'all', name: 'All', sites: [] };
      }

      const allSitesFlat = Object.values(groups).flatMap((g) => g.sites);
      if (allSitesFlat.some((s) => s.name === name)) {
        showFeedback('Name already exists');
        return;
      }

      const newSite = {
        id: `site_${Date.now()}`,
        name: name,
        url: url,
      };

      groups['all'].sites.push(newSite);
      chrome.storage.sync.set({ groups }, () => {
        showFeedback('Entry added!', false);
        loadEntries();
        nameInput.value = '';
        urlInput.value = '';
        selectedIdx = allSites.length;
      });
    }
  });
};

entriesList.onclick = (e) => {
  /**
   * Handles the click event on the entries list for actions like edit, delete, and open.
   */
  const btn = e.target.closest('button');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx, 10);
  const site = allSites[idx];

  if (btn.dataset.action === 'edit') {
    nameInput.value = site.name;
    urlInput.value = site.url;
    editingIdx = idx;
    addBtnText.textContent = 'Save Changes';
    addBtn.querySelector('.material-symbols-outlined').textContent = 'edit';
    nameInput.focus();
  } else if (btn.dataset.action === 'delete') {
    if (confirm(`Delete "${site.name}"?`)) {
      chrome.storage.sync.get({ groups: {} }, ({ groups }) => {
        const group = groups[site.groupId];
        if (group) {
          group.sites = group.sites.filter((s) => s.id !== site.siteId);
          chrome.storage.sync.set({ groups }, () => {
            showFeedback('Entry deleted!', false);
            if (editingIdx === idx) {
              nameInput.value = '';
              urlInput.value = '';
              editingIdx = null;
              addBtnText.textContent = 'Add Entry';
              addBtn.querySelector('.material-symbols-outlined').textContent =
                'save';
            }
            loadEntries();
            if (selectedIdx >= allSites.length - 1) {
              selectedIdx = Math.max(0, allSites.length - 2);
            }
          });
        }
      });
    }
  } else if (btn.dataset.action === 'open') {
    openSidebar(site);
  }
};

openBtn.onclick = () => {
  /**
   * Handles the click event of the open button to open the selected entry in the sidebar.
   */
  if (allSites.length === 0) {
    showFeedback('No entries available. Add one first!');
    return;
  }
  if (allSites[selectedIdx]) {
    openSidebar(allSites[selectedIdx]);
  }
};

function escapeHtml(text) {
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - The text to escape.
   */
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  /**
   * Event listener for DOMContentLoaded to load entries and focus on the name input.
   */
  loadEntries();
  nameInput.focus();
});
