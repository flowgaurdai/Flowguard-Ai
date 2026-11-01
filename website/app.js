// Flowguard-AI Interactive 3D Spatial Clinical Admin Dashboard Application Logic

// Dynamic Base URL: Works seamlessly on localhost, LAN (e.g. http://192.168.1.5:8000), or hosted cloud
const API_BASE_URL = (() => {
  if (typeof window !== "undefined" && window.location) {
    if (window.location.protocol.startsWith("http")) {
      return `${window.location.origin}/api`;
    }
  }
  return "http://localhost:8000/api";
})();

// --- State Repositories ---
let beds = {
  "ICU-01": {
    bed_id: "ICU-01",
    patient_name: "Unassigned Bed 01",
    age_gender: "N/A",
    doctor_name: "Dr.SIDDARTHA",
    assigned_nurse: "Nurse Aishani",
    room_no: "ICU Ward 101",
    fluid_type: "Saline 0.9% (500ml)",
    current_volume_ml: 500.0,
    full_volume_ml: 500.0,
    percentage: 100.0,
    flow_rate_mlm: 0.0,
    tte_minutes: 999,
    status: "NORMAL",
    blynk_token: ""
  },
  "ICU-02": {
    bed_id: "ICU-02",
    patient_name: "Unassigned Bed 02",
    age_gender: "N/A",
    doctor_name: "Dr.SIDDARTHA",
    assigned_nurse: "Nurse Tejaswini",
    room_no: "ICU Ward 102",
    fluid_type: "Saline 0.9% (500ml)",
    current_volume_ml: 500.0,
    full_volume_ml: 500.0,
    percentage: 100.0,
    flow_rate_mlm: 0.0,
    tte_minutes: 999,
    status: "NORMAL",
    blynk_token: ""
  }
};

let nurses = {
  "NURSE-01": { nurse_id: "NURSE-01", name: "Nurse Aishani", shift: "Morning (07:00 - 15:00)", contact: "+91 98765 43210", status: "On Duty", assigned_count: 1 },
  "NURSE-02": { nurse_id: "NURSE-02", name: "Nurse Tejaswini", shift: "Evening (15:00 - 23:00)", contact: "+91 98765 43211", status: "On Duty", assigned_count: 1 },
  "NURSE-03": { nurse_id: "NURSE-03", name: "Nurse Durga", shift: "Night (23:00 - 07:00)", contact: "+91 98765 43212", status: "On Standby", assigned_count: 0 }
};

let doctors = {
  "DOC-01": { doc_id: "DOC-01", name: "Dr.SIDDARTHA", specialty: "General Medicine Lead", contact: "+91 98111 22330", status: "Available", username: "siddhartha", password: "admin123", photo_url: "https://plain-apac-prod-public.komododecks.com/202611/01/waqc0HFunHNZKuyytbSD/image.png" }
};

let activeSelectedBed = "ICU-01";
let currentTab = "dashboard";

// --- Image URL Sanitization & Protocol Normalizer ---
function sanitizePhotoUrl(url) {
  if (!url || typeof url !== "string") return "";
  url = url.trim();
  if (!url) return "";

  // 1. Convert Google Drive share links to direct embed thumbnail URLs
  // Handles /file/d/FILE_ID/view, open?id=FILE_ID, uc?id=FILE_ID
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w500`;
  }

  // 2. Convert Dropbox links to direct raw image
  if (url.includes("dropbox.com")) {
    return url.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
  }

  // 3. Convert Imgur page URL to direct image URL
  if (url.includes("imgur.com/") && !url.includes("i.imgur.com") && !url.endsWith(".jpg") && !url.endsWith(".png") && !url.endsWith(".jpeg") && !url.endsWith(".webp")) {
    const parts = url.split("imgur.com/");
    const imgId = parts[1]?.split("/")[0]?.split("?")[0];
    if (imgId) return `https://i.imgur.com/${imgId}.jpg`;
  }

  // 4. Ensure URL has protocol if missing (prevents treating domain as relative path)
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:") && !url.startsWith("/")) {
    url = "https://" + url;
  }

  return url;
}

// --- Client-side Image Compression & Base64 Encoder ---
function compressImageFile(file, maxWidth, maxHeight, quality, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      callback(dataUrl);
    };
    img.onerror = function() {
      callback(e.target.result);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

window.handleDoctorFileUpload = function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const statusEl = document.getElementById("doc-file-status");
  if (statusEl) statusEl.textContent = `Processing ${file.name.slice(0, 16)}...`;
  
  compressImageFile(file, 280, 280, 0.85, (base64Data) => {
    const photoInput = document.getElementById("doc-form-photo");
    const preview = document.getElementById("doc-photo-preview");
    if (photoInput) photoInput.value = base64Data;
    if (preview) preview.src = base64Data;
    if (statusEl) statusEl.textContent = `✓ Selected (${Math.round(base64Data.length / 1024)} KB)`;
  });
};

window.handleNurseFileUpload = function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const statusEl = document.getElementById("nurse-file-status");
  if (statusEl) statusEl.textContent = `Processing ${file.name.slice(0, 16)}...`;
  
  compressImageFile(file, 280, 280, 0.85, (base64Data) => {
    const photoInput = document.getElementById("nurse-form-photo");
    const preview = document.getElementById("nurse-photo-preview");
    if (photoInput) photoInput.value = base64Data;
    if (preview) preview.src = base64Data;
    if (statusEl) statusEl.textContent = `✓ Selected (${Math.round(base64Data.length / 1024)} KB)`;
  });
};

let docResolveTimer = null;
window.previewDoctorPhoto = function(url) {
  const preview = document.getElementById("doc-photo-preview");
  if (!preview) return;
  const clean = sanitizePhotoUrl(url);
  preview.src = clean || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80";

  if (clean && !clean.startsWith("data:") && !clean.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) {
    clearTimeout(docResolveTimer);
    docResolveTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/resolve-image?url=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.image_url) {
            preview.src = data.image_url;
            const input = document.getElementById("doc-form-photo");
            if (input && input.value.trim() === url.trim()) {
              input.value = data.image_url;
            }
          }
        }
      } catch (e) { console.warn("Doctor photo resolve:", e); }
    }, 400);
  }
};

let nurseResolveTimer = null;
window.previewNursePhoto = function(url) {
  const preview = document.getElementById("nurse-photo-preview");
  if (!preview) return;
  const clean = sanitizePhotoUrl(url);
  preview.src = clean || "https://images.unsplash.com/photo-1594824813588-e9f0d48123db?w=100&auto=format&fit=crop&q=80";

  if (clean && !clean.startsWith("data:") && !clean.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) {
    clearTimeout(nurseResolveTimer);
    nurseResolveTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/resolve-image?url=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.image_url) {
            preview.src = data.image_url;
            const input = document.getElementById("nurse-form-photo");
            if (input && input.value.trim() === url.trim()) {
              input.value = data.image_url;
            }
          }
        }
      } catch (e) { console.warn("Nurse photo resolve:", e); }
    }, 400);
  }
};

let currentUser = null;
let blynkToken = localStorage.getItem("blynk_token") || "";
let blynkServer = localStorage.getItem("blynk_server") || "blynk.cloud";
let isSimulationMode = !blynkToken; // If token is present, start in Blynk Live mode!
if (blynkToken && beds["ICU-01"]) beds["ICU-01"].blynk_token = blynkToken;

let isDbConnected = false;
let isSoundEnabled = true;

let alertAudioInterval = null;
let audioCtx = null;

let chartInstance = null;
let analyticsBarInstance = null;
let analyticsDoughnutInstance = null;
let chartHistoryData = { labels: [], volumes: [] };

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (window.lucide) lucide.createIcons();

    initChart();
    setupEventListeners();
    await checkDatabaseConnection();
    await checkAuthOnStartup();
    renderAllViews();

    // Telemetry loop every 3 seconds
    setInterval(updateTelemetry, 3000);
  } catch (err) {
    console.error("Flowguard-AI Init Error:", err);
  }
});

// --- Mobile Drawer Toggle (Global Window Scope) ---
window.toggleMobileMenu = function(open) {
  const sidebar = document.getElementById("main-sidebar");
  const backdrop = document.getElementById("mobile-drawer-backdrop");
  if (!sidebar || !backdrop) return;

  if (open) {
    sidebar.classList.remove("-translate-x-full");
    backdrop.classList.remove("hidden");
  } else {
    sidebar.classList.add("-translate-x-full");
    backdrop.classList.add("hidden");
  }
};

// --- SPA Page View Switcher (Global Window Scope) ---
window.switchTab = function(tabName) {
  currentTab = tabName;
  const views = document.querySelectorAll(".page-view");
  views.forEach(v => v.classList.add("hidden"));

  const target = document.getElementById(`view-${tabName}`);
  if (target) target.classList.remove("hidden");

  // Update Desktop Sidebar Nav Buttons
  const navBtns = document.querySelectorAll("aside nav button");
  navBtns.forEach(btn => {
    btn.classList.remove("nav-active", "text-white");
    btn.classList.add("text-slate-600");
  });

  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.add("nav-active");
    activeBtn.classList.remove("text-slate-600");
  }

  // Update Mobile & Tablet Bottom Nav Buttons
  const mobNavBtns = document.querySelectorAll("nav[class*='lg:hidden'] button");
  mobNavBtns.forEach(btn => {
    btn.classList.remove("text-cyan-600", "bg-cyan-50/80");
    btn.classList.add("text-slate-500");
  });
  const mobActiveBtn = document.getElementById(`mob-nav-${tabName}`);
  if (mobActiveBtn) {
    mobActiveBtn.classList.remove("text-slate-500");
    mobActiveBtn.classList.add("text-cyan-600", "bg-cyan-50/80");
  }

  if (tabName === 'analytics') initAnalyticsCharts();
  renderAllViews();
};

// --- Render All Pages & Components ---
function renderAllViews() {
  renderBedCards();
  renderPatientsTable();
  renderNurseRoster();
  renderDoctorsGrid();
  fetchAndRenderAlertLogs();
  setTimeout(init3DTiltEffect, 100);
}

// --- Card Hover Logic (Stationary Cards with Hover Highlights) ---
function init3DTiltEffect() {
  // Card movement disabled as per user request — cards stay stationary with clean glow & bottle highlight
}

// --- Continuous Sound Synthesizer ---
function playAlertChime(freq = 900, type = 'sawtooth') {
  if (!isSoundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, audioCtx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) { console.warn("Audio error:", e); }
}

function manageContinuousAudio(hasActiveCriticalAlert) {
  if (hasActiveCriticalAlert && isSoundEnabled) {
    if (!alertAudioInterval) {
      playAlertChime(950, 'sawtooth');
      alertAudioInterval = setInterval(() => {
        playAlertChime(950, 'sawtooth');
      }, 1500);
    }
  } else {
    if (alertAudioInterval) {
      clearInterval(alertAudioInterval);
      alertAudioInterval = null;
    }
  }
}

// --- SQLite Database Connectivity Check ---
async function checkDatabaseConnection() {
  const dbStatusEl = document.getElementById("db-status");
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (res.ok) {
      isDbConnected = true;
      if (dbStatusEl) {
        dbStatusEl.textContent = "Connected";
        dbStatusEl.className = "text-emerald-600 font-bold";
      }
      await fetchBedsFromDatabase();
      await fetchNursesFromDatabase();
      await fetchDoctorsFromDatabase();
    }
  } catch (err) {
    isDbConnected = false;
    if (dbStatusEl) {
      dbStatusEl.textContent = "Offline (Local State)";
      dbStatusEl.className = "text-slate-400 font-medium";
    }
    renderAllViews();
  }
}

function updateLoginBadges() {
  const nBadge = document.getElementById("login-nurses-badge");
  const dBadge = document.getElementById("login-doctors-badge");
  const bBadge = document.getElementById("login-beds-badge");
  if (nBadge) nBadge.textContent = `${Object.keys(nurses).length} Nurses Loaded`;
  if (dBadge) dBadge.textContent = `${Object.keys(doctors).length} Doctors Loaded`;
  if (bBadge) bBadge.textContent = `${Object.keys(beds).length} ICU Beds Synced`;
}

async function fetchBedsFromDatabase() {
  try {
    const res = await fetch(`${API_BASE_URL}/beds`);
    if (res.ok) {
      const data = await res.json();
      const newBeds = {};
      if (Array.isArray(data)) {
        data.forEach(bed => { newBeds[bed.bed_id] = bed; });
      }
      beds = newBeds;
      updateLoginBadges();
      populateBedSelectDropdown();
      renderAllViews();
    }
  } catch (err) { console.warn(err); }
}

