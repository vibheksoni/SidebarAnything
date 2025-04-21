const sidebarTitle = document.getElementById('sidebarTitle');
const sidebarEntries = document.getElementById('sidebarEntries');
const reloadBtn = document.getElementById('reloadBtn');
const copyTextBtn = document.getElementById('copyTextBtn');
const sidebarFrame = document.getElementById('sidebarFrame');

function loadSidebarEntries(selectedUrl) {
    /**
     * Loads sidebar entries from storage and populates the dropdown.
     * @param {string} selectedUrl The URL to select in the dropdown.
     */
    chrome.storage.sync.get({ entries: [] }, ({ entries }) => {
        sidebarEntries.innerHTML = '';
        let selectedIdx = 0;
        entries.forEach((entry, idx) => {
            const opt = document.createElement('option');
            opt.value = entry.url;
            opt.textContent = entry.name;
            if (entry.url === selectedUrl) selectedIdx = idx;
            sidebarEntries.appendChild(opt);
        });
        sidebarEntries.selectedIndex = selectedIdx;
        if (entries[selectedIdx]) {
            sidebarTitle.textContent = entries[selectedIdx].name;
        }
    });
}

function setSidebarUrl(url) {
    /**
     * Sets the URL of the sidebar iframe and handles potential errors.
     * @param {string} url {string} The URL to set for the sidebar.
     */
    let errorMsg = document.getElementById('errorMessage');
    if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.id = 'errorMessage';
        errorMsg.style.display = 'none';
        errorMsg.className = 'error-message';
        document.body.appendChild(errorMsg);
    }

    errorMsg.style.display = 'none';
    const readerContainer = document.getElementById('readerContainer');
    if (readerContainer) {
        readerContainer.style.display = 'none';
    }
    const existingFrames = document.querySelectorAll('iframe');
    existingFrames.forEach(frame => {
        if (frame.id === 'sidebarFrame' && frame.parentNode) {
            frame.parentNode.removeChild(frame);
        }
    });

    const newFrame = document.createElement('iframe');
    newFrame.id = 'sidebarFrame';
    newFrame.style.border = 'none';
    newFrame.style.width = '100%';
    newFrame.style.height = 'calc(100vh - 44px)';
    newFrame.setAttribute('allow', 'clipboard-read; clipboard-write');
    newFrame.src = url;

    document.body.appendChild(newFrame);
    sidebarFrame = newFrame;

    chrome.storage.local.set({ sidebarUrl: url });
    sidebarFrame.onerror = () => handleFrameError(url);
}

function handleFrameError(url) {
    /**
     * Handles errors that occur when loading the iframe.
     * @param {string} url {string} The URL that failed to load.
     */
    const errorMsg = document.getElementById('errorMessage');
    sidebarFrame.style.display = 'none';
    errorMsg.style.display = 'flex';
    errorMsg.innerHTML = `
                <div>
                        <p>This site cannot be displayed in the sidebar.</p>
                        <p>It may have X-Frame-Options that prevent embedding.</p>
                        <div class="error-actions">
                                <button id="bypassRestriction">Reader View</button>
                                <button id="openInTab">Open in New Tab</button>
                        </div>
                </div>
        `;
    document.getElementById('openInTab').onclick = () => {
        window.open(url, '_blank');
    };
    document.getElementById('bypassRestriction').onclick = () => {
        tryBypass(url);
    };
}

function tryBypass(url) {
    /**
     * Attempts to bypass X-Frame-Options restrictions by extracting content.
     * @param {string} url {string} The URL to bypass restrictions for.
     */
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.innerHTML = `
                <div>
                        <p>Loading Reader View...</p>
                        <div class="loading-spinner"></div>
                </div>
        `;

    chrome.runtime.sendMessage(
        { action: "bypassFrameRestriction", url },
        (response) => {
            if (response && response.success && response.data) {
                displayExtractedContent(response.data, url);
            } else {
                errorMsg.innerHTML = `
                                        <div>
                                                <p>Unable to load Reader View.</p>
                                                <p>${response?.error || 'Unknown error'}</p>
                                                <button id="openInTab">Open in New Tab</button>
                                        </div>
                                `;
                document.getElementById('openInTab').onclick = () => {
                    window.open(url, '_blank');
                };
            }
        }
    );
}

