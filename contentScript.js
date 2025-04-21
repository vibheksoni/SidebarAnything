chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  /**
   * Listens for messages from the extension and extracts content from the page.
   * @param {object} request - The request object from the extension.
   * @param {object} sender - The sender object from the extension.
   * @param {function} sendResponse - The function to send the response back to the extension.
   */
  if (request.action === "extractContent") {
    const pageContent = {
      title: document.title,
      content: document.documentElement.outerHTML,
      url: window.location.href,
      baseUrl: window.location.origin,
    };

    sendResponse(pageContent);
    return true;
  }

  if (request.action === "extractSelectedText") {
    /**
     * Extracts the currently selected text from the page.
     * @param {object} request - The request object from the extension.
     */
    const selection = window.getSelection();
    let selectedText = selection ? selection.toString() : "";

    if (!selectedText || request.forceSelectable) {
      const style = document.createElement("style");
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
      document.head.appendChild(style);

      document.querySelectorAll("*").forEach((element) => {
        element.oncopy = null;
        element.oncut = null;
        element.onselectstart = null;
        element.oncontextmenu = null;
        element.onmousedown = null;
        element.ondragstart = null;
      });
    }

    if (!selectedText) {
      setTimeout(() => {
        selectedText = window.getSelection().toString();

        if (!selectedText) {
          const markdownElements = document.querySelectorAll(
            ".markdown-body, .markdown-content, .md-content, " +
              '[data-testid="renderedMarkdown"], .rendered-markdown, ' +
              ".markdown, .markdown-renderer, article, .article-content, " +
              ".post-content, .post-body, .content-body, " +
              '[class*="markdown"], [class*="Markdown"]'
          );

          if (markdownElements.length > 0) {
            selectedText =
              markdownElements[0].innerText ||
              markdownElements[0].textContent;
          }
        }

        sendResponse({ selectedText });
      }, 100);
      return true;
    }

    sendResponse({ selectedText });
    return true;
  }
});