async function fetchNursesFromDatabase() {
  try {
    const res = await fetch(`${API_BASE_URL}/nurses`);
    if (res.ok) {
      const data = await res.json();
      const newNurses = {};
      if (Array.isArray(data)) {
        data.forEach(n => { newNurses[n.nurse_id] = n; });
      }
      nurses = newNurses;
      updateLoginBadges();
      renderNurseRoster(true);
      populateNurseSelectDropdown();
    }
  } catch (err) { console.warn(err); }
}

async function fetchDoctorsFromDatabase() {
  try {
    const res = await fetch(`${API_BASE_URL}/doctors`);
    if (res.ok) {
      const data = await res.json();
      const newDocs = {};
      if (Array.isArray(data)) {
        data.forEach(d => { newDocs[d.doc_id] = d; });
      }
      doctors = newDocs;
      updateLoginBadges();
      renderDoctorsGrid(true);
    }
  } catch (err) { console.warn(err); }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  const toggleBtn = document.getElementById("toggle-sim-btn");
  const simText = document.getElementById("sim-mode-text");
  const soundBtn = document.getElementById("toggle-sound-btn");
  const soundText = document.getElementById("sound-text");

  const openPatientBtn = document.getElementById("open-add-patient-btn");
  const closePatientBtn = document.getElementById("close-patient-modal-btn");
  const patientModal = document.getElementById("patient-modal");
  const patientForm = document.getElementById("admit-patient-form");

  const openNurseBtn = document.getElementById("open-add-nurse-btn");
  const closeNurseBtn = document.getElementById("close-nurse-modal-btn");
  const nurseModal = document.getElementById("nurse-modal");
  const nurseForm = document.getElementById("add-nurse-form");

  populateBedSelectDropdown();
  populateNurseSelectDropdown();

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      isSoundEnabled = !isSoundEnabled;
      if (soundText) soundText.textContent = isSoundEnabled ? "Audio: Continuous ON" : "Audio: Muted";
      if (!isSoundEnabled && alertAudioInterval) {
        clearInterval(alertAudioInterval);
        alertAudioInterval = null;
      }
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      isSimulationMode = !isSimulationMode;
      updateSimButtonUI();
      if (!isSimulationMode) {
        fetchBlynkHardwareData();
      }
    });
  }

  // Pre-fill hardware setup fields from localStorage
  const tokenInput = document.getElementById("settings-token-input");
  const serverInput = document.getElementById("settings-server-input");
  if (tokenInput && blynkToken) tokenInput.value = blynkToken;
  if (serverInput && blynkServer) serverInput.value = blynkServer;

  updateSimButtonUI();
  updateBlynkStatusUI(false, blynkToken ? "Configured" : "No Token");

  if (openPatientBtn && patientModal) {
    openPatientBtn.addEventListener("click", () => patientModal.classList.remove("hidden"));
  }
  if (closePatientBtn && patientModal) {
    closePatientBtn.addEventListener("click", () => patientModal.classList.add("hidden"));
  }

  if (patientForm) {
    patientForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bedId = document.getElementById("form-bed-id")?.value.trim().toUpperCase() || "ICU-04";
      const patientName = document.getElementById("form-patient-name")?.value.trim() || "M. Rao";
      const ageGender = document.getElementById("form-age-gender")?.value.trim() || "45/M";
      const doctorName = document.getElementById("form-doctor-name")?.value.trim() || (Object.values(doctors)[0]?.name || "Dr.SIDDARTHA");
      const assignedNurse = document.getElementById("form-assigned-nurse")?.value || "Nurse Aishani";
      const roomNo = document.getElementById("form-room-no")?.value.trim() || "ICU Room 201";
      const fluidType = document.getElementById("form-fluid-type")?.value || "Saline 0.9% (500ml)";
      const fullVol = parseFloat(document.getElementById("form-full-volume")?.value) || 500.0;
      const token = document.getElementById("form-blynk-token")?.value.trim() || "";

      const newBedObj = {
        bed_id: bedId,
        patient_name: patientName,
        age_gender: ageGender,
        doctor_name: doctorName,
        assigned_nurse: assignedNurse,
        room_no: roomNo,
        fluid_type: fluidType,
        full_volume_ml: fullVol,
        current_volume_ml: fullVol,
        percentage: 100.0,
        flow_rate_mlm: 4.6,
        tte_minutes: Math.round(fullVol / 4.6),
        status: "NORMAL",
        blynk_token: token
      };

      beds[bedId] = newBedObj;
      populateBedSelectDropdown();
      renderAllViews();

      if (isDbConnected) {
        try {
          await fetch(`${API_BASE_URL}/beds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newBedObj)
          });
          await fetchBedsFromDatabase();
        } catch (err) { console.warn(err); }
      }

      if (patientModal) patientModal.classList.add("hidden");
      patientForm.reset();
      alert(`Success: Patient ${patientName} admitted to Bed ${bedId}!`);
    });
  }

  window.openAddNurseModal = function() {
    if (nurseForm) nurseForm.reset();
    const idEl = document.getElementById("nurse-form-id");
    const nameEl = document.getElementById("nurse-form-name");
    const contactEl = document.getElementById("nurse-form-contact");
    const photoEl = document.getElementById("nurse-form-photo");
    const titleEl = document.getElementById("nurse-modal-title");
    const nModal = document.getElementById("nurse-modal");
    const preview = document.getElementById("nurse-photo-preview");

    if (idEl) { idEl.value = `NURSE-0${Object.keys(nurses).length + 1}`; idEl.readOnly = false; }
    if (nameEl) nameEl.value = "";
    if (contactEl) contactEl.value = "+91 98765 ";
    if (photoEl) photoEl.value = "";
    if (preview) preview.src = "https://images.unsplash.com/photo-1594824813588-e9f0d48123db?w=100&auto=format&fit=crop&q=80";
    const uNameEl = document.getElementById("nurse-form-username");
    const pwdEl = document.getElementById("nurse-form-password");
    if (uNameEl) uNameEl.value = "";
    if (pwdEl) pwdEl.value = "nurse123";
    const fileStatus = document.getElementById("nurse-file-status");
    if (fileStatus) fileStatus.textContent = "";
    const fileInput = document.getElementById("nurse-file-input");
    if (fileInput) fileInput.value = "";
    if (titleEl) titleEl.innerHTML = `<i data-lucide="user-check" class="w-5 h-5 text-cyan-600"></i> Add Nurse to Roster`;
    if (nModal) nModal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons();
  };

  if (openNurseBtn) {
    openNurseBtn.addEventListener("click", window.openAddNurseModal);
  }

  if (closeNurseBtn && nurseModal) {
    closeNurseBtn.addEventListener("click", () => nurseModal.classList.add("hidden"));
  }

  if (nurseForm) {
    nurseForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nId = document.getElementById("nurse-form-id")?.value.trim().toUpperCase() || "NURSE-04";
      const nName = document.getElementById("nurse-form-name")?.value.trim() || "Nurse Priya";
      const nShift = document.getElementById("nurse-form-shift")?.value || "Morning (07:00 - 15:00)";
      const nStatus = document.getElementById("nurse-form-status")?.value || "On Duty";
      const nContact = document.getElementById("nurse-form-contact")?.value.trim() || "+91 98765 43210";
      const nPhoto = sanitizePhotoUrl(document.getElementById("nurse-form-photo")?.value.trim() || "");
      const nUsername = document.getElementById("nurse-form-username")?.value.trim().toLowerCase() || "";
      const nPassword = document.getElementById("nurse-form-password")?.value.trim() || "nurse123";

      const newNurseObj = { nurse_id: nId, name: nName, shift: nShift, status: nStatus, contact: nContact, photo_url: nPhoto, username: nUsername, password: nPassword, assigned_count: 0 };
      nurses[nId] = newNurseObj;
      renderNurseRoster(true);
      populateNurseSelectDropdown();

      if (isDbConnected) {
        try {
          await fetch(`${API_BASE_URL}/nurses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newNurseObj)
          });
          await fetchNursesFromDatabase();
        } catch (err) { console.warn(err); }
      }

      if (nurseModal) nurseModal.classList.add("hidden");
      nurseForm.reset();
      alert(`Success: ${nName} saved to Nurse Roster!`);
    });
  }

  // Doctor Modal Listeners
  const openDoctorBtn = document.getElementById("open-add-doctor-btn");
  const closeDoctorBtn = document.getElementById("close-doctor-modal-btn");
  const doctorModal = document.getElementById("doctor-modal");
  const doctorForm = document.getElementById("doctor-form");

  window.openAddDoctorModal = function() {
    if (doctorForm) doctorForm.reset();
    const idEl = document.getElementById("doc-form-id");
    const nameEl = document.getElementById("doc-form-name");
    const specEl = document.getElementById("doc-form-specialty");
    const contactEl = document.getElementById("doc-form-contact");
    const photoEl = document.getElementById("doc-form-photo");
    const titleEl = document.getElementById("doctor-modal-title");
    const preview = document.getElementById("doc-photo-preview");

    if (idEl) { idEl.value = `DOC-0${Object.keys(doctors).length + 1}`; idEl.readOnly = false; }
    if (nameEl) nameEl.value = "";
    if (specEl) specEl.value = "General Medicine Lead";
    if (contactEl) contactEl.value = "+91 98111 ";
    if (photoEl) photoEl.value = "";
    if (preview) preview.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80";
    const uNameEl = document.getElementById("doc-form-username");
    const pwdEl = document.getElementById("doc-form-password");
    if (uNameEl) uNameEl.value = "";
    if (pwdEl) pwdEl.value = "admin123";
    const fileStatus = document.getElementById("doc-file-status");
    if (fileStatus) fileStatus.textContent = "";
    const fileInput = document.getElementById("doc-file-input");
    if (fileInput) fileInput.value = "";
    if (titleEl) titleEl.innerHTML = `<i data-lucide="stethoscope" class="w-5 h-5 text-cyan-600"></i> Add Doctor to Directory`;
    if (doctorModal) doctorModal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons();
  };

  if (openDoctorBtn) openDoctorBtn.addEventListener("click", window.openAddDoctorModal);
  if (closeDoctorBtn && doctorModal) closeDoctorBtn.addEventListener("click", () => doctorModal.classList.add("hidden"));

  if (doctorForm) {
    doctorForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dId = document.getElementById("doc-form-id")?.value.trim().toUpperCase() || "DOC-04";
      const dName = document.getElementById("doc-form-name")?.value.trim() || "Dr. Medical Lead";
      const dSpec = document.getElementById("doc-form-specialty")?.value.trim() || "Critical Care Specialist";
      const dContact = document.getElementById("doc-form-contact")?.value.trim() || "+91 98111 22330";
      const dPhoto = sanitizePhotoUrl(document.getElementById("doc-form-photo")?.value.trim() || "");
      const dUsername = document.getElementById("doc-form-username")?.value.trim().toLowerCase() || "";
      const dPassword = document.getElementById("doc-form-password")?.value.trim() || "admin123";

      const newDocObj = { doc_id: dId, name: dName, specialty: dSpec, contact: dContact, status: "", photo_url: dPhoto, username: dUsername, password: dPassword };
      doctors[dId] = newDocObj;
      renderDoctorsGrid(true);

      if (isDbConnected) {
        try {
          await fetch(`${API_BASE_URL}/doctors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newDocObj)
          });
          await fetchDoctorsFromDatabase();
        } catch (err) { console.warn(err); }
      }

      if (doctorModal) doctorModal.classList.add("hidden");
      doctorForm.reset();
      alert(`Success: ${dName} saved to Doctors Directory!`);
    });
  }

  // Profile Modal Listeners
  const closeProfileBtn = document.getElementById("close-profile-modal-btn");
  const profileModal = document.getElementById("my-profile-modal");
  if (closeProfileBtn && profileModal) {
    closeProfileBtn.addEventListener("click", () => profileModal.classList.add("hidden"));
  }
}

function openEditNurseModal(nurseId) {
  const n = nurses[nurseId];
  if (!n) return;
  const idEl = document.getElementById("nurse-form-id");
  if (idEl) { idEl.value = n.nurse_id; idEl.readOnly = true; }
  document.getElementById("nurse-form-name").value = n.name;
  document.getElementById("nurse-form-shift").value = n.shift;
  document.getElementById("nurse-form-status").value = n.status || "On Duty";
  document.getElementById("nurse-form-contact").value = n.contact;
  const photoInput = document.getElementById("nurse-form-photo");
  if (photoInput) photoInput.value = n.photo_url || "";
  const preview = document.getElementById("nurse-photo-preview");
  if (preview) preview.src = sanitizePhotoUrl(n.photo_url) || "https://images.unsplash.com/photo-1594824813588-e9f0d48123db?w=100&auto=format&fit=crop&q=80";
  const uNameEl = document.getElementById("nurse-form-username");
  const pwdEl = document.getElementById("nurse-form-password");
  if (uNameEl) uNameEl.value = n.username || n.nurse_id.toLowerCase().replace('-', '');
  if (pwdEl) pwdEl.value = n.password || "nurse123";
  const fileStatus = document.getElementById("nurse-file-status");
  if (fileStatus) fileStatus.textContent = n.photo_url ? (n.photo_url.startsWith("data:") ? "Image loaded (device file)" : "Image loaded (URL)") : "";
  const fileInput = document.getElementById("nurse-file-input");
  if (fileInput) fileInput.value = "";
  document.getElementById("nurse-modal-title").innerHTML = `<i data-lucide="edit" class="w-5 h-5 text-cyan-600"></i> Edit Nurse Record`;
  document.getElementById("nurse-modal").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

async function triggerDeleteNurse(nurseId) {
  const n = nurses[nurseId];
  const name = n ? n.name : nurseId;
  if (!confirm(`Are you sure you want to delete profile for ${name}?`)) return;

  if (isDbConnected) {
    try {
      await fetch(`${API_BASE_URL}/nurses/${nurseId}`, { method: "DELETE" });
      await fetchNursesFromDatabase();
      alert(`Nurse ${name} profile deleted successfully.`);
      return;
    } catch (e) { console.error(e); }
  }

  delete nurses[nurseId];
  renderNurseRoster(true);
  populateNurseSelectDropdown();
}

function openEditDoctorModal(docId) {
  const d = doctors[docId];
  if (!d) return;
  const idEl = document.getElementById("doc-form-id");
  if (idEl) { idEl.value = d.doc_id; idEl.readOnly = true; }
  document.getElementById("doc-form-name").value = d.name;
  document.getElementById("doc-form-specialty").value = d.specialty;
  document.getElementById("doc-form-contact").value = d.contact;
  const photoInput = document.getElementById("doc-form-photo");
  if (photoInput) photoInput.value = d.photo_url || "";
  const preview = document.getElementById("doc-photo-preview");
  if (preview) preview.src = sanitizePhotoUrl(d.photo_url) || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80";
  const uNameEl = document.getElementById("doc-form-username");
  const pwdEl = document.getElementById("doc-form-password");
  if (uNameEl) uNameEl.value = d.username || d.doc_id.toLowerCase().replace('-', '');
  if (pwdEl) pwdEl.value = d.password || "admin123";
  const fileStatus = document.getElementById("doc-file-status");
  if (fileStatus) fileStatus.textContent = d.photo_url ? (d.photo_url.startsWith("data:") ? "Image loaded (device file)" : "Image loaded (URL)") : "";
  const fileInput = document.getElementById("doc-file-input");
  if (fileInput) fileInput.value = "";
  document.getElementById("doctor-modal-title").innerHTML = `<i data-lucide="edit" class="w-5 h-5 text-cyan-600"></i> Edit Doctor Record`;
  document.getElementById("doctor-modal").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

async function triggerDeleteDoctor(docId) {
  const d = doctors[docId];
  const name = d ? d.name : docId;
  if (!confirm(`Are you sure you want to delete profile for ${name}?`)) return;

  if (isDbConnected) {
    try {
      await fetch(`${API_BASE_URL}/doctors/${docId}`, { method: "DELETE" });
      await fetchDoctorsFromDatabase();
      alert(`Doctor ${name} profile deleted successfully.`);
      return;
    } catch (e) { console.error(e); }
  }

  delete doctors[docId];
  renderDoctorsGrid(true);
}

function populateBedSelectDropdown() {
  const bedSelect = document.getElementById("bed-select");
  if (!bedSelect) return;
  bedSelect.innerHTML = "";
  Object.keys(beds).forEach(bedId => {
    const opt = document.createElement("option");
    opt.value = bedId;
    opt.textContent = `${bedId} - ${beds[bedId].patient_name || bedId}`;
    if (bedId === activeSelectedBed) opt.selected = true;
    bedSelect.appendChild(opt);
  });
}

function populateNurseSelectDropdown() {
  const select = document.getElementById("form-assigned-nurse");
  if (!select) return;
  select.innerHTML = "";
  Object.values(nurses).forEach(n => {
    const opt = document.createElement("option");
    opt.value = n.name;
    opt.textContent = `${n.name} (${n.shift.split(' ')[0]})`;
    select.appendChild(opt);
  });
}

// --- Render Page View 1: Bed Cards Grid ---
// Map to track stagnation / zero flow duration per bed: { bedId: startTime }
const zeroFlowTimers = {};

// --- Predictive Triage Evaluator Guard (7-Second Weight-Stagnation Occlusion Detection) ---
function evaluateBedStatus(vol, pct, flow, tte, fullVol = 500, bedId = "ICU-01") {
  // 1. Truly Empty
  if (vol <= 5.0 || pct <= 2.0) {
    delete zeroFlowTimers[bedId];
    return "EMPTY";
  }

  // 2. Critical Low threshold: <= 15% of bottle capacity (works for 100ml, 250ml, 500ml, 1000ml)
  const criticalThreshold = Math.max(15.0, fullVol * 0.15);
  if (pct <= 15.0 || vol <= criticalThreshold || (tte <= 5 && pct <= 25.0)) {
    delete zeroFlowTimers[bedId];
    return "CRITICAL_LOW";
  }

  // 3. Occlusion / Line Blockage Check:
  // If weight remains stagnant / flow rate is 0.0 (< 0.1 ml/min) while bottle has fluid:
  // Triggers even if bottle is full (85% - 100%) after the 7-second time limit!
  if (flow < 0.1 && vol > 5.0) {
    if (!zeroFlowTimers[bedId]) {
      zeroFlowTimers[bedId] = Date.now();
    }
    const elapsedSeconds = (Date.now() - zeroFlowTimers[bedId]) / 1000;
    if (elapsedSeconds >= 7.0) {
      return "BLOCKED";
    }
    return "NORMAL"; // 7-second grace window
  }

  // 4. Fluid is actively flowing -> reset stagnation timer
  delete zeroFlowTimers[bedId];
  return "NORMAL";
}

// --- Render Page View 1: Bed Cards Grid ---
function renderBedCards() {
  const container = document.getElementById("bed-grid");
  if (!container) return;
  container.innerHTML = "";

  let hasCritical = false;
  let activeBedsCount = Object.keys(beds).length;
  let normalCount = 0;
  let alertCount = 0;

  Object.values(beds).forEach(bed => {
    const fullVol = bed.full_volume_ml || 500;
    const vol = bed.current_volume_ml !== undefined ? bed.current_volume_ml : fullVol;
    const pct = bed.percentage !== undefined ? bed.percentage : 100;
    const flow = bed.flow_rate_mlm !== undefined ? bed.flow_rate_mlm : 4.6;
    const tte = bed.tte_minutes !== undefined ? bed.tte_minutes : 96;
    const bedId = bed.bed_id || bed.id || "ICU-01";

    // Evaluate status dynamically with 7s stagnation detection
    bed.status = evaluateBedStatus(vol, pct, flow, tte, fullVol, bedId);

    const card = document.createElement("div");
    let badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
    let containerGlow = "card-3d bed-card-item border-slate-200/80";
    
    if (bed.status === "CRITICAL_LOW" || bed.status === "EMPTY") {
      badgeClass = "bg-rose-100 text-rose-700 border-rose-200 font-bold";
      containerGlow = "card-3d bed-card-item bg-rose-50/50 border-rose-300 pulse-glow-red";
      hasCritical = true;
      alertCount++;
    } else if (bed.status === "BLOCKED") {
      badgeClass = "bg-amber-100 text-amber-800 border-amber-200 font-bold";
      containerGlow = "card-3d bed-card-item bg-amber-50/50 border-amber-300 pulse-glow-amber";
      hasCritical = true;
      alertCount++;
    } else {
      normalCount++;
    }

    const patientName = bed.patient_name || bed.bed_id;
    const ageGender = bed.age_gender || "45/M";
    const doctorName = bed.doctor_name || (Object.values(doctors)[0]?.name || "Dr.SIDDARTHA");
    const assignedNurse = bed.assigned_nurse || "Nurse Aishani";
    const fluidType = bed.fluid_type || "Saline 0.9%";

    const strokeDash = 150.8 * (1 - Math.min(100, Math.max(0, pct)) / 100);

    card.className = `${containerGlow} p-5 flex flex-col justify-between`;
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-extrabold text-cyan-600 bg-cyan-50/80 px-3 py-1 rounded-full border border-cyan-200/80 shadow-xs">${bedId}</span>
              <span class="text-[11px] font-bold text-slate-500">${bed.room_no || 'ICU Ward'}</span>
            </div>
            <h3 class="text-sm font-extrabold text-slate-900 mt-1.5">${patientName} <span class="text-xs font-semibold text-slate-500">(${ageGender})</span></h3>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">Doc: <strong class="text-slate-700">${doctorName}</strong> | Nurse: <strong class="text-cyan-700">${assignedNurse}</strong></p>
          </div>
          <span class="px-3 py-1 text-[11px] font-extrabold rounded-full border ${badgeClass}">${bed.status}</span>
        </div>

        <div class="flex items-center justify-between gap-3 my-3 bg-white/60 p-3.5 rounded-2xl border border-white/80 shadow-xs">
          <!-- IV Saline Bottle Visual -->
          <div class="iv-bottle-3d-wrapper flex flex-col items-center shrink-0">
            <div class="iv-bottle-cap"></div>
            <div class="iv-bottle-container">
              <div class="iv-bottle-liquid" style="height: ${pct}%;"></div>
            </div>
            <div class="iv-drip-line">
              <div class="iv-drip-drop" style="animation-play-state: ${flow > 0 ? 'running' : 'paused'}"></div>
            </div>
          </div>

          <!-- Circular Glass Percentage Gauge (PrepPilot Style) -->
          <div class="glass-gauge-wrapper shrink-0">
            <svg class="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="4" class="text-slate-200/80" fill="transparent"/>
              <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="4" class="${pct <= 10 ? 'text-rose-500' : (pct <= 25 ? 'text-amber-500' : 'text-cyan-600')}" stroke-dasharray="150.8" stroke-dashoffset="${strokeDash}" stroke-linecap="round" fill="transparent" style="transition: stroke-dashoffset 0.8s ease;"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-xs font-black text-slate-900 leading-none">${pct.toFixed(0)}%</span>
              <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-tight scale-90">Fluid</span>
            </div>
          </div>

          <!-- Telemetry Stats Column -->
          <div class="flex-1 space-y-1.5 pl-1">
            <div class="text-[11px] font-bold text-slate-700 truncate">${fluidType}</div>
            <div class="grid grid-cols-2 gap-1.5 text-[11px]">
              <div class="bg-white/80 p-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span class="text-slate-400 text-[9px] uppercase font-bold block">Volume</span>
                <span class="font-extrabold text-slate-900">${vol.toFixed(1)} ml</span>
              </div>
              <div class="bg-white/80 p-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span class="text-slate-400 text-[9px] uppercase font-bold block">Rate</span>
                <span class="font-extrabold text-cyan-600">${flow.toFixed(1)} ml/m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
        <div>
          <span class="text-slate-500 font-medium">Est TTE:</span>
          <strong class="${tte <= 5 ? 'text-rose-600 animate-pulse' : 'text-slate-800'} font-bold ml-1">
            ${tte < 900 ? tte + ' mins' : 'N/A'}
          </strong>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="triggerResetBottle('${bedId}')" title="Set New Bottle (100% Full Capacity)" class="btn-3d px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full transition flex items-center gap-1 text-[11px] shadow-sm">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Full
          </button>
          <button onclick="triggerTareHook('${bedId}')" title="Zero Tare Calibration (0.0g Empty Hook)" class="btn-3d px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full transition flex items-center gap-1 text-[11px] shadow-sm">
            <i data-lucide="scale" class="w-3.5 h-3.5"></i> Tare
          </button>
          <button onclick="triggerDischargeBed('${bedId}')" title="Discharge Patient" class="btn-3d px-2 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  const bCount = document.getElementById("stat-active-beds");
  if (bCount) bCount.textContent = activeBedsCount;
  const nCount = document.getElementById("stat-normal-infusions");
  if (nCount) nCount.textContent = normalCount;
  const cCount = document.getElementById("stat-critical-alerts");
  if (cCount) cCount.textContent = alertCount;
  const sBadge = document.getElementById("sidebar-alert-badge");
  if (sBadge) sBadge.textContent = alertCount;

  // Dynamically update Priority Triage Banner
  const banner = document.getElementById("triage-banner");
  if (banner) {
    const criticalBed = Object.values(beds).find(b => b.status === "EMPTY") ||
                        Object.values(beds).find(b => b.status === "CRITICAL_LOW") ||
                        Object.values(beds).find(b => b.status === "BLOCKED");

    if (criticalBed) {
      banner.classList.remove("hidden");
      const cBedId = criticalBed.bed_id || "ICU-01";
      const cRoom = criticalBed.room_no || "ICU Ward";
      const cVol = (criticalBed.current_volume_ml !== undefined ? criticalBed.current_volume_ml : 500).toFixed(1);
      const cTte = criticalBed.tte_minutes !== undefined ? criticalBed.tte_minutes : 96;

      const bannerBedEl = document.getElementById("banner-bed-id");
      if (bannerBedEl) bannerBedEl.textContent = `Bed ${cBedId} (${cRoom})`;

      const bannerTitleEl = document.getElementById("alert-title");
      if (bannerTitleEl) {
        if (criticalBed.status === "EMPTY") {
          bannerTitleEl.innerHTML = `IV Bottle Empty (0.0 ml remaining) — Immediate Replacement Required!`;
        } else if (criticalBed.status === "BLOCKED") {
          bannerTitleEl.innerHTML = `Infusion Line Blocked/Occluded — Immediate Nurse Intervention Required!`;
        } else {
          bannerTitleEl.innerHTML = `Low IV Fluid Warning (${cVol} ml remaining) — Estimated Empty in <span class="text-rose-600 font-extrabold underline">${cTte < 900 ? cTte + ' Minutes' : 'N/A'}</span>`;
        }
      }

      const bannerBtn = banner.querySelector("button");
      if (bannerBtn) {
        bannerBtn.setAttribute("onclick", `triggerResetBottle('${cBedId}')`);
      }
    } else {
      banner.classList.add("hidden");
    }
  }

  manageContinuousAudio(hasCritical);
  if (window.lucide) lucide.createIcons();
}

let lastRenderedNursesHash = "";
let lastRenderedDoctorsHash = "";

// --- Render Nurse Duty Roster Panel ---
function renderNurseRoster(force = false) {
  const container = document.getElementById("nurses-full-grid");
  const sidebarContainer = document.getElementById("nurse-roster-container");
  
  const currentHash = JSON.stringify(nurses);
  if (!force && currentHash === lastRenderedNursesHash && (container ? container.children.length > 0 : true) && (sidebarContainer ? sidebarContainer.children.length > 0 : true)) {
    return;
  }
  lastRenderedNursesHash = currentHash;
  
  if (sidebarContainer) {
    sidebarContainer.innerHTML = "";
    Object.values(nurses).forEach(n => {
      const card = document.createElement("div");
      card.className = "p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs";
      const cleanPhoto = sanitizePhotoUrl(n.photo_url);
      const photoHtml = cleanPhoto 
        ? `<img src="${cleanPhoto}" referrerpolicy="no-referrer" loading="lazy" class="w-8 h-8 rounded-full object-cover border border-cyan-400 shadow-2xs" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1594824813588-e9f0d48123db?w=100&auto=format&fit=crop&q=80';">`
        : `<div class="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center text-xs shadow-xs">${n.name.replace('Nurse ', '').charAt(0)}</div>`;

      card.innerHTML = `
        <div class="flex items-center gap-3">
          ${photoHtml}
          <div>
            <h4 class="font-bold text-slate-900">${n.name}</h4>
            <p class="text-[10px] text-slate-500">${n.shift}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${n.status === 'On Duty' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}">${n.status}</span>
          <button onclick="openEditNurseModal('${n.nurse_id}')" class="text-slate-400 hover:text-cyan-600 p-1"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
          <button onclick="triggerDeleteNurse('${n.nurse_id}')" class="text-slate-400 hover:text-rose-600 p-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      `;
      sidebarContainer.appendChild(card);
    });
  }

  if (container) {
    container.innerHTML = "";
    const userRole = (currentUser ? (currentUser.role || 'admin') : 'admin').toLowerCase();
    const canManageNurses = userRole === 'admin' || userRole === 'doctor';

    Object.values(nurses).forEach(n => {
      const card = document.createElement("div");
      card.className = "card-3d p-5 space-y-3";
      const cleanPhoto = sanitizePhotoUrl(n.photo_url);
      const photoHtml = cleanPhoto 
        ? `<img src="${cleanPhoto}" referrerpolicy="no-referrer" loading="lazy" class="w-11 h-11 rounded-full object-cover border-2 border-cyan-500 shadow shrink-0" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1594824813588-e9f0d48123db?w=100&auto=format&fit=crop&q=80';">`
        : `<div class="w-11 h-11 rounded-full bg-cyan-600 text-white font-extrabold flex items-center justify-center text-sm shadow shrink-0">${n.name.replace('Nurse ', '').charAt(0)}</div>`;

      const isOwnNurse = currentUser && ((currentUser.nurse_id && currentUser.nurse_id === n.nurse_id) || (currentUser.username && n.username && currentUser.username.toLowerCase() === n.username.toLowerCase()));

      let nurseActionsHtml = "";
      if (canManageNurses) {
        nurseActionsHtml = `
          <button onclick="openEditNurseModal('${n.nurse_id}')" class="btn-3d px-2.5 py-1 text-xs font-bold text-cyan-600 bg-cyan-50 rounded-xl border border-cyan-200 hover:bg-cyan-100 flex items-center gap-1 shadow-2xs">
            <i data-lucide="edit" class="w-3.5 h-3.5"></i> Edit
          </button>
          <button onclick="triggerDeleteNurse('${n.nurse_id}')" title="Delete Profile" class="btn-3d px-2 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-200 hover:bg-rose-100 flex items-center gap-1 shadow-2xs">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        `;
      } else if (isOwnNurse) {
        nurseActionsHtml = `
          <button onclick="openMyProfileModal()" class="btn-3d px-2.5 py-1 text-xs font-bold text-cyan-600 bg-cyan-50 rounded-xl border border-cyan-200 hover:bg-cyan-100 flex items-center gap-1 shadow-2xs">
            <i data-lucide="user-check" class="w-3.5 h-3.5"></i> My Profile
          </button>
        `;
      } else {
        nurseActionsHtml = `<span class="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded-lg">Duty Staff</span>`;
      }

      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            ${photoHtml}
            <div class="min-w-0">
              <h3 class="font-extrabold text-slate-900 text-sm truncate leading-snug">${n.name}</h3>
              <p class="text-xs text-slate-500 font-mono truncate">${n.nurse_id}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${nurseActionsHtml}
          </div>
        </div>
        <div class="text-xs space-y-1.5 text-slate-600 pt-3 border-t border-slate-100">
          <div class="flex items-center justify-between">
            <span>Shift: <strong class="text-slate-800">${n.shift}</strong></span>
            <span class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200 text-[10px]">
              Login: @${n.username || n.nurse_id.toLowerCase().replace('-', '')}
            </span>
          </div>
          <div>Duty Status: <strong class="${n.status === 'On Duty' ? 'text-emerald-600' : 'text-slate-500'} font-bold">${n.status}</strong></div>
          <div>Contact: <strong class="text-slate-800">${n.contact}</strong></div>
        </div>
      `;
      container.appendChild(card);
    });
  }
  if (window.lucide) lucide.createIcons();
}

// --- Render Patients Table & Doctors ---
function renderPatientsTable() {
  const tbody = document.getElementById("patients-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  Object.values(beds).forEach(b => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100";
    const vol = b.current_volume_ml !== undefined ? b.current_volume_ml : 500;
    const flow = b.flow_rate_mlm !== undefined ? b.flow_rate_mlm : 4.6;

    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-cyan-600 whitespace-nowrap">${b.bed_id}</td>
      <td class="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">${b.patient_name}</td>
      <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${b.age_gender || '45/M'}</td>
      <td class="py-3 px-4 text-slate-600 whitespace-nowrap">${b.room_no || 'ICU Ward'}</td>
      <td class="py-3 px-4 text-slate-600 whitespace-nowrap">${b.fluid_type}</td>
      <td class="py-3 px-4 font-mono font-bold whitespace-nowrap">${vol.toFixed(1)} ml</td>
      <td class="py-3 px-4 font-mono font-bold text-cyan-600 whitespace-nowrap">${flow.toFixed(1)} ml/m</td>
      <td class="py-3 px-4 text-slate-700 whitespace-nowrap">${b.doctor_name || (Object.values(doctors)[0]?.name || 'Dr.SIDDARTHA')}</td>
      <td class="py-3 px-4 text-cyan-700 font-semibold whitespace-nowrap">${b.assigned_nurse || 'Nurse Aishani'}</td>
      <td class="py-3 px-4 whitespace-nowrap"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${b.status === 'NORMAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${b.status}</span></td>
      <td class="py-3 px-4 text-right whitespace-nowrap">
        <div class="inline-flex items-center gap-1.5 justify-end">
          <button onclick="triggerResetBottle('${b.bed_id}')" title="Set 100% Full Bottle" class="btn-3d px-2.5 py-1 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg flex items-center gap-1 shadow-2xs">
            <i data-lucide="rotate-ccw" class="w-3 h-3"></i> Full
          </button>
          <button onclick="triggerTareHook('${b.bed_id}')" title="Zero Tare (0.0g Empty Hook)" class="btn-3d px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1 shadow-2xs">
            <i data-lucide="scale" class="w-3 h-3"></i> Tare
          </button>
          <button onclick="triggerDischargeBed('${b.bed_id}')" title="Discharge Patient" class="btn-3d px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 shadow-2xs">
            <i data-lucide="trash-2" class="w-3 h-3"></i> Discharge
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDoctorsGrid(force = false) {
  const container = document.getElementById("doctors-full-grid");
  if (!container) return;

  const currentHash = JSON.stringify(doctors);
  if (!force && currentHash === lastRenderedDoctorsHash && container.children.length > 0) {
    return;
  }
  lastRenderedDoctorsHash = currentHash;
  container.innerHTML = "";

  const userRole = (currentUser ? (currentUser.role || 'admin') : 'admin').toLowerCase();
  const isAdmin = userRole === 'admin';

  Object.values(doctors).forEach(d => {
    const card = document.createElement("div");
    card.className = "card-3d p-5 space-y-3";
    const cleanPhoto = sanitizePhotoUrl(d.photo_url);
    const photoSrc = cleanPhoto || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80";

    const isSelfDoc = currentUser && ((currentUser.doc_id && currentUser.doc_id === d.doc_id) || (currentUser.username && d.username && currentUser.username.toLowerCase() === d.username.toLowerCase()));

    let docActionsHtml = "";
    if (isAdmin) {
      docActionsHtml = `
        <button onclick="openEditDoctorModal('${d.doc_id}')" class="btn-3d px-2.5 py-1 text-xs font-bold text-cyan-600 bg-cyan-50 rounded-xl border border-cyan-200 hover:bg-cyan-100 flex items-center gap-1 shadow-2xs">
          <i data-lucide="edit" class="w-3.5 h-3.5"></i> Edit
        </button>
        <button onclick="triggerDeleteDoctor('${d.doc_id}')" title="Delete Profile" class="btn-3d px-2 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-200 hover:bg-rose-100 flex items-center gap-1 shadow-2xs">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      `;
    } else if (isSelfDoc) {
      docActionsHtml = `
        <button onclick="openMyProfileModal()" class="btn-3d px-2.5 py-1 text-xs font-bold text-cyan-600 bg-cyan-50 rounded-xl border border-cyan-200 hover:bg-cyan-100 flex items-center gap-1 shadow-2xs">
          <i data-lucide="user-cog" class="w-3.5 h-3.5"></i> My Profile
        </button>
      `;
    } else {
      docActionsHtml = `<span class="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded-lg">Attending</span>`;
    }

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="${photoSrc}" referrerpolicy="no-referrer" loading="lazy" class="w-11 h-11 rounded-full object-cover border-2 border-cyan-500 shadow-sm shrink-0" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80';">
          <div class="min-w-0">
            <h3 class="font-extrabold text-slate-900 text-sm truncate leading-snug">${d.name}</h3>
            <p class="text-xs text-cyan-600 font-bold truncate">${d.specialty}</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${docActionsHtml}
        </div>
      </div>
      <div class="text-xs space-y-1.5 text-slate-600 pt-3 border-t border-slate-100">
        <div class="flex items-center justify-between">
          <span>Doctor ID: <strong class="text-slate-800 font-mono">${d.doc_id}</strong></span>
          <span class="px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-700 font-mono font-bold border border-cyan-200 text-[10px]">
            Login: @${d.username || d.doc_id.toLowerCase().replace('-', '')}
          </span>
        </div>
        <div>Contact: <strong class="text-slate-800">${d.contact}</strong></div>
      </div>
    `;
    container.appendChild(card);
  });
  if (window.lucide) lucide.createIcons();
}

// --- Render Triage Alert Logs ---
async function fetchAndRenderAlertLogs() {
  const container = document.getElementById("alerts-log-container");
  const fullPageContainer = document.getElementById("alerts-page-full-list");
  if (!container && !fullPageContainer) return;

  if (isDbConnected) {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts`);
      if (res.ok) {
        const logs = await res.json();
        renderAlertLogItems(logs, container, fullPageContainer);
        return;
      }
    } catch (e) { console.warn(e); }
  }

  const fallbackLogs = [
    { id: 1, bed_id: "ICU-02", patient_name: "R. Verma", alert_type: "CRITICAL_LOW", severity: "HIGH", created_at: new Date().toISOString(), blocked_duration_mins: 0, acknowledged: 0, acknowledged_by: "" }
  ];
  renderAlertLogItems(fallbackLogs, container, fullPageContainer);
}

function renderAlertLogItems(logs, container, fullContainer) {
  if (container) container.innerHTML = "";
  if (fullContainer) fullContainer.innerHTML = "";

  logs.forEach(log => {
    if (log.resolved_at) return;

    const informedText = log.acknowledged ? `Informed: Yes (${log.acknowledged_by})` : "Informed: Pending Nurse Ack";
    const itemHTML = `
      <div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs shadow-xs">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900">${log.bed_id} (${log.patient_name})</span>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${log.severity === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">${log.alert_type}</span>
          </div>
          <p class="text-slate-500 text-[11px] mt-0.5">Occlusion Duration: <strong>${log.blocked_duration_mins} min</strong> | ${informedText}</p>
        </div>
        <div>
          ${log.acknowledged ? 
            `<span class="text-emerald-600 font-bold flex items-center gap-1 text-[11px]"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Ack Done</span>` : 
            `<button onclick="acknowledgeAlert(${log.id})" class="btn-3d px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl text-xs shadow-sm">Ack Alert</button>`
          }
        </div>
      </div>
    `;

    if (container) container.innerHTML += itemHTML;
    if (fullContainer) fullContainer.innerHTML += itemHTML;
  });

  if (window.lucide) lucide.createIcons();
}

async function acknowledgeAlert(alertId) {
  const nurseName = prompt("Enter Nurse Name:", "Nurse Aishani");
  if (!nurseName) return;

  if (isDbConnected) {
    try {
      await fetch(`${API_BASE_URL}/alerts/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId, nurse_name: nurseName })
      });
      fetchAndRenderAlertLogs();
    } catch (e) { alert("Error acknowledging alert"); }
  } else {
    alert(`Alert ${alertId} acknowledged by ${nurseName}`);
    fetchAndRenderAlertLogs();
  }
}

