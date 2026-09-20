/**
 * Contactly — app.js
 * Vanilla JS (ES6) | Local Storage | No dependencies
 */

"use strict";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "contactly_contacts";

const AVATAR_COLORS = [
  "#557c8a","#657657","#9d6c60","#9b6d98","#be8251",
  "#6b829e","#9a7660","#59836e","#7b6d96","#8a7050",
  "#5a8070","#7a6090","#a06858","#5c7a8a","#7c9060",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-(). ]{5,}$/;

// ─── STATE ─────────────────────────────────────────────────────────────────────
let contacts   = [];
let selectedId = null;
let searchQuery = "";

// ─── UTILITIES ─────────────────────────────────────────────────────────────────
// uid() must be declared before SAMPLE_CONTACTS (which calls it at parse time)
function uid() {
  return "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

function initials(name) {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function sanitize(str) { return (str || "").trim(); }

function escHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch (_) { return ""; }
}

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────
const SAMPLE_CONTACTS = [
  {
    id: uid(), name: "Cameron Williamson", phone: "+1 415 555 0182",
    email: "cameron.williamson@example.com", company: "Wavelength Media",
    jobTitle: "Creative Director",
    notes: "Met at the Design Week conference. Very interested in collaboration on the brand refresh project.",
    favorite: true, createdAt: "2024-03-15T10:22:00Z",
  },
  {
    id: uid(), name: "Elena Vernon", phone: "+1 917 555 0148",
    email: "elena.vernon@morrowco.com", company: "Morrow & Co.",
    jobTitle: "Product Operations Manager",
    notes: "Met at the Product Leaders Summit. Elena is exploring a customer research partnership for Q3. Prefer email for introductions; generally available Tuesday and Thursday afternoons.",
    favorite: true, createdAt: "2024-06-12T14:00:00Z",
  },
  {
    id: uid(), name: "Marcus Chen", phone: "+1 212 555 0191",
    email: "marcus.chen@nexlab.io", company: "NexLab",
    jobTitle: "Principal Engineer",
    notes: "Spoke at the engineering conference. Expert in distributed systems.",
    favorite: true, createdAt: "2024-04-20T09:00:00Z",
  },
  {
    id: uid(), name: "Amina Yusuf", phone: "+44 20 7946 0926",
    email: "amina.yusuf@globalpivot.com", company: "Global Pivot",
    jobTitle: "Strategy Consultant", notes: "", favorite: false,
    createdAt: "2024-01-10T08:30:00Z",
  },
  {
    id: uid(), name: "Brooklyn Simmons", phone: "+1 310 555 0177",
    email: "brooklyn.s@brightleaf.co", company: "Brightleaf",
    jobTitle: "Head of Growth",
    notes: "Introduced through mutual contact. Focused on B2B SaaS growth.",
    favorite: false, createdAt: "2024-02-05T11:00:00Z",
  },
  {
    id: uid(), name: "Dianne Russell", phone: "+1 646 555 0124",
    email: "dianne.russell@arcvista.com", company: "ArcVista",
    jobTitle: "UX Research Lead",
    notes: "Strong background in qualitative research. Open to advisory roles.",
    favorite: false, createdAt: "2024-05-18T15:45:00Z",
  },
  {
    id: uid(), name: "Jenny Wilson", phone: "+1 718 555 0165",
    email: "jenny.wilson@outlook.com", company: "Freelance",
    jobTitle: "Copywriter", notes: "", favorite: false,
    createdAt: "2024-07-02T10:00:00Z",
  },
  {
    id: uid(), name: "Kristin Watson", phone: "+1 415 555 0109",
    email: "k.watson@petalux.io", company: "Petalux",
    jobTitle: "VP of Marketing",
    notes: "Interested in co-hosting a webinar series on customer success.",
    favorite: false, createdAt: "2024-08-01T09:15:00Z",
  },
  {
    id: uid(), name: "Robert Fox", phone: "+1 212 555 0139",
    email: "robert.fox@foxventures.com", company: "Fox Ventures",
    jobTitle: "Angel Investor",
    notes: "Looking for seed-stage SaaS opportunities. Prefers warm intros.",
    favorite: false, createdAt: "2024-09-10T13:30:00Z",
  },
];

// ─── LOCAL STORAGE ─────────────────────────────────────────────────────────────
function loadContacts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { contacts = JSON.parse(raw); return; } catch (_) { /* corrupt — fall through */ }
  }
  // First-run: seed sample data
  contacts = SAMPLE_CONTACTS;
  saveContacts();
}

function saveContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

// ─── COUNTER ───────────────────────────────────────────────────────────────────
function updateCounter() {
  document.getElementById("contact-count-num").textContent = contacts.length;
}

// ─── SEARCH ────────────────────────────────────────────────────────────────────
function getFilteredContacts() {
  if (!searchQuery) return contacts;
  const q = searchQuery.toLowerCase();
  return contacts.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.phone || "").toLowerCase().includes(q) ||
    (c.email || "").toLowerCase().includes(q)
  );
}

function searchContacts(query) {
  searchQuery = query;
  const filtered = getFilteredContacts();
  if (!filtered.find(c => c.id === selectedId)) selectedId = null;
  renderContacts();
}

// ─── RENDER SIDEBAR ────────────────────────────────────────────────────────────
function renderContacts() {
  const list            = document.getElementById("contact-list");
  const detailEl        = document.getElementById("contact-detail");
  const emptyNoContacts = document.getElementById("empty-state-no-contacts");
  const emptyNoResults  = document.getElementById("empty-state-no-results");

  // Reset right-panel visibility
  detailEl.style.display        = "none";
  emptyNoContacts.style.display = "none";
  emptyNoResults.style.display  = "none";

  updateCounter();

  if (contacts.length === 0) {
    list.innerHTML = '<p class="list-empty">No contacts available</p>';
    emptyNoContacts.style.display = "flex";
    selectedId = null;
    return;
  }

  const filtered = getFilteredContacts();

  if (filtered.length === 0) {
    list.innerHTML = '<p class="list-empty">No matching contacts found.</p>';
    emptyNoResults.style.display = "flex";
    return;
  }

  const favorites = filtered.filter(c => c.favorite);
  const others    = filtered.filter(c => !c.favorite).sort((a, b) => a.name.localeCompare(b.name));

  let html = "";

  if (favorites.length) {
    html += '<p class="list-label">Favorites</p>';
    favorites.forEach(c => { html += contactRowHTML(c); });
  }

  const letters = [...new Set(others.map(c => c.name[0].toUpperCase()))].sort();
  letters.forEach(letter => {
    html += `<p class="list-label">${escHtml(letter)}</p>`;
    others
      .filter(c => c.name[0].toUpperCase() === letter)
      .forEach(c => { html += contactRowHTML(c); });
  });

  list.innerHTML = html;

  // Attach click handlers
  list.querySelectorAll(".contact-row").forEach(row => {
    row.addEventListener("click", e => { e.preventDefault(); selectContact(row.dataset.id); });
    row.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectContact(row.dataset.id); }
    });
  });

  // Decide what to show in detail panel
  const inFiltered = filtered.find(c => c.id === selectedId);
  if (selectedId && inFiltered) {
    renderSelectedContact(selectedId);
  } else if (filtered.length > 0) {
    selectContact(filtered[0].id);
  }
}

function contactRowHTML(c) {
  const ini   = initials(c.name);
  const color = avatarColor(c.id);
  const sel   = c.id === selectedId;
  const fav   = c.favorite
    ? `<span class="favorite" aria-label="Favorite">&#9733;</span>`
    : `<span class="favorite muted" aria-label="Not a favorite">&#9734;</span>`;

  return `
    <a class="contact-row${sel ? " selected" : ""}" href="#"
       data-id="${escHtml(c.id)}" tabindex="0"
       ${sel ? 'aria-current="page"' : ""}>
      <span class="avatar" style="background:${color};flex-shrink:0;">${escHtml(ini)}</span>
      <span class="contact-summary">
        <strong>${escHtml(c.name)}</strong>
        <small>${escHtml(c.phone)}</small>
      </span>
      ${fav}
    </a>`;
}

