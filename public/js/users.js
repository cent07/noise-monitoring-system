import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://vuzgotyghqsyjdjrbuwu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

/* ========= AUTH ========= */
const { data: { session } } = await supabase.auth.getSession();
if (!session) location.href = "auth.html";

/* ========= ELEMENTS ========= */
const usersBody = document.getElementById("usersBody");
const totalUsers = document.getElementById("totalUsers");
const activeUsers = document.getElementById("activeUsers");
const userModal = document.getElementById("userModal");
const searchUser = document.getElementById("searchUser");

/* ========= LOAD USERS ========= */
async function loadUsers() {

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const keyword = searchUser.value.toLowerCase();

  const filtered = data.filter(user =>
    (user.email || "").toLowerCase().includes(keyword)
  );

  /* ===== STATS ===== */
  totalUsers.textContent = filtered.length;

  const activeCount = filtered.filter(u => u.status === "Active").length;
  activeUsers.textContent = activeCount;

  /* ===== NO RESULT ===== */
  if (!filtered.length) {
    usersBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;">
          No users found
        </td>
      </tr>
    `;
    return;
  }

  /* ===== RENDER ===== */
  let rows = "";

  filtered.forEach(user => {
    rows += `
    <tr>
      <td>${user.email}</td>
      <td>${user.id.slice(0, 8)}...</td>

      <td>
        <span style="
          color:${user.status === "Active" ? "green" : "red"};
          font-weight:600;
        ">
          ${user.status}
        </span>
      </td>

      <td>
        <button
          class="btn-action ${user.status === "Active" ? "btn-delete" : "btn-edit"}"
          onclick="toggleUser('${user.id}', '${user.status}')"
        >
          ${user.status === "Active" ? "Disable" : "Enable"}
        </button>
      </td>
    </tr>
    `;
  });

  usersBody.innerHTML = rows;
}

/* ========= TOGGLE USER ========= */
window.toggleUser = async function(id, currentStatus){

  const newStatus = currentStatus === "Active" ? "Disabled" : "Active";

  const { error } = await supabase
    .from("profiles")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    alert("Update failed");
    return;
  }

  loadUsers();
};

/* ========= ADD USER ========= */
document.getElementById("confirmAddUser").onclick = async () => {

  const email = document.getElementById("userEmail").value;
  const password = document.getElementById("userPassword").value;

  if (!email || !password) {
    alert("Fill all fields");
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
    return;
  }

  await supabase.from("profiles").insert([{
    id: data.user.id,
    email,
    status: "Active"
  }]);

  alert("User created");
  userModal.classList.remove("show");

  loadUsers();
};

/* ========= MODALS ========= */
document.getElementById("openAddUser").onclick = () =>
  userModal.classList.add("show");

document.getElementById("cancelAddUser").onclick = () =>
  userModal.classList.remove("show");

/* ========= LOGOUT ========= */
document.getElementById("logoutBtn").onclick = () =>
  document.getElementById("logoutModal").classList.add("show");

document.getElementById("cancelLogout").onclick = () =>
  document.getElementById("logoutModal").classList.remove("show");

document.getElementById("confirmLogout").onclick = async () => {
  await supabase.auth.signOut();
  location.href = "auth.html";
};

/* ========= INIT ========= */
loadUsers();

/* 🔥 IMPORTANT FIX (SEARCH) */
searchUser.addEventListener("input", loadUsers);