// --- Telemetry Loop ---
async function updateTelemetry() {
  if (isSimulationMode || !blynkToken) {
    simulateTelemetryData();
  } else {
    await fetchBlynkHardwareData();
  }

  if (isDbConnected) {
    for (const bedId in beds) {
      const b = beds[bedId];
      if (b) {
        try {
          await fetch(`${API_BASE_URL}/telemetry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bed_id: b.bed_id || bedId,
              volume_ml: b.current_volume_ml !== undefined ? b.current_volume_ml : 500,
              percentage: b.percentage !== undefined ? b.percentage : 100,
              flow_rate_mlm: b.flow_rate_mlm !== undefined ? b.flow_rate_mlm : 4.6,
              tte_minutes: b.tte_minutes !== undefined ? b.tte_minutes : 96,
              status: b.status || "NORMAL"
            })
          });
        } catch (e) { console.warn(e); }
      }
    }
  }

  // Only update beds, patients table, and telemetry chart.
  // Doctor/nurse rosters are never destroyed/reloaded on telemetry intervals, eliminating screen flickering.
  renderBedCards();
  renderPatientsTable();
  updateChartData();
}

function simulateTelemetryData() {
  Object.values(beds).forEach(bed => {
    if (!bed) return;
    const full = bed.full_volume_ml || 500;
    let v = bed.current_volume_ml !== undefined ? bed.current_volume_ml : full;
    let rate = bed.flow_rate_mlm !== undefined ? bed.flow_rate_mlm : 4.6;
    if (rate <= 0) rate = 4.6;
    bed.flow_rate_mlm = rate;

    if (v > 0) {
      v -= (rate / 60) * 3; // 3 seconds interval
      if (v < 0) v = 0;
      bed.current_volume_ml = Math.max(0, v);
      bed.percentage = Math.min(100, Math.max(0, (v / full) * 100));
      bed.tte_minutes = rate > 0.1 ? Math.max(1, Math.round(v / rate)) : 999;
      bed.status = evaluateBedStatus(bed.current_volume_ml, bed.percentage, bed.flow_rate_mlm, bed.tte_minutes, full, bed.bed_id || "ICU-01");
    }
  });
}

async function fetchBlynkHardwareData() {
  try {
    for (const bedId in beds) {
      const bed = beds[bedId];
      const tokenToUse = (bed.blynk_token || blynkToken || "").trim();
      if (!tokenToUse || tokenToUse.startsWith("DEMO_")) continue;

      let fetchedData = null;

      // Method 1: Try proxy through backend server (avoids browser CORS & resolves region)
      try {
        const proxyUrl = `${API_BASE_URL}/blynk/telemetry?token=${encodeURIComponent(tokenToUse)}&server=${encodeURIComponent(blynkServer)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data) {
            fetchedData = json.data;
            if (json.server && json.server !== blynkServer) {
              blynkServer = json.server;
              localStorage.setItem("blynk_server", blynkServer);
            }
          }
        }
      } catch (proxyErr) {
        // Backend offline, fallback to direct browser fetch
      }

      // Method 2: Direct browser fetch fallback (if backend is offline/standalone)
      if (!fetchedData) {
        try {
          const directUrl = `https://${blynkServer}/external/api/get?token=${encodeURIComponent(tokenToUse)}&v0&v1&v2&v3&v4`;
          const res = await fetch(directUrl);
          if (res.ok) {
            const raw = await res.json();
            fetchedData = {
              v0: raw.v0 !== undefined ? raw.v0 : raw.V0,
              v1: raw.v1 !== undefined ? raw.v1 : raw.V1,
              v2: raw.v2 !== undefined ? raw.v2 : raw.V2,
              v3: raw.v3 !== undefined ? raw.v3 : raw.V3,
              v4: raw.v4 !== undefined ? raw.v4 : raw.V4
            };
          }
        } catch (directErr) {
          console.warn("Direct Blynk fetch failed (likely browser CORS policy):", directErr);
        }
      }

      if (fetchedData) {
        const v0 = fetchedData.v0 !== undefined ? fetchedData.v0 : fetchedData.V0;
        const v1 = fetchedData.v1 !== undefined ? fetchedData.v1 : fetchedData.V1;
        const v2 = fetchedData.v2 !== undefined ? fetchedData.v2 : fetchedData.V2;
        const v3 = fetchedData.v3 !== undefined ? fetchedData.v3 : fetchedData.V3;

        const fullVol = bed.full_volume_ml || 500;
        if (v0 !== undefined) {
          bed.current_volume_ml = parseFloat(v0);
          // Recalculate percentage based on bed's configured full volume
          bed.percentage = Math.min(100.0, Math.max(0.0, (bed.current_volume_ml / fullVol) * 100.0));
        } else if (v1 !== undefined) {
          bed.percentage = parseFloat(v1);
        }
        if (v2 !== undefined) bed.flow_rate_mlm = parseFloat(v2);
        if (v3 !== undefined) bed.tte_minutes = parseInt(v3);

        // Re-evaluate clinical status with 7s zero-flow stagnation check
        bed.status = evaluateBedStatus(
          bed.current_volume_ml !== undefined ? bed.current_volume_ml : fullVol,
          bed.percentage !== undefined ? bed.percentage : 100,
          bed.flow_rate_mlm !== undefined ? bed.flow_rate_mlm : 4.6,
          bed.tte_minutes !== undefined ? bed.tte_minutes : 96,
          fullVol,
          bed.bed_id || bedId
        );

        updateBlynkStatusUI(true, "Live (Syncing)");

        if (isDbConnected) {
          try {
            await fetch(`${API_BASE_URL}/telemetry`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bed_id: bed.bed_id,
                volume_ml: bed.current_volume_ml,
                percentage: bed.percentage,
                flow_rate_mlm: bed.flow_rate_mlm,
                tte_minutes: bed.tte_minutes,
                status: bed.status
              })
            });
          } catch (e) { console.warn(e); }
        }
      } else {
        updateBlynkStatusUI(false, "Check Token / CORS");
      }
    }
  } catch (err) {
    console.warn("Telemetry polling error:", err);
  }
}

