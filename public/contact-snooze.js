(function () {
  // Location configuration with snooze field IDs
  const LOCATION_CONFIG = {
    "5p53YW7HzzBidwP4ANYi": {
      snoozeFieldId: "lFH0oXwb1HRVHRTVEV0b",
      apiBase: "https://backend.leadconnectorhq.com",
    },
    // Nw2jglUnVxhwl6AwSb9x: {
    //   snoozeFieldId: "e66nNGVBWFKvZwGmzD10",
    //   apiBase: "https://backend.leadconnectorhq.com",
    // },
  };

  // Get current location ID
  const locMatch = window.location.pathname.match(/\/v2\/location\/([^\/]+)/);
  const currentLocation = locMatch?.[1];

  // Exit if not a supported location
  if (!currentLocation || !LOCATION_CONFIG[currentLocation]) {
    console.warn("[SNOOZE] Unsupported location, exiting");
    return;
  }

  const { snoozeFieldId, apiBase } = LOCATION_CONFIG[currentLocation];
  console.log("[SNOOZE] Initializing for location:", currentLocation);

  // Helper to await an element
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

  // API auth helper
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

  // Fetch contact ID from conversation
  async function getContactId() {
    const parts = window.location.pathname.split("/");
    const convId = parts[parts.lastIndexOf("conversations") + 1];
    const headers = await getHeaders();
    const convRes = await fetch(`${apiBase}/conversations/${convId}`, {
      headers,
    });
    return (await convRes.json()).contactId;
  }

  // Build & inject button + modal
  async function initSnoozeButton() {
    try {
      const btnGroup = await waitFor(".button-group.flex");
      console.log("[SNOOZE] Found button group");

      // Create Snooze button if not exists
      if (!document.getElementById("snooze-btn")) {
        const buttons = btnGroup.children;
        const deleteBtn = buttons[buttons.length - 2];

        const snoozeBtn = document.createElement("button");
        snoozeBtn.id = "snooze-btn";
        snoozeBtn.className =
          "flex items-center px-2.5 py-1 border border-gray-300 border-l-0";
        snoozeBtn.title = "Set Snooze Date";
        snoozeBtn.innerHTML = `
          <svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 5v5h4.5M10 2.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15z"
                  stroke="#667085" stroke-width="1.667"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;
        btnGroup.insertBefore(snoozeBtn, deleteBtn);
        console.log("[SNOOZE] Button inserted");
      }

      // Create modal if not exists
      if (!document.getElementById("snooze-modal")) {
        const modal = document.createElement("div");
        modal.id = "snooze-modal";
        modal.className =
          "fixed inset-0 bg-black bg-opacity-50 z-[9999] hidden items-center justify-center";
        modal.innerHTML = `
          <div class="modal-content bg-white rounded-lg shadow-xl w-80 relative">
            <div class="p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Snooze Until</h3>
              <input type="date" id="snooze-time"
                     class="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"/>
              <div class="flex justify-end space-x-3">
                <button id="cancel-snooze"
                        class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                  Cancel
                </button>
                <button id="submit-snooze"
                        class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md">
                  Set Snooze
                </button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(modal);
        console.log("[SNOOZE] Modal created");
      }

      return true;
    } catch (err) {
      console.error("[SNOOZE] Initialization error:", err);
      return false;
    }
  }

  // Main execution
  (async function main() {
    if (!(await initSnoozeButton())) return;

    const modal = document.getElementById("snooze-modal");
    const dateInput = document.getElementById("snooze-time");
    const cancelBtn = document.getElementById("cancel-snooze");
    const submitBtn = document.getElementById("submit-snooze");

    // Modal control functions
    const openModal = () => modal.classList.remove("hidden");
    const closeModal = () => modal.classList.add("hidden");

    // Setup modal behavior
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    cancelBtn.addEventListener("click", closeModal);

    // Snooze button click handler
    document
      .getElementById("snooze-btn")
      .addEventListener("click", async () => {
        try {
          const contactId = await getContactId();
          const headers = await getHeaders();
          const contactRes = await fetch(`${apiBase}/contacts/${contactId}`, {
            headers,
          });
          const customFields =
            (await contactRes.json()).contact.customFields || [];
          const existing = customFields.find((f) => f.id === snoozeFieldId);

          // Set min date to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dateInput.min = tomorrow.toISOString().split("T")[0];

          // Set existing value or clear
          dateInput.value = existing?.value || "";
          openModal();
        } catch (err) {
          console.error("[SNOOZE] Open error:", err);
          alert("Failed to open snooze modal:\n" + err.message);
        }
      });

    // Submit handler
    submitBtn.addEventListener("click", async () => {
      if (!dateInput.value) return alert("Please select a date");

      try {
        const contactId = await getContactId();
        const headers = await getHeaders();

        const payload = {
          customFields: [{ id: snoozeFieldId, field_value: dateInput.value }],
          dirty: true,
          skipTrigger: false,
        };

        const res = await fetch(`${apiBase}/contacts/${contactId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("API responded with " + res.status);

        alert("✅ Snooze date set successfully!");
        closeModal();
      } catch (err) {
        console.error("[SNOOZE] Save error:", err);
        alert("Failed to save snooze date:\n" + err.message);
      }
    });
  })();
})();
