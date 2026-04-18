// ================= SUPABASE CONFIG =================
const SUPABASE_URL = "https://vuzgotyghqsyjdjrbuwu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================= ELEMENTS =================
const deviceInput = document.getElementById("deviceName");
const locationInput = document.getElementById("location");

const registerModal = document.getElementById("registerModal");
const cancelRegister = document.getElementById("cancelRegister");
const confirmRegister = document.getElementById("confirmRegister");

const duplicateModal = document.getElementById("duplicateModal");
const closeDuplicate = document.getElementById("closeDuplicate");

const cDevice = document.getElementById("cDevice");
const cLocation = document.getElementById("cLocation");
const dupDevice = document.getElementById("dupDevice");

const logoutBtn = document.getElementById("logoutBtn");

const successModal = document.getElementById("successModal");
const closeSuccess = document.getElementById("closeSuccess");
const successDevice = document.getElementById("successDevice");

const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

// ================= OPEN CONFIRM =================
const form = document.getElementById("deviceForm");

form.onsubmit = (e) => {
  e.preventDefault();

  const name = deviceInput.value.trim();
  const location = locationInput.value.trim();

  cDevice.textContent = name;
  cLocation.textContent = location;

  registerModal.classList.add("show");
};
// ================= CANCEL =================
cancelRegister.onclick = () => {
  registerModal.classList.remove("show");
};

// ================= REGISTER =================
confirmRegister.onclick = async () => {
  const name = deviceInput.value.trim();
  const location = locationInput.value.trim();

  try {
    // 🔍 CHECK DUPLICATE FROM DATABASE
    const { data: existing, error: checkError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_name", name);

    if (checkError) throw checkError;

    if (existing.length > 0) {
      registerModal.classList.remove("show");
      dupDevice.textContent = name;
      duplicateModal.classList.add("show");
      return;
    }

    // ✅ INSERT DATA
    const { error } = await supabase
      .from("devices")
      .insert([
        {
          device_name: name,
          location: location
        }
      ]);

    if (error) throw error;

    registerModal.classList.remove("show");

    successDevice.textContent = name;
    successModal.classList.add("show");

    deviceInput.value = "";
    locationInput.value = "";

  } catch (err) {
    alert("Error: " + err.message);
  }
};

// ================= CLOSE DUPLICATE =================
closeDuplicate.onclick = () => {
  duplicateModal.classList.remove("show");
};

// ================= CLOSE SUCCESS =================
closeSuccess.onclick = () => {
  successModal.classList.remove("show");
};

// ================= LOGOUT MODAL =================

// OPEN
logoutBtn.onclick = (e) => {
  e.preventDefault();
  logoutModal.classList.add("show");
  document.body.style.overflow = "hidden";
};

// CANCEL
cancelLogout.onclick = () => {
  logoutModal.classList.remove("show");
  document.body.style.overflow = "auto";
};

// CONFIRM LOGOUT
confirmLogout.onclick = () => {
  document.body.style.overflow = "auto";
  location.href = "auth.html";
}

// CLICK OUTSIDE CLOSE
window.onclick = (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("show");
    document.body.style.overflow = "auto";
  }
};

// ESC KEY CLOSE
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    logoutModal.classList.remove("show");
    document.body.style.overflow = "auto";
  }
});