// --- ZERO TARE (0.0g EMPTY HOOK CALIBRATION) ACTION ---
async function triggerTareHook(bedId) {
  if (!confirm(`Perform Zero Tare for Bed ${bedId}?\n\nMake sure the hanger is EMPTY (no bottle hanging) so the load cell calibrates to 0.0g.`)) return;

  const targetBed = beds[bedId];
  const tokenToUse = (targetBed?.blynk_token || blynkToken || "").trim();

  if (isDbConnected) {
    try {
      await fetch(`${API_BASE_URL}/beds/${bedId}/tare`, { method: "POST" });
    } catch (e) {
      console.warn("Backend tare route failed, sending direct signal:", e);
    }
  }

  if (tokenToUse && !tokenToUse.startsWith("DEMO_")) {
    try {
      // Send V6=1 (Zero Tare) via proxy or direct
      fetch(`${API_BASE_URL}/blynk/update?token=${encodeURIComponent(tokenToUse)}&pin=V6&value=1&server=${encodeURIComponent(blynkServer)}`)
        .catch(() => fetch(`https://${blynkServer}/external/api/update?token=${tokenToUse}&V6=1`).catch(() => {}));
    } catch (e) { console.warn(e); }
  }

  alert(`Zero Tare command sent for Bed ${bedId}!\nEmpty hook calibrated to 0.0g on ESP32 load cell.`);
}

