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
  const inviteDialog = document.getElementById('inviteDialog');
  const inviteForm = document.getElementById('inviteForm');
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
  document.querySelectorAll('[data-invite-caregiver]').forEach((button) => button.addEventListener('click', () => {
    if (!inviteDialog) return;
    inviteForm?.reset();
    const result = document.getElementById('inviteResult');
    if (result) result.hidden = true;
    inviteDialog.showModal();
    document.getElementById('inviteFirstName')?.focus();
  }));
  ['inviteClose', 'inviteCancel'].forEach((id) => document.getElementById(id)?.addEventListener('click', () => inviteDialog?.close()));
  inviteDialog?.addEventListener('click', (event) => { if (event.target === inviteDialog) inviteDialog.close(); });

  document.getElementById('copyInvite')?.addEventListener('click', async () => {
    const link = document.getElementById('inviteLink')?.value;
    if (!link) return;
    try { await navigator.clipboard.writeText(link); notify('Invitation link copied.'); }
    catch (_) { window.prompt('Copy this caregiver invitation link:', link); }
  });

  inviteForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(inviteForm);
    const payload = Object.fromEntries(['firstName', 'lastName', 'email', 'phone'].map((key) => [key, String(formData.get(key) || '').trim()]));
    if (!payload.email && !payload.phone) { notify('Enter an email address or phone number.'); return; }
    Object.keys(payload).forEach((key) => { if (!payload[key]) delete payload[key]; });
    const submit = document.getElementById('inviteSubmit');
    submit.disabled = true;
    submit.textContent = 'Creating…';
    try {
      const data = await api('/employers/invitations', { method: 'POST', body: JSON.stringify(payload) });
      const result = document.getElementById('inviteResult');
      const link = document.getElementById('inviteLink');
      const delivery = document.getElementById('inviteDelivery');
      link.value = data.inviteUrl;
      delivery.textContent = data.emailSent ? 'The invitation email was sent. You can also copy or text the link.' : 'Copy, email, or text this secure link to the caregiver.';
      document.getElementById('emailInvite').href = `mailto:${encodeURIComponent(payload.email || '')}?subject=${encodeURIComponent('Your Elite Care invitation')}&body=${encodeURIComponent(`Join our care team on Elite Care: ${data.inviteUrl}`)}`;
      document.getElementById('textInvite').href = `sms:${encodeURIComponent(payload.phone || '')}?body=${encodeURIComponent(`Join our care team on Elite Care: ${data.inviteUrl}`)}`;
      result.hidden = false;
      notify('Caregiver invitation created.');
      await loadEmployer();
    } catch (error) { notify(error.message); }
    finally { submit.disabled = false; submit.textContent = 'Create invitation'; }
  });

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
      <article class="list-row shift-row" data-searchable>
        <span class="row-icon">${employerView ? 'SH' : '$'}</span>
        <span class="row-copy"><strong>${escapeHtml(shift.title || shift.serviceType || 'Care shift')}</strong><span>${escapeHtml(shift.location?.city || '')}${shift.location?.state ? `, ${escapeHtml(shift.location.state)}` : ''} · ${dateTime(shift.startTime)} – ${dateTime(shift.endTime)} · ${Number(shift.assignedCaregivers || 0)}/${Number(shift.numberOfCaregivers || 1)} positions filled</span></span>
        <span class="row-meta"><span class="status ${shift.status === 'open' ? '' : 'neutral'}">${escapeHtml(shift.status || 'open')}</span><br>${money(shift.hourlyRate)}/hr</span>
        ${!employerView && expectedRole === 'caregiver' ? (shift.applicationStatus === 'pending' ? '<span class="status neutral">Applied</span>' : `<button class="primary-button" type="button" data-shift-op="${shift.assignmentMode === 'instant' ? 'claim' : 'apply'}" data-shift-id="${shift.id}">${shift.assignmentMode === 'instant' ? 'Claim position' : 'Apply'}</button>`) : ''}
        ${employerView && expectedRole === 'employer' && ['open', 'assigned'].includes(shift.status) ? `<button class="secondary-button" type="button" data-shift-op="cancel" data-shift-id="${shift.id}">Cancel shift</button>` : ''}
      </article>`).join('');
  }

  function renderActivities(container, activities) {
    if (!container) return;
    if (!activities.length) {
      renderEmpty(container, 'No live care activity', 'Clock-ins and clock-outs will appear here as caregivers begin scheduled visits.');
      return;
    }
    container.innerHTML = activities.slice(0, 6).map((activity) => `
      <div class="list-row" data-searchable><span class="row-icon">${activity.type === 'clock_in' ? 'IN' : activity.type === 'clock_out' ? 'OUT' : 'BR'}</span><span class="row-copy"><strong>${escapeHtml(`${activity.first_name || ''} ${activity.last_name || ''}`.trim() || 'Caregiver')}</strong><span>${escapeHtml(activity.shift_title || 'Care shift')} · ${dateTime(activity.timestamp)}${['clock_in', 'clock_out'].includes(activity.type) ? activity.location ? ' · GPS captured; review required' : ' · No GPS evidence' : ''}</span></span><span class="status ${activity.type === 'clock_in' ? '' : 'neutral'}">${escapeHtml(String(activity.type || '').replace('_', ' '))}</span></div>`).join('');
  }

  function renderApplications(applications) {
    const container = document.getElementById('applicationList');
    if (!container) return;
    const pending = applications.filter(a => a.status === 'pending');
    if (!pending.length) { renderEmpty(container, 'No applications to review', 'Caregiver applications appear here when you choose employer review.'); return; }
    container.innerHTML = pending.map(a => `<article class="surface-pad" data-searchable><strong>${escapeHtml(`${a.first_name} ${a.last_name}`)}</strong><p>${escapeHtml(a.shift_title)} · ${dateTime(a.start_time)} – ${dateTime(a.end_time)}</p><p>${escapeHtml(a.note || '')}</p><button class="primary-button" type="button" data-application-id="${a.id}" data-decision="approved">Approve caregiver</button> <button class="secondary-button" type="button" data-application-id="${a.id}" data-decision="rejected">Decline</button></article>`).join('');
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-application-id], [data-shift-op]');
    if (!button || savingTime) return;
    const operation = button.dataset.shiftOp;
    if (operation === 'cancel' && !window.confirm('Cancel this shift and notify assigned caregivers?')) return;
    savingTime = true; button.disabled = true;
    try {
      const route = button.dataset.applicationId ? `/bookings/employer/applications/${button.dataset.applicationId}` : operation === 'cancel' ? `/bookings/employer/${button.dataset.shiftId}/cancel` : `/bookings/${button.dataset.shiftId}/${operation}`;
      await api(route, { method: button.dataset.applicationId || operation === 'cancel' ? 'PATCH' : 'POST', body: JSON.stringify(button.dataset.applicationId ? { status: button.dataset.decision } : {}) });
      notify('Shift update saved.');
      await (expectedRole === 'employer' ? loadEmployer() : loadCaregiver());
    } catch (error) { notify(error.message); }
    finally { savingTime = false; button.disabled = false; }
  });

  function renderTimesheets(container, sheets, employerView, applications = []) {
    if (!container) return;
    if (!sheets.length) { renderEmpty(container, 'No completed timesheets yet', 'Clocking out creates a shared timesheet for employer review.'); return; }
    container.innerHTML = sheets.map((sheet) => {
      const title = employerView ? `${sheet.first_name} ${sheet.last_name} · ${sheet.shift_title}` : applications.find(a => a.shift.id === sheet.shift_id)?.shift.title || 'Care shift';
      return `<article class="surface-pad" data-searchable><strong>${escapeHtml(title)}</strong><p>${dateTime(sheet.clock_in_at)} – ${dateTime(sheet.clock_out_at)} · ${(Number(sheet.worked_minutes) / 60).toFixed(2)} hours · ${money(sheet.total_amount)}</p><span class="status">${escapeHtml(sheet.status.replaceAll('_', ' '))}</span>${sheet.notes ? `<p>${escapeHtml(sheet.notes)}</p>` : ''}${sheet.agency_note ? `<p>Employer note: ${escapeHtml(sheet.agency_note)}</p>` : ''}
      ${employerView && sheet.status === 'pending_approval' ? `<form data-review-sheet="${sheet.id}" class="field"><label for="review-${sheet.id}">Review note (required for clarification)</label><textarea id="review-${sheet.id}" name="note" maxlength="2000"></textarea><div><button class="primary-button" type="submit" name="decision" value="approved">Approve hours</button> <button class="secondary-button" type="submit" name="decision" value="correction_requested">Request clarification</button></div></form>` : ''}
      ${!employerView && sheet.status === 'correction_requested' ? `<form data-resubmit-sheet="${sheet.id}" class="field"><label for="response-${sheet.id}">Clarification for your employer</label><textarea id="response-${sheet.id}" name="notes" maxlength="2000" required></textarea><button class="primary-button" type="submit">Send clarification</button><small>Recorded hours remain unchanged.</small></form>` : ''}</article>`;
    }).join('');
  }

  async function captureLocation() {
    if (!navigator.geolocation) return null;
    return new Promise(resolve => navigator.geolocation.getCurrentPosition(position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() }), () => resolve(null), { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }));
  }

  function renderCaregiverClock(applications, records) {
    const container = document.getElementById('caregiverClock');
    if (!container) return;
    const drafts = new Map([...container.querySelectorAll('textarea')].map(el => [el.id, el.value]));
    const starts = records.activities.filter(a => a.type === 'clock_in');
    const active = starts.find(i => !records.activities.some(o => o.shift_id === i.shift_id && o.type === 'clock_out' && o.id > i.id));
    const assignments = applications.filter(a => a.status === 'approved' && ['open', 'assigned', 'in_progress'].includes(a.shift.status) && !records.timesheets.some(t => t.shift_id === a.shift.id));
    if (!assignments.length) { renderEmpty(container, 'No assigned shifts ready', 'Accept a shift or wait for your employer to approve an application.'); return; }
    container.innerHTML = assignments.map(({ shift }) => {
      const running = active?.shift_id === shift.id;
      const last = records.activities.filter(a => a.shift_id === shift.id).at(-1);
      const onBreak = running && last?.type === 'break_start';
      return `<article class="surface-pad"><h2>${escapeHtml(shift.title)}</h2><p>${dateTime(shift.startTime)} – ${dateTime(shift.endTime)}</p><p>${escapeHtml(shift.location.address)}, ${escapeHtml(shift.location.city)}</p>${running ? `<p>Clocked in ${dateTime(active.timestamp)}${onBreak ? ' · On paid break' : ''}</p><p>${active.location ? 'GPS captured for employer review; site verification is not configured.' : 'No GPS evidence captured.'}</p><label for="clock-note-${shift.id}">Shift notes</label><textarea id="clock-note-${shift.id}" maxlength="4000"></textarea><p><button type="button" class="secondary-button" data-clock-shift="${shift.id}" data-clock-action="${onBreak ? 'end' : 'start'}">${onBreak ? 'End' : 'Start'} paid break</button> <button type="button" class="primary-button" data-clock-shift="${shift.id}" data-clock-action="clock-out" ${onBreak ? 'disabled' : ''}>Clock out</button></p>` : `<button type="button" class="primary-button" data-clock-shift="${shift.id}" data-clock-action="clock-in" ${active ? 'disabled' : ''}>Clock in</button>`}</article>`;
    }).join('');
    for (const [id, value] of drafts) { const field = document.getElementById(id); if (field) field.value = value; }
  }

  let savingTime = false;
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!form.matches('[data-review-sheet], [data-resubmit-sheet]')) return;
    event.preventDefault();
    if (savingTime) return;
    const review = form.dataset.reviewSheet;
    const data = new FormData(form);
    const status = event.submitter?.value;
    if (review && !['approved', 'correction_requested'].includes(status)) return;
    if (status === 'correction_requested' && !String(data.get('note') || '').trim()) { notify('Explain what needs clarification.'); return; }
    if (status === 'approved' && !window.confirm('Approve these recorded hours? This does not send payment.')) return;
    savingTime = true;
    form.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      await api(review ? `/bookings/employer/timesheets/${review}` : `/bookings/caregiver/timesheets/${form.dataset.resubmitSheet}/resubmit`, { method: review ? 'PATCH' : 'POST', body: JSON.stringify(review ? { status, note: String(data.get('note') || '') } : { notes: String(data.get('notes') || '') }) });
      notify('Timesheet update saved.');
      await (review ? loadEmployer() : loadCaregiver());
    } catch (error) { notify(error.message); }
    finally { savingTime = false; form.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-clock-shift]');
    if (!button || savingTime) return;
    const shiftId = button.dataset.clockShift;
    const action = button.dataset.clockAction;
    if (action === 'clock-out' && !window.confirm('Finish this shift and send the timesheet for review?')) return;
    savingTime = true; button.disabled = true;
    try {
      const isBreak = action === 'start' || action === 'end';
      const location = isBreak ? null : await captureLocation();
      await api(`/bookings/${shiftId}/${isBreak ? 'break' : action}`, { method: 'POST', body: JSON.stringify(isBreak ? { action } : { location, notes: document.getElementById(`clock-note-${shiftId}`)?.value || '' }) });
      notify(isBreak ? 'Break saved.' : location ? 'Attendance saved with GPS evidence.' : 'Attendance saved without GPS evidence.');
      await loadCaregiver();
    } catch (error) { notify(error.message); }
    finally { savingTime = false; button.disabled = false; }
  });

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

  function renderInvitations(container, invitations) {
    if (!container) return;
    if (!invitations.length) {
      renderEmpty(container, 'No invitations yet', 'Invite a caregiver by email or phone to connect them to your organization.');
      return;
    }
    container.innerHTML = invitations.map((invitation) => {
      const name = `${invitation.firstName || ''} ${invitation.lastName || ''}`.trim() || invitation.email || invitation.phone || 'Caregiver';
      const expired = invitation.status === 'pending' && new Date(invitation.expiresAt) <= new Date();
      const status = expired ? 'expired' : invitation.status;
      return `<div class="list-row" data-searchable><span class="row-icon">IN</span><span class="row-copy"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(invitation.email || invitation.phone || '')} · Sent ${dateTime(invitation.createdAt)}</span></span><span class="status ${status === 'accepted' ? '' : 'neutral'}">${escapeHtml(status)}</span></div>`;
    }).join('');
  }

  function renderCompliance(container, caregivers) {
    if (!container) return;
    if (!caregivers.length) {
      renderEmpty(container, 'No caregiver screening records', 'Invite a caregiver first. Screening status will appear after their profile is connected.');
      return;
    }
    container.innerHTML = caregivers.map((person) => {
      const status = person.backgroundCheckStatus || 'pending';
      return `<div class="list-row" data-searchable><span class="avatar">${escapeHtml(`${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`)}</span><span class="row-copy"><strong>${escapeHtml(`${person.firstName || ''} ${person.lastName || ''}`.trim())}</strong><span>${person.backgroundCheckDate ? `Updated ${dateTime(person.backgroundCheckDate)}` : 'Awaiting screening update'}</span></span><span class="status ${status === 'verified' ? '' : 'warning'}">${escapeHtml(status)}</span></div>`;
    }).join('');
  }

  async function loadEmployer() {
    const [shiftResult, activityResult, payrollResult, caregiverResult, conversationResult, profileResult, invitationResult, timesheetResult, applicationsResult] = await Promise.allSettled([
      api('/bookings/employer/my'), api('/bookings/activities'), api('/payroll/employer/overview'), api('/bookings/employer/team'), api('/messages/conversations'), api(`/employers/${session.user.id}`), api('/employers/invitations'), api('/bookings/employer/timesheets'), api('/bookings/employer/applications')
    ]);
    const shifts = shiftResult.status === 'fulfilled' ? shiftResult.value.shifts || [] : [];
    const activities = activityResult.status === 'fulfilled' ? activityResult.value.activities || [] : [];
    const payroll = payrollResult.status === 'fulfilled' ? payrollResult.value : { stats: {}, recentPayments: [] };
    const caregivers = caregiverResult.status === 'fulfilled' ? (caregiverResult.value.team || []).map((person) => ({
      ...person, userId: person.user_id, firstName: person.first_name, lastName: person.last_name,
      hourlyRate: person.hourly_rate, backgroundCheckStatus: person.background_check_status,
      backgroundCheckDate: person.background_check_date,
    })) : [];
    const conversations = conversationResult.status === 'fulfilled' ? conversationResult.value.conversations || [] : [];
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const invitations = invitationResult.status === 'fulfilled' ? invitationResult.value.invitations || [] : [];
    if (profile?.companyName) {
      session.user.companyName = profile.companyName;
      session.storage.setItem('user', JSON.stringify(session.user));
      document.querySelectorAll('[data-company-name]').forEach((element) => { element.textContent = profile.companyName; });
    }
    const timesheets = timesheetResult.status === 'fulfilled' ? timesheetResult.value.timesheets || [] : [];
    const unfilled = shifts.filter(shift => ['open', 'assigned', 'in_progress'].includes(shift.status) && shift.remainingPositions > 0).length;
    setText('metricOpenShifts', unfilled);
    setText('metricOnDuty', activityResult.status === 'fulfilled' ? activityResult.value.activeCount : 'Unavailable');
    setText('metricCaregivers', caregivers.length);
    setText('metricPendingPayroll', money(payroll.stats?.pending_amount));
    setText('attentionTimesheets', timesheetResult.status === 'fulfilled' ? timesheets.filter(t => t.status === 'pending_approval').length : 'Unavailable');
    setText('attentionShifts', unfilled);
    renderShiftRows(document.getElementById('overviewShiftList'), shifts.slice(0, 4), true);
    renderShiftRows(document.getElementById('allShiftList'), shifts, true);
    renderActivities(document.getElementById('activityList'), activities);
    if (timesheetResult.status === 'fulfilled') renderTimesheets(document.getElementById('timesheetList'), timesheets, true);
    else renderEmpty(document.getElementById('timesheetList'), 'Timesheets could not be loaded', 'Refresh to try again.');
    renderConversations(document.getElementById('conversationList'), conversations);
    const caregiverList = document.getElementById('caregiverList');
    if (caregiverList) {
      if (!caregivers.length) renderEmpty(caregiverList, 'No caregivers available yet', 'Verified caregivers will appear here as the network grows.');
      else caregiverList.innerHTML = caregivers.map((person) => `<div class="list-row" data-searchable><span class="avatar">${escapeHtml(`${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`)}</span><span class="row-copy"><strong>${escapeHtml(`${person.firstName || ''} ${person.lastName || ''}`)}</strong><span>${escapeHtml((person.specialties || []).join(' · ') || 'Caregiver')}</span></span><span class="row-meta">★ ${escapeHtml(person.rating || 'New')}<br>${money(person.hourlyRate)}/hr</span></div>`).join('');
    }
    if (applicationsResult.status === 'fulfilled') renderApplications(applicationsResult.value.applications || []);
    else renderEmpty(document.getElementById('applicationList'), 'Applications unavailable', 'Refresh to try again.');
    renderInvitations(document.getElementById('invitationList'), invitations);
    renderCompliance(document.getElementById('complianceList'), caregivers);
    setText('payrollTotal', money(payroll.stats?.total_spent));
    setText('payrollPending', money(payroll.stats?.pending_amount));
    setText('payrollPaid', money(payroll.stats?.paid_amount));
  }

  async function loadCaregiver() {
    const [profileResult, shiftResult, conversationResult, assignmentsResult, timeResult] = await Promise.allSettled([
      api(`/caregivers/${session.user.id}`), api('/bookings/available'), api('/messages/conversations'), api('/bookings/caregiver/my-applications'), api('/bookings/caregiver/timekeeping')
    ]);
    const profile = profileResult.status === 'fulfilled' ? profileResult.value.profile : null;
    const shifts = shiftResult.status === 'fulfilled' ? shiftResult.value.shifts || [] : [];
    const conversations = conversationResult.status === 'fulfilled' ? conversationResult.value.conversations || [] : [];
    setText('metricAvailable', shifts.length);
    const applications = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value.applications || [] : [];
    const records = timeResult.status === 'fulfilled' ? timeResult.value : { activities: [], timesheets: [] };
    setText('metricCompleted', timeResult.status === 'fulfilled' ? records.timesheets.length : 'Unavailable');
    renderShiftRows(document.getElementById('assignedShiftList'), applications.filter(a => a.status === 'approved').map(a => a.shift), true);
    if (assignmentsResult.status === 'fulfilled' && timeResult.status === 'fulfilled') {
      renderCaregiverClock(applications, records);
      renderTimesheets(document.getElementById('caregiverTimesheets'), records.timesheets, false, applications);
    } else {
      renderEmpty(document.getElementById('caregiverClock'), 'Time records could not be loaded', 'Reconnect and select Refresh before recording attendance.');
      renderEmpty(document.getElementById('caregiverTimesheets'), 'Timesheets unavailable', 'Refresh to try again.');
    }
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
      title: formData.get('title'), serviceType: formData.get('serviceType'), caregiverType: formData.get('caregiverType'), careRecipientName: formData.get('careRecipientName'), scheduleType: 'one_time', startDate: formData.get('startDate'), startTime: formData.get('startTime'), endTime: formData.get('endTime'), endDate: formData.get('endDate') || undefined, timeZone: formData.get('timeZone'), assignmentMode: formData.get('assignmentMode'),
      location: { type: 'client_home', address: formData.get('address'), city: formData.get('city'), state: String(formData.get('state') || '').toUpperCase(), zipCode: formData.get('zipCode') },
      pay: { hourlyRate: Number(formData.get('hourlyRate')), currency: 'USD' }, numberOfCaregivers: Number(formData.get('numberOfCaregivers') || 1), requirements: [], responsibilities: formData.get('responsibilities'), notes: '', contact: { name: fullName, phone: session.user.phone || 'Contact through Elite Bridge' }, urgency: formData.get('urgency')
    };
    try {
      await api('/bookings', { method: 'POST', body: JSON.stringify(payload) });
      notify('Your shift is live and available to matching caregivers.');
      shiftForm.reset();
      await loadEmployer();
    } catch (error) { notify(error.message); }
    finally { submit.disabled = false; submit.textContent = 'Publish shift'; }
  });

  const refreshShared = () => (expectedRole === 'employer' ? loadEmployer() : loadCaregiver()).catch(() => notify('Could not refresh shared records.'));
  document.getElementById('refreshTime')?.addEventListener('click', refreshShared);
  window.addEventListener('focus', () => {
    if (!savingTime && !document.querySelector('textarea:not(:placeholder-shown)') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) void refreshShared();
  });
  (expectedRole === 'employer' ? loadEmployer() : loadCaregiver()).catch(() => notify('Some live information could not be loaded. Please refresh to try again.'));
})();
