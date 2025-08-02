(async function () {
  const EXPECTED_LOCATION = ["5p53YW7HzzBidwP4ANYi"];
  const FIELD_ID = "lFH0oXwb1HRVHRTVEV0b";
  const API_BASE = "https://backend.leadconnectorhq.com";

  // 1. Route check
  const locMatch = window.location.pathname.match(/\/v2\/location\/([^\/]+)/);
  if (!locMatch || !EXPECTED_LOCATION.includes(locMatch[1])) {
    console.warn("[SNOOZE] Wrong location, exiting");
    return;
  }
  console.log("[SNOOZE] Location matched:", locMatch[1]);

  // 2. Helper to await an element
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

  // 3. API auth helper
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

  // 4. Build & inject button + modal once button bar is ready
  try {
    const btnGroup = await waitFor(".button-group.flex");
    console.log("[SNOOZE] Found button group");

    // Avoid double-inject
    if (!document.getElementById("snooze-btn")) {
      // Adjust existing Delete button styling
      // const deleteBtn = btnGroup.lastElementChild;
      const buttons = btnGroup.children;
      const deleteBtn = buttons[buttons.length - 2];
      deleteBtn.classList.remove("rounded-r-md", "mr-2");

      // Create Snooze button
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
      // deleteBtn.classList.add("border-l-0", "rounded-r-md", "mr-2");

      console.log("[SNOOZE] Snooze button inserted");
    }

    // Inject modal once
    if (!document.getElementById("snooze-modal")) {
      const modal = document.createElement("div");
      modal.id = "snooze-modal";
      Object.assign(modal.style, {
        display: "none",
        position: "fixed",
        inset: "0",
        background: "rgba(0,0,0,0.5)",
        zIndex: "9999",
        alignItems: "center",
        justifyContent: "center",
      });
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
      console.log("[SNOOZE] Modal appended");
    }

    // Grab refs
    const modal = document.getElementById("snooze-modal");
    const dateInput = modal.querySelector("#snooze-time");
    const cancelBtn = modal.querySelector("#cancel-snooze");
    const submitBtn = modal.querySelector("#submit-snooze");

    // Show/hide helpers
    const openModal = () => (modal.style.display = "flex");
    const closeModal = () => (modal.style.display = "none");

    // Prevent backdrop clicks from closing when clicking inside content
    modal
      .querySelector(".modal-content")
      .addEventListener("click", (e) => e.stopPropagation());
    modal.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);

    // Button click: fetch contact, prefill date, open modal
    document
      .getElementById("snooze-btn")
      .addEventListener("click", async () => {
        try {
          const parts = window.location.pathname.split("/");
          const convId = parts[parts.lastIndexOf("conversations") + 1];
          const headers = await getHeaders();
          const convRes = await fetch(`${API_BASE}/conversations/${convId}`, {
            headers,
          });
          const contactId = (await convRes.json()).contactId;
          const contactRes = await fetch(`${API_BASE}/contacts/${contactId}`, {
            headers,
          });
          const customFields =
            (await contactRes.json()).contact.customFields || [];
          const existing = customFields.find((f) => f.id === FIELD_ID);

          dateInput.value = existing?.value || "";
          openModal();
        } catch (err) {
          console.error("[SNOOZE] Open error:", err);
          alert("Failed to open snooze modal:\n" + err.message);
        }
      });

    // Submit click: update custom field
    submitBtn.addEventListener("click", async () => {
      if (!dateInput.value) return alert("Please select a date");
      try {
        // reuse convId fetch
        const parts = window.location.pathname.split("/");
        const convId = parts[parts.lastIndexOf("conversations") + 1];
        const headers = await getHeaders();
        const convRes = await fetch(`${API_BASE}/conversations/${convId}`, {
          headers,
        });
        const contactId = (await convRes.json()).contactId;

        const payload = {
          customFields: [{ id: FIELD_ID, field_value: dateInput.value }],
          dirty: true,
          skipTrigger: false,
        };
        const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Status " + res.status);

        alert("✅ Snooze set!");
        closeModal();
      } catch (err) {
        console.error("[SNOOZE] Save error:", err);
        alert("Failed to save snooze:\n" + err.message);
      }
    });
  } catch (err) {
    console.error("[SNOOZE] Initialization error:", err);
  }
})();