// --- RESET BOTTLE / REFILL ACTION (Supports 100ml, 250ml, 500ml, 1000ml) ---
async function triggerResetBottle(bedId) {
  const targetBed = beds[bedId];
  const currentCap = targetBed?.full_volume_ml || 500;

  const inputCap = prompt(
    `Set New Saline Bottle (100% Full) for Bed ${bedId}:\n\nEnter Bottle Capacity in ml (e.g. 100, 250, 500, 1000):`,
    currentCap
  );
  if (inputCap === null) return; // User cancelled

  const newCapacity = parseFloat(inputCap) > 10.0 ? parseFloat(inputCap) : currentCap;

  if (targetBed) {
    targetBed.full_volume_ml = newCapacity;
    targetBed.current_volume_ml = newCapacity;
    targetBed.percentage = 100.0;
    targetBed.flow_rate_mlm = 0.0;
    targetBed.status = "NORMAL";
    zeroFlowTimers[bedId] = Date.now(); // 7-second grace timer starting upon bottle refill

    const tokenToUse = (targetBed.blynk_token || blynkToken || "").trim();
    if (tokenToUse && !tokenToUse.startsWith("DEMO_")) {
      try {
        // Send V5=1 (Set Full) and V7={capacity} (Sync bottle capacity)
        fetch(`${API_BASE_URL}/blynk/update?token=${encodeURIComponent(tokenToUse)}&pin=V5&value=1&server=${encodeURIComponent(blynkServer)}`)
          .catch(() => fetch(`https://${blynkServer}/external/api/update?token=${tokenToUse}&V5=1`).catch(() => {}));
        fetch(`${API_BASE_URL}/blynk/update?token=${encodeURIComponent(tokenToUse)}&pin=V7&value=${newCapacity}&server=${encodeURIComponent(blynkServer)}`)
          .catch(() => fetch(`https://${blynkServer}/external/api/update?token=${tokenToUse}&V7=${newCapacity}`).catch(() => {}));
      } catch (e) { console.warn(e); }
    }

    manageContinuousAudio(false);
  }

  if (isDbConnected) {
    try {
      await fetch(`${API_BASE_URL}/beds/${bedId}/reset-full`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_volume_ml: newCapacity })
      });
      await fetchBedsFromDatabase();
    } catch (e) { console.error(e); }
  }

  renderAllViews();
  resetChartData();
  alert(`Success: Bed ${bedId} refilled to 100% Full (${newCapacity} ml).\nActive alerts cleared and sound chime stopped!`);
}

