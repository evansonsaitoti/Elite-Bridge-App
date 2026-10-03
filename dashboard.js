(function () {
  const API_BASE = 'https://elite-bridge-shared-api-evans.vercel.app/api';
  const role = document.body.dataset.role;
  const expectedRole = role === 'employer' ? 'employer' : 'caregiver';
  const otherDashboard = expectedRole === 'employer' ? '/caregiver-dashboard' : '/employer-dashboard';

  function getSession() {
    const stores = [localStorage, sessionStorage];
    for (const storage of stores) {
      const token = storage.getItem('token');
      const rawUser = storage.getItem('user');
      if (!token || !rawUser) continue;
      try {
        return { storage, user: JSON.parse(rawUser), token };
      } catch (_) {
        storage.removeItem('token');
        storage.removeItem('user');
      }
    }
    return { storage: sessionStorage, user: null, token: null };
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
  const mobileMoreTab = document.getElementById('mobileMoreTab');
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

  function setMoreExpanded(expanded) {
    if (!mobileMoreTab) return;
    mobileMoreTab.setAttribute('aria-expanded', String(expanded));
    mobileMoreTab.setAttribute('aria-label', expanded ? 'Close navigation menu' : 'Open more navigation');
    const label = mobileMoreTab.querySelector('.mobile-more-label');
    if (label) label.textContent = expanded ? 'Close menu' : 'More';
  }

  function closeMobileNav() {
    document.body.classList.remove('nav-open', 'mobile-more-open');
    setMoreExpanded(false);
    menuToggle?.setAttribute('aria-expanded', 'false');
  }
  menuToggle?.addEventListener('click', () => {
    const expanded = document.body.classList.toggle('nav-open');
    menuToggle.setAttribute('aria-expanded', String(expanded));
  });
  mobileMoreTab?.addEventListener('click', () => {
    const expanded = document.body.classList.toggle('mobile-more-open');
    setMoreExpanded(expanded);
  });
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



  const clockReminderForm = document.getElementById('clockReminderSettings');
  const clockReminderStatus = document.getElementById('clockReminderStatus');
  async function loadClockReminderSettings() {
    if (!clockReminderForm || expectedRole !== 'employer') return;
    try {
      const result = await api('/clock-reminders/settings');
      const settings = result.settings || {};
      document.getElementById('preShiftEnabled').checked = Boolean(settings.preShiftEnabled);
      document.getElementById('preShiftMinutes').value = String(settings.preShiftMinutes || 15);
      document.getElementById('lateAlertEnabled').checked = Boolean(settings.lateAlertEnabled);
      document.getElementById('lateGraceMinutes').value = String(settings.lateGraceMinutes || 5);
      document.getElementById('notifyEmployer').checked = settings.notifyEmployer !== false;
    } catch (error) {
      if (clockReminderStatus) clockReminderStatus.textContent = error.message || 'Settings could not be loaded.';
    }
  }
  clockReminderForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = clockReminderForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    if (clockReminderStatus) clockReminderStatus.textContent = 'Saving…';
    try {
      await api('/clock-reminders/settings', {
        method: 'PUT',
        body: JSON.stringify({
          preShiftEnabled: document.getElementById('preShiftEnabled').checked,
          preShiftMinutes: Number(document.getElementById('preShiftMinutes').value),
          lateAlertEnabled: document.getElementById('lateAlertEnabled').checked,
          lateGraceMinutes: Number(document.getElementById('lateGraceMinutes').value),
          notifyEmployer: document.getElementById('notifyEmployer').checked
        })
      });
      if (clockReminderStatus) clockReminderStatus.textContent = 'Settings saved.';
      notify('Shift reminder settings saved.');
    } catch (error) {
      if (clockReminderStatus) clockReminderStatus.textContent = error.message || 'Settings could not be saved.';
    } finally {
      if (button) button.disabled = false;
    }
  });
  loadClockReminderSettings();

  function todayInputValue() {
    return new Date().toISOString().slice(0, 10);
  }

  function contractFieldValue(id, fallback = '') {
    const el = document.getElementById(id);
    return (el?.value || '').trim() || fallback;
  }

  function formatContractDate(value) {
    if (!value) return 'To be confirmed';
    const date = new Date(value + 'T12:00:00');
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatContractDateOrBlank(value) {
    return value ? formatContractDate(value) : '';
  }

  function contractLines(value, fallback = 'To be confirmed') {
    return value
      .split(/\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map((item) => '<span>' + escapeHtml(item) + '</span>')
      .join('') || '<span>' + escapeHtml(fallback) + '</span>';
  }

  function contractRateLines(value) {
    return value
      .split(/\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((item) => '<p>' + escapeHtml(item) + '</p>')
      .join('');
  }

  function checkedContractValues(name, fallback = 'To be confirmed') {
    const values = Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((field) => field.value);
    return values.length ? values.join(', ') : fallback;
  }

  function contractCheckmark(name, value) {
    return document.querySelector(`input[name="${name}"][value="${value}"]:checked`) ? '✓' : '';
  }

  function rateCheckmark(value) {
    return document.querySelector(`input[name="contractRates"][value="${value}"]:checked`) ? '✓' : '';
  }

  const CONTRACT_NUDGE_STORAGE = 'eliteContractOverlayNudges';
  const contractNudgeTargets = {
    'client-name': ['value-client'],
    'care-recipient': ['value-recipient'],
    'start-date': ['value-start'],
    'service-days': ['mark-mon', 'mark-tue', 'mark-wed', 'mark-thu', 'mark-fri', 'mark-sat', 'mark-sun'],
    'rate-checks': ['mark-morning', 'mark-evening'],
    'rate-amounts': ['value-day-rate', 'value-evening-rate'],
    billing: ['mark-weekly', 'mark-biweekly'],
    'client-signature': ['sig-client'],
    'client-date': ['date-client'],
    'agency-signature': ['sig-agency'],
    'agency-date': ['date-agency']
  };

  function readContractNudges() {
    try {
      return JSON.parse(localStorage.getItem(CONTRACT_NUDGE_STORAGE) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function saveContractNudges(nudges) {
    localStorage.setItem(CONTRACT_NUDGE_STORAGE, JSON.stringify(nudges));
  }

  function applyContractNudges() {
    const nudges = readContractNudges();
    Object.entries(contractNudgeTargets).forEach(([key, classes]) => {
      const offset = nudges[key];
      classes.forEach((className) => {
        document.querySelectorAll(`.${className}`).forEach((element) => {
          if (!offset || (!offset.x && !offset.y)) {
            element.style.transform = '';
            return;
          }
          element.style.transform = `translate(${offset.x || 0}px, ${offset.y || 0}px)`;
        });
      });
    });
  }

  function nudgeContractTarget(target, dx, dy) {
    const nudges = readContractNudges();
    const current = nudges[target] || { x: 0, y: 0 };
    nudges[target] = { x: (current.x || 0) + dx, y: (current.y || 0) + dy };
    saveContractNudges(nudges);
    applyContractNudges();
  }

  function resetContractNudge(target) {
    const nudges = readContractNudges();
    delete nudges[target];
    saveContractNudges(nudges);
    applyContractNudges();
  }

  function renderContractPreview() {
    const preview = document.getElementById('contractPreview');
    if (!preview) return;

    const clientName = contractFieldValue('contractClientName', '');
    const careRecipient = contractFieldValue('contractCareRecipient', '');
    const startDate = formatContractDateOrBlank(contractFieldValue('contractStartDate', ''));
    const dayRate = contractFieldValue('contractDayRate', '');
    const eveningRate = contractFieldValue('contractEveningRate', '');
    const clientSigner = contractFieldValue('contractClientSigner', clientName);
    const clientDate = formatContractDateOrBlank(contractFieldValue('contractClientDate', ''));
    const agencySigner = contractFieldValue('contractAgencySigner', '');
    const agencyDate = formatContractDateOrBlank(contractFieldValue('contractAgencyDate', ''));

    preview.innerHTML = `
      <section class="contract-template-page" aria-label="Contract page 1">
        <img src="/elite-contract-template-1.png?v=contract-align-20261001" alt="Elite Bridge contract page 1">
        <span class="template-value value-client">${escapeHtml(clientName)}</span>
        <span class="template-value value-recipient">${escapeHtml(careRecipient)}</span>
        <span class="template-value value-start">${escapeHtml(startDate)}</span>
        <span class="template-mark mark-mon">${contractCheckmark('contractDays', 'Monday')}</span>
        <span class="template-mark mark-tue">${contractCheckmark('contractDays', 'Tuesday')}</span>
        <span class="template-mark mark-wed">${contractCheckmark('contractDays', 'Wednesday')}</span>
        <span class="template-mark mark-thu">${contractCheckmark('contractDays', 'Thursday')}</span>
        <span class="template-mark mark-fri">${contractCheckmark('contractDays', 'Friday')}</span>
        <span class="template-mark mark-sat">${contractCheckmark('contractDays', 'Saturday')}</span>
        <span class="template-mark mark-sun">${contractCheckmark('contractDays', 'Sunday')}</span>
        <span class="template-mark mark-morning">${rateCheckmark('Morning')}</span>
        <span class="template-mark mark-evening">${rateCheckmark('Evening')}</span>
        <span class="template-mark mark-weekly">${contractCheckmark('contractBilling', 'Weekly')}</span>
        <span class="template-mark mark-biweekly">${contractCheckmark('contractBilling', 'Biweekly')}</span>
        <span class="template-value value-day-rate">${escapeHtml(dayRate)}</span>
        <span class="template-value value-evening-rate">${escapeHtml(eveningRate)}</span>
      </section>
      <section class="contract-template-page" aria-label="Contract page 2">
        <img src="/elite-contract-template-2.png?v=contract-align-20261001" alt="Elite Bridge contract page 2">
        <span class="template-signature sig-client">${escapeHtml(clientSigner)}</span>
        <span class="template-value date-client">${escapeHtml(clientDate)}</span>
        <span class="template-signature sig-agency">${escapeHtml(agencySigner)}</span>
        <span class="template-value date-agency">${escapeHtml(agencyDate)}</span>
      </section>
    `;
    applyContractNudges();
  }

  function printContractPdf() {
    renderContractPreview();
    window.print();
  }

  function emailContractClient() {
    renderContractPreview();
    const email = contractFieldValue('contractClientEmail', '');
    const clientName = contractFieldValue('contractClientName', 'Client');
    const subject = encodeURIComponent('Elite Bridge Staffing service agreement');
    const body = encodeURIComponent(`Hello ${clientName},\n\nAttached/printed separately is your Elite Bridge Staffing non-medical home care services agreement for review.\n\nThank you,\nElite Bridge Staffing`);
    const target = email ? `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = target;
  }

  function initializeContractGenerator() {
    const form = document.getElementById('contractForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      renderContractPreview();
      notify('Contract preview updated.');
    });

    form.querySelectorAll('input, textarea').forEach((field) => {
      field.addEventListener('input', renderContractPreview);
      field.addEventListener('change', renderContractPreview);
    });

    document.getElementById('printContract')?.addEventListener('click', printContractPdf);
    document.getElementById('printContractTop')?.addEventListener('click', printContractPdf);
    document.getElementById('emailContract')?.addEventListener('click', emailContractClient);
    document.getElementById('emailContractTop')?.addEventListener('click', emailContractClient);
    document.querySelectorAll('[data-nudge-x], [data-nudge-y]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById('contractNudgeTarget')?.value || 'client-signature';
        nudgeContractTarget(target, Number(button.dataset.nudgeX || 0), Number(button.dataset.nudgeY || 0));
      });
    });
    document.getElementById('resetContractNudge')?.addEventListener('click', () => {
      const target = document.getElementById('contractNudgeTarget')?.value || 'client-signature';
      resetContractNudge(target);
    });
    document.getElementById('resetAllContractNudges')?.addEventListener('click', () => {
      localStorage.removeItem(CONTRACT_NUDGE_STORAGE);
      applyContractNudges();
    });

    renderContractPreview();
  }

  function activateView(viewName) {
    const view = document.querySelector(`[data-view-panel="${viewName}"]`) || document.querySelector('[data-view-panel="overview"]');
    document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel !== view; });
    document.querySelectorAll('[data-view]').forEach((link) => {
      const isActive = link.dataset.view === view.dataset.viewPanel;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
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
  const fallbackWorkflowSpec = {
    version: '2026-10-03',
    owner: 'Elite Bridge Staffing',
    defaultSecurity: {
      authentication: 'Bearer JWT or scoped MCP token',
      authorization: 'Employer admin or owner role required for write actions',
      auditRequired: true,
      humanApprovalRequiredFor: ['sending client-facing contract emails', 'publishing shifts', 'marking payroll runs paid', 'changing caregiver pay rates'],
      privacyRules: [
        'Caregivers never receive client billing rates.',
        'Client billing rate and caregiver pay rate remain separate fields.',
        'MCP tools must only expose allowlisted actions and redact tokens from logs.'
      ]
    },
    workflows: [
      {
        id: 'client_schedule_intake',
        name: 'Client schedule intake',
        description: 'Create a client record, care schedule, draft shifts, and staff allocation options from one intake.',
        triggerSources: ['ChatGPT', 'internal_dashboard', 'mcp_server'],
        requiredRole: 'employer_admin',
        inputs: { clientName: 'string', careRecipient: 'string optional', address: 'string', serviceDays: 'array of weekday strings', timeWindows: 'array of { startTime, endTime }', clientBillingRate: 'number', notes: 'string optional' },
        actions: ['create_or_update_client', 'create_schedule_template', 'draft_shift_series', 'prepare_staff_allocation_options'],
        auditEvents: ['client.created', 'schedule.created', 'shift_series.drafted'],
        mcpToolCandidate: 'elitebridge_create_client_schedule'
      },
      {
        id: 'invite_caregiver_shift',
        name: 'Invite caregiver to shift',
        description: 'Invite one caregiver to a specific shift with a custom pay rate visible only to that caregiver.',
        triggerSources: ['ChatGPT', 'internal_dashboard', 'mcp_server'],
        requiredRole: 'employer_admin',
        inputs: { shiftId: 'string', caregiverId: 'string', caregiverPayRate: 'number', message: 'string optional' },
        actions: ['validate_shift_open', 'store_private_caregiver_offer', 'send_caregiver_invitation', 'log_rate_visibility'],
        auditEvents: ['shift.offer.created', 'caregiver.invited', 'private_rate.logged'],
        mcpToolCandidate: 'elitebridge_invite_caregiver_to_shift'
      },
      {
        id: 'shift_coverage_guard',
        name: 'Shift coverage guard',
        description: 'Check upcoming shifts and alert the owner when coverage is missing before the start time.',
        triggerSources: ['scheduled_job', 'ChatGPT', 'mcp_server'],
        requiredRole: 'system_or_employer_admin',
        inputs: { lookAheadHours: 'number default 24', minimumOpenSlots: 'number default 1', notifyChannels: 'array of email, sms, dashboard' },
        actions: ['find_underfilled_shifts', 'rank_by_start_time', 'notify_owner', 'suggest_available_caregivers'],
        auditEvents: ['coverage_guard.checked', 'coverage_guard.alerted'],
        mcpToolCandidate: 'elitebridge_check_shift_coverage'
      },
      {
        id: 'timesheet_reminder',
        name: 'Timesheet reminder',
        description: 'Remind caregivers to submit or correct timesheets after completed shifts.',
        triggerSources: ['scheduled_job', 'internal_dashboard', 'mcp_server'],
        requiredRole: 'employer_admin',
        inputs: { afterShiftHours: 'number default 4', caregiverIds: 'array optional', messageTemplate: 'string optional' },
        actions: ['find_missing_timesheets', 'send_caregiver_reminders', 'record_reminder_attempts'],
        auditEvents: ['timesheet.reminder.sent'],
        mcpToolCandidate: 'elitebridge_send_timesheet_reminders'
      },
      {
        id: 'payroll_exception_check',
        name: 'Payroll exception check',
        description: 'Review approved timesheets before a 1099 payout run and flag issues that need human review.',
        triggerSources: ['internal_dashboard', 'ChatGPT', 'mcp_server'],
        requiredRole: 'employer_owner',
        inputs: { periodStart: 'date', periodEnd: 'date', includeW9Check: 'boolean default true' },
        actions: ['find_approved_unpaid_timesheets', 'detect_duplicate_hours', 'detect_missing_w9', 'detect_rate_changes', 'prepare_exception_report'],
        auditEvents: ['payroll.exception_check.created'],
        mcpToolCandidate: 'elitebridge_prepare_payroll_exception_report'
      },
      {
        id: 'contract_generate_send',
        name: 'Generate and send client contract',
        description: 'Generate the Elite Bridge contract PDF from client inputs and prepare an email for approval before sending.',
        triggerSources: ['internal_dashboard', 'ChatGPT', 'mcp_server'],
        requiredRole: 'employer_admin',
        inputs: { clientId: 'string', clientName: 'string', careRecipient: 'string optional', serviceDays: 'array', hourlyRates: 'object', clientEmail: 'string' },
        actions: ['render_contract_pdf', 'prepare_email_draft', 'require_human_approval', 'send_contract_email'],
        auditEvents: ['contract.pdf.generated', 'contract.email.approved', 'contract.email.sent'],
        mcpToolCandidate: 'elitebridge_generate_client_contract'
      }
    ]
  };

  let workflowSpecPromise;
  async function getWorkflowSpec() {
    if (!workflowSpecPromise) {
      workflowSpecPromise = fetch('/elite-bridge-automation-workflows.json')
        .then((response) => {
          if (!response.ok) throw new Error('Workflow library could not be loaded.');
          return response.json();
        })
        .catch(() => fallbackWorkflowSpec);
    }
    return workflowSpecPromise;
  }

  async function copyWorkflowPayload(workflowId) {
    try {
      const spec = await getWorkflowSpec();
      if (workflowId === 'all') {
        const textPayload = JSON.stringify(spec, null, 2);
        try {
          await navigator.clipboard.writeText(textPayload);
          notify('Copied all prepared workflow payloads.');
        } catch (_) {
          window.prompt('Copy these workflow payloads:', textPayload);
        }
        return;
      }
      const workflow = spec.workflows?.find((item) => item.id === workflowId);
      if (!workflow) throw new Error('Workflow was not found.');
      const payload = {
        eliteBridgeWorkflow: workflow,
        security: spec.defaultSecurity,
        preparedFor: ['ChatGPT', 'internal_dashboard', 'mcp_server'],
        nextIntegrationStep: 'Map mcpToolCandidate to a backend endpoint with role checks, input validation, and audit logging.'
      };
      const textPayload = JSON.stringify(payload, null, 2);
      try {
        await navigator.clipboard.writeText(textPayload);
        notify(`Copied ${workflow.name} workflow payload.`);
      } catch (_) {
        window.prompt('Copy this workflow payload:', textPayload);
      }
    } catch (error) {
      notify(error.message || 'Could not copy workflow payload.');
    }
  }

  document.querySelectorAll('[data-copy-workflow]').forEach((button) => {
    button.addEventListener('click', () => copyWorkflowPayload(button.dataset.copyWorkflow));
  });
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

  document.getElementById('copyInviteApp')?.addEventListener('click', async () => {
    const link = document.getElementById('inviteAppLink')?.value;
    if (!link) return;
    try { await navigator.clipboard.writeText(link); notify('Caregiver app link copied.'); }
    catch (_) { window.prompt('Copy this caregiver app link:', link); }
  });

  document.getElementById('shareInvite')?.addEventListener('click', async () => {
    const link = document.getElementById('inviteLink')?.value;
    const appLink = document.getElementById('inviteAppLink')?.value || link;
    if (!link) return;
    const shareData = { title: 'Elite Bridge invitation', text: `Join our care team on Elite Bridge. Download the caregiver app: ${appLink}`, url: link };
    if (navigator.share) {
      try { await navigator.share(shareData); return; }
      catch (error) { if (error?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(link); notify('Invitation link copied. You can paste it into any app.'); }
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
      const appLink = document.getElementById('inviteAppLink');
      const delivery = document.getElementById('inviteDelivery');
      const caregiverAppUrl = data.appLinks?.caregiver || data.inviteUrl;
      link.value = data.inviteUrl;
      appLink.value = caregiverAppUrl;
      const sentBy = [data.emailSent ? 'email' : '', data.smsSent ? 'text' : ''].filter(Boolean).join(' and ');
      delivery.textContent = sentBy ? `The invitation was sent by ${sentBy}. You can also copy or share the links below.` : 'Copy, email, or text this secure invitation and app download link to the caregiver.';
      const emailBody = `Join our care team on Elite Bridge.\n\nAccept your secure invitation: ${data.inviteUrl}\nDownload the caregiver app: ${caregiverAppUrl}`;
      const textBody = `Join Elite Bridge. Accept: ${data.inviteUrl} Download app: ${caregiverAppUrl}`;
      document.getElementById('emailInvite').href = `mailto:${encodeURIComponent(payload.email || '')}?subject=${encodeURIComponent('Your Elite Bridge invitation')}&body=${encodeURIComponent(emailBody)}`;
      document.getElementById('textInvite').href = `sms:${encodeURIComponent(payload.phone || '')}?body=${encodeURIComponent(textBody)}`;
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

  function formatDateOnly(value) {
    if (!value) return '—';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function render1099Payroll(data) {
    const approved = data?.approvedTimesheets || [];
    const runs = data?.runs || [];
    const contractors = data?.contractors || [];
    const summary = data?.summary || {};
    const blockedCount = approved.filter(item => item.w9_status !== 'received').length;
    setText('payrollDraft', money(summary.draft_total));
    setText('payrollPaid', money(summary.paid_total));
    setText('payrollYear', money(summary.year_paid_total));
    setText('payrollUnbatched', approved.length);

    const approvedList = document.getElementById('approvedPayoutList');
    if (approvedList) {
      if (!approved.length) renderEmpty(approvedList, 'No approved unpaid timesheets', 'Approve timesheets first, or everything approved has already been placed into a payout run.');
      else approvedList.innerHTML = `${blockedCount ? `<p class="form-note warning-note">${blockedCount} approved timesheet${blockedCount === 1 ? '' : 's'} cannot be batched until W-9 is marked received.</p>` : ''}${approved.map((item) => {
        const ready = item.w9_status === 'received';
        return `
        <div class="list-row" data-searchable>
          <span class="row-icon">1099</span>
          <span class="row-copy"><strong>${escapeHtml(`${item.first_name || ''} ${item.last_name || ''}`.trim())}</strong><span>${escapeHtml(item.shift_title || item.service_type || 'Care shift')} · ${formatDateOnly(item.clock_in_utc)} · ${(Number(item.worked_minutes || 0) / 60).toFixed(2)} hrs</span></span>
          <span class="row-meta">${money(item.total_amount)}<br><span class="status ${ready ? '' : 'warning'}">${ready ? 'Ready' : `Blocked: ${escapeHtml(item.w9_status || 'not_collected')}`}</span></span>
        </div>
      `; }).join('')}`;
    }

    const runList = document.getElementById('payoutRunList');
    if (runList) {
      if (!runs.length) renderEmpty(runList, 'No payout runs yet', 'Create your first 1099 payout run from approved unpaid timesheets.');
      else runList.innerHTML = runs.map((run) => `
        <article class="list-row payout-run" data-searchable>
          <span class="row-icon">$</span>
          <span class="row-copy"><strong>Run #${run.id} · ${formatDateOnly(run.period_start)} – ${formatDateOnly(run.period_end)}</strong><span>${escapeHtml(run.memo || '1099 contractor payout')} · ${run.paid_at ? `Paid ${dateTime(run.paid_at)}` : 'Not marked paid yet'}</span></span>
          <span class="row-meta">${money(run.total_amount)}<br><span class="status ${run.status === 'paid' ? '' : 'neutral'}">${escapeHtml(run.status)}</span></span>
          <span class="row-actions">
            <button class="secondary-button" type="button" data-export-run="${run.id}" data-export-format="standard">Audit CSV</button>
            <button class="secondary-button" type="button" data-export-run="${run.id}" data-export-format="chase">Chase CSV</button>
            <button class="secondary-button" type="button" data-export-run="${run.id}" data-export-format="melio">Melio CSV</button>
            ${run.status === 'draft' ? `<button class="primary-button" type="button" data-mark-payout-paid="${run.id}">Mark paid</button>` : ''}
          </span>
        </article>
      `).join('');
    }

    const contractorList = document.getElementById('contractor1099List');
    if (contractorList) {
      if (!contractors.length) renderEmpty(contractorList, 'No connected contractors', 'Invite caregivers first. Their 1099 totals will appear here after payout runs are paid.');
      else contractorList.innerHTML = contractors.map((person) => `
        <div class="list-row" data-searchable>
          <span class="avatar">${escapeHtml(`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`)}</span>
          <span class="row-copy"><strong>${escapeHtml(`${person.first_name || ''} ${person.last_name || ''}`.trim())}</strong><span>${escapeHtml(person.email || '')} · ${escapeHtml(person.payment_method || 'manual payment')}</span></span>
          <span class="row-meta">${money(person.year_paid)}<br><span class="status ${person.w9_status === 'received' ? '' : 'warning'}">W-9 ${escapeHtml(String(person.w9_status || 'not_collected').replaceAll('_', ' '))}</span></span>
          <span class="row-actions payroll-controls">
            <label>W-9
              <select data-w9-caregiver="${person.caregiver_id}">
                ${['not_collected', 'requested', 'received', 'blocked'].map(status => `<option value="${status}" ${person.w9_status === status ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('')}
              </select>
            </label>
            <label>Pay by
              <select data-payment-caregiver="${person.caregiver_id}">
                ${['manual', 'ach', 'check', 'zelle', 'cashapp', 'venmo'].map(method => `<option value="${method}" ${person.payment_method === method ? 'selected' : ''}>${method}</option>`).join('')}
              </select>
            </label>
          </span>
        </div>
      `).join('');
    }
  }

  function renderPayrollAudit(data) {
    const container = document.getElementById('payrollAuditList');
    if (!container) return;
    const events = data?.events || [];
    if (!events.length) {
      renderEmpty(container, 'No payroll security events yet', 'W-9 updates, payout creation, exports, and paid confirmations will appear here.');
      return;
    }
    const labels = {
      contractor_1099_profile_updated: 'Contractor payroll profile updated',
      contractor_payout_run_created: 'Payout run created',
      contractor_payout_run_exported: 'Payout run exported',
      contractor_payout_run_marked_paid: 'Payout run marked paid',
      payroll_export: 'Legacy payroll export'
    };
    container.innerHTML = events.map((event) => {
      const detail = event.detail || {};
      const actor = `${event.first_name || ''} ${event.last_name || ''}`.trim() || event.email || 'Unknown user';
      const pieces = [];
      if (detail.runId) pieces.push(`Run #${detail.runId}`);
      if (detail.format) pieces.push(`${String(detail.format).toUpperCase()} export`);
      if (detail.w9Status) pieces.push(`W-9 ${String(detail.w9Status).replaceAll('_', ' ')}`);
      if (detail.paymentMethod) pieces.push(`Pay by ${detail.paymentMethod}`);
      if (detail.gross) pieces.push(money(detail.gross));
      if (detail.totalAmount) pieces.push(money(detail.totalAmount));
      if (detail.timesheetIds?.length) pieces.push(`${detail.timesheetIds.length} timesheet${detail.timesheetIds.length === 1 ? '' : 's'}`);
      return `
        <article class="list-row" data-searchable>
          <span class="row-icon">LOG</span>
          <span class="row-copy"><strong>${escapeHtml(labels[event.action] || event.action)}</strong><span>${escapeHtml(actor)} · ${dateTime(event.created_at)}</span></span>
          <span class="row-meta">${escapeHtml(pieces.join(' · ') || 'Recorded')}</span>
        </article>
      `;
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

  function renderEmployerSetup(profile, invitations, shifts) {
    const address = profile?.billingAddress || profile?.billing_address || {};
    const services = profile?.servicesOffered || profile?.serviceArea || profile?.service_area || [];
    const checks = {
      organization: Boolean(profile?.companyName || profile?.company_name),
      location: Boolean(address.address && address.city && address.state && address.zipCode),
      services: Array.isArray(services) && services.length > 0,
      invitation: invitations.length > 0,
      shift: shifts.length > 0,
    };
    const completed = Object.values(checks).filter(Boolean).length;
    const percent = Math.round((completed / Object.keys(checks).length) * 100);
    setText('employerSetupPercent', `${percent}%`);
    const progress = document.getElementById('employerSetupProgress');
    if (progress) progress.style.width = `${percent}%`;
    document.querySelectorAll('#employerSetupList [data-setup]').forEach((step) => {
      step.classList.toggle('done', Boolean(checks[step.dataset.setup]));
    });

    const action = document.getElementById('employerSetupAction');
    if (!action) return;
    action.dataset.setupAction = !checks.organization || !checks.location || !checks.services
      ? 'profile'
      : !checks.invitation
        ? 'invite'
        : !checks.shift
          ? 'shift'
          : 'complete';
    action.textContent = action.dataset.setupAction === 'profile'
      ? 'Complete organization setup'
      : action.dataset.setupAction === 'invite'
        ? 'Invite your first caregiver'
        : action.dataset.setupAction === 'shift'
          ? 'Publish your first shift'
          : 'Setup complete';
  }

  function renderCaregiverSetup(profile) {
    const availability = profile?.availability || {};
    const hasAvailability = Object.values(availability).some((values) => Array.isArray(values) && values.length > 0);
    const checks = {
      account: true,
      services: Array.isArray(profile?.specialties) && profile.specialties.length > 0,
      availability: hasAvailability,
      profile: Boolean(profile?.bio && Number(profile?.hourlyRate) > 0),
      verification: profile?.backgroundCheckStatus === 'verified',
    };
    const completed = Object.values(checks).filter(Boolean).length;
    const percent = Math.round((completed / Object.keys(checks).length) * 100);
    setText('caregiverSetupPercent', `${percent}%`);
    const progress = document.getElementById('caregiverSetupProgress');
    if (progress) progress.style.width = `${percent}%`;
    document.querySelectorAll('#caregiverSetupList [data-caregiver-setup]').forEach((step) => {
      step.classList.toggle('done', Boolean(checks[step.dataset.caregiverSetup]));
    });
    const action = document.getElementById('caregiverSetupAction');
    if (action) action.textContent = checks.verification && completed === Object.keys(checks).length ? 'Profile ready' : 'Complete your profile';
  }

  document.getElementById('employerSetupAction')?.addEventListener('click', (event) => {
    const action = event.currentTarget.dataset.setupAction;
    if (action === 'profile') window.location.assign('/onboarding');
    else if (action === 'invite') document.querySelector('[data-invite-caregiver]')?.click();
    else if (action === 'shift') activateView('shifts');
    else activateView('caregivers');
  });

  async function loadEmployer() {
    const [shiftResult, activityResult, payrollResult, caregiverResult, conversationResult, profileResult, invitationResult, timesheetResult, applicationsResult, contractorPayrollResult, payrollAuditResult] = await Promise.allSettled([
      api('/bookings/employer/my'), api('/bookings/activities'), api('/payroll/employer/overview'), api('/bookings/employer/team'), api('/messages/conversations'), api(`/employers/${session.user.id}`), api('/employers/invitations'), api('/bookings/employer/timesheets'), api('/bookings/employer/applications'), api(`/payroll/1099/overview?year=${new Date().getFullYear()}`), api('/payroll/1099/audit')
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
    const pendingTimesheets = timesheets.filter(t => t.status === 'pending_approval').length;
    const pendingApplications = applicationsResult.status === 'fulfilled' ? (applicationsResult.value.applications || []).filter(a => a.status === 'pending').length : 0;
    const unfilled = shifts.filter(shift => ['open', 'assigned', 'in_progress'].includes(shift.status) && shift.remainingPositions > 0).length;
    setText('metricOpenShifts', unfilled);
    setText('metricOnDuty', activityResult.status === 'fulfilled' ? activityResult.value.activeCount : 'Unavailable');
    setText('metricCaregivers', caregivers.length);
    setText('metricPendingPayroll', contractorPayrollResult.status === 'fulfilled' ? money(contractorPayrollResult.value.summary?.draft_total) : money(payroll.stats?.pending_amount));
    setText('priorityOpenShifts', unfilled);
    setText('priorityApplications', pendingApplications);
    setText('priorityTimesheets', timesheetResult.status === 'fulfilled' ? pendingTimesheets : '—');
    setText('attentionTimesheets', timesheetResult.status === 'fulfilled' ? pendingTimesheets : 'Unavailable');
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
    renderEmployerSetup(profile, invitations, shifts);
    if (contractorPayrollResult.status === 'fulfilled') render1099Payroll(contractorPayrollResult.value);
    else render1099Payroll({ summary: {}, approvedTimesheets: [], contractors: [], runs: [] });
    if (payrollAuditResult.status === 'fulfilled') renderPayrollAudit(payrollAuditResult.value);
    else renderPayrollAudit({ events: [] });
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
    renderCaregiverSetup(profile);
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

  document.getElementById('payoutRunForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!window.confirm('Create a 1099 payout run from approved unpaid timesheets for this date range? Contractors must have W-9 marked received.')) return;
    const data = new FormData(form);
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Creating…';
    try {
      await api('/payroll/1099/runs', { method: 'POST', body: JSON.stringify({ from: data.get('from'), to: data.get('to'), memo: data.get('memo') }) });
      notify('1099 payout run created.');
      form.reset();
      await loadEmployer();
    } catch (error) { notify(error.message); }
    finally { submit.disabled = false; submit.textContent = 'Create 1099 payout run'; }
  });

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-mark-payout-paid]');
    if (!button || savingTime) return;
    const confirmation = window.prompt('Type MARK PAID to confirm these contractors were actually paid.');
    if (confirmation !== 'MARK PAID') { notify('Payout was not marked paid.'); return; }
    savingTime = true;
    button.disabled = true;
    try {
      await api(`/payroll/1099/runs/${button.dataset.markPayoutPaid}/mark-paid`, { method: 'POST', body: JSON.stringify({ confirmation }) });
      notify('Payout run marked paid.');
      await loadEmployer();
    } catch (error) { notify(error.message); }
    finally { savingTime = false; button.disabled = false; }
  });

  document.addEventListener('change', async (event) => {
    const target = event.target;
    const w9Caregiver = target.closest?.('[data-w9-caregiver]');
    const paymentCaregiver = target.closest?.('[data-payment-caregiver]');
    const caregiverId = w9Caregiver?.dataset.w9Caregiver || paymentCaregiver?.dataset.paymentCaregiver;
    if (!caregiverId) return;
    target.disabled = true;
    try {
      await api(`/payroll/1099/contractors/${caregiverId}`, {
        method: 'PATCH',
        body: JSON.stringify(w9Caregiver ? { w9Status: target.value } : { paymentMethod: target.value })
      });
      notify('Contractor payroll setting saved.');
      await loadEmployer();
    } catch (error) { notify(error.message); }
    finally { target.disabled = false; }
  });

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-export-run]');
    if (!button || savingTime) return;
    savingTime = true;
    button.disabled = true;
    const format = button.dataset.exportFormat || 'standard';
    try {
      const response = await fetch(`${API_BASE}/payroll/1099/runs/${button.dataset.exportRun}/export?format=${encodeURIComponent(format)}`, { headers: { Authorization: `Bearer ${session.token}` } });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || 'Export failed.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `elite-1099-payout-run-${button.dataset.exportRun}-${format}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify(`${format === 'standard' ? 'Audit' : format === 'chase' ? 'Chase payment' : 'Melio payment'} CSV downloaded.`);
    } catch (error) { notify(error.message); }
    finally { savingTime = false; button.disabled = false; }
  });

  const refreshShared = () => (expectedRole === 'employer' ? loadEmployer() : loadCaregiver()).catch(() => notify('Could not refresh shared records.'));
  document.getElementById('refreshTime')?.addEventListener('click', refreshShared);
  window.addEventListener('focus', () => {
    if (!savingTime && !document.querySelector('textarea:not(:placeholder-shown)') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) void refreshShared();
  });
  initializeContractGenerator();
  (expectedRole === 'employer' ? loadEmployer() : loadCaregiver()).catch(() => notify('Some live information could not be loaded. Please refresh to try again.'));
})();
