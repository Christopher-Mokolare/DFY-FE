const BASE = (process.env.DFY_API_URL || "https://dfy-be-staging.onrender.com/api/v1").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.DFY_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DFY_ADMIN_PASSWORD;
const CREATOR_EMAIL = process.env.DFY_CREATOR_EMAIL;
const CREATOR_PASSWORD = process.env.DFY_CREATOR_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !CREATOR_EMAIL || !CREATOR_PASSWORD) {
  throw new Error("Missing DFY_ADMIN_EMAIL/PASSWORD or DFY_CREATOR_EMAIL/PASSWORD GitHub secrets.");
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
  return body?.id || body?.taskId || body?.data?.id || body?.data?.taskId || body?.data?.task?.taskId || body?.data?.task?.id;
}
let r = await request("/auth/login", { method:"POST", body:JSON.stringify({
  email: CREATOR_EMAIL, password: CREATOR_PASSWORD
})});
if (!r.ok) throw new Error("Configured creator login failed: " + r.status + " " + JSON.stringify(r.body));
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
const postedResponse = await request("/tasks/my-posted?page=1&pageSize=100", {headers});
if (!postedResponse.ok) throw new Error("Could not read tasks for configured creator: " + postedResponse.status);
const postedBody = postedResponse.body;
const existingTasks = Array.isArray(postedBody) ? postedBody :
  (postedBody?.items || postedBody?.data?.tasks || postedBody?.data || postedBody?.tasks || []);

for (let i=0;i<tasks.length;i++) {
  const [taskName, taskDescription, budget] = tasks[i];
  const existing = existingTasks.find(x => x.taskName === taskName);
  let taskId = idOf(existing);

  if (!taskId) {
    const payload = {
      taskName, taskDescription, category:"Home", area:"Johannesburg",
      dateNeeded:new Date(Date.now()+86400000*(i+1)).toISOString(),
      budget, notes:"Staging test task for mobile Browse Tasks responsiveness.",
      priority:"Normal"
    };
    const created = await request("/tasks", { method:"POST", headers, body:JSON.stringify(payload) });
    console.log(`Task ${i+1} create => ${created.status}`);
    taskId = idOf(created.body);

    // Some staging builds persist the task before the payment-provider call fails.
    if (!taskId) {
      const posted = await request("/tasks/my-posted?page=1&pageSize=100", {headers});
      const list = Array.isArray(posted.body) ? posted.body :
        (posted.body?.items || posted.body?.data?.tasks || posted.body?.data || posted.body?.tasks || []);
      taskId = idOf(list.find(x => x.taskName === taskName));
    }
  } else {
    console.log(`Task ${i+1} already exists; reusing ${taskId}`);
  }
  if (!taskId) throw new Error(`Could not recover task ${i+1}.`);
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
console.log("Creator email: " + CREATOR_EMAIL);
console.log("Creator password: [provided by GitHub Actions secret; not printed]");
console.log("Task IDs: " + ids.join(", "));