function displayExtractedContent(data, originalUrl) {
    /**
     * Displays the extracted content in reader view.
     * @param {object} data {object} The extracted content data.
     * @param {string} originalUrl {string} The original URL of the content.
     */
    let readerContainer = document.getElementById('readerContainer');
    if (!readerContainer) {
        readerContainer = document.createElement('div');
        readerContainer.id = 'readerContainer';
        document.body.appendChild(readerContainer);
    }

    sidebarFrame.style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    readerContainer.style.display = 'block';

    readerContainer.innerHTML = `
                <div class="reader-header">
                        <span class="reader-badge">Reader View</span>
                        <h1>${data.title}</h1>
                        <div class="reader-source">Source: <a href="${originalUrl}" target="_blank">${originalUrl}</a></div>
                </div>
                <div class="reader-content">
                        <style>
                                ${data.styles}
                                /* Override styles for readability */
                                body, html { font-size: 16px; line-height: 1.5; }
                                img { max-width: 100%; height: auto; }
                        </style>
                        ${data.content}
                </div>
                <div class="reader-footer">
                        <button id="exitReader">Exit Reader View</button>
                </div>
        `;

    document.getElementById('exitReader').addEventListener('click', () => {
        readerContainer.style.display = 'none';
        handleFrameError(originalUrl);
    });

    fixRelativeUrls(readerContainer, data.baseUrl);
}

function fixRelativeUrls(container, baseUrl) {
    /**
     * Fixes relative URLs in the extracted content.
     * @param {HTMLElement} container {HTMLElement} The container element.
     * @param {string} baseUrl {string} The base URL to use for fixing relative URLs.
     */
    container.querySelectorAll('a').forEach(link => {
        if (link.href && link.href.startsWith('/')) {
            link.href = baseUrl + link.href;
        }
        link.target = '_blank';
    });

    container.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.startsWith('/')) {
            img.src = baseUrl + img.src;
        }
    });
}

chrome.storage.local.get(['sidebarUrl', 'sidebarName'], ({ sidebarUrl, sidebarName }) => {
    setSidebarUrl(sidebarUrl || 'about:blank');
    sidebarTitle.textContent = sidebarName || '';
    loadSidebarEntries(sidebarUrl);
});

sidebarEntries.addEventListener('change', () => {
    const url = sidebarEntries.value;
    const name = sidebarEntries.options[sidebarEntries.selectedIndex].textContent;
    setSidebarUrl(url);
    sidebarTitle.textContent = name;
});

reloadBtn.addEventListener('click', () => {
    const currentSrc = sidebarFrame.src;
    sidebarFrame.src = 'about:blank';
    setTimeout(() => {
        sidebarFrame.src = currentSrc;
    }, 50);
});

document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open('options.html', '_blank');
            }
        };
    }

    chrome.storage.local.get(['sidebarUrl'], ({ sidebarUrl }) => {
        loadSidebarEntries(sidebarUrl);
    });
});

function copyTextFromSidebar() {
    /**
     * Copies text from the iframe or reader view to clipboard.
     */
    const readerContainer = document.getElementById('readerContainer');
    if (readerContainer && readerContainer.style.display !== 'none') {
        const selection = window.getSelection();
        const selectedText = selection.toString();

        if (selectedText) {
            copyTextToClipboard(selectedText);
        } else {
            showCopyFeedback('Please select some text first', true);
        }
    } else {
        extractTextFromIframe();
    }
}

function extractTextFromIframe() {
    /**
     * Extract selected text from the iframe content.
     */
    try {
        const iframeDoc = sidebarFrame.contentDocument || sidebarFrame.contentWindow.document;
        const selection = iframeDoc.getSelection();
        const selectedText = selection.toString();

        if (selectedText) {
            copyTextToClipboard(selectedText);
        } else {
            makeIframeContentSelectable(iframeDoc);

            const markdownContent = extractMarkdownContent(iframeDoc);
            if (markdownContent) {
                copyTextToClipboard(markdownContent);
            } else {
                showCopyFeedback('Please select some text first', true);
            }
        }
    } catch (error) {
        const frameUrl = sidebarFrame.src;
        chrome.tabs.query({ url: frameUrl }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "extractSelectedText",
                    forceSelectable: true
                }, (response) => {
                    if (response && response.selectedText) {
                        copyTextToClipboard(response.selectedText);
                    } else {
                        chrome.runtime.sendMessage({
                            action: "getSelectedText",
                            url: frameUrl
                        }, (response) => {
                            if (response && response.selectedText) {
                                copyTextToClipboard(response.selectedText);
                            } else {
                                alternativeCopyMethod();
                            }
                        });
                    }
                });
            } else {
                alternativeCopyMethod();
            }
        });
    }
}

function alternativeCopyMethod() {
    /**
     * Alternative method to extract text when regular methods fail
     */
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'copy-feedback';
    feedbackEl.innerHTML = `
        <div style="position:fixed; top:50px; left:50%; transform:translateX(-50%); 
                                background:#333; color:#fff; padding:12px 20px; border-radius:5px; 
                                z-index:1000; font-size:14px; text-align:center; max-width:80%;">
            <p>Please use keyboard shortcut Ctrl+C (Cmd+C on Mac) after selecting text</p>
            <button id="dismissBtn" style="background:#4285f4; border:none; color:#fff; 
                                                                        padding:5px 10px; border-radius:3px; margin-top:5px; 
                                                                        cursor:pointer;">Dismiss</button>
        </div>
    `;

    document.body.appendChild(feedbackEl);
    document.getElementById('dismissBtn').addEventListener('click', () => {
        document.body.removeChild(feedbackEl);
    });

    setTimeout(() => {
        if (document.body.contains(feedbackEl)) {
            document.body.removeChild(feedbackEl);
        }
    }, 5000);
}

