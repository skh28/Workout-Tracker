const TOKEN_KEY = 'workout_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function api(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(path, { ...options, headers });
}

function showAuth() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
  document.getElementById('logout-btn').setAttribute('hidden', '');
}

function showDashboard() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');
  document.getElementById('logout-btn').removeAttribute('hidden');
  loadWorkouts();
}

function setAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

function setWorkoutError(msg) {
  const el = document.getElementById('workout-error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

function setWorkoutEditError(msg) {
  const el = document.getElementById('workout-edit-error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

// Tabs
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('login-form').classList.toggle('hidden', btn.dataset.tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', btn.dataset.tab !== 'register');
    document.getElementById('forgot-password-form').classList.add('hidden');
    document.getElementById('forgot-message').hidden = true;
    setAuthError('');
  });
});

// Forgot password
document.getElementById('forgot-password-btn').addEventListener('click', () => {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('forgot-password-form').classList.remove('hidden');
  document.getElementById('forgot-message').hidden = true;
  setAuthError('');
});

document.getElementById('forgot-back-btn').addEventListener('click', () => {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('forgot-password-form').classList.add('hidden');
  document.getElementById('forgot-message').hidden = true;
});

document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const res = await api('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  const msgEl = document.getElementById('forgot-message');
  msgEl.hidden = false;
  if (data.reset_link) {
    msgEl.innerHTML = `Check your email, or use this link (valid 1 hour): <a href="${escapeHtml(
      data.reset_link,
    )}" target="_blank" rel="noopener">Reset password</a>`;
    msgEl.classList.remove('muted');
  } else {
    msgEl.textContent =
      data.message || 'If an account exists with that email, you will receive reset instructions.';
    msgEl.classList.add('muted');
  }
});

// Reset password (when URL has ?reset_token=...)
function showResetPasswordForm(token) {
  document.getElementById('auth-section').classList.remove('hidden');
  document.querySelector('.auth-card .tabs').classList.add('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('forgot-password-form').classList.add('hidden');
  document.getElementById('forgot-message').hidden = true;
  document.getElementById('reset-password-card').classList.remove('hidden');
  document.getElementById('reset-password-form').dataset.resetToken = token;
}

document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const token = form.dataset.resetToken || new URLSearchParams(window.location.search).get('reset_token');
  const newPassword = form.new_password.value;
  const confirmPassword = form.confirm_password.value;
  const errEl = document.getElementById('reset-password-error');
  errEl.hidden = true;
  if (newPassword !== confirmPassword) {
    errEl.textContent = 'Passwords do not match.';
    errEl.hidden = false;
    return;
  }
  if (!token) {
    errEl.textContent = 'Invalid or expired reset link.';
    errEl.hidden = false;
    return;
  }
  const res = await api('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    errEl.textContent = data.detail || 'Failed to reset password.';
    errEl.hidden = false;
    return;
  }
  document.getElementById('reset-password-card').classList.add('hidden');
  document.querySelector('.auth-card .tabs').classList.remove('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  if (window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname || '/');
  }
  setAuthError('');
  const msgEl = document.getElementById('forgot-message');
  msgEl.textContent = 'Password has been reset. You can log in with your new password.';
  msgEl.classList.add('muted');
  msgEl.hidden = false;
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAuthError('');
  const form = e.target;
  const body = new URLSearchParams({
    username: form.username.value.trim(),
    password: form.password.value,
  });
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setAuthError(data.detail || 'Login failed');
    return;
  }
  const data = await res.json();
  setToken(data.access_token);
  showDashboard();
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAuthError('');
  const form = e.target;
  const res = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: form.email.value.trim(),
      password: form.password.value,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setAuthError(data.detail || 'Registration failed');
    return;
  }
  await res.json();
  const loginRes = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: form.email.value.trim(),
      password: form.password.value,
    }),
  });
  if (!loginRes.ok) {
    setAuthError('Account created. Please log in.');
    return;
  }
  const loginData = await loginRes.json();
  setToken(loginData.access_token);
  showDashboard();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  setToken(null);
  showAuth();
});

