const API = '/api/v1';
let accessToken = null;
let currentUser = null;

function showMsg(id, text, type){
  const el = document.getElementById(id);
  if(el){
    el.textContent = text;
    el.className = 'msg ' + type;
  }
}

function hideMsg(id){
  const el = document.getElementById(id);
  if(el) el.className = 'msg';
}

function switchTab(tab){
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  hideMsg('authMsg');
}

async function api(path, options = {}){
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function handleRegister(e){
  e.preventDefault();
  hideMsg('authMsg');
  try{
    const body = {
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value,
    };
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    const user = data.data?.user || data.user;
    const token = data.data?.accessToken || data.accessToken || data.data?.token || data.token;
    onAuthSuccess(user, token);
  }catch(err){ showMsg('authMsg', err.message, 'err'); }
}

async function handleLogin(e){
  e.preventDefault();
  hideMsg('authMsg');
  try{
    const body = {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value,
    };
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    const user = data.data?.user || data.user;
    const token = data.data?.accessToken || data.accessToken || data.data?.token || data.token;
    onAuthSuccess(user, token);
  }catch(err){ showMsg('authMsg', err.message, 'err'); }
}

function onAuthSuccess(user, token){
  if(!user || !token){
    showMsg('authMsg', 'Failed to read user data structure from backend response.', 'err');
    return;
  }
  currentUser = user;
  accessToken = token;
  document.getElementById('authView').style.display = 'none';
  document.getElementById('appView').style.display = 'block';
  document.getElementById('whoami').innerHTML = `<b>${escapeHtml(user.name)}</b> · ${escapeHtml(user.role || 'User')}`;
  loadTasks();
}

function logout(){
  accessToken = null; currentUser = null;
  document.getElementById('appView').style.display = 'none';
  document.getElementById('authView').style.display = 'block';
  document.getElementById('whoami').innerHTML = '';
}

async function handleCreateTask(e){
  e.preventDefault();
  hideMsg('taskMsg');
  try{
    const body = {
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDesc').value,
      status: document.getElementById('taskStatus').value,
    };
    await api('/tasks', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('taskForm').reset();
    showMsg('taskMsg', 'Task created.', 'ok');
    loadTasks();
  }catch(err){ showMsg('taskMsg', err.message, 'err'); }
}

async function loadTasks(){
  try{
    const data = await api('/tasks');
    const taskList = data.data?.tasks || data.tasks || [];
    const count = data.count ?? taskList.length;
    renderTasks(taskList);
    document.getElementById('taskCount').textContent = `(${count})`;
  }catch(err){ showMsg('taskMsg', err.message, 'err'); }
}

function renderTasks(tasks){
  const list = document.getElementById('taskList');
  if (!tasks || !tasks.length){
    list.innerHTML = '<div class="empty">No tasks yet — add one above.</div>';
    return;
  }
  // No inline onclick/onchange here — data-id attributes are picked up
  // by the delegated listeners set up in initEventListeners().
  list.innerHTML = tasks.map(t => `
    <div class="task">
      <div>
        <div class="title">${escapeHtml(t.title)}</div>
        ${t.description ? `<div class="desc">${escapeHtml(t.description)}</div>` : ''}
        <div class="task-meta">
          <span class="badge ${escapeHtml(t.status)}">${escapeHtml(t.status).replace('_', ' ')}</span>
          <select class="statusSelect" data-id="${t._id}" style="margin:0;width:auto;padding:2px 6px;font-size:11px;background:#0d0f14;">
            <option value="">change…</option>
            <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>pending</option>
            <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>in progress</option>
            <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>completed</option>
          </select>
        </div>
      </div>
      <button class="danger deleteBtn" data-id="${t._id}">Delete</button>
    </div>
  `).join('');
}

async function cycleStatus(id, status){
  if (!status) return;
  try{ await api('/tasks/' + id, { method: 'PUT', body: JSON.stringify({ status }) }); loadTasks(); }
  catch(err){ showMsg('taskMsg', err.message, 'err'); }
}

async function removeTask(id){
  try{ await api('/tasks/' + id, { method: 'DELETE' }); loadTasks(); }
  catch(err){ showMsg('taskMsg', err.message, 'err'); }
}

function escapeHtml(str){
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function initEventListeners(){
  document.getElementById('tabLogin').addEventListener('click', () => switchTab('login'));
  document.getElementById('tabRegister').addEventListener('click', () => switchTab('register'));
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('taskForm').addEventListener('submit', handleCreateTask);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Event delegation: taskList is re-rendered often, so listeners live
  // on the stable parent container instead of the regenerated children.
  document.getElementById('taskList').addEventListener('change', (e) => {
    if (e.target.classList.contains('statusSelect')){
      cycleStatus(e.target.dataset.id, e.target.value);
    }
  });
  document.getElementById('taskList').addEventListener('click', (e) => {
    if (e.target.classList.contains('deleteBtn')){
      removeTask(e.target.dataset.id);
    }
  });
}

initEventListeners();
document.getElementById('authView').style.display = 'block';