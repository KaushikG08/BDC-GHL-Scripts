window.addEventListener("load", async function () {
  const expectedLocationId = ["5p53YW7HzzBidwP4ANYi"];
  const pathMatch = window.location.pathname.match(/\/v2\/location\/([^\/]+)/);
  const currentLocationId = pathMatch ? pathMatch[1] : null;

  if (!expectedLocationId.includes(currentLocationId)) {
    console.warn("❌ Location ID mismatch. Script not executed.");
    return;
  }
  console.log("✅ Location ID matched, running script...");

  // ——————————————————————————————————————————————
  // Helpers
  // ——————————————————————————————————————————————

  function getAuthHeaders() {
    const vue = document.querySelector("#app")?.__vue__;
    const authUser = vue?.authUser;
    if (!authUser) {
      console.error("❌ Vue authUser not found");
      return null;
    }
    return new Headers({
      Authorization: `Bearer ${authUser.authToken}`,
      "x-api-key": authUser.apiKey,
      Channel: "APP",
      Source: "WEB_USER",
      Version: "2021-07-28",
      "Content-Type": "application/json",
    });
  }

  function generateFormHTML(customFields) {
    const fieldsConfig = [
      {
        id: "brbb2yPv8zffJT3zTD2l",
        name: "offerAmount",
        label: "Offer Amount (USD)",
        type: "number",
      },
      {
        id: "o0d2EXUOJ9N20I3buVZP",
        name: "mileage",
        label: "Mileage",
        type: "number",
      },
      {
        id: "iugb9cY7AfbFhjhmnvCB",
        name: "status",
        label: "Lost/Win Status",
        type: "select",
        options: ["open", "lost", "win"],
      },
      {
        id: "kBhUtPhv3paBGrIAL4gF",
        name: "year",
        label: "Year",
        type: "number",
      },
      { id: "mr2HEGPN6AX4qk702fkm", name: "make", label: "Make", type: "text" },
      {
        id: "zp198kx2ZIodQLYMrlnw",
        name: "model",
        label: "Model",
        type: "text",
      },
      {
        id: "FpkQ8dnJd7Y0rvSDDy0U",
        name: "offerLink",
        label: "Offer Link",
        type: "text",
      },
      { id: "0HaSUns32ObBwmJ8ripD", name: "vin", label: "VIN", type: "text" },
      {
        id: "tWNbOqKNRjKkAl8Kspcp",
        name: "vehicle",
        label: "Vehicle of Interest",
        type: "text",
      },
      {
        id: "lFH0oXwb1HRVHRTVEV0b",
        name: "snooze",
        label: "Snooze",
        type: "date",
      },
      {
        id: "51r5VSCTYc0XxEHD8N3T",
        name: "followUp",
        label: "Follow Up Call",
        type: "date",
      },
    ];

    return `
      <form id="custom-update-form" class="grid grid-cols-2 gap-4">
        ${fieldsConfig
          .map((field) => {
            const existing = customFields.find((cf) => cf.id === field.id);
            const value = existing ? existing.value : "";
            const cls =
              "border border-gray-300 rounded w-full p-2 text-sm mt-1";

            if (field.type === "select") {
              return `
              <div class="space-y-1">
                <label class="text-sm text-gray-600">${field.label}</label>
                <select name="${field.name}" class="${cls}">
                  ${field.options
                    .map(
                      (opt) =>
                        `<option value="${opt}" ${
                          opt === value ? "selected" : ""
                        }>${opt}</option>`
                    )
                    .join("")}
                </select>
              </div>`;
            }

            return `
            <div class="space-y-1">
              <label class="text-sm text-gray-600">${field.label}</label>
              <input type="${field.type}" name="${field.name}" value="${value}" class="${cls}">
            </div>`;
          })
          .join("")}
      </form>
    `;
  }

  // ——————————————————————————————————————————————
  // UI Builders
  // ——————————————————————————————————————————————

  function createCustomTab() {
    const sidebar = document.querySelector(".mini-panel");
    if (!sidebar) return null;
    if (document.getElementById("custom-tab-button"))
      return document.getElementById("custom-tab-button");

    const btn = document.createElement("div");
    btn.id = "custom-tab-button";
    btn.className = "p-[9px] inline-block cursor-pointer rounded";
    btn.title = "Custom Tab";
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none"
           viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>`;
    sidebar.appendChild(btn);
    return btn;
  }

  function createModal() {
    if (document.getElementById("custom-modal"))
      return document.getElementById("custom-modal");

    const modal = document.createElement("div");
    modal.id = "custom-modal";
    modal.className =
      "fixed inset-0 z-[999] hidden items-center justify-center p-4";
    modal.style.backgroundColor = "rgba(0,0,0,0.5)";
    modal.style.backdropFilter = "blur(2px)";
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-4">
          <h3 class="text-lg font-semibold">View and Update Contact Details</h3>
          <button id="custom-modal-close" class="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div id="custom-modal-content" class="p-6 overflow-y-auto" style="max-height:60vh">
          <div class="text-center flex items-center justify-center gap-6 py-8">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 rotate-180 animate-spin" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9
                       m0 0H9 m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2
                       m15.357 2H15" />
            </svg>
            <p >Loading contact data...</p>
          </div>
        </div>
        <div class="p-4 flex justify-end gap-3">
          <button id="custom-modal-cancel" class="hover:bg-gray-100 text-gray-700 py-2 px-6 rounded">
            Cancel
          </button>
          <button id="custom-modal-submit" class="bg-blue-600 text-white py-2 px-6 rounded disabled:opacity-50" disabled>
            Update
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  // ——————————————————————————————————————————————
  // Open / Close Modal
  // ——————————————————————————————————————————————

  function closeModal() {
    const modal = document.getElementById("custom-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  async function openCustomModal() {
    const modal = document.getElementById("custom-modal");
    const content = document.getElementById("custom-modal-content");
    const submitBtn = document.getElementById("custom-modal-submit");

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    submitBtn.disabled = true;

    // Reset to loading spinner
    content.innerHTML = `
      <div class="text-center flex items-center justify-center gap-6 py-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 animate-spin rotate-180" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9
                   m0 0H9 m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2
                   m15.357 2H15" />
        </svg>
        <p >Loading contact data...</p>
      </div>`;

    // Get convo ID
    const parts = window.location.pathname.split("/");
    const idx = parts.indexOf("conversations");
    const conversationId = idx !== -1 ? parts[idx + 2] : null;
    if (!conversationId) {
      content.innerHTML = `<p class="text-red-500 text-center py-8">❌ Conversation not found</p>`;
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      content.innerHTML = `<p class="text-red-500 text-center py-8">❌ Authentication failed</p>`;
      return;
    }

    try {
      const convRes = await fetch(
        `https://backend.leadconnectorhq.com/conversations/${conversationId}`,
        { headers }
      );
      const convData = await convRes.json();
      const contactId = convData.contactId;

      const contRes = await fetch(
        `https://backend.leadconnectorhq.com/contacts/${contactId}`,
        { headers }
      );
      const contactData = await contRes.json();
      const customFields = contactData.contact.customFields || [];

      content.innerHTML = generateFormHTML(customFields);
      submitBtn.disabled = false;
      submitBtn.dataset.contactId = contactId;
    } catch (err) {
      console.error("🚨 Error loading form", err);
      content.innerHTML = `
        <div class="text-red-500 text-center py-8">
          ❌ Failed to load contact data<br><small>${err.message}</small>
        </div>`;
    }
  }

  // ——————————————————————————————————————————————
  // Single Update Handler
  // ——————————————————————————————————————————————

  async function updateContact(e) {
    e.preventDefault();
    const submitBtn = document.getElementById("custom-modal-submit");
    const form = document.getElementById("custom-update-form");
    if (!submitBtn || !form) return;

    const contactId = submitBtn.dataset.contactId;
    const headers = getAuthHeaders();
    if (!contactId || !headers)
      return alert("❌ Contact information not available");

    submitBtn.disabled = true;
    try {
      const formData = new FormData(form);
      const updateData = Array.from(formData.entries())
        .filter(([_, v]) => v !== "")
        .map(([name, value]) => {
          const cfg = [
            { id: "brbb2yPv8zffJT3zTD2l", name: "offerAmount" },
            { id: "o0d2EXUOJ9N20I3buVZP", name: "mileage" },
            { id: "iugb9cY7AfbFhjhmnvCB", name: "status" },
            { id: "kBhUtPhv3paBGrIAL4gF", name: "year" },
            { id: "mr2HEGPN6AX4qk702fkm", name: "make" },
            { id: "zp198kx2ZIodQLYMrlnw", name: "model" },
            { id: "FpkQ8dnJd7Y0rvSDDy0U", name: "offerLink" },
            { id: "0HaSUns32ObBwmJ8ripD", name: "vin" },
            { id: "tWNbOqKNRjKkAl8Kspcp", name: "vehicle" },
            { id: "lFH0oXwb1HRVHRTVEV0b", name: "snooze" },
            { id: "51r5VSCTYc0XxEHD8N3T", name: "followUp" },
          ].find((f) => f.name === name);
          if (!cfg) return null;
          return {
            id: cfg.id,
            field_value: ["mileage", "offerAmount", "year"].includes(name)
              ? Number(value)
              : value,
          };
        })
        .filter(Boolean);

      if (!updateData.length) {
        alert("⚠️ No fields to update.");
        submitBtn.disabled = false;
        return;
      }

      const res = await fetch(
        `https://backend.leadconnectorhq.com/contacts/${contactId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            customFields: updateData,
            dirty: true,
            skipTrigger: false,
          }),
        }
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);

      alert("✅ Contact updated successfully!");
      closeModal();
    } catch (err) {
      console.error("🚨 Update error", err);
      alert("❌ Failed to update contact: " + err.message);
      submitBtn.disabled = false;
    }
  }

  // ——————————————————————————————————————————————
  // Init
  // ——————————————————————————————————————————————

  function initCustomTab() {
    const customTab = createCustomTab();
    const modal = createModal();
    if (!customTab || !modal) return;

    customTab.addEventListener("click", openCustomModal);
    document
      .getElementById("custom-modal-close")
      ?.addEventListener("click", closeModal);
    document
      .getElementById("custom-modal-cancel")
      ?.addEventListener("click", closeModal);
    document
      .getElementById("custom-modal-submit")
      ?.addEventListener("click", updateContact);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCustomTab);
  } else {
    initCustomTab();
  }
});