// Load workouts
async function loadWorkouts() {
  const list = document.getElementById('workouts-list');
  const empty = document.getElementById('workouts-empty');
  list.innerHTML = '';
  empty.hidden = true;

  const res = await api('/workouts');
  if (!res.ok) {
    list.innerHTML = '<li class="muted">Failed to load workouts.</li>';
    return;
  }
  const workouts = await res.json();
  if (workouts.length === 0) {
    empty.hidden = false;
    return;
  }
  workouts.forEach((w) => {
    const li = document.createElement('li');
    const started = w.started_at ? new Date(w.started_at).toLocaleString() : '';
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(w.name)}</strong>
        <div class="workout-meta">
          ${started} · ${w.duration_minutes} min
          ${w.active_calories != null ? ` · ${w.active_calories} cal` : ''}
        </div>
      </div>
      <div class="workout-actions">
        <button type="button" class="btn btn-small btn-ghost edit-workout-btn" data-id="${w.id}">Edit</button>
        <button type="button" class="btn btn-small btn-danger delete-workout-btn" data-id="${w.id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });
  document.querySelectorAll('.delete-workout-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteWorkout(parseInt(btn.dataset.id, 10)));
  });
  document.querySelectorAll('.edit-workout-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const w = workouts.find((x) => x.id === parseInt(btn.dataset.id, 10));
      if (w) showEditForm(w);
    });
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Add workout
document.getElementById('workout-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setWorkoutError('');
  const form = e.target;
  const startedAt = form.started_at.value
    ? new Date(form.started_at.value).toISOString()
    : new Date().toISOString();
  const body = {
    name: form.name.value.trim(),
    description: form.description.value.trim() || null,
    workout_type: '',
    started_at: startedAt,
    duration_minutes: parseInt(form.duration_minutes.value, 10) || 0,
    avg_heart_rate_bpm: form.avg_heart_rate_bpm.value
      ? parseInt(form.avg_heart_rate_bpm.value, 10)
      : null,
    active_calories: form.active_calories.value
      ? parseInt(form.active_calories.value, 10)
      : null,
    total_calories: form.total_calories.value
      ? parseInt(form.total_calories.value, 10)
      : null,
  };
  const res = await api('/workouts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setWorkoutError(
      data.detail ||
        (Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join(', ') : 'Failed to add workout'),
    );
    return;
  }
  form.reset();
  loadWorkouts();
});

// Delete workout
async function deleteWorkout(id) {
  if (!confirm('Delete this workout?')) return;
  const res = await api(`/workouts/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setWorkoutError(data.detail || 'Failed to delete');
    return;
  }
  loadWorkouts();
  document.getElementById('edit-workout-card').classList.add('hidden');
}

// Edit workout: show form with data
function showEditForm(w) {
  const card = document.getElementById('edit-workout-card');
  const form = document.getElementById('workout-edit-form');
  form.id.value = w.id;
  form.workout_type.value = w.workout_type || '';
  form.name.value = w.name || '';
  form.description.value = w.description || '';
  const started = w.started_at ? new Date(w.started_at) : new Date();
  started.setMinutes(started.getMinutes() - started.getTimezoneOffset());
  form.started_at.value = started.toISOString().slice(0, 16);
  form.duration_minutes.value = w.duration_minutes ?? '';
  form.avg_heart_rate_bpm.value = w.avg_heart_rate_bpm ?? '';
  form.active_calories.value = w.active_calories ?? '';
  form.total_calories.value = w.total_calories ?? '';
  setWorkoutEditError('');
  card.classList.remove('hidden');
}

document.getElementById('workout-edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setWorkoutEditError('');
  const form = e.target;
  const id = parseInt(form.id.value, 10);
  const startedAt = form.started_at.value
    ? new Date(form.started_at.value).toISOString()
    : new Date().toISOString();
  const body = {
    name: form.name.value.trim(),
    description: form.description.value.trim() || null,
    workout_type: form.workout_type.value.trim(),
    started_at: startedAt,
    duration_minutes: parseInt(form.duration_minutes.value, 10) || 0,
    avg_heart_rate_bpm: form.avg_heart_rate_bpm.value
      ? parseInt(form.avg_heart_rate_bpm.value, 10)
      : null,
    active_calories: form.active_calories.value
      ? parseInt(form.active_calories.value, 10)
      : null,
    total_calories: form.total_calories.value
      ? parseInt(form.total_calories.value, 10)
      : null,
  };
  const res = await api(`/workouts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setWorkoutEditError(
      data.detail ||
        (Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join(', ') : 'Failed to update'),
    );
    return;
  }
  document.getElementById('edit-workout-card').classList.add('hidden');
  loadWorkouts();
});

document.getElementById('edit-cancel-btn').addEventListener('click', () => {
  document.getElementById('edit-workout-card').classList.add('hidden');
  setWorkoutEditError('');
});

// Init: set datetime-local default to now
function initFormDefaultTime() {
  const input = document.querySelector('input[name="started_at"]');
  if (input && !input.value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    input.value = now.toISOString().slice(0, 16);
  }
}

if (getToken()) {
  api('/auth/me')
    .then((r) => {
      if (r.ok) {
        showDashboard();
        initFormDefaultTime();
      } else {
        setToken(null);
        showAuth();
        checkResetTokenInUrl();
      }
    })
    .catch(() => {
      setToken(null);
      showAuth();
      checkResetTokenInUrl();
    });
} else {
  showAuth();
  checkResetTokenInUrl();
}

function checkResetTokenInUrl() {
  const token = new URLSearchParams(window.location.search).get('reset_token');
  if (token) {
    document.getElementById('reset-password-form').dataset.resetToken = token;
    showResetPasswordForm(token);
  }
}

// Show/hide password toggles
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const wrap = btn.closest('.password-wrap');
    const input = wrap.querySelector('input');
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });
});

