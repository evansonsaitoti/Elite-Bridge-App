(function () {
  const API_BASE = 'https://elite-bridge-shared-api-evans.vercel.app/api';
  const role = document.body.dataset.role;
  const expectedRole = role === 'employer' ? 'employer' : 'caregiver';
  const otherDashboard = expectedRole === 'employer' ? '/caregiver-dashboard' : '/employer-dashboard';

  function getSession() {
    const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
    try {
      return { storage, user: JSON.parse(storage.getItem('user') || 'null'), token: storage.getItem('token') };
    } catch (_) {
      return { storage, user: null, token: null };
    }
  }

  const session = getSession();
  if (!session.user || !session.token) {
    window.location.replace('/');
    return;
  }
  if (session.user.role && session.user.role !== expectedRole) {
    window.location.replace(otherDashboard);
    return;
  }

  const fullName = `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || 'Elite Bridge member';
  const initials = `${session.user.firstName?.[0] || ''}${session.user.lastName?.[0] || ''}`.toUpperCase() || 'EB';
  document.querySelectorAll('[data-user-name]').forEach((element) => { element.textContent = fullName; });
  document.querySelectorAll('[data-user-first]').forEach((element) => { element.textContent = session.user.firstName || 'there'; });
  document.querySelectorAll('[data-user-initials]').forEach((element) => { element.textContent = initials; });
  document.querySelectorAll('[data-company-name]').forEach((element) => { element.textContent = session.user.companyName || 'Your care workspace'; });

  const accountButton = document.getElementById('accountButton');
  const accountMenu = document.getElementById('accountMenu');
  const menuToggle = document.getElementById('menuToggle');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const toast = document.getElementById('toast');
  const search = document.getElementById('globalSearch');
  let toastTimer;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
  }

  function closeMobileNav() { document.body.classList.remove('nav-open'); }
  menuToggle?.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  mobileOverlay?.addEventListener('click', closeMobileNav);
  accountButton?.addEventListener('click', () => {
    const expanded = accountButton.getAttribute('aria-expanded') === 'true';
    accountButton.setAttribute('aria-expanded', String(!expanded));
    accountMenu.hidden = expanded;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.account-wrap') && accountMenu) {
      accountMenu.hidden = true;
      accountButton?.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('[data-logout]').forEach((button) => button.addEventListener('click', () => {
    ['token', 'user'].forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); });
    window.location.assign('/');
  }));

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${session.token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      ['token', 'user'].forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); });
      window.location.assign('/');
      throw new Error('Your session has ended.');
    }
    if (!response.ok) throw new Error(data.message || data.error || 'Something went wrong.');
    return data;
  }

  function activateView(viewName) {
    const view = document.querySelector(`[data-view-panel="${viewName}"]`) || document.querySelector('[data-view-panel="overview"]');
    document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel !== view; });
    document.querySelectorAll('[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === view.dataset.viewPanel));
    closeMobileNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', viewName === 'overview' ? window.location.pathname : `#${viewName}`);
  }

  document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    activateView(link.dataset.view);
  }));
  activateView(location.hash.slice(1) || 'overview');

  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    const activePanel = document.querySelector('[data-view-panel]:not([hidden])');
    activePanel?.querySelectorAll('[data-searchable]').forEach((item) => {
      item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query);
    });
  });

  document.querySelectorAll('[data-notify]').forEach((button) => button.addEventListener('click', () => notify(button.dataset.notify)));
  document.querySelectorAll('[data-go-view]').forEach((button) => button.addEventListener('click', () => activateView(button.dataset.goView)));
  document.querySelectorAll('[data-invite-caregiver]').forEach((button) => button.addEventListener('click', async () => {
    const inviteUrl = `${location.origin}/signup?role=caregiver`;
    try { await navigator.clipboard.writeText(inviteUrl); notify('Caregiver invitation link copied.'); }
    catch (_) { window.prompt('Copy this caregiver invitation link:', inviteUrl); }
  }));

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
  function money(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
  }
  function dateTime(value) {
    if (!value) return 'Date not set';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }
  function renderEmpty(container, title, copy, action, view) {
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><div><span class="empty-mark">EB</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p>${action ? `<button class="secondary-button" type="button" data-empty-view="${escapeHtml(view || 'overview')}">${escapeHtml(action)}</button>` : ''}</div></div>`;
    container.querySelector('[data-empty-view]')?.addEventListener('click', () => activateView(view || 'overview'));
  }

  function renderShiftRows(container, shifts, employerView) {
    if (!container) return;
    if (!shifts.length) {
      renderEmpty(container, employerView ? 'No shifts posted yet' : 'No open shifts nearby yet', employerView ? 'Post your first care shift to begin matching with caregivers.' : 'New care opportunities will appear here as employers post them.', employerView ? 'Post a shift' : '', employerView ? 'shifts' : 'overview');
      return;
    }
    container.innerHTML = shifts.map((shift) => `
      <article class="list-row" data-searchable>
        <span class="row-icon">${employerView ? 'SH' : '$'}</span>
        <span class="row-copy"><strong>${escapeHtml(shift.title || shift.serviceType || 'Care shift')}</strong><span>${escapeHtml(shift.location?.city || '')}${shift.location?.state ? `, ${escapeHtml(shift.location.state)}` : ''} · ${dateTime(shift.startTime)}</span></span>
        <span class="row-meta"><span class="status ${shift.status === 'open' ? '' : 'neutral'}">${escapeHtml(shift.status || 'open')}</span><br>${money(shift.hourlyRate)}/hr</span>
      </article>`).join('');
  }

  function renderActivities(container, activities) {
    if (!container) return;
    if (!activities.length) {
      renderEmpty(container, 'No live care activity', 'Clock-ins and clock-outs will appear here as caregivers begin scheduled visits.');
      return;
    }
    container.innerHTML = activities.slice(0, 6).map((activity) => `
      <div class="list-row" data-searchable><span class="row-icon">${activity.type === 'clock_in' ? 'IN' : 'OUT'}</span><span class="row-copy"><strong>${escapeHtml(`${activity.first_name || ''} ${activity.last_name || ''}`.trim() || 'Caregiver')}</strong><span>${escapeHtml(activity.shift_title || 'Care shift')} · ${dateTime(activity.timestamp)}</span></span><span class="status ${activity.type === 'clock_in' ? '' : 'neutral'}">${escapeHtml(String(activity.type || '').replace('_', ' '))}</span></div>`).join('');
  }

  function renderConversations(container, conversations) {
    if (!container) return;
    if (!conversations.length) {
      renderEmpty(container, 'No conversations yet', 'Messages with caregivers and care coordinators will stay synchronized here and in the mobile app.');
      return;
    }
    container.innerHTML = conversations.map((contact) => `
      <div class="list-row" data-searchable><span class="avatar">${escapeHtml(`${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase())}</span><span class="row-copy"><strong>${escapeHtml(`${contact.firstName || ''} ${contact.lastName || ''}`.trim())}</strong><span>${escapeHtml(contact.role || 'Elite Bridge member')}</span></span><button class="secondary-button" type="button" data-notify="Open this conversation in the Elite Bridge mobile app while web messaging is being completed.">Message</button></div>`).join('');
    container.querySelectorAll('[data-notify]').forEach((button) => button.addEventListener('click', () => notify(button.dataset.notify)));
  }

  async function loadEmployer() {
    const [shiftResult, activityResult, payrollResult, caregiverResult, conversationResult, profileResult] = await Promise.allSettled([
      api('/bookings/employer/my'), api('/bookings/activities'), api('/payroll/employer/overview'), api('/caregivers'), api('/messages/conversations'), api(`/employers/${session.user.id}`)
    ]);
    const shifts = shiftResult.status === 'fulfilled' ? shiftResult.value.shifts || [] : [];
    const activities = activityResult.status === 'fulfilled' ? activityResult.value.activities || [] : [];
    const payroll = payrollResult.status === 'fulfilled' ? payrollResult.value : { stats: {}, recentPayments: [] };
    const caregivers = caregiverResult.status === 'fulfilled' ? caregiverResult.value.caregivers || [] : [];
    const conversations = conversationResult.status === 'fulfilled' ? conversationResult.value.conversations || [] : [];
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    if (profile?.companyName) {
      session.user.companyName = profile.companyName;
      session.storage.setItem('user', JSON.stringify(session.user));
      document.querySelectorAll('[data-company-name]').forEach((element) => { element.textContent = profile.companyName; });
    }
    setText('metricOpenShifts', shifts.filter((shift) => shift.status === 'open').length);
    setText('metricOnDuty', activities.filter((item) => item.type === 'clock_in').length);
    setText('metricCaregivers', caregivers.length);
    setText('metricPendingPayroll', money(payroll.stats?.pending_amount));
    setText('attentionTimesheets', activities.filter((item) => item.type === 'clock_out').length);
    setText('attentionShifts', shifts.filter((shift) => shift.status === 'open').length);
    renderShiftRows(document.getElementById('overviewShiftList'), shifts.slice(0, 4), true);
    renderShiftRows(document.getElementById('allShiftList'), shifts, true);
    renderActivities(document.getElementById('activityList'), activities);
    renderActivities(document.getElementById('timesheetList'), activities);
    renderConversations(document.getElementById('conversationList'), conversations);
    const caregiverList = document.getElementById('caregiverList');
    if (caregiverList) {
      if (!caregivers.length) renderEmpty(caregiverList, 'No caregivers available yet', 'Verified caregivers will appear here as the network grows.');
      else caregiverList.innerHTML = caregivers.map((person) => `<div class="list-row" data-searchable><span class="avatar">${escapeHtml(`${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`)}</span><span class="row-copy"><strong>${escapeHtml(`${person.firstName || ''} ${person.lastName || ''}`)}</strong><span>${escapeHtml((person.specialties || []).join(' · ') || 'Caregiver')}</span></span><span class="row-meta">★ ${escapeHtml(person.rating || 'New')}<br>${money(person.hourlyRate)}/hr</span></div>`).join('');
    }
    setText('payrollTotal', money(payroll.stats?.total_spent));
    setText('payrollPending', money(payroll.stats?.pending_amount));
    setText('payrollPaid', money(payroll.stats?.paid_amount));
  }

  async function loadCaregiver() {
    const [profileResult, shiftResult, conversationResult] = await Promise.allSettled([
      api(`/caregivers/${session.user.id}`), api('/bookings/available'), api('/messages/conversations')
    ]);
    const profile = profileResult.status === 'fulfilled' ? profileResult.value.profile : null;
    const shifts = shiftResult.status === 'fulfilled' ? shiftResult.value.shifts || [] : [];
    const conversations = conversationResult.status === 'fulfilled' ? conversationResult.value.conversations || [] : [];
    setText('metricAvailable', shifts.length);
    setText('metricCompleted', '0');
    setText('metricEarnings', money(profile?.totalEarnings || 0));
    setText('metricRating', Number(profile?.rating || 0) ? Number(profile.rating).toFixed(1) : 'New');
    setText('profileRate', `${money(profile?.hourlyRate || 0)}/hr`);
    setText('profileServices', (profile?.specialties || []).join(', ') || 'Complete setup to add your services');
    renderShiftRows(document.getElementById('availableShiftList'), shifts, false);
    renderShiftRows(document.getElementById('overviewShiftList'), shifts.slice(0, 3), false);
    renderConversations(document.getElementById('conversationList'), conversations);
  }

  const shiftForm = document.getElementById('shiftForm');
  shiftForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!shiftForm.checkValidity()) { shiftForm.reportValidity(); return; }
    const formData = new FormData(shiftForm);
    const submit = shiftForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Posting…';
    const payload = {
      title: formData.get('title'), serviceType: formData.get('serviceType'), caregiverType: formData.get('caregiverType'), careRecipientName: formData.get('careRecipientName'), scheduleType: 'one_time', startDate: formData.get('startDate'), startTime: formData.get('startTime'), endTime: formData.get('endTime'),
      location: { type: 'client_home', address: formData.get('address'), city: formData.get('city'), state: String(formData.get('state') || '').toUpperCase(), zipCode: formData.get('zipCode') },
      pay: { hourlyRate: Number(formData.get('hourlyRate')), currency: 'USD' }, numberOfCaregivers: 1, requirements: [], responsibilities: formData.get('responsibilities'), notes: '', contact: { name: fullName, phone: session.user.phone || 'Contact through Elite Bridge' }, urgency: formData.get('urgency')
    };
    try {
      await api('/bookings', { method: 'POST', body: JSON.stringify(payload) });
      notify('Your shift is live and available to matching caregivers.');
      shiftForm.reset();
      await loadEmployer();
    } catch (error) { notify(error.message); }
    finally { submit.disabled = false; submit.textContent = 'Publish shift'; }
  });

  (expectedRole === 'employer' ? loadEmployer() : loadCaregiver()).catch(() => notify('Some live information could not be loaded. Please refresh to try again.'));
})();