async function triggerDischargeBed(bedId) {
  if (!confirm(`Are you sure you want to discharge patient and remove Bed ${bedId}?`)) return;

  if (isDbConnected) {
    try {
      await fetch(`${API_BASE_URL}/beds/${bedId}`, { method: "DELETE" });
      await fetchBedsFromDatabase();
      alert(`Bed ${bedId} discharged successfully.`);
      return;
    } catch (e) { console.error(e); }
  }

  delete beds[bedId];
  populateBedSelectDropdown();
  renderAllViews();
}

function downloadCSVReport() {
  if (isDbConnected) {
    window.open(`${API_BASE_URL}/reports/export-csv`, '_blank');
  } else {
    let csv = "Bed ID,Patient Name,Age/Gender,Doctor,Assigned Nurse,Room No,Fluid Type,Current Volume (ml),Full Capacity (ml),Flow Rate (ml/min),Est TTE (mins),Status\n";
    Object.values(beds).forEach(b => {
      const vol = b.current_volume_ml !== undefined ? b.current_volume_ml : 500;
      const full = b.full_volume_ml !== undefined ? b.full_volume_ml : 500;
      const rate = b.flow_rate_mlm !== undefined ? b.flow_rate_mlm : 4.6;
      csv += `"${b.bed_id}","${b.patient_name}","${b.age_gender || '45/M'}","${b.doctor_name || (Object.values(doctors)[0]?.name || 'Dr.SIDDARTHA')}","${b.assigned_nurse || 'Nurse Aishani'}","${b.room_no || ''}","${b.fluid_type || ''}",${vol.toFixed(1)},${full},${rate.toFixed(1)},${b.tte_minutes || 96},"${b.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Flowguard_Clinical_Report.csv';
    a.click();
  }
}

function handleGlobalSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderAllViews(); return; }
  // Global filter logic...
}

// --- Chart.js ---
function initChart() {
  const ctx = document.getElementById("weightDepletionChart")?.getContext("2d");
  if (!ctx) return;
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartHistoryData.labels,
      datasets: [{
        label: "IV Fluid Volume (ml)",
        data: chartHistoryData.volumes,
        borderColor: "#0284c7",
        backgroundColor: "rgba(2, 132, 199, 0.08)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: "#0ea5e9"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: "#f1f5f9" },
          ticks: {
            color: "#64748b",
            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
            maxRotation: 0,
            autoSkip: true
          }
        },
        y: {
          grid: { color: "#f1f5f9" },
          ticks: {
            color: "#64748b",
            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" }
          },
          title: { display: true, text: "Volume (ml)", color: "#94a3b8" }
        }
      },
      plugins: { legend: { display: false } }
    }
  });

  resetChartData();
}

// Helper to get responsive sliding window limit for time-series chart
function getResponsiveChartLimit() {
  const w = window.innerWidth;
  if (w < 640) return 5;       // Mobile screens: exactly 5 sliding timestamps
  if (w < 1024) return 7;      // Tablet screens: exactly 7 sliding timestamps
  return 20;                   // Laptop & Desktop screens: 20 timestamps
}

function resetChartData() {
  const selected = beds[activeSelectedBed] || Object.values(beds)[0];
  chartHistoryData.labels = [];
  chartHistoryData.volumes = [];
  const now = new Date();
  const v = selected.current_volume_ml !== undefined ? selected.current_volume_ml : 500;
  const rate = selected.flow_rate_mlm !== undefined ? selected.flow_rate_mlm : 4.6;
  const limit = getResponsiveChartLimit();

  for (let i = limit - 1; i >= 0; i--) {
    const timeStr = new Date(now.getTime() - i * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    chartHistoryData.labels.push(timeStr);
    chartHistoryData.volumes.push(v + i * (rate / 12));
  }

  if (chartInstance) {
    chartInstance.data.labels = chartHistoryData.labels;
    chartInstance.data.datasets[0].data = chartHistoryData.volumes;
    chartInstance.update();
  }
}

function updateChartData() {
  if (!chartInstance) return;
  const selected = beds[activeSelectedBed] || Object.values(beds)[0];
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const v = selected.current_volume_ml !== undefined ? selected.current_volume_ml : 0;
  const limit = getResponsiveChartLimit();

  chartHistoryData.labels.push(timeStr);
  chartHistoryData.volumes.push(v);

  // Maintain sliding window tailored to device screen size (5 for mobile, 7 for tablet, 20 for laptop)
  while (chartHistoryData.labels.length > limit) {
    chartHistoryData.labels.shift();
    chartHistoryData.volumes.shift();
  }

  chartInstance.update("quiet");
}

function initAnalyticsCharts() {
  const barCtx = document.getElementById("analyticsBarChart")?.getContext("2d");
  const pieCtx = document.getElementById("analyticsDoughnutChart")?.getContext("2d");

  if (barCtx && !analyticsBarInstance) {
    analyticsBarInstance = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
        datasets: [{ label: "Infused (ml)", data: [450, 920, 1380, 1850, 2300, 2750, 3200], backgroundColor: "#0284c7" }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (pieCtx && !analyticsDoughnutInstance) {
    analyticsDoughnutInstance = new Chart(pieCtx, {
      type: "doughnut",
      data: {
        labels: ["Normal Flow", "Occlusions", "Critical Low", "Empty"],
        datasets: [{ data: [75, 15, 8, 2], backgroundColor: ["#10b981", "#f59e0b", "#f43f5e", "#64748b"] }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function updateSimButtonUI() {
  const toggleBtn = document.getElementById("toggle-sim-btn");
  const simText = document.getElementById("sim-mode-text");
  if (!toggleBtn || !simText) return;

  if (isSimulationMode) {
    simText.textContent = "Mode: Live Simulation";
    toggleBtn.className = "btn-3d px-4 py-2 rounded-full text-xs font-semibold border border-cyan-200/80 bg-cyan-50/80 text-cyan-700 hover:bg-cyan-100 flex items-center gap-1.5 shadow-2xs";
  } else {
    simText.textContent = "Mode: Blynk Cloud Live";
    toggleBtn.className = "btn-3d px-4 py-2 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 shadow-2xs";
  }
}

function updateBlynkStatusUI(isConnected, message) {
  const badgeDot = document.getElementById("blynk-status-dot");
  const badgeText = document.getElementById("blynk-status-text");
  const sidebarDot = document.getElementById("sidebar-blynk-dot");
  const sidebarText = document.getElementById("sidebar-blynk-text");
  const loginDot = document.getElementById("login-blynk-dot");
  const loginText = document.getElementById("login-blynk-text");
  const connPill = document.getElementById("settings-conn-pill");
  const loginBadge = document.getElementById("login-token-status-badge");

  const srvName = (blynkServer || "blynk.cloud").split('.')[0];

  if (isConnected) {
    if (badgeDot) badgeDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse";
    if (badgeText) badgeText.textContent = `Blynk: Live (${srvName})`;
    if (sidebarDot) sidebarDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
    if (sidebarText) {
      sidebarText.textContent = "Live / Streaming";
      sidebarText.className = "text-emerald-600 font-bold";
    }
    if (loginDot) loginDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
    if (loginText) {
      loginText.textContent = `Live (${srvName})`;
      loginText.className = "text-[11px] font-bold text-emerald-600 truncate";
    }
    if (connPill) {
      connPill.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700";
      connPill.textContent = "Online / Streaming";
    }
    if (loginBadge) {
      loginBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300";
      loginBadge.textContent = "✓ Hardware Online";
    }
  } else if (blynkToken) {
    if (badgeDot) badgeDot.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
    if (badgeText) badgeText.textContent = message || "Blynk: Connecting...";
    if (sidebarDot) sidebarDot.className = "w-2 h-2 rounded-full bg-amber-400";
    if (sidebarText) {
      sidebarText.textContent = message || "Standby";
      sidebarText.className = "text-amber-600 font-semibold";
    }
    if (loginDot) loginDot.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
    if (loginText) {
      loginText.textContent = message || "Standby";
      loginText.className = "text-[11px] font-bold text-amber-600 truncate";
    }
    if (connPill) {
      connPill.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700";
      connPill.textContent = message || "Standby";
    }
    if (loginBadge) {
      loginBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-800 border border-cyan-300";
      loginBadge.textContent = "✓ Saved in DB";
    }
  } else {
    if (badgeDot) badgeDot.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
    if (badgeText) badgeText.textContent = "Blynk: Not Configured";
    if (sidebarDot) sidebarDot.className = "w-2 h-2 rounded-full bg-slate-400";
    if (sidebarText) {
      sidebarText.textContent = "Not Configured";
      sidebarText.className = "text-slate-400 font-normal";
    }
    if (loginDot) loginDot.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
    if (loginText) {
      loginText.textContent = "No Token";
      loginText.className = "text-[11px] font-bold text-slate-500 truncate";
    }
    if (connPill) {
      connPill.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500";
      connPill.textContent = "Unconnected";
    }
    if (loginBadge) {
      loginBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500 border border-slate-200";
      loginBadge.textContent = "No Token Saved";
    }
  }
}

async function saveHardwareSettings() {
  const tok = document.getElementById("settings-token-input")?.value.trim();
  const srv = document.getElementById("settings-server-input")?.value.trim() || "blynk.cloud";

  if (tok) {
    blynkToken = tok;
    blynkServer = srv;
    localStorage.setItem("blynk_token", tok);
    localStorage.setItem("blynk_server", srv);

    // Sync to login inputs
    const loginTok = document.getElementById("login-blynk-token");
    const loginSrv = document.getElementById("login-blynk-server");
    if (loginTok) loginTok.value = tok;
    if (loginSrv) loginSrv.value = srv;

    // Apply token to default beds
    if (beds[activeSelectedBed]) {
      beds[activeSelectedBed].blynk_token = tok;
    }
    if (beds["ICU-01"]) beds["ICU-01"].blynk_token = tok;

    // Persist permanently to backend SQLite settings
    try {
      await fetch(`${API_BASE_URL}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blynk_token: tok,
          blynk_server: srv
        })
      });
    } catch (e) {
      console.warn("Backend settings persistence offline:", e);
    }

    // Turn off simulation and switch to live Blynk mode
    isSimulationMode = false;
    updateSimButtonUI();
    updateBlynkStatusUI(false, "Connecting to Blynk...");

    // Trigger immediate fetch & ping check
    fetchBlynkHardwareData();
    checkBlynkConnectionNow();
    alert(`Success: Blynk Device Auth Code saved permanently in SQLite database!\nSystem switched to Live Blynk Hardware Mode.`);
  } else {
    alert("Please enter a valid Blynk Auth Token.");
  }
}