// ─── SELECT / RENDER DETAIL ─────────────────────────────────────────────────────
function selectContact(id) {
  selectedId = id;

  document.querySelectorAll(".contact-row").forEach(row => {
    const isThis = row.dataset.id === id;
    row.classList.toggle("selected", isThis);
    if (isThis) row.setAttribute("aria-current", "page");
    else row.removeAttribute("aria-current");
  });

  renderSelectedContact(id);
}

function renderSelectedContact(id) {
  const c = contacts.find(c => c.id === id);
  if (!c) return;

  document.getElementById("empty-state-no-contacts").style.display = "none";
  document.getElementById("empty-state-no-results").style.display  = "none";
  document.getElementById("contact-detail").style.display = "block";

  // Breadcrumb
  document.getElementById("detail-breadcrumb-name").textContent = c.name;

  // Avatar
  const avatarEl = document.getElementById("detail-avatar");
  avatarEl.textContent      = initials(c.name);
  avatarEl.style.background = avatarColor(c.id);

  // Name
  document.getElementById("contact-name").textContent = c.name;

  // Favorite star
  const favEl = document.getElementById("detail-favorite");
  if (c.favorite) {
    favEl.textContent = "★";
    favEl.style.color = "var(--warm)";
    favEl.setAttribute("aria-label", "Favorite");
  } else {
    favEl.textContent = "";
    favEl.setAttribute("aria-label", "");
  }

  // Subtitle: "Job Title at Company"
  const subtitleParts = [];
  if (c.jobTitle) subtitleParts.push(c.jobTitle);
  if (c.company)  subtitleParts.push("at " + c.company);
  document.getElementById("detail-subtitle").textContent = subtitleParts.join(" ");

  // Contact info fields
  const fieldList = document.getElementById("detail-field-list");
  let fieldsHTML = `
    <div>
      <dt>Phone</dt>
      <dd><a href="tel:${escHtml(c.phone)}">${escHtml(c.phone)}</a><span class="tag">Mobile</span></dd>
    </div>
    <div>
      <dt>Email</dt>
      <dd><a href="mailto:${escHtml(c.email)}">${escHtml(c.email)}</a></dd>
    </div>`;
  if (c.company)  fieldsHTML += `<div><dt>Company</dt><dd>${escHtml(c.company)}</dd></div>`;
  if (c.jobTitle) fieldsHTML += `<div><dt>Job title</dt><dd>${escHtml(c.jobTitle)}</dd></div>`;
  fieldList.innerHTML = fieldsHTML;

  // Notes
  const notesSection = document.getElementById("detail-notes-section");
  const notesCard    = document.getElementById("detail-notes-card");
  if (c.notes) {
    notesSection.style.display = "";
    const dateStr = c.createdAt ? formatDate(c.createdAt) : "";
    notesCard.innerHTML = `
      <p>${escHtml(c.notes)}</p>
      ${dateStr ? `<p class="note-meta">Last updated ${dateStr}</p>` : ""}`;
  } else {
    notesSection.style.display = "none";
    notesCard.innerHTML = "";
  }

  // Delete button aria-label
  document.getElementById("btn-delete-contact").setAttribute("aria-label", "Delete " + c.name);
}

// ─── MODALS ────────────────────────────────────────────────────────────────────
function openModal(id) {
  const overlay = document.getElementById(id);
  overlay.style.display = "flex";
  overlay.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";

  const firstInput = overlay.querySelector("input:not([type=hidden]), textarea");
  if (firstInput) setTimeout(() => firstInput.focus(), 60);
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function closeAllModals() {
  ["modal-add", "modal-edit", "modal-delete"].forEach(closeModal);
}

// ─── VALIDATION ────────────────────────────────────────────────────────────────
function setFieldError(inputId, errorId, msg) {
  const input   = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);
  if (msg) {
    input.classList.add("error");
    errorEl.textContent = msg;
    return false;
  }
  input.classList.remove("error");
  errorEl.textContent = "";
  return true;
}

