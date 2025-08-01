(async function () {
  const EXPECTED_LOCATION = ["5p53YW7HzzBidwP4ANYi"];

  // Track modal state
  let isMinimized = false;
  let originalFormContent = null;
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

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

  function generateMinimizedContent(customFields) {
    const getValue = (name) => {
      const field = customFields.find((cf) => cf.name === name);
      return field ? field.value || "N/A" : "N/A";
    };

    return `
      <div class="p-4">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="border p-2 rounded">
            <div class="text-xs text-gray-500">Year</div>
            <div class="font-semibold">${getValue("year")}</div>
          </div>
          <div class="border p-2 rounded">
            <div class="text-xs text-gray-500">Make</div>
            <div class="font-semibold">${getValue("make")}</div>
          </div>
          <div class="border p-2 rounded">
            <div class="text-xs text-gray-500">Model</div>
            <div class="font-semibold">${getValue("model")}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ——————————————————————————————————————————————
  // UI Builders
  // ——————————————————————————————————————————————
  // REMOVED createCustomTab function - no longer needed

  // Create details button in button group
  async function createDetailsButton() {
    try {
      const btnGroup = await waitFor(".button-group.flex");
      console.log("[DETAILS] Found button group");

      // Avoid double-inject
      if (!document.getElementById("details-btn")) {
        // Get the second last button (which should be the delete button)
        const buttons = btnGroup.children;
        const deleteBtn = buttons[buttons.length - 2];

        // Create Details button
        const detailsBtn = document.createElement("button");
        detailsBtn.id = "details-btn";
        detailsBtn.className =
          "flex items-center px-2.5 py-1 border border-gray-300 border-l-0";
        detailsBtn.title = "Vehicle Details";
        detailsBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" 
               viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>`;

        // Insert before the delete button (second last position)
        btnGroup.insertBefore(detailsBtn, deleteBtn);

        // Add click event to open modal
        detailsBtn.addEventListener("click", openModal);

        console.log("[DETAILS] Button inserted in button group");
      }
    } catch (err) {
      console.error("Error creating details button:", err);
    }
  }

  function createModal() {
    if (document.getElementById("custom-modal")) return;
    const modal = document.createElement("div");
    modal.id = "custom-modal";
    modal.className = "fixed z-[999] hidden";
    modal.style.pointerEvents = "none";

    const container = document.createElement("div");
    container.id = "custom-modal-container";
    container.className =
      "bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative";
    container.style.pointerEvents = "auto";

    modal.appendChild(container);
    document.body.appendChild(modal);

    container.innerHTML = `
      <div class="flex items-center justify-between p-4" id="modal-drag-handle">
        <h3 class="text-lg font-semibold">Vehicle Details</h3>
        <div class="flex items-center gap-2">
          <button id="custom-modal-minimize" class="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" />
            </svg>
          </button>
          <button id="custom-modal-close" class="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div id="custom-modal-content" class="p-6 overflow-y-auto flex-grow">
        <p class="text-center">Loading…</p>
      </div>
      <div class="p-4 flex justify-end gap-3 border-t">
        <button id="custom-modal-cancel" class="hover:bg-gray-100 text-gray-700 py-2 px-6 rounded">Cancel</button>
        <button id="custom-modal-submit" class="bg-blue-600 text-white py-2 px-6 rounded disabled:opacity-50" disabled>Update</button>
      </div>
      
      <!-- Resize handle -->
      <div class="resize-handle cursor-pointer absolute bottom-2 right-2 w-4 h-4 cursor-se-resize">
        <svg class="w-5 h-5"  viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
        <path d="M21 15L15 21M21 8L8 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>`;

    // Setup dragging and resizing
    setupModalDrag();
    setupModalResize();
  }

  // Robust drag implementation using event delegation
  function setupModalDrag() {
    const modal = document.getElementById("custom-modal");
    if (!modal) return;

    // Use event delegation for drag handle
    modal.addEventListener("mousedown", function (e) {
      const dragHandle = e.target.closest("#modal-drag-handle");
      if (dragHandle) {
        e.preventDefault();
        isDragging = true;

        // Get current modal position
        const rect = modal.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        // Store mouse starting position
        startX = e.clientX;
        startY = e.clientY;

        // Add movement handlers
        document.addEventListener("mousemove", elementDrag);
        document.addEventListener("mouseup", closeDragElement);
      }
    });

    function elementDrag(e) {
      if (!isDragging) return;
      e.preventDefault();

      // Calculate movement delta
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Update modal position
      modal.style.left = initialLeft + deltaX + "px";
      modal.style.top = initialTop + deltaY + "px";
    }

    function closeDragElement() {
      isDragging = false;
      document.removeEventListener("mousemove", elementDrag);
      document.removeEventListener("mouseup", closeDragElement);
    }
  }

  function setupModalResize() {
    const modal = document.getElementById("custom-modal");
    const container = document.getElementById("custom-modal-container");
    if (!modal || !container) return;

    // Use event delegation for resize handle
    modal.addEventListener("mousedown", function (e) {
      const resizeHandle = e.target.closest(".resize-handle");
      if (resizeHandle) {
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parseInt(
          document.defaultView.getComputedStyle(container).width,
          10
        );
        const startHeight = parseInt(
          document.defaultView.getComputedStyle(container).height,
          10
        );

        function resize(e) {
          const newWidth = startWidth + e.clientX - startX;
          const newHeight = startHeight + e.clientY - startY;

          container.style.width = `${Math.max(400, newWidth)}px`;
          container.style.height = `${Math.max(300, newHeight)}px`;
        }

        function stopResize() {
          document.removeEventListener("mousemove", resize);
          document.removeEventListener("mouseup", stopResize);
        }

        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stopResize);
      }
    });
  }

  // ——————————————————————————————————————————————
  // Open / Close & Data Logic
  // ——————————————————————————————————————————————
  function closeModal() {
    const m = document.getElementById("custom-modal");
    if (m) m.classList.add("hidden");
    isMinimized = false;
  }

  function minimizeModal() {
    const modal = document.getElementById("custom-modal");
    const container = document.getElementById("custom-modal-container");
    const content = document.getElementById("custom-modal-content");
    const buttons = document.querySelector(
      "#custom-modal-container > div:last-child"
    );

    if (!isMinimized) {
      // Store original content
      originalFormContent = content.innerHTML;

      // Switch to minimized view
      container.style.width = "320px";
      container.style.height = "auto";

      // Position at top center
      const minimizedWidth = 320;
      const left = (window.innerWidth - minimizedWidth) / 2;
      modal.style.left = left + "px";
      modal.style.top = "20px";

      // Hide buttons and show minimized content
      buttons.classList.add("hidden");

      // Create minimized content
      const fields = Array.from(
        document.querySelectorAll(
          "#custom-update-form input, #custom-update-form select"
        )
      ).reduce((acc, el) => {
        acc[el.name] = el.value;
        return acc;
      }, {});

      content.innerHTML = generateMinimizedContent(
        Object.entries(fields).map(([name, value]) => ({ name, value }))
      );

      isMinimized = true;
      document.getElementById("custom-modal-minimize").innerHTML = `
       <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-expand-icon lucide-expand"><path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/></svg>
      `;
    } else {
      // Restore to full view
      container.style.width = "";
      container.style.height = "";
      buttons.classList.remove("hidden");
      content.innerHTML = originalFormContent;
      isMinimized = false;
      document.getElementById("custom-modal-minimize").innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" />
        </svg>
      `;

      // Re-center modal
      positionModal();
    }
  }

  function positionModal() {
    const modal = document.getElementById("custom-modal");
    const container = document.getElementById("custom-modal-container");

    // Calculate centered position
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const left = (window.innerWidth - containerWidth) / 2;
    const top = (window.innerHeight - containerHeight) / 2;

    // Apply position
    modal.style.left = Math.max(0, left) + "px";
    modal.style.top = Math.max(0, top) + "px";
  }

  async function openModal() {
    const content = document.getElementById("custom-modal-content");
    const submit = document.getElementById("custom-modal-submit");
    const modal = document.getElementById("custom-modal");
    const container = document.getElementById("custom-modal-container");

    content.innerHTML = '<p class="text-center">Loading…</p>';
    submit.disabled = true;
    modal.classList.remove("hidden");

    // Reset modal size
    container.style.width = "";
    container.style.height = "";
    isMinimized = false;

    // Get contact data
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

    // Load form
    content.innerHTML = generateFormHTML(customFields);
    submit.disabled = false;
    submit.dataset.contactId = contactId;

    // Position modal after content is loaded
    positionModal();
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

    // Create modal immediately
    createModal();

    // Create details button in button group
    await createDetailsButton();

    // Add event listeners
    document.getElementById("details-btn").addEventListener("click", openModal);
    document
      .getElementById("custom-modal-close")
      .addEventListener("click", closeModal);
    document
      .getElementById("custom-modal-minimize")
      .addEventListener("click", minimizeModal);
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
