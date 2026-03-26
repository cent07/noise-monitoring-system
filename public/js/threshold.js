import { createClient } from
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
"https://vuzgotyghqsyjdjrbuwu.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emdvdHlnaHFzeWpkanJidXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAyMzYsImV4cCI6MjA4NTc3NjIzNn0.Dwpc6plq3t_y7PB_B4lejhfOPNkmXULYb3KIkakVsRU"
);

let deleteTargetDevice = null;
let editTargetDevice = null;

/* MODALS */

const deleteModal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
const deleteDeviceName = document.getElementById("deleteDeviceName");

const editModal = document.getElementById("editModal");
const cancelEdit = document.getElementById("cancelEdit");
const confirmEdit = document.getElementById("confirmEdit");

const editDeviceLabel = document.getElementById("editDeviceLabel");
const editNormal = document.getElementById("editNormal");
const editModerate = document.getElementById("editModerate");
const editCritical = document.getElementById("editCritical");

/* AUTH */

const { data } = await supabase.auth.getSession();
if(!data.session) location.href="auth.html";

/* LOGOUT */

logoutBtn.onclick=e=>{
e.preventDefault();
logoutModal.classList.add("show");
}

cancelLogout.onclick=()=> logoutModal.classList.remove("show");

confirmLogout.onclick=async()=>{
await supabase.auth.signOut();
location.href="auth.html";
}

/* ELEMENTS */

const deviceSelect=document.getElementById("deviceSelect");
const form=document.getElementById("thresholdForm");
const tableBody=document.getElementById("thresholdTable");

/* LOAD DEVICES */

async function loadDevices(){

const {data}=await supabase
.from("devices")
.select("device_name")
.order("device_name");

deviceSelect.innerHTML=`<option value="">-- Choose Device --</option>`;

data.forEach(d=>{
const opt=document.createElement("option");
opt.value=d.device_name;
opt.textContent=d.device_name;
deviceSelect.appendChild(opt);
});

}

/* LOAD TABLE */

async function loadThresholds(){

const {data}=await supabase
.from("device_thresholds")
.select("*")
.order("device_name");

tableBody.innerHTML="";

data.forEach(t=>{

const tr=document.createElement("tr");

tr.innerHTML=`
<td>${t.device_name}</td>
<td>${t.normal}</td>
<td>${t.moderate}</td>
<td>${t.critical}</td>
<td>
<button class="btn-action btn-edit" data-device="${t.device_name}">
Edit
</button>

<button class="btn-action btn-delete" data-device="${t.device_name}">
Delete
</button>
</td>
`;

tableBody.appendChild(tr);

});

/* DELETE CLICK */

document.querySelectorAll(".btn-delete").forEach(b=>{
b.onclick=()=>{
deleteTargetDevice=b.dataset.device;
deleteDeviceName.textContent=deleteTargetDevice;
deleteModal.classList.add("show");
};
});

/* EDIT CLICK (MODAL) */

document.querySelectorAll(".btn-edit").forEach(b=>{
b.onclick=async()=>{

const device=b.dataset.device;

const {data}=await supabase
.from("device_thresholds")
.select("*")
.eq("device_name",device)
.single();

editTargetDevice=device;

editDeviceLabel.innerHTML=`Editing <b>${device}</b>`;

editNormal.value=data.normal;
editModerate.value=data.moderate;
editCritical.value=data.critical;

editModal.classList.add("show");

};
});

}

/* FORM = ADD ONLY */

form.addEventListener("submit",async e=>{

e.preventDefault();

const device=deviceSelect.value;
const normal=Number(normalValue.value);
const moderate=Number(moderateValue.value);
const critical=Number(criticalValue.value);

if(!device) return;

await supabase
.from("device_thresholds")
.insert({
device_name:device,
normal,
moderate,
critical
});

form.reset();
loadThresholds();

});

/* DELETE MODAL */

cancelDelete.onclick=()=>{
deleteModal.classList.remove("show");
};

confirmDelete.onclick=async()=>{

await supabase
.from("device_thresholds")
.delete()
.eq("device_name",deleteTargetDevice);

deleteModal.classList.remove("show");
loadThresholds();

};

/* EDIT SAVE */

cancelEdit.onclick=()=>{
editModal.classList.remove("show");
};

confirmEdit.onclick=async()=>{

await supabase
.from("device_thresholds")
.update({
normal:Number(editNormal.value),
moderate:Number(editModerate.value),
critical:Number(editCritical.value)
})
.eq("device_name",editTargetDevice);

editModal.classList.remove("show");
loadThresholds();

};

/* START */

loadDevices();
loadThresholds();