function copyTextToClipboard(text) {
    /**
     * Copies text to clipboard using a fallback method if the Clipboard API is blocked
     * @param {string} text {string} The text to copy to clipboard
     */
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'clipboard-write' })
            .then(permissionStatus => {
                if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
                    useClipboardAPI(text);
                } else {
                    fallbackCopyTextToClipboard(text);
                }
            })
            .catch(error => {
                useClipboardAPI(text);
            });
    } else {
        useClipboardAPI(text);
    }
}

function useClipboardAPI(text) {
    /**
     * Attempts to use the Clipboard API to copy text
     * @param {string} text {string} The text to copy to clipboard
     */
    try {
        navigator.clipboard.writeText(text)
            .then(() => {
                showCopyFeedback('Text copied to clipboard!', false);
            })
            .catch(err => {
                fallbackCopyTextToClipboard(text);
            });
    } catch (err) {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    /**
     * Fallback method to copy text to clipboard using document.execCommand
     * @param {string} text {string} The text to copy to clipboard
     */
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, textArea.value.length);
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            showCopyFeedback('Text copied to clipboard!', false);
        } else {
            showCopyFeedback('Failed to copy. Try using keyboard shortcut Ctrl+C/Cmd+C instead.', true);
        }
    } catch (err) {
        showCopyFeedback('Failed to copy. Try using keyboard shortcut Ctrl+C/Cmd+C instead.', true);
    }
}

function showCopyFeedback(message, isError) {
    /**
     * Shows feedback message when copying
     * @param {string} message {string} The message to show
     * @param {boolean} isError {boolean} Whether it's an error message
     */
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'copy-feedback';
    feedbackEl.innerHTML = `
        <div style="position:fixed; top:50px; left:50%; transform:translateX(-50%); 
                                background:${isError ? '#d93025' : '#43a047'}; color:#fff; 
                                padding:8px 16px; border-radius:4px; z-index:1000; 
                                font-size:14px;">${message}</div>
    `;

    document.body.appendChild(feedbackEl);

    setTimeout(() => {
        document.body.removeChild(feedbackEl);
    }, 2000);
}

copyTextBtn.addEventListener('click', copyTextFromSidebar);

function makeIframeContentSelectable(doc) {
    /**
     * Makes content in the iframe selectable by injecting CSS and removing event handlers
     * @param {Document} doc {Document} The iframe document
     */
    try {
        const style = doc.createElement('style');
        style.textContent = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                cursor: auto !important;
            }
            
            /* Target common markdown renderers */
            .markdown-body, .markdown-content, .md-content, 
            [data-testid="renderedMarkdown"], .rendered-markdown,
            .markdown, .markdown-renderer, article, .article-content,
            .post-content, .post-body, .content-body,
            [class*="markdown"], [class*="Markdown"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                pointer-events: auto !important;
            }
            
            /* Remove overlay elements that might block selection */
            [class*="overlay"], [class*="Overlay"], 
            [class*="blocker"], [class*="Blocker"],
            [class*="copy-protection"], [class*="CopyProtection"] {
                display: none !important;
            }
        `;
        doc.head.appendChild(style);

        try {
            Array.from(doc.querySelectorAll('*')).forEach(element => {
                element.oncopy = null;
                element.oncut = null;
                element.onselectstart = null;
                element.oncontextmenu = null;
                element.onmousedown = null;
                element.ondragstart = null;
            });
        } catch (e) {
            console.log('Error removing event listeners', e);
        }
    } catch (e) {
        console.log('Error making content selectable', e);
    }
}

function extractMarkdownContent(doc) {
    /**
     * Extracts markdown content from common markdown containers
     * @param {Document} doc {Document} The iframe document
     * @returns {string|null} The extracted markdown content or null if none found
     */
    try {
        const markdownSelectors = [
            '.markdown-body', '.markdown-content', '.md-content',
            '[data-testid="renderedMarkdown"]', '.rendered-markdown',
            '.markdown', '.markdown-renderer', 'article', '.article-content',
            '.post-content', '.post-body', '.content-body',
            '[class*="markdown"]', '[class*="Markdown"]'
        ];

        for (const selector of markdownSelectors) {
            const elements = doc.querySelectorAll(selector);
            if (elements && elements.length > 0) {
                return elements[0].innerText || elements[0].textContent;
            }
        }

        return null;
    } catch (e) {
        console.log('Error extracting markdown content', e);
        return null;
    }
}
