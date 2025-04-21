async function initializeExtension() {
  /**
   * Initializes the Sidebar Anything extension.
   */
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {}

  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  await setupHeaderModificationRules();
}

async function handleRuntimeMessage(request, sender, sendResponse) {
  /**
   * Handles runtime messages for the extension.
   * @param {object} request - The request object.
   * @param {object} sender - The sender object.
   * @param {function} sendResponse - The function to send a response.
   * @returns {boolean} - True if the message was handled, false otherwise.
   */
  if (request.action === "bypassFrameRestriction") {
    try {
      const result = await bypassFrameRestriction(request.url);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (request.action === "getSelectedText") {
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (activeTab) {
        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "extractSelectedText" },
          (response) => {
            sendResponse(response);
          }
        );
        return true;
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  return false;
}

async function setupHeaderModificationRules() {
  /**
   * Sets up header modification rules to bypass X-Frame-Options.
   */
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [9999],
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: 9999,
          priority: 1,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "content-security-policy", operation: "remove" },
              { header: "x-frame-options", operation: "remove" },
              { header: "frame-options", operation: "remove" },
              { header: "frame-ancestors", operation: "remove" },
              { header: "X-Content-Type-Options", operation: "remove" },
              {
                header: "access-control-allow-origin",
                operation: "set",
                value: "*",
              },
            ],
          },
          condition: {
            resourceTypes: ["main_frame", "sub_frame"],
          },
        },
      ],
    });
  } catch (error) {}
}

async function bypassFrameRestriction(url) {
  /**
   * Legacy bypass function - keep for compatibility with existing code.
   * @param {string} url - The URL to bypass frame restrictions for.
   * @returns {object} - An object indicating success or failure.
   */
  try {
    return {
      success: true,
      message:
        "Using declarativeNetRequest for bypass - direct iframe loading should work",
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

initializeExtension();

chrome.runtime.onInstalled.addListener(async () => {
  await setupHeaderModificationRules();
});
