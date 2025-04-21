document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('themeSelect');
  const newName = document.getElementById('newName');
  const newUrl = document.getElementById('newUrl');
  const addEntryBtn = document.getElementById('addEntryBtn');
  let editingIdx = null;

  function applyTheme(theme) {
    /**
     * Applies the selected theme to the options page.
     * @param {string} theme - The theme to apply ('dark', 'light', or 'auto').
     */
    document.body.setAttribute('data-theme', theme);
    const container = document.querySelector('.container');
    const isDark =
      theme === 'dark' ||
      (theme === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.body.style.background = isDark ? '#181a1b' : '#f4f6fa';
    document.body.style.color = isDark ? '#f3f3f3' : '#222';
    container.style.background = isDark ? '#23272a' : '#fff';
    container.style.boxShadow = isDark
      ? '0 2px 8px rgba(0,0,0,0.15)'
      : '0 2px 8px rgba(0,0,0,0.07)';
  }

  function showFeedback(msg, isError = true) {
    /**
     * Displays feedback messages to the user.
     * @param {string} msg - The message to display.
     * @param {boolean} isError - Whether the message is an error message.
     */
    const feedback = document.getElementById('feedback');
    feedback.textContent = msg;
    feedback.style.color = isError ? '#d93025' : '#43a047';
    setTimeout(() => {
      feedback.textContent = '';
    }, 2000);
  }

  function renderEntries() {
    /**
     * Renders the saved sidebar entries in the options page.
     */
    chrome.storage.sync.get({ entries: [] }, ({ entries }) => {
      const list = document.getElementById('entriesList');
      list.innerHTML = '';
      if (!entries || entries.length === 0) {
        list.innerHTML =
          '<div style="color:#607d8b;text-align:center;padding:18px 0;">No saved sidebars yet.</div>';
        return;
      }
      entries.forEach((entry, idx) => {
        const row = document.createElement('div');
        row.className = 'entry-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.background =
          document.body.getAttribute('data-theme') === 'dark'
            ? '#2c3035'
            : '#f8fafc';
        row.style.borderRadius = '6px';
        row.style.padding = '10px 12px';
        row.style.marginBottom = '8px';
        row.style.border =
          document.body.getAttribute('data-theme') === 'dark'
            ? '1px solid #444'
            : '1px solid #e3e7ed';
        row.innerHTML = `
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${
                          document.body.getAttribute('data-theme') === 'dark'
                            ? '#f3f3f3'
                            : '#222'
                        }">${entry.name || 'Unnamed Entry'}</div>
                        <div style="font-size:0.97em;color:${
                          document.body.getAttribute('data-theme') === 'dark'
                            ? '#aaa'
                            : '#607d8b'
                        };overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${
          entry.url || 'No URL'
        }</div>
                    </div>
                    <button data-action="edit" data-idx="${idx}" title="Edit" style="background:none;border:none;color:#1976d2;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;"><span class="material-symbols-outlined">edit</span></button>
                    <button data-action="delete" data-idx="${idx}" title="Delete" style="background:none;border:none;color:#d93025;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;"><span class="material-symbols-outlined">delete</span></button>
                `;
        row.querySelector('[data-action="edit"]').onclick = () => {
          newName.value = entry.name;
          newUrl.value = entry.url;
          editingIdx = idx;
          addEntryBtn.innerHTML =
            '<span class="material-symbols-outlined">edit</span> Save';
        };
        row.querySelector('[data-action="delete"]').onclick = () => {
          if (confirm(`Delete "${entry.name}"?`)) {
            entries.splice(idx, 1);
            chrome.storage.sync.set({ entries }, renderEntries);
            showFeedback('Entry deleted!', false);
            if (editingIdx === idx) {
              newName.value = '';
              newUrl.value = '';
              editingIdx = null;
              addEntryBtn.innerHTML =
                '<span class="material-symbols-outlined">add</span> Add';
            }
          }
        };
        list.appendChild(row);
      });
    });
  }

  themeSelect.onchange = () => {
    chrome.storage.sync.set({ theme: themeSelect.value });
    applyTheme(themeSelect.value);
  };

  document.getElementById('clearEntriesBtn').onclick = () => {
    if (confirm('Are you sure you want to delete all saved sidebar entries?')) {
      chrome.storage.sync.set({ entries: [] }, () => {
        renderEntries();
        showFeedback('All sidebar entries cleared!', false);
      });
    }
  };

  addEntryBtn.onclick = () => {
    const name = newName.value.trim();
    const url = newUrl.value.trim();
    if (!name || !url) {
      showFeedback('Please enter both name and URL');
      return;
    }
    try {
      new URL(url);
    } catch {
      showFeedback('Please enter a valid URL (http/https)');
      return;
    }
    chrome.storage.sync.get({ entries: [] }, ({ entries }) => {
      if (editingIdx !== null) {
        entries[editingIdx] = { name, url };
        editingIdx = null;
        addEntryBtn.innerHTML =
          '<span class="material-symbols-outlined">add</span> Add';
        showFeedback('Entry updated!', false);
      } else {
        if (entries.some((e) => e.name === name)) {
          showFeedback('Name already exists');
          return;
        }
        entries.push({ name, url });
        showFeedback('Entry added!', false);
      }
      chrome.storage.sync.set({ entries }, renderEntries);
      newName.value = '';
      newUrl.value = '';
    });
  };

  chrome.storage.sync.get({ theme: 'auto' }, ({ theme }) => {
    themeSelect.value = theme;
    applyTheme(theme);
  });

  renderEntries();
});