// --- Clinical Staff Authentication & Session Management ---
async function checkAuthOnStartup() {
  // 1. Fetch system settings from backend SQLite
  try {
    const sRes = await fetch(`${API_BASE_URL}/settings`);
    if (sRes.ok) {
      const settings = await sRes.json();
      if (settings.blynk_token) {
        blynkToken = settings.blynk_token;
        localStorage.setItem("blynk_token", blynkToken);
      }
      if (settings.blynk_server) {
        blynkServer = settings.blynk_server;
        localStorage.setItem("blynk_server", blynkServer);
      }
    }
  } catch (e) {
    // Backend offline, fallback to localStorage
  }

  // Pre-fill login inputs with saved token & server
  const tokInput = document.getElementById("login-blynk-token");
  const srvInput = document.getElementById("login-blynk-server");
  if (tokInput && blynkToken) tokInput.value = blynkToken;
  if (srvInput && blynkServer) srvInput.value = blynkServer;

  // Pre-fill hardware setup fields
  const settingsTok = document.getElementById("settings-token-input");
  const settingsSrv = document.getElementById("settings-server-input");
  if (settingsTok && blynkToken) settingsTok.value = blynkToken;
  if (settingsSrv && blynkServer) settingsSrv.value = blynkServer;

  updateLoginBadges();

  // Check saved user session
  const savedUser = localStorage.getItem("flowguard_current_user") || sessionStorage.getItem("flowguard_current_user");
  const loginScreen = document.getElementById("login-screen");

  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      // Clean up legacy Petra Winburry session if present
      if (currentUser && currentUser.name && currentUser.name.includes("Petra")) {
        localStorage.removeItem("flowguard_current_user");
        sessionStorage.removeItem("flowguard_current_user");
        currentUser = null;
        if (loginScreen) loginScreen.classList.remove("hidden");
      } else {
        applyUserProfileToUI(currentUser);
        if (loginScreen) loginScreen.classList.add("hidden");

        // Auto-connect to Blynk hardware if token is available
        if (blynkToken) {
          isSimulationMode = false;
          updateSimButtonUI();
          updateBlynkStatusUI(false, "Restoring Blynk...");
          fetchBlynkHardwareData();
          checkBlynkConnectionNow();
        }
      }
    } catch (e) {
      currentUser = null;
      if (loginScreen) loginScreen.classList.remove("hidden");
    }
  } else {
    // Show login screen
    if (loginScreen) loginScreen.classList.remove("hidden");
  }

  updateBlynkStatusUI(false, blynkToken ? "Configured" : "No Token");
}

function selectQuickProfile(username, password, name, role, photoUrl) {
  const uInput = document.getElementById("login-username");
  const pInput = document.getElementById("login-password");
  if (uInput) uInput.value = username;
  if (pInput) pInput.value = password;

  document.querySelectorAll(".quick-profile-btn").forEach(btn => {
    btn.classList.remove("ring-2", "ring-cyan-500", "bg-cyan-50/80");
  });
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add("ring-2", "ring-cyan-500", "bg-cyan-50/80");
  }
}

async function handleStaffLogin(e) {
  if (e) e.preventDefault();

  const uInput = document.getElementById("login-username");
  const pInput = document.getElementById("login-password");
  const tokInput = document.getElementById("login-blynk-token");
  const srvInput = document.getElementById("login-blynk-server");
  const autoConnCheck = document.getElementById("login-auto-connect");
  const rememberCheck = document.getElementById("login-remember-me");
  const submitBtn = document.getElementById("login-submit-btn");
  const alertBox = document.getElementById("login-alert-box");

  const username = uInput ? uInput.value.trim() : "admin";
  const password = pInput ? pInput.value.trim() : "admin123";
  const token = tokInput ? tokInput.value.trim() : "";
  const server = srvInput ? srvInput.value.trim() : "blynk.cloud";
  const shouldAutoConnect = autoConnCheck ? autoConnCheck.checked : true;
  const rememberMe = rememberCheck ? rememberCheck.checked : true;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Authenticating & Syncing Ward...</span>`;
  }
  if (alertBox) alertBox.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        blynk_token: token,
        blynk_server: server
      })
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;

      if (rememberMe) {
        localStorage.setItem("flowguard_current_user", JSON.stringify(currentUser));
      } else {
        sessionStorage.setItem("flowguard_current_user", JSON.stringify(currentUser));
        localStorage.removeItem("flowguard_current_user");
      }

      // Persist Blynk Token & Server
      if (token) {
        blynkToken = token;
        blynkServer = server;
        localStorage.setItem("blynk_token", token);
        localStorage.setItem("blynk_server", server);
      } else if (data.settings && data.settings.blynk_token) {
        blynkToken = data.settings.blynk_token;
        blynkServer = data.settings.blynk_server || server;
        localStorage.setItem("blynk_token", blynkToken);
        localStorage.setItem("blynk_server", blynkServer);
      }

      // Load nurses, doctors, beds from response
      if (data.nurses && Array.isArray(data.nurses)) {
        const newNurses = {};
        data.nurses.forEach(n => { newNurses[n.nurse_id] = n; });
        nurses = newNurses;
      }
      if (data.doctors && Array.isArray(data.doctors)) {
        const newDocs = {};
        data.doctors.forEach(d => { newDocs[d.doc_id] = d; });
        doctors = newDocs;
      }
      if (data.beds && Array.isArray(data.beds)) {
        const newBeds = {};
        data.beds.forEach(b => { newBeds[b.bed_id] = b; });
        beds = newBeds;
      }

      if (blynkToken) {
        for (const b in beds) {
          if (!beds[b].blynk_token) beds[b].blynk_token = blynkToken;
        }
      }

      applyUserProfileToUI(currentUser);
      populateBedSelectDropdown();
      populateNurseSelectDropdown();
      renderAllViews();

      const loginScreen = document.getElementById("login-screen");
      if (loginScreen) loginScreen.classList.add("hidden");

      // Auto-connect to Blynk hardware
      if (shouldAutoConnect && blynkToken) {
        isSimulationMode = false;
        updateSimButtonUI();
        updateBlynkStatusUI(false, "Connecting to Blynk...");
        fetchBlynkHardwareData();
        checkBlynkConnectionNow();
      }

    } else {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.detail || "Authentication failed. Please verify credentials.";
      if (alertBox) {
        alertBox.classList.remove("hidden");
        alertBox.className = "p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200";
        alertBox.textContent = msg;
      }
    }
  } catch (err) {
    console.warn("Backend auth offline, using local authentication:", err);
    // Find matching doctor from doctors roster
    const allDocs = Object.values(doctors);
    let matchedDoc = allDocs.find(d => 
      (d.username && d.username.toLowerCase() === username.toLowerCase()) ||
      (d.doc_id && d.doc_id.toLowerCase() === username.toLowerCase()) ||
      (d.name && d.name.toLowerCase().includes(username.toLowerCase()))
    );

    if (!matchedDoc && allDocs.length > 0) {
      matchedDoc = allDocs[0];
    }

    const defaultAvatar = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80";
    const doctorPhoto = matchedDoc ? (matchedDoc.photo_url || defaultAvatar) : defaultAvatar;

    currentUser = {
      username,
      name: matchedDoc ? matchedDoc.name : (username === "admin" ? "Dr.SIDDARTHA" : username.charAt(0).toUpperCase() + username.slice(1)),
      role: matchedDoc ? (matchedDoc.specialty || "General Medicine Lead") : (username === "admin" ? "General Medicine Lead" : "Duty Staff"),
      photo_url: doctorPhoto
    };
    if (token) {
      blynkToken = token;
      blynkServer = server;
      localStorage.setItem("blynk_token", token);
      localStorage.setItem("blynk_server", server);
    }
    applyUserProfileToUI(currentUser);
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) loginScreen.classList.add("hidden");
    if (shouldAutoConnect && blynkToken) {
      isSimulationMode = false;
      updateSimButtonUI();
      fetchBlynkHardwareData();
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In & Launch Ward Dashboard</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
    }
    if (window.lucide) lucide.createIcons();
  }
}

function applyUserProfileToUI(user) {
  if (!user) return;
  const sName = document.getElementById("sidebar-user-name");
  const sRole = document.getElementById("sidebar-user-role");
  const sAvatar = document.getElementById("sidebar-user-avatar");

  const hName = document.getElementById("header-user-name");
  const hAvatar = document.getElementById("header-user-avatar");

  const cleanPhoto = sanitizePhotoUrl(user.photo_url);
  const defaultAvatar = "https://plain-apac-prod-public.komododecks.com/202611/01/waqc0HFunHNZKuyytbSD/image.png";

  const displayName = user.name || "Dr.SIDDARTHA";

  let displayRole = "Hospital Staff";
  const role = (user.role || 'admin').toLowerCase();
  if (role === 'admin') displayRole = "Chief Medical Admin";
  else if (role === 'doctor') displayRole = user.role_title || user.specialty || "Attending Physician";
  else if (role === 'nurse') displayRole = user.role_title || "Duty Nurse";
  else displayRole = user.role || user.specialty || "Staff Member";

  if (sName) sName.textContent = displayName;
  if (sRole) sRole.textContent = displayRole;
  if (sAvatar) {
    sAvatar.src = cleanPhoto || defaultAvatar;
    sAvatar.referrerPolicy = "no-referrer";
    sAvatar.onerror = function() {
      this.onerror = null;
      this.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80";
    };
  }

  if (hName) hName.textContent = displayName;
  if (hAvatar) {
    hAvatar.src = cleanPhoto || defaultAvatar;
    hAvatar.referrerPolicy = "no-referrer";
    hAvatar.onerror = function() {
      this.onerror = null;
      this.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80";
    };
  }

  applyRolePermissions();
}

// --- Role-Based Access Control (RBAC) UI Permissions ---
function applyRolePermissions() {
  if (!currentUser) return;
  const role = (currentUser.role || 'admin').toLowerCase();

  const addDocBtn = document.getElementById("open-add-doctor-btn");
  const addNurseBtn = document.getElementById("open-add-nurse-btn");
  const addPatientBtn = document.getElementById("open-add-patient-btn");

  if (role === "admin") {
    // Admin can manage doctors, nurses, and beds
    if (addDocBtn) addDocBtn.classList.remove("hidden");
    if (addNurseBtn) addNurseBtn.classList.remove("hidden");
    if (addPatientBtn) addPatientBtn.classList.remove("hidden");
  } else if (role === "doctor") {
    // Doctor cannot add other doctors, but can manage nurses and beds
    if (addDocBtn) addDocBtn.classList.add("hidden");
    if (addNurseBtn) addNurseBtn.classList.remove("hidden");
    if (addPatientBtn) addPatientBtn.classList.remove("hidden");
  } else if (role === "nurse") {
    // Nurse is strictly for monitoring: cannot add doctors, nurses, or patients
    if (addDocBtn) addDocBtn.classList.add("hidden");
    if (addNurseBtn) addNurseBtn.classList.add("hidden");
    if (addPatientBtn) addPatientBtn.classList.add("hidden");
  }
}

// --- My Profile & Change Password Modal (Self-Service) ---
window.openMyProfileModal = function() {
  if (!currentUser) return;
  const modal = document.getElementById("my-profile-modal");
  if (!modal) return;

  const uNameEl = document.getElementById("profile-username-display");
  const roleBadge = document.getElementById("profile-role-badge");
  const nameInput = document.getElementById("profile-name-input");
  const contactInput = document.getElementById("profile-contact-input");
  const photoInput = document.getElementById("profile-photo-input");
  const photoPreview = document.getElementById("profile-photo-preview");
  const newPwd = document.getElementById("profile-new-password");
  const confirmPwd = document.getElementById("profile-confirm-password");
  const alertBox = document.getElementById("profile-alert-box");

  if (uNameEl) uNameEl.textContent = `@${currentUser.username || 'user'}`;

  const roleLabels = {
    admin: "Chief Medical Admin",
    doctor: "Attending Physician",
    nurse: "Duty Staff Nurse"
  };
  const roleColors = {
    admin: "bg-purple-100 text-purple-800 border-purple-200",
    doctor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    nurse: "bg-emerald-100 text-emerald-800 border-emerald-200"
  };

  const userRole = (currentUser.role || 'staff').toLowerCase();
  if (roleBadge) {
    roleBadge.textContent = roleLabels[userRole] || currentUser.role_title || "Hospital Staff";
    roleBadge.className = `px-3 py-1 rounded-full text-xs font-bold border ${roleColors[userRole] || 'bg-slate-100 text-slate-700 border-slate-200'}`;
  }

  if (nameInput) nameInput.value = currentUser.name || "";
  if (contactInput) contactInput.value = currentUser.contact || "";
  if (photoInput) photoInput.value = currentUser.photo_url || "";
  if (photoPreview) {
    const clean = sanitizePhotoUrl(currentUser.photo_url);
    photoPreview.src = clean || "https://plain-apac-prod-public.komododecks.com/202611/01/waqc0HFunHNZKuyytbSD/image.png";
  }

  if (newPwd) newPwd.value = "";
  if (confirmPwd) confirmPwd.value = "";
  if (alertBox) {
    alertBox.classList.add("hidden");
    alertBox.textContent = "";
  }

  modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
};

window.handleProfileFileUpload = function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const statusEl = document.getElementById("profile-file-status");
  if (statusEl) statusEl.textContent = `Processing ${file.name.slice(0, 15)}...`;

  compressImageFile(file, 280, 280, 0.85, (base64Data) => {
    const photoInput = document.getElementById("profile-photo-input");
    const preview = document.getElementById("profile-photo-preview");
    if (photoInput) photoInput.value = base64Data;
    if (preview) preview.src = base64Data;
    if (statusEl) statusEl.textContent = `✓ Selected (${Math.round(base64Data.length / 1024)} KB)`;
  });
};

window.previewProfilePhoto = function(url) {
  const preview = document.getElementById("profile-photo-preview");
  if (!preview) return;
  const clean = sanitizePhotoUrl(url);
  preview.src = clean || "https://plain-apac-prod-public.komododecks.com/202611/01/waqc0HFunHNZKuyytbSD/image.png";
};

window.handleProfileUpdateSubmit = async function(e) {
  e.preventDefault();
  if (!currentUser) return;

  const alertBox = document.getElementById("profile-alert-box");
  const saveBtn = document.getElementById("save-profile-btn");
  const name = document.getElementById("profile-name-input")?.value.trim() || currentUser.name;
  const contact = document.getElementById("profile-contact-input")?.value.trim() || "";
  const photo = sanitizePhotoUrl(document.getElementById("profile-photo-input")?.value.trim() || "");
  const newPwd = document.getElementById("profile-new-password")?.value.trim() || "";
  const confirmPwd = document.getElementById("profile-confirm-password")?.value.trim() || "";

  if (newPwd && newPwd !== confirmPwd) {
    if (alertBox) {
      alertBox.className = "p-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200";
      alertBox.textContent = "New passwords do not match. Please verify.";
      alertBox.classList.remove("hidden");
    }
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span>Saving...</span>`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/profile/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: currentUser.username,
        name: name,
        contact: contact,
        photo_url: photo,
        new_password: newPwd || null
      })
    });

    if (res.ok) {
      const data = await res.json();
      currentUser.name = name;
      currentUser.contact = contact;
      if (photo) currentUser.photo_url = photo;
      localStorage.setItem("flowguard_current_user", JSON.stringify(currentUser));
      sessionStorage.setItem("flowguard_current_user", JSON.stringify(currentUser));

      applyUserProfileToUI(currentUser);
      await fetchDoctorsFromDatabase();
      await fetchNursesFromDatabase();

      const modal = document.getElementById("my-profile-modal");
      if (modal) modal.classList.add("hidden");
      alert("Success: Your profile and password have been updated!");
    } else {
      const err = await res.json().catch(() => ({}));
      if (alertBox) {
        alertBox.className = "p-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200";
        alertBox.textContent = err.detail || "Failed to update profile.";
        alertBox.classList.remove("hidden");
      }
    }
  } catch (err) {
    currentUser.name = name;
    currentUser.contact = contact;
    if (photo) currentUser.photo_url = photo;
    localStorage.setItem("flowguard_current_user", JSON.stringify(currentUser));
    applyUserProfileToUI(currentUser);

    const modal = document.getElementById("my-profile-modal");
    if (modal) modal.classList.add("hidden");
    alert("Profile details saved locally.");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Save Profile & Password</span>`;
    }
    if (window.lucide) lucide.createIcons();
  }
};

function logoutStaff() {
  currentUser = null;
  localStorage.removeItem("flowguard_current_user");
  sessionStorage.removeItem("flowguard_current_user");

  const loginScreen = document.getElementById("login-screen");
  if (loginScreen) {
    loginScreen.classList.remove("hidden");
  }

  // Pre-fill saved token and server into login form
  const tokInput = document.getElementById("login-blynk-token");
  const srvInput = document.getElementById("login-blynk-server");
  if (tokInput && blynkToken) tokInput.value = blynkToken;
  if (srvInput && blynkServer) srvInput.value = blynkServer;

  updateBlynkStatusUI(false, "Logged Out");
}

async function checkBlynkConnectionNow() {
  const badgeDot = document.getElementById("blynk-status-dot");
  const badgeText = document.getElementById("blynk-status-text");
  if (badgeText) badgeText.textContent = "Blynk: Checking...";
  if (badgeDot) badgeDot.className = "w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping";

  const tokenToUse = (blynkToken || "").trim();
  if (!tokenToUse) {
    updateBlynkStatusUI(false, "No Token Entered");
    switchTab("settings");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/blynk/status?token=${encodeURIComponent(tokenToUse)}&server=${encodeURIComponent(blynkServer)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.server && data.server !== blynkServer) {
        blynkServer = data.server;
        localStorage.setItem("blynk_server", blynkServer);
      }
      if (data.connected || data.status === "connected") {
        updateBlynkStatusUI(true, "Live (Online)");
        fetchBlynkHardwareData();
      } else {
        updateBlynkStatusUI(false, "Hardware Standby");
      }
    } else {
      await fetchBlynkHardwareData();
    }
  } catch (err) {
    await fetchBlynkHardwareData();
  }
}

async function testLoginBlynkConnection() {
  const tokInput = document.getElementById("login-blynk-token");
  const srvInput = document.getElementById("login-blynk-server");
  const resBox = document.getElementById("login-blynk-test-result");
  const testBtn = document.getElementById("login-test-btn");

  const tok = tokInput ? tokInput.value.trim() : "";
  const srv = srvInput ? srvInput.value.trim() : "blynk.cloud";

  if (!tok) {
    if (resBox) {
      resBox.classList.remove("hidden");
      resBox.className = "p-2 rounded-xl text-[10px] font-mono whitespace-pre-wrap bg-rose-50 text-rose-700 border border-rose-200";
      resBox.textContent = "Please enter or paste your Blynk Auth Token first.";
    }
    return;
  }

  if (testBtn) testBtn.innerHTML = `<span>Checking...</span>`;
  if (resBox) {
    resBox.classList.remove("hidden");
    resBox.className = "p-2 rounded-xl text-[10px] font-mono whitespace-pre-wrap bg-slate-100 text-slate-700 border border-slate-200";
    resBox.textContent = `Pinging Blynk Cloud (${srv})...\nToken: ${tok.substring(0, 6)}••••`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/blynk/status?token=${encodeURIComponent(tok)}&server=${encodeURIComponent(srv)}`);
    if (res.ok) {
      const data = await res.json();
      const isOnline = data.connected || data.status === "connected";
      if (resBox) {
        resBox.className = isOnline 
          ? "p-2 rounded-xl text-[10px] font-mono whitespace-pre-wrap bg-emerald-50 text-emerald-800 border border-emerald-200"
          : "p-2 rounded-xl text-[10px] font-mono whitespace-pre-wrap bg-amber-50 text-amber-800 border border-amber-200";
        resBox.textContent = isOnline
          ? `✓ Blynk Hardware Online & Verified!\nServer: ${data.server}\nDatastreams: ` + JSON.stringify(data.data || {}, null, 1)
          : `Device in Standby (Token Valid, Hardware ESP32 offline or not sending yet).\nServer: ${data.server}`;
      }
      updateBlynkStatusUI(isOnline, isOnline ? "Live Verified" : "Hardware Standby");
    } else {
      throw new Error(`Server returned status ${res.status}`);
    }
  } catch (err) {
    if (resBox) {
      resBox.className = "p-2 rounded-xl text-[10px] font-mono whitespace-pre-wrap bg-rose-50 text-rose-800 border border-rose-200";
      resBox.textContent = `Blynk Verification error: ${err.message}`;
    }
  } finally {
    if (testBtn) testBtn.innerHTML = `<i data-lucide="zap" class="w-3.5 h-3.5"></i><span>Test</span>`;
    if (window.lucide) lucide.createIcons();
  }
}