function clearFormErrors(prefix) {
  ["name", "phone", "email"].forEach(f =>
    setFieldError(`${prefix}-${f}`, `${prefix}-${f}-error`, "")
  );
}

function validateForm(prefix, excludeId) {
  const name  = sanitize(document.getElementById(`${prefix}-name`).value);
  const phone = sanitize(document.getElementById(`${prefix}-phone`).value);
  const email = sanitize(document.getElementById(`${prefix}-email`).value);
  let valid = true;

  // Name
  if (!name) {
    if (!setFieldError(`${prefix}-name`, `${prefix}-name-error`, "Full name is required.")) valid = false;
  } else {
    setFieldError(`${prefix}-name`, `${prefix}-name-error`, "");
  }

  // Phone
  if (!phone) {
    if (!setFieldError(`${prefix}-phone`, `${prefix}-phone-error`, "Phone number is required.")) valid = false;
  } else if (!PHONE_RE.test(phone)) {
    if (!setFieldError(`${prefix}-phone`, `${prefix}-phone-error`, "Enter a valid phone number.")) valid = false;
  } else {
    const normPhone = phone.replace(/\s/g, "");
    const dup = contacts.find(c => c.phone.replace(/\s/g,"") === normPhone && c.id !== excludeId);
    if (dup) {
      if (!setFieldError(`${prefix}-phone`, `${prefix}-phone-error`, "This phone number is already in use.")) valid = false;
    } else {
      setFieldError(`${prefix}-phone`, `${prefix}-phone-error`, "");
    }
  }

  // Email
  if (!email) {
    if (!setFieldError(`${prefix}-email`, `${prefix}-email-error`, "Email address is required.")) valid = false;
  } else if (!EMAIL_RE.test(email)) {
    if (!setFieldError(`${prefix}-email`, `${prefix}-email-error`, "Enter a valid email address.")) valid = false;
  } else {
    const dup = contacts.find(c => c.email.toLowerCase() === email.toLowerCase() && c.id !== excludeId);
    if (dup) {
      if (!setFieldError(`${prefix}-email`, `${prefix}-email-error`, "This email is already in use.")) valid = false;
    } else {
      setFieldError(`${prefix}-email`, `${prefix}-email-error`, "");
    }
  }

  return valid;
}

// ─── ADD CONTACT ───────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById("form-add").reset();
  clearFormErrors("add");
  openModal("modal-add");
}

function addContact(e) {
  e.preventDefault();
  if (!validateForm("add")) return;

  const contact = {
    id:        uid(),
    name:      sanitize(document.getElementById("add-name").value),
    phone:     sanitize(document.getElementById("add-phone").value),
    email:     sanitize(document.getElementById("add-email").value),
    company:   sanitize(document.getElementById("add-company").value),
    jobTitle:  sanitize(document.getElementById("add-jobtitle").value),
    notes:     sanitize(document.getElementById("add-notes").value),
    favorite:  document.getElementById("add-favorite").checked,
    createdAt: new Date().toISOString(),
  };

  contacts.push(contact);
  saveContacts();
  selectedId = contact.id;
  closeModal("modal-add");
  renderContacts();
  showToast(contact.name + " added successfully.");
}

// ─── EDIT CONTACT ──────────────────────────────────────────────────────────────
function openEditModal() {
  const c = contacts.find(c => c.id === selectedId);
  if (!c) return;

  document.getElementById("edit-id").value        = c.id;
  document.getElementById("edit-name").value      = c.name;
  document.getElementById("edit-phone").value     = c.phone;
  document.getElementById("edit-email").value     = c.email;
  document.getElementById("edit-company").value   = c.company  || "";
  document.getElementById("edit-jobtitle").value  = c.jobTitle || "";
  document.getElementById("edit-notes").value     = c.notes    || "";
  document.getElementById("edit-favorite").checked = !!c.favorite;

  clearFormErrors("edit");
  openModal("modal-edit");
}

