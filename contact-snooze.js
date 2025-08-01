window.addEventListener("load", async function () {
  const EXPECTED_LOCATION = ["5p53YW7HzzBidwP4ANYi"];
  const FIELD_ID = "lFH0oXwb1HRVHRTVEV0b";
  const API_BASE = "https://backend.leadconnectorhq.com";

  console.log("[SNOOZE] Path:", window.location.pathname);

  const locMatch = window.location.pathname.match(/\/v2\/location\/([^\/]+)/);
  if (!locMatch || !EXPECTED_LOCATION.includes(locMatch[1])) {
    console.warn("[SNOOZE] Wrong location, exiting");
    return;
  }
  console.log("[SNOOZE] Location matched");

  // Insert snooze button
  const btnGroup = document.querySelector(".button-group.flex");
  if (!btnGroup) return console.error("[SNOOZE] .button-group.flex not found");
  const deleteBtn = btnGroup.lastElementChild;
  deleteBtn.classList.remove("rounded-r-md", "mr-2");

  const snoozeBtn = document.createElement("button");
  snoozeBtn.className =
    "flex items-center px-2.5 py-1 border border-gray-300 border-l-0";
  snoozeBtn.innerHTML = `
    <svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 5v5h4.5M10 2.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15z"
            stroke="#667085" stroke-width="1.667"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  btnGroup.insertBefore(snoozeBtn, deleteBtn);
  deleteBtn.classList.add("border-l-0", "rounded-r-md", "mr-2");
  console.log("[SNOOZE] Snooze button inserted");

  // Build modal (hidden via display:none)
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
    <div class="modal-content bg-white rounded-lg shadow-xl w-80" 
         style="position:relative">
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

  // Grab refs
  const contentDiv = modal.querySelector(".modal-content");
  const dateInput = modal.querySelector("#snooze-time");
  const cancelBtn = modal.querySelector("#cancel-snooze");
  const submitBtn = modal.querySelector("#submit-snooze");

  // show/hide helpers
  const openModal = () => (modal.style.display = "flex");
  const closeModal = () => (modal.style.display = "none");

  // prevent clicks inside content from closing it
  contentDiv.addEventListener("click", (e) => e.stopPropagation());
  // clicking backdrop closes
  modal.addEventListener("click", () => {
    console.log("[SNOOZE] Backdrop clicked");
    closeModal();
  });

  // closure vars
  let _contactId = null;
  let _headers = null;

  // API helpers
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
  function getConversationId() {
    const parts = window.location.pathname.split("/");
    const idx = parts.lastIndexOf("conversations");
    if (idx < 0 || !parts[idx + 1]) {
      throw new Error("conversationId not in URL");
    }
    return parts[idx + 1];
  }
  async function getContactId(convId, hdr) {
    const res = await fetch(`${API_BASE}/conversations/${convId}`, {
      headers: hdr,
    });
    if (!res.ok) throw new Error("Conv fetch " + res.status);
    return (await res.json()).contactId;
  }
  async function getCustomFields(contactId, hdr) {
    const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
      headers: hdr,
    });
    if (!res.ok) throw new Error("Contact fetch " + res.status);
    return (await res.json()).contact.customFields || [];
  }

  // when snoozeBtn is clicked
  snoozeBtn.addEventListener("click", async () => {
    console.log("[SNOOZE] Button clicked");
    try {
      const convId = getConversationId();
      const headers = await getHeaders();
      const contactId = await getContactId(convId, headers);
      const custom = await getCustomFields(contactId, headers);

      _contactId = contactId;
      _headers = headers;
      console.log("[SNOOZE] contactId:", _contactId);

      const existing = custom.find((f) => f.id === FIELD_ID);
      dateInput.value = existing?.value || "";

      openModal();
      console.log("[SNOOZE] Modal opened");
      dateInput.focus();
    } catch (err) {
      console.error("[SNOOZE] Open error:", err);
      alert(
        `Failed to open snooze modal, Please try again after refreshing your browser:\n${err.message}`
      );
    }
  });

  // Cancel click
  cancelBtn.addEventListener("click", () => {
    console.log("[SNOOZE] Close button clicked");
    closeModal();
  });

  // Submit click
  submitBtn.addEventListener("click", async () => {
    console.log("[SNOOZE] Submit clicked:", dateInput.value);
    if (!dateInput.value) {
      return alert("Please select a date");
    }
    if (!_contactId || !_headers) {
      return alert("No contactId—reopen modal");
    }

    const payload = {
      customFields: [{ id: FIELD_ID, field_value: dateInput.value }],
      dirty: true,
      skipTrigger: false,
    };
    console.log("[SNOOZE] PUT payload", payload);

    try {
      const res = await fetch(`${API_BASE}/contacts/${_contactId}`, {
        method: "PUT",
        headers: _headers,
        body: JSON.stringify(payload),
      });
      console.log("[SNOOZE] PUT status", res.status);
      if (!res.ok) throw new Error("Update failed " + res.status);
      alert("✅ Snooze set!");
      closeModal();
    } catch (err) {
      console.error("[SNOOZE] Save error:", err);
      alert(`Failed to save snooze:\n${err.message}`);
    }
  });
});
