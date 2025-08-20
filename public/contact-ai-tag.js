(function () {
  // Location configuration
  const LOCATION_IDS = ["5p53YW7HzzBidwP4ANYi", "Nw2jglUnVxhwl6AwSb9x"];

  // AI Tag configuration
  const AI_TAG = "AI";
  const addTagSVG = `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
  const removeTagSVG = `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.67 8H18a2 2 0 0 1 2 2v4.33"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M22 22 2 2"/><path d="M8 8H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 1.414-.586"/><path d="M9 13v2"/><path d="M9.67 4H12v2.33"/></svg>`;

  // Token store
  if (!window.GHL_TOKEN_STORE) {
    window.GHL_TOKEN_STORE = {
      capturedAuthToken: null,
      capturedTokenId: null,
    };
  }

  // Install fetch interceptor
  (function () {
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
      const [url, opts] = args;

      // Check if this is a GHL API request with headers
      if (url.includes("leadconnectorhq.com") && opts?.headers) {
        // Capture Authorization token
        if (
          opts.headers.Authorization &&
          opts.headers.Authorization.startsWith("Bearer ")
        ) {
          window.GHL_TOKEN_STORE.capturedAuthToken =
            opts.headers.Authorization.split(" ")[1];
          console.log("Captured Authorization token");
        }

        // Capture Token-Id
        if (opts.headers["Token-Id"] || opts.headers["token-id"]) {
          window.GHL_TOKEN_STORE.capturedTokenId =
            opts.headers["Token-Id"] || opts.headers["token-id"];
          console.log("Captured Token-Id");
        }
      }

      return origFetch.apply(this, args);
    };
  })();

  // State variables
  let isInitialized = false;
  let observer = null;
  let currentContactId = null;
  let tagCheckInterval = null;
  let currentLocation = null;
  let currentButtonState = null; // Track button state locally

  // Store event handlers for proper cleanup
  let eventHandlers = {
    aiTagBtn: null
  };

  // Helper functions
  function isConversationPage() {
    return /\/v2\/location\/[^/]+\/conversations\/[^/]+/.test(
      window.location.pathname
    );
  }

  function getCurrentLocation() {
    const locMatch = window.location.pathname.match(/\/v2\/location\/([^/]+)/);
    return locMatch ? locMatch[1] : null;
  }

  function shouldInitialize() {
    currentLocation = getCurrentLocation();
    const isSupportedLocation = LOCATION_IDS.includes(currentLocation);
    const hasTokens = window.GHL_TOKEN_STORE.capturedAuthToken && window.GHL_TOKEN_STORE.capturedTokenId;
    
    console.log("Current location:", currentLocation, "Supported:", isSupportedLocation, "Has tokens:", hasTokens);
    return isConversationPage() && isSupportedLocation && hasTokens;
  }

  function waitFor(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(iv);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(iv);
          reject(new Error("Timeout waiting for " + selector));
        }
      }, 300);
    });
  }

  async function getHeaders() {
    if (!window.GHL_TOKEN_STORE.capturedAuthToken || !window.GHL_TOKEN_STORE.capturedTokenId) {
      throw new Error("Tokens not captured yet");
    }
    return new Headers({
      Authorization: `Bearer ${window.GHL_TOKEN_STORE.capturedAuthToken}`,
      'Token-Id': window.GHL_TOKEN_STORE.capturedTokenId,
      Channel: "APP",
      Source: "WEB_USER",
      Version: "2021-07-28",
      "Content-Type": "application/json",
    });
  }

  async function getContactId() {
    const parts = location.pathname.split("/");
    const idx = parts.indexOf("conversations");
    const convId = parts[idx + 2];
    const headers = await getHeaders();
    const convRes = await fetch(
      `https://backend.leadconnectorhq.com/conversations/${convId}`,
      { headers }
    );
    return (await convRes.json()).contactId;
  }

  // AI Tag functionality
  async function createAITagButton() {
    try {
      const btnGroup = await waitFor(".button-group.flex");
      if (!document.getElementById('ai-tag-btn')) {
        const aiTagBtn = document.createElement('button');
        aiTagBtn.id = 'ai-tag-btn';
        aiTagBtn.className = 'flex items-center px-2.5 py-1 border border-gray-300 border-l-0';
        aiTagBtn.innerHTML = addTagSVG;
        aiTagBtn.title = "Toggle AI Tag";
        
        // Insert into button group
        const buttons = btnGroup.children;
        const deleteBtn = buttons[buttons.length - 2];
        btnGroup.insertBefore(aiTagBtn, deleteBtn);
        
        console.log("AI Tag button created");
      }
    } catch (err) {
      console.error("Error creating AI tag button:", err);
    }
  }

  async function updateAITagButtonState(contactId) {
    try {
      const button = document.getElementById('ai-tag-btn');
      if (!button) return;

      const hasTag = await contactHasAITag(contactId);
      button.innerHTML = hasTag ? removeTagSVG : addTagSVG;
      button.dataset.hasTag = hasTag;
      currentButtonState = hasTag; // Update our local state
      console.log("AI Tag button state updated:", hasTag ? "Tag present" : "Tag not present");
    } catch (error) {
      console.error("Error updating AI tag button:", error);
    }
  }

  async function contactHasAITag(contactId) {
    try {
      const headers = await getHeaders();
      const res = await fetch(
        `https://services.leadconnectorhq.com/contacts/${contactId}`,
        { headers }
      );
      const contact = await res.json();
      
      // Check for both "AI" and "ai" (case insensitive)
      const tags = contact.contact?.tags || [];
      const hasAITag = tags.some(tag => 
        tag.toLowerCase() === AI_TAG.toLowerCase()
      );
      
      return hasAITag;
    } catch (error) {
      console.error("Error checking AI tag:", error);
      return false;
    }
  }

  async function toggleAITag(contactId) {
    try {
      const button = document.getElementById('ai-tag-btn');
      if (!button) return;

      const hasTag = button.dataset.hasTag === 'true';
      button.disabled = true;

      // Optimistic UI update - change the button immediately
      button.innerHTML = hasTag ? addTagSVG : removeTagSVG;
      button.dataset.hasTag = !hasTag;
      currentButtonState = !hasTag;

      if (hasTag) {
        await removeAITag(contactId);
      } else {
        await addAITag(contactId);
      }

      // Verify the change was successful
      await updateAITagButtonState(contactId);
    } catch (error) {
      console.error("Error toggling AI tag:", error);
      
      // Revert the UI if the operation failed
      const button = document.getElementById('ai-tag-btn');
      if (button) {
        button.innerHTML = currentButtonState ? removeTagSVG : addTagSVG;
        button.dataset.hasTag = currentButtonState;
      }
      
      alert("Failed to toggle AI tag: " + error.message);
    } finally {
      const button = document.getElementById('ai-tag-btn');
      if (button) button.disabled = false;
    }
  }

  async function addAITag(contactId) {
    const headers = await getHeaders();
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}/tags`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ tags: [AI_TAG] })
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to add tag: ${res.status} - ${errorText}`);
    }
    console.log("AI Tag added successfully");
  }

  async function removeAITag(contactId) {
    const headers = await getHeaders();
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}/tags`,
      {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ tags: [AI_TAG] })
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to remove tag: ${res.status} - ${errorText}`);
    }
    console.log("AI Tag removed successfully");
  }

  // Setup AI Tag button handler
  function setupAITagButtonHandler() {
    const aiTagBtn = document.getElementById('ai-tag-btn');
    if (!aiTagBtn) return;

    // Remove existing listener
    if (eventHandlers.aiTagBtn) {
      aiTagBtn.removeEventListener('click', eventHandlers.aiTagBtn);
    }

    // Create new handler
    eventHandlers.aiTagBtn = async () => {
      try {
        const contactId = await getContactId();
        await toggleAITag(contactId);
      } catch (error) {
        console.error('Error handling AI tag button:', error);
      }
    };

    // Attach new listener
    aiTagBtn.addEventListener('click', eventHandlers.aiTagBtn);
    console.log("AI Tag button handler set up");
  }

  // Start polling for tag status
  function startTagPolling(contactId) {
    // Clear any existing interval
    if (tagCheckInterval) {
      clearInterval(tagCheckInterval);
    }
    
    // Set up new interval to check tag status every 5 seconds
    tagCheckInterval = setInterval(async () => {
      try {
        console.log("Polling tag status...");
        await updateAITagButtonState(contactId);
      } catch (error) {
        console.error('Error in tag polling:', error);
      }
    }, 5000);
    
    console.log("Started tag status polling (every 5 seconds)");
  }

  // Stop polling for tag status
  function stopTagPolling() {
    if (tagCheckInterval) {
      clearInterval(tagCheckInterval);
      tagCheckInterval = null;
      console.log("Stopped tag status polling");
    }
  }

  // SPA Navigation Handling
  function handleSPANavigation() {
    if (shouldInitialize()) {
      if (!isInitialized) {
        console.log("Initializing AI Tag button for location:", currentLocation);
        initPage();
      }
    } else {
      if (isInitialized) {
        console.log("Cleaning up AI Tag button (not on supported location)");
        cleanupPage();
      }
    }
  }

  function initSPAObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      handleSPANavigation();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    console.log("SPA observer initialized");
  }

  function initHistoryObserver() {
    const pushState = history.pushState;
    history.pushState = function () {
      pushState.apply(history, arguments);
      handleSPANavigation();
    };

    const replaceState = history.replaceState;
    history.replaceState = function () {
      replaceState.apply(history, arguments);
      handleSPANavigation();
    };

    window.addEventListener("popstate", handleSPANavigation);
    
    console.log("History observer initialized");
  }

  // Page Initialization and Cleanup
  async function initPage() {
    try {
      // Initialize AI Tag button
      await createAITagButton();
      setupAITagButtonHandler();
      
      // Set initial AI Tag button state
      currentContactId = await getContactId();
      await updateAITagButtonState(currentContactId);
      
      // Start polling for tag status
      startTagPolling(currentContactId);
      
      isInitialized = true;
      console.log("AI Tag button initialized for conversation page");
    } catch (err) {
      console.error("Initialization failed:", err);
      isInitialized = false;
      
      // Retry initialization after a delay if tokens weren't ready
      if (err.message.includes("Tokens not captured")) {
        console.log("Retrying initialization in 2 seconds...");
        setTimeout(handleSPANavigation, 2000);
      }
    }
  }

  function cleanupPage() {
    // Remove event listeners
    const aiTagBtn = document.getElementById('ai-tag-btn');

    // AI Tag button
    if (aiTagBtn && eventHandlers.aiTagBtn) {
      aiTagBtn.removeEventListener('click', eventHandlers.aiTagBtn);
    }

    // Reset event handlers
    eventHandlers = {
      aiTagBtn: null
    };

    // Stop polling
    stopTagPolling();
    
    // Remove elements
    if (aiTagBtn) aiTagBtn.remove();

    isInitialized = false;
    currentContactId = null;
    currentButtonState = null;
    console.log("Cleaned up UI elements");
  }

  // Main Initialization
  function init() {
    console.log("Starting AI Tag button initialization...");
    console.log("Supported location IDs:", LOCATION_IDS);
    initSPAObserver();
    initHistoryObserver();
    handleSPANavigation(); // Initial check
    
    // Also check for tokens periodically
    const tokenCheckInterval = setInterval(() => {
      if (window.GHL_TOKEN_STORE.capturedAuthToken && window.GHL_TOKEN_STORE.capturedTokenId) {
        console.log("Tokens captured via periodic check");
        handleSPANavigation();
        clearInterval(tokenCheckInterval);
      }
    }, 1000);
    
    // Stop checking after 30 seconds
    setTimeout(() => {
      clearInterval(tokenCheckInterval);
      if (!window.GHL_TOKEN_STORE.capturedAuthToken || !window.GHL_TOKEN_STORE.capturedTokenId) {
        console.log("Token capture timeout - please interact with the page to generate API requests");
      }
    }, 30000);
  }

  // Start the script
  init();
})();