function editContact(e) {
  e.preventDefault();
  const id  = document.getElementById("edit-id").value;
  if (!validateForm("edit", id)) return;

  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return;

  contacts[idx] = {
    ...contacts[idx],
    name:     sanitize(document.getElementById("edit-name").value),
    phone:    sanitize(document.getElementById("edit-phone").value),
    email:    sanitize(document.getElementById("edit-email").value),
    company:  sanitize(document.getElementById("edit-company").value),
    jobTitle: sanitize(document.getElementById("edit-jobtitle").value),
    notes:    sanitize(document.getElementById("edit-notes").value),
    favorite: document.getElementById("edit-favorite").checked,
  };

  saveContacts();
  closeModal("modal-edit");
  renderContacts();
  showToast("Contact updated successfully.");
}

// ─── DELETE CONTACT ────────────────────────────────────────────────────────────
function openDeleteModal() {
  const c = contacts.find(c => c.id === selectedId);
  if (!c) return;
  document.getElementById("delete-contact-name").textContent = c.name;
  openModal("modal-delete");
}

function deleteContact() {
  const idx = contacts.findIndex(c => c.id === selectedId);
  if (idx === -1) return;

  const name = contacts[idx].name;
  contacts.splice(idx, 1);
  saveContacts();

  if (contacts.length > 0) {
    selectedId = contacts[Math.min(idx, contacts.length - 1)].id;
  } else {
    selectedId = null;
  }

  closeModal("modal-delete");
  renderContacts();
  showToast(name + " deleted.");
}

// ─── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(message, type) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast" + (type === "error" ? " toast-error" : "");
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("removing");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 3200);
}

// ─── KEYBOARD ──────────────────────────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeAllModals();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      document.getElementById("contact-search").focus();
    }
  });
}

// ─── INLINE VALIDATION WIRING ──────────────────────────────────────────────────
function wireInlineValidation(prefix, getExcludeId) {
  ["name", "phone", "email"].forEach(field => {
    const input = document.getElementById(`${prefix}-${field}`);
    input.addEventListener("blur", () => {
      if (input.value.trim()) validateForm(prefix, getExcludeId());
    });
    input.addEventListener("input", () => {
      if (input.classList.contains("error")) validateForm(prefix, getExcludeId());
    });
  });
}

// ─── INITIALIZE ────────────────────────────────────────────────────────────────
function initializeApp() {
  loadContacts();
  renderContacts();
  updateCounter();

  // Search
  document.getElementById("contact-search").addEventListener("input", e => searchContacts(e.target.value));
  document.getElementById("search-form").addEventListener("submit", e => e.preventDefault());

  // Header Add button
  document.getElementById("btn-add-contact").addEventListener("click", openAddModal);

  // Empty-state Add button
  const emptyAddBtn = document.getElementById("btn-add-contact-empty");
  if (emptyAddBtn) emptyAddBtn.addEventListener("click", openAddModal);

  // Detail panel Edit / Delete
  document.getElementById("btn-edit-contact").addEventListener("click", openEditModal);
  document.getElementById("btn-delete-contact").addEventListener("click", openDeleteModal);
  document.getElementById("btn-confirm-delete").addEventListener("click", deleteContact);

  // Form submissions
  document.getElementById("form-add").addEventListener("submit", addContact);
  document.getElementById("form-edit").addEventListener("submit", editContact);

  // Close buttons (data-modal pattern)
  document.querySelectorAll("[data-modal]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.modal));
  });

  // Backdrop click closes modal
  ["modal-add", "modal-edit", "modal-delete"].forEach(id => {
    document.getElementById(id).addEventListener("click", e => {
      if (e.target.id === id) closeModal(id);
    });
  });

  // Inline validation
  wireInlineValidation("add", () => null);
  wireInlineValidation("edit", () => document.getElementById("edit-id").value);

  setupKeyboard();
}

// ─── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", initializeApp);
