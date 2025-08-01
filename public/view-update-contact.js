(async function () {
  const EXPECTED_LOCATION = ["5p53YW7HzzBidwP4ANYi"];

  // ——————————————————————————————————————————————
  // Helpers
  // ——————————————————————————————————————————————
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

  function getAuthHeaders() {
    const vue = document.querySelector("#app")?.__vue__;
    const authUser = vue?.authUser;
    if (!authUser) throw new Error("authUser not found");
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
    const fields = [
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
        ${fields
          .map((f) => {
            const existing = customFields.find((cf) => cf.id === f.id);
            const val = existing?.value || "";
            const cls =
              "border border-gray-300 rounded w-full p-2 text-sm mt-1";
            if (f.type === "select") {
              return `<div class="space-y-1">
              <label class="text-sm text-gray-600">${f.label}</label>
              <select name="${f.name}" class="${cls}">
                ${f.options
                  .map(
                    (o) =>
                      `<option ${
                        o === val ? "selected" : ""
                      } value="${o}">${o}</option>`
                  )
                  .join("")}
              </select>
            </div>`;
            }
            return `<div class="space-y-1">
            <label class="text-sm text-gray-600">${f.label}</label>
            <input type="${f.type}" name="${f.name}" value="${val}" class="${cls}" />
          </div>`;
          })
          .join("")}
      </form>`;
  }

  // ——————————————————————————————————————————————
  // UI Builders
  // ——————————————————————————————————————————————
  function createCustomTab() {
    const sidebar = document.querySelector(".mini-panel");
    if (!sidebar) throw new Error("Sidebar not found");
    if (document.getElementById("custom-tab-button")) return;
    const btn = document.createElement("div");
    btn.id = "custom-tab-button";
    btn.className = "p-[9px] inline-block cursor-pointer rounded";
    btn.title = "Custom Tab";
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none"
       viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
         <path stroke-linecap="round" stroke-linejoin="round"
               d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
       </svg>`;
    sidebar.appendChild(btn);
    return btn;
  }

  function createModal() {
    if (document.getElementById("custom-modal")) return;
    const modal = document.createElement("div");
    modal.id = "custom-modal";
    modal.className =
      "fixed inset-0 z-[999] flex hidden items-center justify-center p-4";
    modal.style.backgroundColor = "rgba(0,0,0,0.5)";
    modal.style.backdropFilter = "blur(2px)";
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-4">
          <h3 class="text-lg font-semibold">View and Update Contact Details</h3>
          <button id="custom-modal-close" class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div id="custom-modal-content" class="p-6 overflow-y-auto" style="max-height:60vh">
          <p class="text-center">Loading…</p>
        </div>
        <div class="p-4 flex justify-end gap-3">
          <button id="custom-modal-cancel" class="hover:bg-gray-100 text-gray-700 py-2 px-6 rounded">Cancel</button>
          <button id="custom-modal-submit" class="bg-blue-600 text-white py-2 px-6 rounded disabled:opacity-50" disabled>Update</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  // ——————————————————————————————————————————————
  // Open / Close & Data Logic
  // ——————————————————————————————————————————————
  function closeModal() {
    const m = document.getElementById("custom-modal");
    if (m) m.classList.add("hidden");
  }

  async function openModal() {
    const content = document.getElementById("custom-modal-content");
    const submit = document.getElementById("custom-modal-submit");
    content.innerHTML = '<p class="text-center">Loading…</p>';
    submit.disabled = true;
    document.getElementById("custom-modal").classList.remove("hidden");

    // get conversation & contact
    const parts = location.pathname.split("/");
    const idx = parts.indexOf("conversations");
    const convId = parts[idx + 2];
    const headers = getAuthHeaders();
    const convRes = await fetch(
      `https://backend.leadconnectorhq.com/conversations/${convId}`,
      { headers }
    );
    const contactId = (await convRes.json()).contactId;
    const contRes = await fetch(
      `https://backend.leadconnectorhq.com/contacts/${contactId}`,
      { headers }
    );
    const customFields = (await contRes.json()).contact.customFields || [];

    // load form
    content.innerHTML = generateFormHTML(customFields);
    submit.disabled = false;
    submit.dataset.contactId = contactId;
  }

  async function updateContact(e) {
    e.preventDefault();
    const submit = document.getElementById("custom-modal-submit");
    const contactId = submit.dataset.contactId;
    const headers = getAuthHeaders();
    const form = document.getElementById("custom-update-form");
    const entries = Array.from(new FormData(form).entries())
      .filter(([, v]) => v !== "")
      .map(([name, val]) => {
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
          field_value: cfg.type === "number" ? Number(val) : val,
        };
      })
      .filter(Boolean);

    if (!entries.length) return alert("No changes to save");

    await fetch(`https://backend.leadconnectorhq.com/contacts/${contactId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        customFields: entries,
        dirty: true,
        skipTrigger: false,
      }),
    });
    alert("✅ Updated successfully");
    closeModal();
  }

  // ——————————————————————————————————————————————
  // Init
  // ——————————————————————————————————————————————
  try {
    // exit if wrong location
    const loc = location.pathname.match(/\/v2\/location\/([^/]+)/)?.[1];
    if (!EXPECTED_LOCATION.includes(loc)) return;

    // wait for sidebar + inject
    await waitFor(".mini-panel");
    createCustomTab();
    createModal();

    document
      .getElementById("custom-tab-button")
      .addEventListener("click", openModal);
    document
      .getElementById("custom-modal-close")
      .addEventListener("click", closeModal);
    document
      .getElementById("custom-modal-cancel")
      .addEventListener("click", closeModal);
    document
      .getElementById("custom-modal-submit")
      .addEventListener("click", updateContact);
  } catch (err) {
    console.error("Custom Tab init failed:", err);
  }
})();
