(async function () {
  // Location configuration with snooze field IDs
  const LOCATION_CONFIG = {
    "5p53YW7HzzBidwP4ANYi": "lFH0oXwb1HRVHRTVEV0b",
    // "Nw2jglUnVxhwl6AwSb9x": "e66nNGVBWFKvZwGmzD10"
  };

  // State variables
  let isInitialized = false;
  let observer = null;
  let currentLocation = null;
  let currentFieldId = null;

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
    const newLocation = getCurrentLocation();
    if (newLocation !== currentLocation) {
      currentLocation = newLocation;
      currentFieldId = LOCATION_CONFIG[currentLocation];
    }
    return isConversationPage() && currentFieldId;
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
    const vue = document.querySelector("#app")?.__vue__;
    const auth = vue?.authUser;
    if (!auth) throw new Error("authUser missing");
    return new Headers({
      Authorization: `Bearer ${auth.authToken}`,
      "x-api-key": auth.apiKey,
      Channel: "APP",
      Source: "WEB_USER",
      Version: "2021-07-28",
      "Content-Type": "application/json",
    });
  }

  async function getContactId() {
    const parts = window.location.pathname.split("/");
    const convId = parts[parts.lastIndexOf("conversations") + 1];
    const headers = await getHeaders();
    const convRes = await fetch(
      `https://backend.leadconnectorhq.com/conversations/${convId}`,
      { headers }
    );
    return (await convRes.json()).contactId;
  }

  // Snooze Button and Modal Management - PRESERVING ORIGINAL STYLING
  async function createSnoozeButton() {
    try {
      const btnGroup = await waitFor(".button-group.flex");

      // Avoid double-inject
      if (!document.getElementById("snooze-btn")) {
        // Get the second last button (which should be the delete button)
        const buttons = btnGroup.children;
        const deleteBtn = buttons[buttons.length - 2];

        // Create Snooze button - EXACTLY AS IN YOUR ORIGINAL CODE
        const snoozeBtn = document.createElement("button");
        snoozeBtn.id = "snooze-btn";
        snoozeBtn.className =
          "flex items-center px-2.5 py-1 border border-gray-300 border-l-0";
        snoozeBtn.innerHTML = `
          <svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 5v5h4.5M10 2.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15z"
                  stroke="#667085" stroke-width="1.667"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;

        btnGroup.insertBefore(snoozeBtn, deleteBtn);
      }
    } catch (err) {
      console.error("Error creating snooze button:", err);
    }
  }

  function createSnoozeModal() {
    // Avoid double-inject
    if (!document.getElementById("snooze-modal")) {
      const modal = document.createElement("div");
      modal.id = "snooze-modal";
      // PRESERVING YOUR ORIGINAL STYLING
      Object.assign(modal.style, {
        display: "none",
        position: "fixed",
        inset: "0",
        background: "rgba(0,0,0,0.5)",
        zIndex: "9999",
        alignItems: "center",
        justifyContent: "center",
      });

      // PRESERVING YOUR ORIGINAL MODAL HTML
      modal.innerHTML = `
        <div class="modal-content bg-white rounded-lg shadow-xl w-80" style="position:relative">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Snooze For</h3>
            <input type="date" id="snooze-time"
                   class="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"/>
            <div class="flex justify-end space-x-3">
              <button id="cancel-snooze"
                      class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                Close
              </button>
              <button id="submit-snooze"
                      class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md">
                Submit
              </button>
            </div>
          </div>
        </div>`;

      document.body.appendChild(modal);
    }
  }

  function setupSnoozeModalHandlers() {
    const modal = document.getElementById("snooze-modal");
    const dateInput = document.getElementById("snooze-time");
    const cancelBtn = document.getElementById("cancel-snooze");
    const submitBtn = document.getElementById("submit-snooze");

    // PRESERVING YOUR ORIGINAL MODAL CONTROL FUNCTIONS
    const openModal = () => (modal.style.display = "flex");
    const closeModal = () => (modal.style.display = "none");

    // PRESERVING YOUR ORIGINAL EVENT HANDLERS
    modal
      .querySelector(".modal-content")
      .addEventListener("click", (e) => e.stopPropagation());
    modal.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);

    document
      .getElementById("snooze-btn")
      .addEventListener("click", async () => {
        try {
          const contactId = await getContactId();
          const headers = await getHeaders();
          const contactRes = await fetch(
            `https://backend.leadconnectorhq.com/contacts/${contactId}`,
            { headers }
          );
          const customFields =
            (await contactRes.json()).contact.customFields || [];
          const existing = customFields.find((f) => f.id === currentFieldId);

          dateInput.value = existing?.value || "";
          openModal();
        } catch (err) {
          console.error("Error opening snooze modal:", err);
          alert("Failed to open snooze modal");
        }
      });

    submitBtn.addEventListener("click", async () => {
      if (!dateInput.value) return alert("Please select a date");

      try {
        const contactId = await getContactId();
        const headers = await getHeaders();

        const payload = {
          customFields: [{ id: currentFieldId, field_value: dateInput.value }],
          dirty: true,
          skipTrigger: false,
        };

        const res = await fetch(
          `https://backend.leadconnectorhq.com/contacts/${contactId}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) throw new Error("API responded with " + res.status);

        alert("✅ Snooze set!");
        closeModal();
      } catch (err) {
        console.error("Error saving snooze:", err);
        alert("Failed to save snooze:\n" + err.message);
      }
    });
  }

  // SPA Navigation Handling
  function handleSPANavigation() {
    if (shouldInitialize()) {
      if (!isInitialized) {
        initPage();
      }
    } else {
      if (isInitialized) {
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
  }

  // Page Initialization and Cleanup
  async function initPage() {
    try {
      await createSnoozeButton();
      createSnoozeModal();
      setupSnoozeModalHandlers();
      isInitialized = true;
      console.log("Snooze button initialized for conversation page");
    } catch (err) {
      console.error("Initialization failed:", err);
      isInitialized = false;
    }
  }

  function cleanupPage() {
    const snoozeBtn = document.getElementById("snooze-btn");
    if (snoozeBtn) snoozeBtn.remove();

    const modal = document.getElementById("snooze-modal");
    if (modal) modal.remove();

    isInitialized = false;
    console.log("Cleaned up snooze button from non-conversation page");
  }

  // Main Initialization
  function init() {
    initSPAObserver();
    initHistoryObserver();
    handleSPANavigation(); // Initial check
  }

  // Start the script
  init();
})();
