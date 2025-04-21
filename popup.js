const nameInput = document.getElementById('name');
const urlInput = document.getElementById('url');
const addBtn = document.getElementById('add');
const addBtnText = addBtn.querySelector('.text');
const entriesList = document.getElementById('entriesList');
const openBtn = document.getElementById('open');
const feedback = document.getElementById('feedback');

let editingIdx = null;
let selectedIdx = 0;

function showFeedback(msg, isError = true) {
    /**
     * Displays feedback message to the user.
     * @param {string} msg - The message to display.
     * @param {boolean} isError - Indicates if the message is an error (true) or success (false).
     */
    feedback.textContent = msg;
    feedback.className = 'feedback visible';
    feedback.style.color = isError ? '#d93025' : '#43a047';
    setTimeout(() => { feedback.className = 'feedback'; }, 2200);
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

function renderEntries(entries) {
    /**
     * Renders the list of entries in the UI.
     * @param {Array<object>} entries - An array of entry objects with name and url properties.
     */
    entriesList.innerHTML = '';
    if (entries.length === 0) return;
    entries.forEach((entry, idx) => {
        const row = document.createElement('div');
        row.className = 'entry-card' + (selectedIdx === idx ? ' selected' : '');
        row.dataset.idx = idx;
        row.innerHTML = `
            <div class="entry-info">
                <div class="entry-name">${entry.name}</div>
                <div class="entry-url">${entry.url}</div>
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
                renderEntries(entries);
            }
        };
        entriesList.appendChild(row);
    });
}

function loadEntries() {
    /**
     * Loads entries from Chrome storage and renders them.
     */
    chrome.storage.sync.get({ entries: [] }, ({ entries }) => {
        renderEntries(entries);
    });
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
    chrome.storage.sync.get({ entries: [] }, ({ entries }) => {
        if (editingIdx !== null) {
            entries[editingIdx] = { name, url };
            editingIdx = null;
            addBtnText.textContent = 'Add Entry';
            addBtn.querySelector('.material-symbols-outlined').textContent = 'save';
            showFeedback('Entry updated!', false);
        } else {
            if (entries.some(e => e.name === name)) {
                showFeedback('Name already exists');
                return;
            }
            entries.push({ name, url });
            selectedIdx = entries.length - 1;
            showFeedback('Entry added!', false);
        }
        chrome.storage.sync.set({ entries }, loadEntries);
        nameInput.value = '';
        urlInput.value = '';
    });
};

entriesList.onclick = (e) => {
    /**
     * Handles the click event on the entries list for actions like edit, delete, and open.
     */
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    chrome.storage.sync.get({ entries: [] }, ({ entries }) => {
        if (btn.dataset.action === 'edit') {
            nameInput.value = entries[idx].name;
            urlInput.value = entries[idx].url;
            editingIdx = idx;
            addBtnText.textContent = 'Save Changes';
            addBtn.querySelector('.material-symbols-outlined').textContent = 'edit';
            nameInput.focus();
        } else if (btn.dataset.action === 'delete') {
            if (confirm(`Delete "${entries[idx].name}"?`)) {
                entries.splice(idx, 1);
                chrome.storage.sync.set({ entries }, loadEntries);
                showFeedback('Entry deleted!', false);
                if (editingIdx === idx) {
                    nameInput.value = '';
                    urlInput.value = '';
                    editingIdx = null;
                    addBtnText.textContent = 'Add Entry';
                    addBtn.querySelector('.material-symbols-outlined').textContent = 'save';
                }
                if (selectedIdx >= entries.length) {
                    selectedIdx = Math.max(0, entries.length - 1);
                }
            }
        } else if (btn.dataset.action === 'open') {
            openSidebar(entries[idx]);
        }
    });
};

openBtn.onclick = () => {
    /**
     * Handles the click event of the open button to open the selected entry in the sidebar.
     */
    chrome.storage.sync.get({ entries: [] }, ({ entries }) => {
        if (entries.length === 0) {
            showFeedback('No entries available. Add one first!');
            return;
        }
        if (entries[selectedIdx]) {
            openSidebar(entries[selectedIdx]);
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    /**
     * Event listener for DOMContentLoaded to load entries and focus on the name input.
     */
    loadEntries();
    nameInput.focus();
});
