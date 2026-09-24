const BASE = (process.env.DFY_API_URL || "https://dfy-be-staging.onrender.com/api/v1").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.DFY_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DFY_ADMIN_PASSWORD;
const TEST_PASSWORD = process.env.TEST_PASSWORD || "Test@1234";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error("Missing DFY_ADMIN_EMAIL or DFY_ADMIN_PASSWORD GitHub secrets.");
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

function tokenOf(body) {
  return body?.token || body?.accessToken || body?.access_token || body?.data?.token ||
    body?.data?.accessToken || body?.data?.access_token;
}
function idOf(body) {
  return body?.id || body?.taskId || body?.data?.id || body?.data?.taskId;
}
function luhn(partial) {
  let sum = 0, alt = true;
  for (let i = partial.length - 1; i >= 0; i--) {
    let n = Number(partial[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return String((10 - (sum % 10)) % 10);
}
function makeId() {
  const base = "900101" + String(Math.floor(Math.random()*10000)).padStart(4,"0") + "08";
  return base + luhn(base);
}
function makePhone() {
  return "082" + String(Math.floor(Math.random()*1e7)).padStart(7,"0");
}

const stamp = Date.now();
const creator = {
  firstName: "DFY",
  lastName: "MobileTest",
  email: `dfy_mobile_${stamp}@test.dfy`,
  phoneNumber: makePhone(),
  idNumber: makeId(),
  address: "123 Test Street, Johannesburg",
  password: TEST_PASSWORD,
  userType: "Creator",
};

console.log(`Creating staging creator: ${creator.email}`);
let r = await request("/auth/register", { method:"POST", body:JSON.stringify({
  firstName: creator.firstName, lastName: creator.lastName, email: creator.email,
  phoneNumber: creator.phoneNumber, userType: creator.userType, idNumber: creator.idNumber,
  address: creator.address, password: creator.password, confirmPassword: creator.password
})});
if (!r.ok && r.status !== 409) throw new Error("Registration failed: " + r.status + " " + JSON.stringify(r.body));

r = await request("/auth/login", { method:"POST", body:JSON.stringify({
  email: creator.email, password: creator.password
})});
if (!r.ok) throw new Error("Creator login failed: " + r.status + " " + JSON.stringify(r.body));
const creatorToken = tokenOf(r.body);
if (!creatorToken) throw new Error("Creator login returned no access token.");

const headers = { Authorization: `Bearer ${creatorToken}` };
const tasks = [
  ["Urgent grocery run for the week", "Please collect the weekly groceries and deliver them to the specified address.", 175],
  ["Collect groceries from the local supermarket", "Collect a prepaid grocery order and deliver it safely.", 200],
  ["Pick up household supplies", "Pick up a small household-supplies order and bring it to the requester.", 225],
  ["Deliver a small grocery order", "Collect and deliver a small grocery order within the local area.", 250],
  ["Collect and deliver essential items", "Collect essential household items and deliver them to the requester.", 275],
];

const ids = [];
for (let i=0;i<tasks.length;i++) {
  const [taskName, taskDescription, budget] = tasks[i];
  const payload = {
    taskName, taskDescription, category:"Home", area:"Johannesburg",
    dateNeeded:new Date(Date.now()+86400000*(i+1)).toISOString(),
    budget, notes:"Staging test task for mobile Browse Tasks responsiveness.",
    priority:"Normal"
  };
  let created = await request("/tasks", { method:"POST", headers, body:JSON.stringify(payload) });
  console.log(`Task ${i+1} create => ${created.status}`);
  let taskId = idOf(created.body);

  // Some staging builds persist the task before the payment-provider call fails.
  if (!taskId) {
    const posted = await request("/tasks/my-posted?page=1&pageSize=100", {headers});
    const list = Array.isArray(posted.body) ? posted.body :
      (posted.body?.items || posted.body?.data || posted.body?.tasks || []);
    const match = list.find(x => x.taskName === taskName);
    taskId = idOf(match);
  }
  if (!taskId) throw new Error(`Could not recover task ${i+1}: ${JSON.stringify(created.body)}`);
  ids.push(taskId);
}

console.log("Logging in as admin...");
r = await request("/auth/login", {method:"POST", body:JSON.stringify({email:ADMIN_EMAIL,password:ADMIN_PASSWORD})});
if (!r.ok) throw new Error("Admin login failed: " + r.status + " " + JSON.stringify(r.body));
const adminToken = tokenOf(r.body);
if (!adminToken) throw new Error("Admin login returned no access token.");

for (const taskId of ids) {
  const v = await request(`/admin/tasks/${taskId}/verify`, {
    method:"PATCH", headers:{Authorization:`Bearer ${adminToken}`}
  });
  console.log(`Verify ${taskId} => ${v.status}`);
  if (!v.ok) throw new Error(`Verification failed for ${taskId}: ${v.status} ${JSON.stringify(v.body)}`);
}

const available = await request("/tasks/available?page=1&pageSize=100", {headers});
if (!available.ok) throw new Error("Available tasks check failed: " + available.status);
const list = Array.isArray(available.body) ? available.body :
  (available.body?.items || available.body?.data || available.body?.tasks || []);
const found = ids.filter(id => list.some(t => String(idOf(t)) === String(id)));
console.log(`Available tasks: ${found.length}/${ids.length}`);
if (found.length !== ids.length) throw new Error("Not all seeded tasks are visible in Browse Tasks.");

console.log("");
console.log("DFY STAGING SEED COMPLETE");
console.log("Creator email: " + creator.email);
console.log("Creator password: " + creator.password);
console.log("Task IDs: " + ids.join(", "));