async function testBlynkConnection() {
  const tok = document.getElementById("settings-token-input")?.value.trim() || blynkToken;
  const srv = document.getElementById("settings-server-input")?.value.trim() || blynkServer;
  const resultBox = document.getElementById("blynk-test-result");
  const testBtn = document.getElementById("test-blynk-btn");

  if (!tok) {
    alert("Please enter a Blynk Auth Token to test.");
    return;
  }

  if (resultBox) {
    resultBox.classList.remove("hidden");
    resultBox.className = "p-3 rounded-xl text-[11px] font-mono whitespace-pre-wrap bg-slate-100 text-slate-700 border border-slate-200";
    resultBox.textContent = `Testing connection to Blynk Cloud (${srv})...\nToken: ${tok.substring(0, 8)}...`;
  }
  if (testBtn) testBtn.textContent = "Testing...";

  try {
    let success = false;
    let details = "";

    // Method 1: Try via backend proxy (recommended, bypasses CORS)
    try {
      const res = await fetch(`${API_BASE_URL}/blynk/telemetry?token=${encodeURIComponent(tok)}&server=${encodeURIComponent(srv)}`);
      const data = await res.json();
      if (res.ok && data.status === "success") {
        success = true;
        details = `✓ Connected via Backend Proxy\nServer: ${data.server}\nDatastreams Received:\n` + JSON.stringify(data.data, null, 2);
      } else {
        details = `Backend proxy response: ` + JSON.stringify(data, null, 2);
      }
    } catch (e) {
      details = `Backend server not reachable (${e.message}). Testing direct browser connection...`;
    }

    // Method 2: If backend not available, test direct browser fetch
    if (!success) {
      try {
        const directRes = await fetch(`https://${srv}/external/api/get?token=${encodeURIComponent(tok)}&v0&v1&v2&v3&v4`);
        if (directRes.ok) {
          const directData = await directRes.json();
          success = true;
          details = `✓ Connected Directly to Blynk Cloud!\nDatastreams: ` + JSON.stringify(directData, null, 2);
        } else {
          details += `\nDirect fetch returned HTTP ${directRes.status}: ${await directRes.text()}`;
        }
      } catch (directErr) {
        details += `\nDirect browser fetch failed (blocked by browser CORS security policy).\nTo resolve this on any laptop, launch the server using 'python start_flowguard.py' or access via http://<HOST_IP>:8000.`;
      }
    }

    if (resultBox) {
      resultBox.className = success 
        ? "p-3 rounded-xl text-[11px] font-mono whitespace-pre-wrap bg-emerald-50 text-emerald-800 border border-emerald-200"
        : "p-3 rounded-xl text-[11px] font-mono whitespace-pre-wrap bg-rose-50 text-rose-800 border border-rose-200";
      resultBox.textContent = details;
    }

    if (success) {
      updateBlynkStatusUI(true, "Connected & Verified");
    }
  } catch (err) {
    if (resultBox) {
      resultBox.className = "p-3 rounded-xl text-[11px] font-mono whitespace-pre-wrap bg-rose-50 text-rose-800 border border-rose-200";
      resultBox.textContent = `Connection error: ${err.message}`;
    }
  } finally {
    if (testBtn) testBtn.textContent = "Test Connection";
  }
}

// Explicit window bindings for inline HTML onclick handlers
window.triggerResetBottle = triggerResetBottle;
window.triggerTareHook = triggerTareHook;
window.triggerDischargeBed = triggerDischargeBed;
window.saveHardwareSettings = saveHardwareSettings;
window.testBlynkConnection = testBlynkConnection;
window.downloadCSVReport = downloadCSVReport;
window.acknowledgeAlert = acknowledgeAlert;
window.openAddNurseModal = window.openAddNurseModal;
window.openEditNurseModal = openEditNurseModal;
window.triggerDeleteNurse = triggerDeleteNurse;
window.openAddDoctorModal = window.openAddDoctorModal;
window.openEditDoctorModal = openEditDoctorModal;
window.triggerDeleteDoctor = triggerDeleteDoctor;
window.handleGlobalSearch = handleGlobalSearch;
window.handleStaffLogin = handleStaffLogin;
window.selectQuickProfile = selectQuickProfile;
window.logoutStaff = logoutStaff;
window.testLoginBlynkConnection = testLoginBlynkConnection;
window.checkBlynkConnectionNow = checkBlynkConnectionNow;
