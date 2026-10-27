(function () {
  const API_BASE = 'https://elite-bridge-shared-api-evans.vercel.app/api';
  const role = document.body.dataset.role;
  const expectedRole = role === 'employer' ? 'employer' : 'caregiver';
  const otherDashboard = expectedRole === 'employer' ? '/dashboard/caregiver' : '/dashboard/employer';

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
    window.location.replace('/dashboard');
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
  const shiftDetailDialog = document.getElementById('shiftDetailDialog');
  const helpButton = document.getElementById('helpButton');
  const helpMenu = document.getElementById('helpMenu');
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
    if (!expanded && helpMenu) {
      helpMenu.hidden = true;
      helpButton?.setAttribute('aria-expanded', 'false');
    }
  });
  helpButton?.addEventListener('click', () => {
    const expanded = helpButton.getAttribute('aria-expanded') === 'true';
    helpButton.setAttribute('aria-expanded', String(!expanded));
    helpMenu.hidden = expanded;
    if (!expanded && accountMenu) {
      accountMenu.hidden = true;
      accountButton?.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.account-wrap') && accountMenu) {
      accountMenu.hidden = true;
      accountButton?.setAttribute('aria-expanded', 'false');
    }
    if (!event.target.closest('.header-menu-wrap') && helpMenu) {
      helpMenu.hidden = true;
      helpButton?.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('[data-logout]').forEach((button) => button.addEventListener('click', () => {
    ['token', 'user'].forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); });
    window.location.assign('/dashboard');
  }));

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${session.token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      ['token', 'user'].forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); });
      window.location.assign('/dashboard');
      throw new Error('Your session has ended.');
    }
    if (!response.ok) throw new Error(data.message || data.error || 'Something went wrong.');
    return data;
  }


  function todayInputValue() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
    if (window.EliteDigitalContract) { window.EliteDigitalContract.init(); return; }
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

  function setInvoiceTab(tabName) {
    const receiptsSelected = tabName === 'receipts';
    const invoices = document.getElementById('invoiceTabInvoices');
    const receipts = document.getElementById('invoiceTabReceipts');
    if (invoices) invoices.hidden = receiptsSelected;
    if (receipts) receipts.hidden = !receiptsSelected;
    document.querySelectorAll('[data-invoice-tab]').forEach(button => {
      const selected = button.dataset.invoiceTab === (receiptsSelected ? 'receipts' : 'invoices');
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      button.classList.toggle('active', selected);
    });
    const heading = document.querySelector('[data-view-panel="invoices"] .page-head h1');
    if (heading) heading.textContent = receiptsSelected ? 'Receipts' : 'Invoices';
    const description = document.getElementById('invoicePageDescription');
    if (description) description.textContent = receiptsSelected
      ? 'Review saved payment receipts and track bank clearance separately from issued invoices.'
      : 'Create official client invoices separate from caregiver timesheets and payroll records.';
    const contractTools = document.querySelector('[data-view-panel="invoices"] .page-head [data-go-view="contracts"]');
    if (contractTools) contractTools.hidden = receiptsSelected;
  }
  function activateView(viewName) {
    // Receipts are a dedicated view under Client Billing, sharing the Invoices
    // panel without changing its existing invoice builder or ledger.
    const targetView = viewName === 'receipts' ? 'invoices' : viewName;
    const view = document.querySelector(`[data-view-panel="${targetView}"]`) || document.querySelector('[data-view-panel="overview"]');
    document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel !== view; });
    document.querySelectorAll('[data-view]').forEach((link) => {
      const isActive = link.dataset.view === viewName;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (targetView === 'invoices') setInvoiceTab(viewName === 'receipts' ? 'receipts' : 'invoices');
    closeMobileNav();
    if (accountMenu) accountMenu.hidden = true;
    if (helpMenu) helpMenu.hidden = true;
    accountButton?.setAttribute('aria-expanded', 'false');
    helpButton?.setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', viewName === 'overview' ? window.location.pathname : `#${viewName}`);
  }

  document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    activateView(link.dataset.view);
  }));
  // Direct links (#receipts) and in-page tabs share a single route.
  document.querySelectorAll('[data-invoice-tab]').forEach(button => {
    button.addEventListener('click', () => activateView(button.dataset.invoiceTab));
    button.addEventListener('keydown', event => {
      const tabs = Array.from(document.querySelectorAll('[data-invoice-tab]'));
      const idx = tabs.indexOf(button);
      const next = event.key === 'ArrowRight' ? (idx + 1) % tabs.length :
        event.key === 'ArrowLeft' ? (idx + tabs.length - 1) % tabs.length :
        event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      const target = tabs[next];
      activateView(target.dataset.invoiceTab);
      target.focus();
    });
  });
  activateView(location.hash.slice(1) || 'overview');
  const manualEntryForm = document.querySelector('[data-manual-entry]');
  if (manualEntryForm) { const today = todayInputValue(); manualEntryForm.elements.startDate.value = today; manualEntryForm.elements.endDate.value = today; }

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
  document.querySelectorAll('[data-copy-mcp-endpoint]').forEach((button) => button.addEventListener('click', async () => {
    const endpoint = 'https://elite-bridge-shared-api-evans.vercel.app/api/mcp';
    try {
      await navigator.clipboard.writeText(endpoint);
      notify('MCP endpoint copied. Add it as a custom connector in ChatGPT.');
    } catch (_) {
      window.prompt('Copy the Elite Bridge MCP endpoint:', endpoint);
    }
  }));
  document.getElementById('organizationLogoUpload')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    const status = document.getElementById('organizationLogoStatus');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 256 * 1024) {
      if (status) status.textContent = 'Choose a PNG, JPEG, or WebP image under 256 KB.';
      event.target.value = '';
      return;
    }
    try {
      const logo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected image.'));
        reader.readAsDataURL(file);
      });
      const result = await api('/employers/me', { method: 'PUT', body: JSON.stringify({ companyLogo: logo }) });
      const preview = document.getElementById('organizationLogoPreview');
      if (preview) { preview.src = result.profile.companyLogo; preview.hidden = false; }
      setOrganizationLogo(result.profile.companyLogo);
      if (status) status.textContent = 'Organization logo saved.';
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not save the logo.';
    } finally { event.target.value = ''; }
  });
  document.getElementById('teamInviteForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('teamInviteEmail')?.value.trim();
    const role = document.getElementById('teamInviteRole')?.value;
    const status = document.getElementById('teamInviteStatus');
    if (!email || !role) return;
    try {
      const result = await api('/employers/team/invitations', { method: 'POST', body: JSON.stringify({ email, role }) });
      if (status) status.textContent = result.emailSent ? `Invitation sent to ${email}.` : `Invitation created. Share this link with ${email}: ${result.invitationUrl}`;
      event.target.reset();
      await loadOrganizationTeam();
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not send the team invitation.';
    }
  });
  document.querySelectorAll('[data-go-view]').forEach((button) => button.addEventListener('click', () => activateView(button.dataset.goView)));
  document.querySelectorAll('[data-location-filter]').forEach((button) => button.addEventListener('click', () => {
    const location = button.dataset.locationFilter || 'all';
    document.querySelectorAll('[data-location-filter]').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('[data-location-schedule]').forEach((card) => {
      card.hidden = location !== 'all' && card.dataset.locationSchedule !== location;
    });
  }));
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
    const payload = Object.fromEntries(['firstName', 'lastName', 'email', 'phone', 'role', 'location', 'note'].map((key) => [key, String(formData.get(key) || '').trim()]));
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
      delivery.textContent = sentBy ? `The invitation was sent by ${sentBy}. The caregiver can create access now and finish profile details later.` : 'Copy, email, or text this secure signup link. The caregiver can create access now and finish profile details later.';
      const inviteContext = [payload.role, payload.location].filter(Boolean).join(' · ');
      const noteLine = payload.note ? `\n\nNote: ${payload.note}` : '';
      const emailBody = `Join our care team on Elite Bridge${inviteContext ? ` for ${inviteContext}` : ''}.${noteLine}\n\nAccept your secure invitation and create access with your email, phone and password. You can finish the rest of your profile later: ${data.inviteUrl}\nDownload the caregiver app: ${caregiverAppUrl}`;
      const textBody = `Join Elite Bridge${payload.location ? ` (${payload.location})` : ''}. Create access now and finish your profile later: ${data.inviteUrl} App: ${caregiverAppUrl}`;
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
  function shiftDateLabel(value) {
    if (!value) return 'TBD';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  }
  function shiftTimeLabel(start, end) {
    const format = (value) => {
      if (!value) return 'TBD';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
    };
    return `${format(start)} - ${format(end)}`;
  }
  function fullDateTime(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }
  function renderEmpty(container, title, copy, action, view) {
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><div><span class="empty-mark">EB</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p>${action ? `<button class="secondary-button" type="button" data-empty-view="${escapeHtml(view || 'overview')}">${escapeHtml(action)}</button>` : ''}</div></div>`;
    container.querySelector('[data-empty-view]')?.addEventListener('click', () => activateView(view || 'overview'));
  }

  let employerShifts = [];
  let employerShiftFilter = 'all';

  function filteredEmployerShifts(shifts) {
    if (employerShiftFilter === 'all') return shifts;
    return shifts.filter((shift) => {
      const status = String(shift.status || 'open').toLowerCase();
      const city = String(shift.location?.city || '').toLowerCase();
      return status === employerShiftFilter || city === employerShiftFilter.toLowerCase();
    });
  }

  function findEmployerShift(id) {
    return employerShifts.find((shift) => String(shift.id) === String(id));
  }

  function renderShiftDetail(shift) {
    if (!shiftDetailDialog || !shift) return;
    const title = shift.title || shift.serviceType || 'Care shift';
    const cityState = `${shift.location?.city || ''}${shift.location?.state ? `, ${shift.location.state}` : ''}`.trim();
    const status = String(shift.status || 'open').toLowerCase();
    const filled = Number(shift.assignedCaregivers || 0);
    const needed = Number(shift.numberOfCaregivers || 1);
    const coverageText = `${filled}/${needed} positions filled`;
    const statusClass = status === 'open' ? 'open' : status === 'assigned' ? 'assigned' : 'neutral';
    const pickupCopy = shift.assignmentMode === 'instant' ? 'Caregivers can claim this shift immediately.' : 'Caregivers can request this shift and wait for your approval.';
    document.getElementById('shiftDetailTitle').textContent = title;
    document.getElementById('shiftDetailSubtitle').textContent = `${shiftDateLabel(shift.startTime)} · ${shiftTimeLabel(shift.startTime, shift.endTime)}`;
    document.getElementById('shiftDetailBody').innerHTML = `
      <div class="shift-detail-status">
        <span class="status ${statusClass}">${escapeHtml(status)}</span>
        <strong>${escapeHtml(coverageText)}</strong>
      </div>
      <div class="shift-detail-grid">
        <div><span>Location</span><strong>${escapeHtml(cityState || 'Care location')}</strong></div>
        <div><span>Start</span><strong>${escapeHtml(fullDateTime(shift.startTime))}</strong></div>
        <div><span>End</span><strong>${escapeHtml(fullDateTime(shift.endTime))}</strong></div>
        <div><span>Caregiver type</span><strong>${escapeHtml(shift.caregiverType || 'Caregiver')}</strong></div>
        <div><span>Assignment</span><strong>${escapeHtml(shift.assignmentMode === 'instant' ? 'Instant pickup' : 'Employer review')}</strong></div>
        <div><span>Priority</span><strong>${escapeHtml(shift.urgency || 'Standard')}</strong></div>
      </div>
      <div class="shift-detail-note">
        <span>Care notes</span>
        <p>${escapeHtml(shift.responsibilities || pickupCopy)}</p>
      </div>`;
    const actions = document.getElementById('shiftDetailActions');
    if (!actions) return;
    actions.innerHTML = status === 'open'
      ? `${shift.assignmentMode === 'instant' ? '<span class="status assigned">Open for pickup</span>' : `<button class="secondary-button" type="button" data-open-pickup="${shift.id}">Open for pickup</button>`}<button class="primary-button" type="button" data-invite-shift-id="${shift.id}" data-shift-location="${escapeHtml(cityState || '')}" data-shift-title="${escapeHtml(title)}">Invite caregiver</button>`
      : status === 'assigned'
        ? `<button class="secondary-button" type="button" data-shift-op="cancel" data-shift-id="${shift.id}">Cancel shift</button><button class="primary-button" type="button" data-close-shift-detail>Done</button>`
        : `<button class="primary-button" type="button" data-close-shift-detail>Done</button>`;
    shiftDetailDialog.showModal();
  }

  function renderShiftRows(container, shifts, employerView) {
    if (!container) return;
    const visibleShifts = employerView && container.id === 'allShiftList' ? filteredEmployerShifts(shifts) : shifts;
    if (!shifts.length) {
      renderEmpty(container, employerView ? 'No shifts posted yet' : 'No open shifts nearby yet', employerView ? 'Post your first care shift to begin matching with caregivers.' : 'New care opportunities will appear here as employers post them.', employerView ? 'Post a shift' : '', employerView ? 'shifts' : 'overview');
      return;
    }
    if (!visibleShifts.length) {
      renderEmpty(container, 'No shifts match this filter', 'Try All shifts or another location to see the rest of your care schedule.');
      return;
    }
    container.innerHTML = visibleShifts.map((shift) => {
      const cityState = `${shift.location?.city || ''}${shift.location?.state ? `, ${shift.location.state}` : ''}`.trim();
      const status = shift.status || 'open';
      const filled = Number(shift.assignedCaregivers || 0);
      const needed = Number(shift.numberOfCaregivers || 1);
      const coverageText = `${filled}/${needed} filled`;
      const statusClass = status === 'open' ? 'open' : status === 'assigned' ? 'assigned' : 'neutral';
      const action = !employerView && expectedRole === 'caregiver'
        ? (shift.applicationStatus === 'pending' ? '<span class="status neutral">Applied</span>' : `<button class="primary-button" type="button" data-shift-op="${shift.assignmentMode === 'instant' ? 'claim' : 'apply'}" data-shift-id="${shift.id}">${shift.assignmentMode === 'instant' ? 'Claim position' : 'Apply'}</button>`)
        : employerView && expectedRole === 'employer' && status === 'open'
          ? `<button class="primary-button" type="button" data-invite-shift-id="${shift.id}" data-shift-location="${escapeHtml(cityState || '')}" data-shift-title="${escapeHtml(shift.title || shift.serviceType || 'Care shift')}">Invite caregiver</button>${shift.assignmentMode === 'instant' ? '<span class="status assigned">Open for pickup</span>' : `<button class="secondary-button" type="button" data-open-pickup="${shift.id}">Open for pickup</button>`}`
          : employerView && expectedRole === 'employer' && status === 'assigned' ? `<button class="secondary-button" type="button" data-shift-op="cancel" data-shift-id="${shift.id}">Cancel shift</button>` : '';
      return `
      <article class="shift-card" data-searchable data-shift-card-id="${shift.id}" tabindex="0" role="button" aria-label="Open details for ${escapeHtml(shift.title || shift.serviceType || 'care shift')}">
        <div class="shift-time-tile">
          <span>${escapeHtml(shiftDateLabel(shift.startTime))}</span>
          <strong>${escapeHtml(shiftTimeLabel(shift.startTime, shift.endTime))}</strong>
        </div>
        <div class="shift-card-copy">
          <div class="shift-card-title-row"><strong>${escapeHtml(shift.title || shift.serviceType || 'Care shift')}</strong><span class="status ${statusClass}">${escapeHtml(status)}</span></div>
          <div class="shift-meta-row">
            <span>${escapeHtml(cityState || 'Care location')}</span>
            <span>${escapeHtml(coverageText)}</span>
            <span>${status === 'open' ? 'Needs caregiver' : status === 'assigned' ? 'Caregiver assigned' : 'Archived'}</span>
          </div>
          <div class="shift-coverage-track" aria-label="${escapeHtml(coverageText)}"><span style="width:${Math.min(100, Math.round((filled / Math.max(needed, 1)) * 100))}%"></span></div>
        </div>
        <div class="shift-card-side">${action}<button class="secondary-button detail-button" type="button" data-shift-detail="${shift.id}">Details</button></div>
      </article>`;
    }).join('');
  }

  document.querySelectorAll('[data-shift-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      employerShiftFilter = button.dataset.shiftFilter || 'all';
      document.querySelectorAll('[data-shift-filter]').forEach((item) => item.classList.toggle('active', item === button));
      renderShiftRows(document.getElementById('allShiftList'), employerShifts, true);
    });
  });

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
    if (!pending.length) { renderEmpty(container, 'No pending claims', 'Caregiver requests will appear here when an open shift needs your review.'); return; }
    container.innerHTML = pending.map((a) => {
      const name = `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Caregiver';
      const initials = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'CG';
      return `<article class="claim-card" data-searchable>
        <div class="claim-card-head">
          <span class="claim-avatar">${escapeHtml(initials)}</span>
          <span class="claim-copy"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(a.shift_title || 'Care shift')}</small></span>
          <span class="status warning">Pending claim</span>
        </div>
        <div class="claim-meta">
          <span>${escapeHtml(dateTime(a.start_time))}</span>
          <span>${escapeHtml(dateTime(a.end_time))}</span>
          <span>Employer approval required</span>
        </div>
        ${a.note ? `<p class="claim-note">${escapeHtml(a.note)}</p>` : ''}
        <div class="claim-actions">
          <button class="primary-button" type="button" data-application-id="${a.id}" data-decision="approved">Approve caregiver</button>
          <button class="secondary-button" type="button" data-application-id="${a.id}" data-decision="rejected">Decline</button>
        </div>
      </article>`;
    }).join('');
  }

  document.addEventListener('click', async event => {
    const closeShiftDetail = event.target.closest('[data-close-shift-detail]');
    if (closeShiftDetail) {
      shiftDetailDialog?.close();
      return;
    }
    const detailTrigger = event.target.closest('[data-shift-detail]');
    if (detailTrigger) {
      renderShiftDetail(findEmployerShift(detailTrigger.dataset.shiftDetail));
      return;
    }
    const shiftCard = event.target.closest('[data-shift-card-id]');
    if (shiftCard && !event.target.closest('button, a, input, select, textarea')) {
      renderShiftDetail(findEmployerShift(shiftCard.dataset.shiftCardId));
      return;
    }
    const inviteShift = event.target.closest('[data-invite-shift-id]');
    if (inviteShift) {
      shiftDetailDialog?.close();
      inviteForm?.reset();
      const result = document.getElementById('inviteResult');
      if (result) result.hidden = true;
      const locationField = document.getElementById('inviteLocation');
      const noteField = document.getElementById('inviteNote');
      const shiftLocation = inviteShift.dataset.shiftLocation || '';
      if (locationField && shiftLocation) {
        const city = shiftLocation.split(',')[0].trim();
        [...locationField.options].forEach((option) => { option.selected = option.value === city || option.textContent === city; });
      }
      if (noteField) noteField.value = `Invited for ${inviteShift.dataset.shiftTitle || 'this open shift'}.`;
      inviteDialog?.showModal();
      document.getElementById('inviteFirstName')?.focus();
      return;
    }
    const pickup = event.target.closest('[data-open-pickup]');
    if (pickup) {
      shiftDetailDialog?.close();
      if (savingTime) return;
      savingTime = true; pickup.disabled = true;
      try {
        const result = await api(`/bookings/employer/${encodeURIComponent(pickup.dataset.openPickup)}/pickup`, { method: 'PATCH' });
        notify(`Shift posted for pickup. ${Number(result.matchedCaregivers || 0)} eligible caregivers notified.`);
        await loadEmployer();
      } catch (error) { notify(error.message || 'Could not post the shift for pickup.'); }
      finally { savingTime = false; pickup.disabled = false; }
      return;
    }
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

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const shiftCard = document.activeElement?.closest?.('[data-shift-card-id]');
    if (!shiftCard) return;
    event.preventDefault();
    renderShiftDetail(findEmployerShift(shiftCard.dataset.shiftCardId));
  });
  document.getElementById('shiftDetailClose')?.addEventListener('click', () => shiftDetailDialog?.close());
  shiftDetailDialog?.addEventListener('click', (event) => { if (event.target === shiftDetailDialog) shiftDetailDialog.close(); });

  let employerManualTimesheets = [];
  function timesheetEntries(staffName, month, startDate, endDate) {
    return employerManualTimesheets.filter(entry => {
      const day = String(entry.shift_date).slice(0, 10);
      return entry.staff_name === staffName && (!month || day.slice(0, 7) === month) && (!startDate || day >= startDate) && (!endDate || day <= endDate);
    });
  }
  function selectedTimesheetPeriod() {
    const staffName = document.getElementById('timesheetShareStaff')?.value || '';
    const startDate = document.getElementById('timesheetShareStart')?.value || '';
    const endDate = document.getElementById('timesheetShareEnd')?.value || '';
    if (!staffName || !startDate || !endDate || startDate > endDate) return null;
    return { staffName, startDate, endDate, month: startDate.slice(0, 7), entries: timesheetEntries(staffName, null, startDate, endDate) };
  }
  function refreshTimesheetShareSummary() {
    const summary = document.getElementById('timesheetShareSummary');
    if (!summary) return;
    const selection = selectedTimesheetPeriod();
    const buttons = document.querySelectorAll('[data-timesheet-share-action]');
    if (!selection) {
      summary.textContent = 'Choose a caregiver and valid date range.';
      buttons.forEach(button => { button.disabled = true; });
      return;
    }
    const hours = selection.entries.reduce((sum, entry) => sum + Number(entry.worked_minutes || 0), 0) / 60;
    summary.textContent = selection.entries.length
      ? `${selection.staffName} · ${selection.entries.length} shift${selection.entries.length === 1 ? '' : 's'} · ${hours.toFixed(2)} hours · ${selection.startDate} through ${selection.endDate} · hours-only PDF`
      : 'There are no recorded hours for this caregiver within the selected dates.';
    buttons.forEach(button => { button.disabled = !selection.entries.length; });
  }
  function syncTimesheetSharePanel() {
    const staff = document.getElementById('timesheetShareStaff');
    const from = document.getElementById('timesheetShareStart');
    const to = document.getElementById('timesheetShareEnd');
    if (!staff || !from || !to) return;
    const names = [...new Set(employerManualTimesheets.map(row => row.staff_name).filter(Boolean))].sort();
    const previous = staff.value;
    staff.replaceChildren(new Option('Select caregiver…', ''));
    names.forEach(name => staff.add(new Option(name, name)));
    if (previous && names.includes(previous)) staff.value = previous;
    else if (names.length) staff.value = names[0];
    if ((!from.value || !to.value) && staff.value) {
      const dates = employerManualTimesheets.filter(row => row.staff_name === staff.value).map(row => String(row.shift_date).slice(0, 10)).sort();
      const last = dates.at(-1);
      if (last) {
        const date = new Date(last + 'T12:00:00Z');
        date.setUTCDate(date.getUTCDate() - 13);
        from.value = date.toISOString().slice(0, 10);
        to.value = last;
      }
    }
    refreshTimesheetShareSummary();
  }
  function renderTimesheets(container, sheets, employerView, applications = []) {
    if (!container) return;
    if (employerView) {
      employerManualTimesheets = sheets.filter(sheet => sheet.entry_source === 'manual_missed_clock_in');
      syncTimesheetSharePanel();
    }
    const summary = document.getElementById('timesheetSummary');
    const pending = sheets.filter(sheet => sheet.status === 'pending_approval');
    const approved = sheets.filter(sheet => sheet.status === 'approved');
    if (summary && employerView) summary.innerHTML = `<article><span>Awaiting approval</span><strong>${pending.length}</strong></article><article><span>Approved</span><strong>${approved.length}</strong></article><article><span>Hours recorded</span><strong>${(sheets.reduce((sum, sheet) => sum + Number(sheet.worked_minutes || 0), 0) / 60).toFixed(2)}</strong></article>`;
    if (!sheets.length) { renderEmpty(container, 'No timesheets yet', 'Add a missed clock-in entry below, or clock out to create a timesheet for review.'); return; }
    const orderedSheets = employerView ? [...sheets].sort((a, b) => (a.status === 'pending_approval' ? 0 : a.status === 'approved' ? 1 : 2) - (b.status === 'pending_approval' ? 0 : b.status === 'approved' ? 1 : 2) || String(b.shift_date || b.clock_in_at || '').localeCompare(String(a.shift_date || a.clock_in_at || ''))) : sheets;
    container.innerHTML = orderedSheets.map((sheet) => {
      const manual = sheet.entry_source === 'manual_missed_clock_in';
      const title = manual ? `${sheet.staff_name} · ${sheet.entry_type === 'hours_only' ? 'Hours worked' : 'Missed clock-in'}` : employerView ? `${sheet.first_name} ${sheet.last_name} · ${sheet.shift_title}` : applications.find(a => a.shift.id === sheet.shift_id)?.shift.title || 'Care shift';
      const details = manual
        ? `${formatDateOnly(sheet.shift_date)} · ${String(sheet.start_time).slice(0, 5)} - ${String(sheet.end_time).slice(0, 5)} · ${Number(sheet.worked_minutes / 60).toFixed(2)} hours`
        : `${dateTime(sheet.clock_in_at)} – ${dateTime(sheet.clock_out_at)} · ${(Number(sheet.worked_minutes) / 60).toFixed(2)} hours · ${money(sheet.total_amount)}`;
      const note = manual ? sheet.reason : sheet.notes;
      const exportAction = employerView && manual
        ? `<div class="timesheet-actions"><button type="button" class="timesheet-action-button" data-timesheet-action="view" data-export-timesheet="${escapeHtml(sheet.staff_name)}" data-export-month="${escapeHtml(String(sheet.shift_date).slice(0, 7))}">View</button><button type="button" class="timesheet-action-button" data-timesheet-action="download" data-export-timesheet="${escapeHtml(sheet.staff_name)}" data-export-month="${escapeHtml(String(sheet.shift_date).slice(0, 7))}">Download PDF</button><button type="button" class="timesheet-action-button" data-timesheet-action="email" data-export-timesheet="${escapeHtml(sheet.staff_name)}" data-export-month="${escapeHtml(String(sheet.shift_date).slice(0, 7))}">Email PDF</button>${sheet.status === 'pending_approval' ? `<button type="button" class="primary-button timesheet-approve-button" data-approve-manual-timesheet="${sheet.id}" data-approve-staff="${escapeHtml(sheet.staff_name)}" data-approve-date="${escapeHtml(formatDateOnly(sheet.shift_date))}">Approve</button>` : ''}</div>`
        : '';
      const approval = manual && sheet.status === 'approved' ? `<p class="timesheet-approval-record">Approved by <strong>${escapeHtml(sheet.approved_by_name || 'Employer')}</strong>${sheet.approval_date ? ` · ${escapeHtml(formatDateOnly(sheet.approval_date))}` : ''}</p>` : '';
      return `<article class="surface-pad timesheet-card" data-searchable><div class="timesheet-card-head"><strong>${escapeHtml(title)}</strong>${manual ? `<span class="status status-manual">${sheet.entry_type === 'hours_only' ? 'Hours only' : 'Missed clock-in'}</span>` : ''}</div><p>${details}</p><div class="timesheet-card-footer"><span class="status ${sheet.status === 'approved' ? 'status-approved' : ''}">${escapeHtml(String(sheet.status || '').replaceAll('_', ' '))}</span></div>${approval}${note ? `<p>${escapeHtml(note)}</p>` : ''}${sheet.agency_note ? `<p>Employer note: ${escapeHtml(sheet.agency_note)}</p>` : ''}${exportAction}
      ${employerView && sheet.status === 'pending_approval' ? manual ? `<form data-review-sheet="${sheet.id}" data-manual-review-sheet="${sheet.id}" class="field timesheet-review-form"><label for="review-manual-${sheet.id}">Review note (required for clarification)</label><textarea id="review-manual-${sheet.id}" name="note" maxlength="2000"></textarea><button class="secondary-button" type="submit" name="decision" value="correction_requested">Request clarification</button></form>` : `<form data-review-sheet="${sheet.id}" class="field timesheet-review-form"><label for="review-${sheet.id}">Review note (required for clarification)</label><textarea id="review-${sheet.id}" name="note" maxlength="2000"></textarea><div><button class="primary-button" type="submit" name="decision" value="approved">Approve hours</button> <button class="secondary-button" type="submit" name="decision" value="correction_requested">Request clarification</button></div></form>` : ''}
      ${!employerView && sheet.status === 'correction_requested' ? `<form data-resubmit-sheet="${sheet.id}" class="field"><label for="response-${sheet.id}">Clarification for your employer</label><textarea id="response-${sheet.id}" name="notes" maxlength="4000" required></textarea><button class="primary-button" type="submit">Send clarification</button><small>Recorded hours remain unchanged.</small></form>` : ''}</article>`;
    }).join('');
  }
  function formatDateOnly(value) {
    if (!value) return '—';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timesheetPrintDocument(staffName, month, entries) {
    const safe = escapeHtml;
    const moneyPrecise = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(value || 0));
    const shiftDate = value => {
      const raw = String(value || '').slice(0, 10);
      const date = new Date(`${raw}T12:00:00`);
      return Number.isNaN(date.getTime()) ? raw : new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    };
    const shiftTime = value => {
      const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return safe(value);
      const period = hours >= 12 ? 'PM' : 'AM';
      return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`;
    };
    const ordered = [...entries].sort((a, b) => String(a.shift_date).localeCompare(String(b.shift_date)));
    const totalMinutes = ordered.reduce((sum, entry) => sum + Number(entry.worked_minutes || 0), 0);
    const hoursOnly = true;
    const gross = ordered.reduce((sum, entry) => sum + Number(entry.total_amount || 0), 0);
    const rates = [...new Set(ordered.map(entry => Number(entry.hourly_rate || 0)))];
    const rateLabel = rates.length > 1 ? 'Varies' : moneyPrecise(rates[0] || 0);
    const rows = ordered.map(entry => hoursOnly ? `<tr><td>${safe(shiftDate(entry.shift_date))}</td><td>${safe(shiftTime(entry.start_time))} - ${safe(shiftTime(entry.end_time))}</td><td class="num">${(Number(entry.worked_minutes || 0) / 60).toFixed(2)}</td></tr>` : `<tr><td>${safe(shiftDate(entry.shift_date))}</td><td>${safe(shiftTime(entry.start_time))} - ${safe(shiftTime(entry.end_time))}</td><td class="num">${(Number(entry.worked_minutes || 0) / 60).toFixed(2)}</td><td class="num">${moneyPrecise(entry.hourly_rate)}</td><td class="num">${moneyPrecise(entry.total_amount)}</td></tr>`).join('');
    const reasons = [...new Set(ordered.map(entry => String(entry.reason || '').trim()).filter(Boolean))];
    const firstDay = new Date(`${String(ordered[0]?.shift_date || '').slice(0, 10)}T12:00:00`);
    const lastDay = new Date(`${String(ordered.at(-1)?.shift_date || '').slice(0, 10)}T12:00:00`);
    const firstLabel = Number.isNaN(firstDay.getTime()) ? month : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(firstDay);
    const lastLabel = Number.isNaN(lastDay.getTime()) ? firstLabel : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(lastDay);
    const payPeriod = ordered.length < 2 || String(ordered[0]?.shift_date).slice(0, 10) === String(ordered.at(-1)?.shift_date).slice(0, 10)
      ? firstLabel
      : firstDay.getMonth() === lastDay.getMonth() && firstDay.getFullYear() === lastDay.getFullYear()
        ? `${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(firstDay)} ${firstDay.getDate()}-${lastDay.getDate()}, ${firstDay.getFullYear()}`
        : `${firstLabel} - ${lastLabel}`;
    const fullyApproved = ordered.every(entry => entry.status === 'approved');
    const signerValues = [...new Set(ordered.map(entry => String(entry.approved_by_name || '').trim()).filter(Boolean))];
    const approvalNames = fullyApproved && signerValues.length === 1 ? signerValues[0] : '';
    const approvalDates = [...new Set(ordered.map(entry => String(entry.approval_date || '').slice(0, 10)).filter(Boolean))];
    const approvalDateValue = fullyApproved && approvalDates.length === 1 ? approvalDates[0] : '';
    const approvalDate = approvalDateValue ? formatDateOnly(approvalDateValue) : '';
    const approvalLabel = hoursOnly ? (fullyApproved ? 'Employer-approved hours record' : 'Hours-only record · Pending employer review') : (fullyApproved ? 'Employer-approved missed clock-in record' : 'Missed clock-in record · Prepared for employer review');
    const reportTitle = `${staffName} timesheet - ${payPeriod}`;
    const metricsHtml = hoursOnly
      ? `<section class="metrics"><div><span class="label">Shifts</span><span class="metric">${ordered.length}</span></div><div><span class="label">Total hours</span><span class="metric">${(totalMinutes / 60).toFixed(2)} hrs</span></div><div><span class="label">Review</span><span class="metric">${fullyApproved ? 'Approved' : 'Pending'}</span></div></section>`
      : `<section class="metrics"><div><span class="label">Hourly pay rate</span><span class="metric">${rateLabel}</span></div><div><span class="label">Total hours</span><span class="metric">${(totalMinutes / 60).toFixed(2)} hrs</span></div><div><span class="label">Gross wages</span><span class="metric">${moneyPrecise(gross)}</span></div></section>`;
    const tableHtml = hoursOnly
      ? `<table><thead><tr><th>Date</th><th>Time worked</th><th class="num">Hours</th></tr></thead><tbody>${rows}<tr class="total"><td></td><td>Total</td><td class="num">${(totalMinutes / 60).toFixed(2)}</td></tr></tbody></table>`
      : `<table><thead><tr><th>Date</th><th>Time worked</th><th class="num">Hours</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>${rows}<tr class="total"><td></td><td>Total</td><td class="num">${(totalMinutes / 60).toFixed(2)}</td><td></td><td class="num">${moneyPrecise(gross)}</td></tr></tbody></table>`;
    const footerLabel = hoursOnly ? 'Confidential hours record · Prepared for employer review' : 'Confidential payroll record · Prepared for employer review';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(reportTitle)}</title><style>
      :root{--green:#064024;--lime:#8dc240;--ink:#1e2a24;--muted:#607067;--line:#dce6df;--pale:#f3f8ee}*{box-sizing:border-box}body{margin:0;background:#eef2ef;color:var(--ink);font:14px/1.45 Arial,Helvetica,sans-serif}.toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding:14px max(18px,calc((100vw - 840px)/2));background:#fff;border-bottom:1px solid var(--line);z-index:2}.toolbar button{min-height:44px;border:0;border-radius:9px;padding:11px 16px;color:#fff;background:var(--green);font-weight:700;cursor:pointer}.toolbar button.secondary{color:var(--green);background:var(--pale);border:1px solid var(--line)}main{width:min(840px,calc(100% - 32px));margin:24px auto 50px;padding:42px 48px;background:#fff;box-shadow:0 12px 38px rgba(20,52,39,.1)}.brand{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:24px;padding:22px 0 24px;border-top:7px solid var(--green)}.brand img{display:block;width:min(210px,100%);height:auto;object-fit:contain}.contact{text-align:right;color:var(--muted);font-size:11px;line-height:1.7}.contact strong{color:var(--green);font-size:12px}.rule{border:0;border-top:1px solid var(--line);margin:0 0 30px}h1{margin:0;color:var(--green);font-size:30px;letter-spacing:-.04em}.subtitle{margin:5px 0 22px;color:var(--muted)}.meta,.metrics{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--pale)}.meta>div,.metrics>div{padding:13px 15px;border-right:1px solid var(--line)}.meta>div:last-child,.metrics>div:last-child{border:0}.label{display:block;margin-bottom:4px;color:var(--muted);font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}.value{color:var(--ink);font-size:15px;font-weight:700}.metrics{margin-top:14px;background:#fff}.metrics>div{padding:14px 15px}.metric{color:var(--green);font-size:21px;font-weight:700;letter-spacing:-.03em}table{width:100%;margin-top:20px;border-collapse:collapse;font-size:11px}th{padding:10px;background:var(--green);color:#fff;text-align:left;font-size:9px;letter-spacing:.05em}td{padding:10px;border:1px solid var(--line)}tbody tr:nth-child(even){background:#f8fbf9}.num{text-align:right;white-space:nowrap}.total{background:var(--pale)!important;color:var(--green);font-weight:700}.note{margin-top:16px;padding:14px 16px;border:1px solid var(--line);border-left:4px solid var(--lime);border-radius:6px;background:#f7faf4;color:var(--muted);font-size:11px}.approval{margin-top:20px}.approval-title{margin:0 0 13px;color:var(--green);font-size:10px;font-weight:700;letter-spacing:.06em}.approval-grid{display:grid;grid-template-columns:1.7fr 1fr;gap:22px}.approval label{display:block;color:var(--muted);font-size:10px;font-weight:700}.approval input{width:100%;min-height:38px;border:0;border-bottom:1px solid #aebfb4;background:#fff;color:var(--ink);font:13px Arial;margin-top:4px;padding:6px 4px}.approval input[type=date]{font:13px Arial;min-width:0}.footer{display:flex;justify-content:space-between;margin-top:34px;padding-top:10px;border-top:1px solid var(--line);color:var(--muted);font-size:9px}@page{size:letter;margin:.42in}@media(max-width:620px){main{padding:22px 16px}.toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px 12px}.toolbar button{padding:9px 7px;font-size:12px}.toolbar #printTimesheet{grid-column:span 2}.brand{grid-template-columns:minmax(0,1fr) minmax(126px,.9fr);gap:12px;padding-top:16px}.brand img{width:100%;max-width:180px}.contact{text-align:right;font-size:9px;line-height:1.6}.contact strong{font-size:10px}.meta,.metrics{grid-template-columns:1fr}.meta>div,.metrics>div{border-right:0;border-bottom:1px solid var(--line)}table{font-size:9px}td,th{padding:7px 5px}.value{font-size:13px}}@media print{body{background:#fff}main{width:auto;margin:0;padding:0;box-shadow:none}.toolbar{display:none}.brand{padding-top:14px}.subtitle{margin-bottom:16px}.meta>div,.metrics>div{padding:10px}.metrics{margin-top:10px}table{margin-top:15px}.note{margin-top:12px}.approval{margin-top:15px}.footer{margin-top:25px}}
    </style></head><body data-timesheet-staff="${safe(staffName)}" data-timesheet-month="${safe(month)}" data-timesheet-first="${safe(String(ordered[0]?.shift_date || '').slice(0, 10))}" data-timesheet-last="${safe(String(ordered.at(-1)?.shift_date || '').slice(0, 10))}"><div class="toolbar"><button id="downloadTimesheet" type="button">Download PDF</button><button id="emailTimesheet" class="secondary" type="button">Email PDF</button><button id="printTimesheet" class="secondary" type="button">Print / save PDF</button><button id="closeTimesheet" class="secondary" type="button">Close</button></div><main><header class="brand"><img src="/logo.png" alt="Elite Bridge Staffing logo"><div class="contact"><strong>ELITE BRIDGE STAFFING</strong><br>(508) 251-9346<br>info@elitebridgestaffing.com<br>elitebridgestaffing.com</div></header><hr class="rule"><h1>Staff timesheet</h1><p class="subtitle">${approvalLabel}</p><section class="meta"><div><span class="label">Staff member</span><span class="value">${safe(staffName)}</span></div><div><span class="label">${hoursOnly ? 'Service period' : 'Pay period'}</span><span class="value">${safe(payPeriod)}</span></div><div><span class="label">Entry type</span><span class="value">${hoursOnly ? 'Hours only' : 'Missed clock-in'}</span></div></section>${metricsHtml}${tableHtml}<aside class="note"><strong>Time entry note</strong><br>${reasons.map(safe).join('<br>') || 'Hours were entered manually from the reported schedule.'}<br>${hoursOnly ? (fullyApproved ? 'Reported hours approved.' : 'Please review and approve the reported hours.') : (fullyApproved ? 'Approval recorded. This entry is ready for payroll review.' : 'Please review and approve before including in payroll.')}</aside><section class="approval"><p class="approval-title">EMPLOYER APPROVAL</p><div class="approval-grid"><label>Approved by<input aria-label="Approved by" type="text" value="${safe(approvalNames)}"></label><label>Date<input aria-label="Approval date" type="date" value="${safe(approvalDateValue)}"></label></div></section><footer class="footer"><span>${footerLabel}</span><span>Elite Bridge Staffing</span></footer></main><script>(function(){const send=action=>{if(window.parent===window){alert('Open this timesheet from the employer dashboard to download or email the PDF.');return}window.parent.postMessage({type:'elitebridge-timesheet-action',action,staffName:document.body.dataset.timesheetStaff,month:document.body.dataset.timesheetMonth,startDate:document.body.dataset.timesheetFirst,endDate:document.body.dataset.timesheetLast,approvedByName:document.querySelector('[aria-label="Approved by"]').value.trim(),approvalDate:document.querySelector('[aria-label="Approval date"]').value},'*')};document.getElementById('downloadTimesheet').addEventListener('click',()=>send('download'));document.getElementById('emailTimesheet').addEventListener('click',()=>send('email'));document.getElementById('printTimesheet').addEventListener('click',()=>window.print());document.getElementById('closeTimesheet').addEventListener('click',()=>send('close'))})();</script></body></html>`;
  }

  function pdfSafeText(value) {
    return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '-');
  }
  function pdfEscape(value) { return pdfSafeText(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)'); }
  function pdfAscii(value) { return new TextEncoder().encode(value); }
  function pdfJoin(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) { output.set(part, offset); offset += part.length; }
    return output;
  }
  function timesheetPdfBlob(staffName, month, entries, approval = {}) {
    const moneyPrecise = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(value || 0));
    const ordered = [...entries].sort((a, b) => String(a.shift_date).localeCompare(String(b.shift_date)));
    const logo = document.querySelector('img[src*="logo"]');
    const canvas = document.createElement('canvas');
    canvas.width = logo?.naturalWidth || 300;
    canvas.height = logo?.naturalHeight || 94;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the timesheet PDF.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    if (logo?.complete && logo.naturalWidth) context.drawImage(logo, 0, 0, canvas.width, canvas.height);
    const logoUrl = canvas.toDataURL('image/jpeg', .92);
    const logoBytes = Uint8Array.from(atob(logoUrl.split(',')[1]), character => character.charCodeAt(0));
    const firstDate = new Date(`${String(ordered[0]?.shift_date || '').slice(0, 10)}T12:00:00`);
    const lastDate = new Date(`${String(ordered.at(-1)?.shift_date || '').slice(0, 10)}T12:00:00`);
    const dateLabel = date => Number.isNaN(date.getTime()) ? month : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    const firstLabel = dateLabel(firstDate), lastLabel = dateLabel(lastDate);
    const payPeriod = ordered.length < 2 || String(ordered[0]?.shift_date).slice(0, 10) === String(ordered.at(-1)?.shift_date).slice(0, 10) ? firstLabel : firstDate.getMonth() === lastDate.getMonth() && firstDate.getFullYear() === lastDate.getFullYear() ? `${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(firstDate)} ${firstDate.getDate()}-${lastDate.getDate()}, ${firstDate.getFullYear()}` : `${firstLabel} - ${lastLabel}`;
    const totalMinutes = ordered.reduce((sum, entry) => sum + Number(entry.worked_minutes || 0), 0);
    const hoursOnly = true;
    const totalAmount = ordered.reduce((sum, entry) => sum + Number(entry.total_amount || 0), 0);
    const rates = [...new Set(ordered.map(entry => Number(entry.hourly_rate || 0)))];
    const rateLabel = rates.length === 1 ? moneyPrecise(rates[0]) : 'Varies';
    const fullyApproved = ordered.every(entry => entry.status === 'approved');
    const signers = [...new Set(ordered.map(entry => String(entry.approved_by_name || '').trim()).filter(Boolean))];
    const approvalDates = [...new Set(ordered.map(entry => String(entry.approval_date || '').slice(0, 10)).filter(Boolean))];
    const recordedApprover = fullyApproved && signers.length === 1 ? signers[0] : '';
    const recordedApprovalDate = fullyApproved && approvalDates.length === 1 ? approvalDates[0] : '';
    const approver = String(approval.approvedByName || recordedApprover).trim();
    const approvalDateValue = String(approval.approvalDate || recordedApprovalDate).slice(0, 10);
    const approvalDate = approvalDateValue ? formatDateOnly(approvalDateValue) : '';
    const reasons = [...new Set(ordered.map(entry => String(entry.reason || '').trim()).filter(Boolean))];
    const chunks = [];
    for (let index = 0; index < ordered.length; index += 16) chunks.push(ordered.slice(index, index + 16));
    if (!chunks.length) chunks.push([]);
    const pages = chunks.map((pageEntries, pageIndex) => {
      const ops = [];
      const text = (x, top, size, value, bold = false, color = '20352A') => {
        const [r, g, b] = color.match(/.{2}/g).map(pair => parseInt(pair, 16) / 255);
        ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${792 - top - size} Td (${pdfEscape(value)}) Tj ET`);
      };
      const rect = (x, top, width, height, fill) => {
        const [r, g, b] = fill.match(/.{2}/g).map(pair => parseInt(pair, 16) / 255);
        ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x} ${792 - top - height} ${width} ${height} re f`);
      };
      const line = (x1, top, x2, color = 'DCE6DF', width = 1) => {
        const [r, g, b] = color.match(/.{2}/g).map(pair => parseInt(pair, 16) / 255);
        ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${width} w ${x1} ${792 - top} m ${x2} ${792 - top} l S`);
      };
      ops.push('q 160 0 0 50 50 742 cm /Im1 Do Q');
      text(372, 5, 10, 'ELITE BRIDGE STAFFING', true, '064024');
      text(372, 22, 9, '(508) 251-9346', false, '607067');
      text(372, 37, 9, 'info@elitebridgestaffing.com', false, '607067');
      text(372, 52, 9, 'elitebridgestaffing.com', false, '607067');
      line(50, 108, 562, '064024', 4);
      text(50, 126, 22, pageIndex ? 'Staff timesheet (continued)' : 'Staff timesheet', true, '064024');
      text(50, 154, 10, hoursOnly ? (fullyApproved ? 'Employer-approved hours record' : 'Hours-only record - Pending employer review') : (fullyApproved ? 'Employer-approved missed clock-in record' : 'Missed clock-in record - Prepared for employer review'), false, '607067');
      rect(50, 176, 512, 49, 'F3F8EE');
      line(50, 176, 562); line(50, 225, 562); line(220, 176, 220); line(391, 176, 391);
      text(62, 184, 8, 'STAFF MEMBER', true, '607067'); text(62, 199, 12, staffName, true, '20352A');
      text(232, 184, 8, 'PAY PERIOD', true, '607067'); text(232, 199, 12, payPeriod, true, '20352A');
      text(403, 184, 8, 'ENTRY TYPE', true, '607067'); text(403, 199, 12, hoursOnly ? 'Hours only' : 'Missed clock-in', true, '20352A');
      rect(50, 238, 512, 54, 'FFFFFF');
      line(50, 238, 562); line(50, 292, 562); line(220, 238, 220); line(391, 238, 391);
      text(62, 247, 8, hoursOnly ? 'SHIFTS' : 'HOURLY PAY RATE', true, '607067'); text(62, 264, 16, hoursOnly ? String(ordered.length) : rateLabel, false, '064024');
      text(232, 247, 8, 'TOTAL HOURS', true, '607067'); text(232, 264, 16, `${(totalMinutes / 60).toFixed(2)} hrs`, false, '064024');
      text(403, 247, 8, hoursOnly ? 'REVIEW STATUS' : 'GROSS WAGES', true, '607067'); text(403, 264, 16, hoursOnly ? (fullyApproved ? 'Approved' : 'Pending') : moneyPrecise(totalAmount), false, '064024');
      const tableTop = 309, rowHeight = 17;
      rect(50, tableTop, 512, 22, '064024');
      text(58, tableTop + 6, 8, 'DATE', true, 'FFFFFF'); text(200, tableTop + 6, 8, 'TIME WORKED', true, 'FFFFFF'); text(350, tableTop + 6, 8, 'HOURS', true, 'FFFFFF'); if (!hoursOnly) { text(411, tableTop + 6, 8, 'RATE', true, 'FFFFFF'); text(478, tableTop + 6, 8, 'AMOUNT', true, 'FFFFFF'); }
      const shiftDateLabel = value => { const d = new Date(`${String(value || '').slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? String(value || '') : new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(d); };
      const shiftTimeLabel = value => { const [hour, minute] = String(value || '').slice(0, 5).split(':').map(Number); if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(value || ''); return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`; };
      pageEntries.forEach((entry, row) => {
        const top = tableTop + 22 + row * rowHeight;
        rect(50, top, 512, rowHeight, row % 2 ? 'F8FBF9' : 'FFFFFF');
        line(50, top + rowHeight, 562, 'DCE6DF', .5);
        text(57, top + 4, 8, shiftDateLabel(entry.shift_date));
        text(199, top + 4, 8, `${shiftTimeLabel(entry.start_time)} - ${shiftTimeLabel(entry.end_time)}`);
        text(350, top + 4, 8, (Number(entry.worked_minutes || 0) / 60).toFixed(2));
        if (!hoursOnly) { text(407, top + 4, 8, moneyPrecise(entry.hourly_rate)); text(475, top + 4, 8, moneyPrecise(entry.total_amount)); }
      });
      let cursor = tableTop + 22 + pageEntries.length * rowHeight;
      if (pageIndex === chunks.length - 1) {
        rect(50, cursor, 512, 20, 'F3F8EE');
        text(199, cursor + 5, 9, 'TOTAL', true, '064024'); text(350, cursor + 5, 9, (totalMinutes / 60).toFixed(2), true, '064024'); if (!hoursOnly) text(475, cursor + 5, 9, moneyPrecise(totalAmount), true, '064024');
        cursor += 30;
        rect(50, cursor, 512, 45, 'F7FAF4');
        text(62, cursor + 7, 8, 'TIME ENTRY NOTE', true, '607067');
        text(62, cursor + 21, 8, hoursOnly ? (fullyApproved ? 'Hours approved by employer.' : 'Reported hours need employer review.') : (fullyApproved ? 'Approval recorded. Ready for payroll review.' : (reasons[0] || 'Hours were entered manually from reported hours.').slice(0, 86)), false, '607067');
        if (reasons.length > 1) text(62, cursor + 32, 8, reasons[1].slice(0, 86), false, '607067');
        cursor += 59;
        text(50, cursor, 8, 'EMPLOYER APPROVAL', true, '064024');
        text(50, cursor + 16, 8, 'Approved by', true, '607067'); text(360, cursor + 16, 8, 'Date', true, '607067');
        text(50, cursor + 31, 10, approver || '____________________________________', false, '20352A');
        text(360, cursor + 31, 10, approvalDate || '____________________', false, '20352A');
      } else text(50, 741, 8, 'Continued on next page', false, '607067');
      line(50, 770, 562); text(50, 777, 7, hoursOnly ? 'Confidential hours record - Prepared for employer review' : 'Confidential payroll record - Prepared for employer review', false, '607067'); text(516, 777, 7, `${pageIndex + 1} / ${chunks.length}`, false, '607067');
      return pdfAscii(ops.join('\n'));
    });
    const objects = [];
    objects[1] = pdfAscii('<< /Type /Catalog /Pages 2 0 R >>');
    const pageIds = pages.map((_, index) => 6 + index * 2);
    objects[2] = pdfAscii(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
    objects[3] = pdfAscii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objects[4] = pdfAscii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    objects[5] = pdfJoin([pdfAscii(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`), logoBytes, pdfAscii('\nendstream')]);
    pages.forEach((stream, index) => {
      const pageId = pageIds[index], contentId = pageId + 1;
      objects[pageId] = pdfAscii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im1 5 0 R >> >> /Contents ${contentId} 0 R >>`);
      objects[contentId] = pdfJoin([pdfAscii(`<< /Length ${stream.length} >>\nstream\n`), stream, pdfAscii('\nendstream')]);
    });
    const parts = [pdfAscii('%PDF-1.4\n')];
    const offsets = [0]; let length = parts[0].length;
    for (let id = 1; id < objects.length; id++) {
      const prefix = pdfAscii(`${id} 0 obj\n`), suffix = pdfAscii('\nendobj\n');
      offsets[id] = length; parts.push(prefix, objects[id], suffix); length += prefix.length + objects[id].length + suffix.length;
    }
    const xrefOffset = length;
    let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    const trailer = `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(pdfAscii(xref + trailer));
    return new Blob([pdfJoin(parts)], { type: 'application/pdf' });
  }
  function timesheetFilename(staffName, month) {
    const name = String(staffName || 'staff').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'staff';
    return `${name}_Timesheet_${month}.pdf`;
  }
  function downloadTimesheetPdf(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.rel = 'noopener';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  function openTimesheetEmailDialog(staffName, startDate, endDate, approval = {}) {
    const entries = timesheetEntries(staffName, null, startDate, endDate);
    if (!entries.length) { notify('No timesheet entries match this caregiver and date range.'); return; }
    const form = document.getElementById('timesheetEmailForm');
    if (!form) return;
    form.reset();
    form.elements.staffName.value = staffName;
    form.elements.month.value = startDate.slice(0, 7);
    form.elements.startDate.value = startDate;
    form.elements.endDate.value = endDate;
    form.elements.approvedByName.value = approval.approvedByName || '';
    form.elements.approvalDate.value = approval.approvalDate || '';
    const error = document.getElementById('timesheetEmailError');
    if (error) { error.hidden = true; error.textContent = ''; }
    const hours = entries.reduce((sum, entry) => sum + Number(entry.worked_minutes || 0), 0) / 60;
    document.getElementById('timesheetEmailSummary').textContent =
      `${staffName} · ${startDate} to ${endDate} · ${entries.length} shifts · ${hours.toFixed(2)} hours. Send an hours-only PDF to an authorized recipient.`;
    document.getElementById('timesheetEmailDialog').showModal();
    document.getElementById('timesheetRecipientEmail').focus();
  }
  async function loadTimesheetEmailHistory() {
    const list = document.getElementById('timesheetEmailHistoryList');
    if (!list) return;
    try {
      const response = await api('/manual-timesheets/employer/email-history');
      const rows = response.emails || [];
      if (!rows.length) {
        list.innerHTML = '<p class="timesheet-export-hint">No timesheet emails submitted yet.</p>';
        return;
      }
      list.innerHTML = rows.map(row =>
        `<div class="timesheet-email-history-row"><div><strong>${escapeHtml(row.staff_name)}</strong><small>${escapeHtml(String(row.start_date).slice(0,10))} to ${escapeHtml(String(row.end_date).slice(0,10))} · ${Number(row.hours).toFixed(2)} hrs · ${escapeHtml(row.recipient)}</small></div><span class="status status-approved" title="Accepted for sending; delivery is not confirmed">Submitted ${escapeHtml(dateTime(row.created_at))}</span></div>`
      ).join('');
    } catch (_error) {
      list.textContent = 'Timesheet email history is temporarily unavailable.';
    }
  }
  document.addEventListener('change', event => {
    if (event.target?.id === 'timesheetShareStaff') {
      const name = event.target.value;
      const dates = employerManualTimesheets.filter(row => row.staff_name === name).map(row => String(row.shift_date).slice(0, 10)).sort();
      if (dates.length) {
        const date = new Date(dates.at(-1) + 'T12:00:00Z');
        date.setUTCDate(date.getUTCDate() - 13);
        document.getElementById('timesheetShareStart').value = date.toISOString().slice(0, 10);
        document.getElementById('timesheetShareEnd').value = dates.at(-1);
      }
    }
    if (['timesheetShareStaff', 'timesheetShareStart', 'timesheetShareEnd'].includes(event.target?.id)) refreshTimesheetShareSummary();
  });
  document.addEventListener('input', event => {
    if (['timesheetShareStart', 'timesheetShareEnd'].includes(event.target?.id)) refreshTimesheetShareSummary();
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-timesheet-share-action]');
    if (!button) return;
    const selection = selectedTimesheetPeriod();
    if (!selection || !selection.entries.length) { notify('Choose a caregiver and dates with recorded hours.'); return; }
    const action = button.dataset.timesheetShareAction;
    if (action === 'email') {
      openTimesheetEmailDialog(selection.staffName, selection.startDate, selection.endDate);
      return;
    }
    if (action === 'download') {
      try {
        downloadTimesheetPdf(timesheetPdfBlob(selection.staffName, selection.month, selection.entries),
          timesheetFilename(selection.staffName, selection.month).replace('.pdf', `_${selection.startDate}_to_${selection.endDate}.pdf`));
        notify('Hours-only timesheet downloaded.');
      } catch (error) { notify(error.message || 'Could not create the PDF.'); }
      return;
    }
    const preview = document.getElementById('timesheetPreviewDialog');
    const frame = document.getElementById('timesheetPreviewFrame');
    if (!preview || !frame) return;
    frame.srcdoc = timesheetPrintDocument(selection.staffName, selection.month, selection.entries);
    preview.showModal();
  });
  document.getElementById('timesheetReviewBeforeSend')?.addEventListener('click', () => {
    const form = document.getElementById('timesheetEmailForm');
    const name = form.elements.staffName.value;
    const first = form.elements.startDate.value;
    const last = form.elements.endDate.value;
    const entries = timesheetEntries(name, null, first, last);
    if (!entries.length) { notify('No timesheet records available.'); return; }
    try {
      downloadTimesheetPdf(timesheetPdfBlob(name, first.slice(0,7), entries),
        timesheetFilename(name, first.slice(0,7)).replace('.pdf', `_${first}_to_${last}.pdf`));
    } catch (error) { notify(error.message || 'PDF review failed.'); }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-export-timesheet]');
    if (!button || button.disabled) return;
    event.preventDefault();
    const staffName = button.dataset.exportTimesheet;
    const month = button.dataset.exportMonth;
    const entries = timesheetEntries(staffName, month);
    if (!entries.length) { notify('No timesheet entries were found for this staff member and month.'); return; }
    if (button.dataset.timesheetAction === 'email') {
      const ordered = [...entries].sort((a,b) => String(a.shift_date).localeCompare(String(b.shift_date)));
      openTimesheetEmailDialog(staffName, String(ordered[0].shift_date).slice(0,10), String(ordered.at(-1).shift_date).slice(0,10));
      return;
    }
    if (button.dataset.timesheetAction === 'download') {
      try { downloadTimesheetPdf(timesheetPdfBlob(staffName, month, entries), timesheetFilename(staffName, month)); notify('Timesheet PDF downloaded.'); }
      catch (error) { notify(error.message || 'Could not create the timesheet PDF.'); }
      return;
    }
    const previewDialog = document.getElementById('timesheetPreviewDialog');
    const previewFrame = document.getElementById('timesheetPreviewFrame');
    if (!previewDialog || !previewFrame) { notify('The timesheet preview could not be opened.'); return; }
    previewFrame.srcdoc = timesheetPrintDocument(staffName, month, entries);
    previewDialog.showModal();
  });
  window.addEventListener('message', event => {
    const message = event.data;
    const previewFrame = document.getElementById('timesheetPreviewFrame');
    if (event.source !== previewFrame?.contentWindow || !message || message.type !== 'elitebridge-timesheet-action') return;
    if (message.action === 'close') { document.getElementById('timesheetPreviewDialog')?.close(); return; }
    const staffName = String(message.staffName || '');
    const month = String(message.month || '');
    const entries = timesheetEntries(staffName, month);
    if (!entries.length) { notify('No timesheet entries were found for this staff member and month.'); return; }
    const approval = { approvedByName: String(message.approvedByName || '').trim(), approvalDate: String(message.approvalDate || '') };
    if (message.action === 'download') {
      try { downloadTimesheetPdf(timesheetPdfBlob(staffName, month, entries, approval), timesheetFilename(staffName, month)); notify('Timesheet PDF downloaded.'); }
      catch (error) { notify(error.message || 'Could not create the timesheet PDF.'); }
      return;
    }
    if (message.action === 'email') {
      document.getElementById('timesheetPreviewDialog')?.close();
      const first = String(message.startDate || '').slice(0, 10);
      const last = String(message.endDate || '').slice(0, 10);
      if (!first || !last) { notify('Select a service period before sending.'); return; }
      openTimesheetEmailDialog(staffName, first, last, approval);
    }
  });
  const timesheetEmailDialog = document.getElementById('timesheetEmailDialog');
  document.addEventListener('click', event => {
    if (event.target.closest('#timesheetEmailClose, #timesheetEmailCancel')) timesheetEmailDialog?.close();
    if (event.target === timesheetEmailDialog) timesheetEmailDialog.close();
  });
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!form.matches('[data-manual-timesheet-email]')) return;
    event.preventDefault();
    if (savingTime) return;
    const data = new FormData(form);
    const staffName = String(data.get('staffName') || '');
    const month = String(data.get('month') || '');
    const startDate = String(data.get('startDate') || '');
    const endDate = String(data.get('endDate') || '');
    const recipient = String(data.get('recipient') || '').trim();
    const entries = timesheetEntries(staffName, null, startDate, endDate);
    if (!entries.length) { notify('No recorded hours within the selected date range.'); return; }
    if (!data.get('confirmSensitiveEmail')) { notify('Confirm that the recipient is authorized.'); return; }
    const hours = entries.reduce((sum, entry) => sum + Number(entry.worked_minutes || 0), 0) / 60;
    if (!window.confirm(`Send ${staffName}'s hours-only PDF (${hours.toFixed(2)} hrs, ${startDate}–${endDate}) to ${recipient}? Please verify the email address.`)) return;
    const button = form.querySelector('button[type="submit"]');
    savingTime = true; button.disabled = true;
    try {
      const blob = timesheetPdfBlob(staffName, month, entries, { approvedByName: String(data.get('approvedByName') || '').trim(), approvalDate: String(data.get('approvalDate') || '') });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      await api('/manual-timesheets/employer/email', { method: 'POST',
        body: JSON.stringify({ staffName, month, startDate, endDate, recipient,
          message: String(data.get('message') || '').trim(), pdfBase64: btoa(binary) })
      });
      timesheetEmailDialog.close(); form.reset();
      notify('Timesheet accepted for email delivery. Check the email history for the submission record.');
      await loadTimesheetEmailHistory();
    } catch (error) {
      const message = error.message || 'Could not submit timesheet email.';
      const emailError = document.getElementById('timesheetEmailError');
      if (emailError) { emailError.textContent = message; emailError.hidden = false; }
      notify(message);
    } finally {
      savingTime = false;
      button.disabled = false;
    }
  });

  let employerInvoices = [];
  let employerReceipts = [];
  function invoicePdfBlob(invoice) {
    // Faithful recreation of the approved Elite Bridge two-page invoice design.
    // Both Download PDF and Email PDF use this same branded, itemized generator.
    const currency = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
    const rawDate = value => String(value || '').slice(0,10);
    const validDate = value => {
      const raw = rawDate(value), date = new Date(raw + 'T12:00:00');
      return /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(date.getTime()) ? date : null;
    };
    const fullDate = value => {
      const date = validDate(value);
      return date ? date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : rawDate(value);
    };
    const rowDate = value => {
      const date = validDate(value);
      return date ? date.toLocaleDateString('en-US',{month:'short'})+' '+String(date.getDate()).padStart(2,'0') : rawDate(value);
    };
    const spanDate = (start,end) => {
      const a=validDate(start), b=validDate(end);
      if (!a || !b) return rawDate(start)+' - '+rawDate(end);
      if(a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth()){
        return a.toLocaleDateString('en-US',{month:'long'})+' '+a.getDate()+' - '+b.getDate()+', '+b.getFullYear();
      }
      return fullDate(start)+' - '+fullDate(end);
    };
    const groupRange = (start,end) => {
      const a=validDate(start), b=validDate(end);
      if(!a||!b) return rawDate(start)+' - '+rawDate(end);
      const month=a.toLocaleDateString('en-US',{month:'long'});
      return a.getMonth()===b.getMonth() ? month+' '+a.getDate()+' - '+b.getDate() :
        a.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' - '+b.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    };
    const headerRange = (start,end) =>
      (rowDate(start)+' - '+rowDate(end)).toUpperCase();
    const hoursLabel = value => {
      const hours=Number(value||0);
      return hours.toFixed(Number.isInteger(hours)?0:2);
    };
    const formatTime = value => {
      const match=/^(\d{1,2}):(\d{2})$/.exec(String(value||''));
      if(!match)return '';
      const hour=Number(match[1]);
      return (hour%12||12)+':'+match[2]+' '+(hour<12?'AM':'PM');
    };
    const items=Array.isArray(invoice.line_items) ? invoice.line_items : [];
    const rows=items.map(item=>{
      const hours=Number(item.hours||0), amount=Number(item.amount||0);
      const startTime=formatTime(item.startTime), endTime=formatTime(item.endTime);
      return {
        isoDate:rawDate(item.serviceDate), date:rowDate(item.serviceDate),
        description:String(item.description||'Care services').replace(/\s*\(.*times not specified.*\)\s*$/i,''),
        serviceTime:startTime&&endTime ? startTime+' - '+endTime :
          /hospital|transport/i.test(String(item.description||'')) ? 'Additional '+hoursLabel(hours)+' hour'+(hours===1?'':'s') : 'Additional service',
        hours:hours, rate:Number(item.rate ?? (hours ? amount/hours : invoice.hourly_rate||0)),
        amount:amount
      };
    });
    if(!rows.length) throw new Error('This invoice has no service rows. Add the verified shifts first.');
    if(rows.some(r=>!validDate(r.isoDate)||!Number.isFinite(r.hours)||r.hours<0||
      !Number.isFinite(r.amount)||r.amount<0||!Number.isFinite(r.rate))) throw new Error('Invoice contains invalid service entries.');
    const subtotal=rows.reduce((sum,r)=>sum+r.amount,0), total=Number(invoice.total||0);
    if(!Number.isFinite(total)||Math.abs(subtotal-total)>0.01){
      throw new Error('Invoice service items do not match the stored total. Please correct the draft before downloading or emailing.');
    }
    const logo=document.getElementById('invoicePdfBrandLogo');
    if(!logo||!logo.complete||!logo.naturalWidth){
      throw new Error('Elite Bridge official logo is still loading. Please wait and try the invoice PDF again.');
    }
    const canvas=document.createElement('canvas');
    canvas.width=logo.naturalWidth;
    canvas.height=logo.naturalHeight;
    const context=canvas.getContext('2d');
    if(!context)throw new Error('Unable to prepare the invoice logo.');
    context.fillStyle='#ffffff';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(logo,0,0,canvas.width,canvas.height);
    const logoData=canvas.toDataURL('image/jpeg',.94).split(',')[1];
    const logoBytes=Uint8Array.from(atob(logoData),character=>character.charCodeAt(0));
    const NL=String.fromCharCode(10);
    const color={
      forest:'063D2C', gold:'BD8627', ink:'1C3029', muted:'65776E',
      border:'DCE3DD', pale:'F9FAF8', row:'F2F5F2', white:'FFFFFF', soft:'B7CBC0'
    };
    const rgb=hex=>hex.match(/.{2}/g).map(part=>(parseInt(part,16)/255).toFixed(3)).join(' ');
    const pdfObjects=[null];
    const add=value=>{pdfObjects.push(value);return pdfObjects.length-1;};
    const catalogId=add(null),pagesId=add(null);
    const regularId=add(pdfAscii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
    const boldId=add(pdfAscii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
    const blackId=add(pdfAscii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
    const imageId=add(pdfJoin([
      pdfAscii('<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+logoBytes.length+' >>'+NL+'stream'+NL),
      logoBytes,pdfAscii(NL+'endstream')
    ]));
    let chunks=[];
    if(rows.length<=3){chunks=[rows];}
    else if(rows.length<=14){const midpoint=Math.ceil(rows.length/2);chunks=[rows.slice(0,midpoint),rows.slice(midpoint)];}
    else {for(let i=0;i<rows.length;i+=14) chunks.push(rows.slice(i,i+14));}
    const totalHours=rows.reduce((sum,row)=>sum+row.hours,0);
    const hoursSummary=()=>{
      const groups=[];
      for(const row of rows){
        const low=row.description.toLowerCase();
        const name=/morning care/.test(low)?'Morning care':/evening care/.test(low)?'Evening care':
          /hospital|transport/.test(low)?'Hospital transport':/care services/.test(low)?
          row.date+' care services':row.description;
        let g=groups.find(group=>group.name===name);
        if(!g){g={name,visits:0,hours:0};groups.push(g);}
        g.visits+=1;g.hours+=row.hours;
      }
      const priority=name=>/morning care/i.test(name)?0:/evening care/i.test(name)?1:/care services/i.test(name)?2:/hospital|transport/i.test(name)?3:4;
      groups.sort((a,b)=>priority(a.name)-priority(b.name));
      if(groups.length>4){
        const rest=groups.splice(3),other={name:'Other care services',visits:0,hours:0};
        rest.forEach(g=>{other.visits+=g.visits;other.hours+=g.hours;});groups.push(other);
      }
      return groups;
    };
    const pageIds=[];
    chunks.forEach((chunk,pageIndex)=>{
      const op=[], first=pageIndex===0, last=pageIndex===chunks.length-1;
      const fill=(x,top,width,height,hex)=>op.push(rgb(hex)+' rg '+x+' '+(792-top-height)+' '+width+' '+height+' re f');
      const stroke=(x1,y1,x2,y2,hex=color.border,width=1)=>op.push(rgb(hex)+' RG '+width+
        ' w '+x1+' '+(792-y1)+' m '+x2+' '+(792-y2)+' l S');
      const round=(x,top,w,h,r,bg,edge)=> {
        const k=.55228475, bottom=792-top-h, upper=bottom+h;
        let path=(x+r)+' '+bottom+' m '+(x+w-r)+' '+bottom+' l '+
          (x+w-r+k*r)+' '+bottom+' '+(x+w)+' '+(bottom+r-k*r)+' '+(x+w)+' '+(bottom+r)+' c '+
          (x+w)+' '+(upper-r)+' l '+(x+w)+' '+(upper-r+k*r)+' '+(x+w-r+k*r)+' '+upper+' '+(x+w-r)+' '+upper+' c '+
          (x+r)+' '+upper+' l '+(x+r-k*r)+' '+upper+' '+x+' '+(upper-r+k*r)+' '+x+' '+(upper-r)+' c '+
          x+' '+(bottom+r)+' l '+x+' '+(bottom+r-k*r)+' '+(x+r-k*r)+' '+bottom+' '+(x+r)+' '+bottom+' c h ';
        op.push(rgb(bg)+' rg '+(edge?rgb(edge)+' RG 1 w ':'')+path+(edge?'B':'f'));
      };
      const text=(x,top,size,value,weight='regular',hex=color.ink)=>{
        const which=weight==='regular'?'F1':weight==='black'?'F3':'F2';
        op.push(rgb(hex)+' rg BT /'+which+' '+size+' Tf '+x+' '+(792-top-size)+' Td ('+pdfEscape(value)+') Tj ET');
      };
      const measure=(value,size,weight='regular')=>{
        context.font=(weight==='regular'?'':'bold ')+size+'px Arial';
        return context.measureText(String(value)).width;
      };
      const right=(rightEdge,top,size,value,weight='regular',hex=color.ink)=>{
        text(Math.max(42,rightEdge-measure(value,size,weight)),top,size,value,weight,hex);
      };
      const fitted=(x,top,maxWidth,size,value,weight='regular',hex=color.ink)=>{
        let actual=size;
        while(actual>6.2&&measure(value,actual,weight)>maxWidth)actual-=.25;
        text(x,top,actual,value,weight,hex);
      };
      const logoBox=(x,top,width,height)=>{
        op.push('q '+width+' 0 0 '+height+' '+x+' '+(792-top-height)+' cm /Im1 Do Q');
      };
      const footer=()=>{
        stroke(43,742,569,742);
        text(43,746,7.9,'ELITE BRIDGE STAFFING LLC  |  NON-MEDICAL HOME CARE','bold',color.muted);
        right(569,746,7.8,'PAGE '+(pageIndex+1)+' OF '+chunks.length,'bold',color.muted);
      };
      const summary=(top)=>{
        round(43,top,256,114,8,color.pale,color.border);
        round(311,top,258,114,8,color.pale,color.border);
        text(55,top+11,9,'BILLING SUMMARY','bold',color.forest);
        hoursSummary().forEach((group,index)=>{
          const label=group.name+'  |  '+group.visits+' visit'+(group.visits===1?'':'s');
          fitted(55,top+35+index*17.3,183,8.4,label,'regular',color.muted);
          right(286,top+35+index*17.3,8.4,hoursLabel(group.hours)+' hour'+(group.hours===1?'':'s'),'bold');
        });
        text(323,top+11,8.5,'SUBTOTAL','bold',color.muted);
        right(557,top+9,10,currency(subtotal),'bold');
        text(323,top+36,8.3,'OTHER CHARGES','bold',color.muted);
        right(557,top+36,9,currency(0));
        stroke(323,top+67,557,top+67,color.gold,1.2);
        text(323,top+77,11.5,'TOTAL DUE','bold',color.forest);
        right(557,top+75,20,currency(total),'black',color.forest);
      };
      const payment=(top)=>{
        round(43,top,526,54,8,color.row,null);
        text(55,top+10,9.5,'PAYMENT BY CHEQUE','bold',color.forest);
        text(55,top+28,10,'Please make cheques payable to Elite Bridge Staffing LLC.','bold');
        text(43,top+72,8.8,'PAYMENT REMITTANCE ADDRESS','bold',color.gold);
        text(43,top+90,9,'Elite Bridge Staffing LLC  |  144 Thissell Ave, Dracut, MA 01826');
      };
      if(first){
        logoBox(43,25,244,61);
        right(569,30,10,'ELITE BRIDGE STAFFING LLC','bold',color.forest);
        right(569,47,8.2,'144 Thissell Ave','regular',color.muted);
        right(569,62,8.2,'Dracut, MA 01826','regular',color.muted);
        right(569,77,8.2,'(508) 251-9346  |  elitebridgestaffing.com','regular',color.muted);
        stroke(43,98,569,98,color.gold,1.3);
        text(43,104,26,'INVOICE','black',color.forest);
        round(43,151,246,112,8,color.pale,color.border);
        round(302,151,267,112,8,color.pale,color.border);
        text(57,162,8.5,'BILL TO','bold',color.gold);
        fitted(57,179,218,12,String(invoice.client_name||''),'bold',color.forest);
        const address=String(invoice.billing_address||'').split(/\r?\n/).filter(Boolean);
        address.slice(0,2).forEach((line,index)=>fitted(57,201+index*17,219,9.8,line));
        text(57,240,8.2,'Non-medical home care services','regular',color.muted);
        [['INVOICE NUMBER',String(invoice.invoice_number||'')],['INVOICE DATE',fullDate(invoice.invoice_date)],
          ['PAYMENT DUE',fullDate(invoice.due_date)],['SERVICE PERIOD',spanDate(invoice.service_start_date,invoice.service_end_date)]]
          .forEach((pair,index)=>{
            const top=165+index*23;
            text(316,top,8,pair[0],'bold',color.muted);
            right(556,top,8.9,pair[1],index===0?'bold':'regular');
          });
        round(43,279,526,61,8,color.forest,null);
        stroke(295,289,295,330,color.soft,.7);
        text(59,290,8.6,'BILLED SERVICE HOURS','bold',color.soft);
        text(59,305,19,hoursLabel(totalHours)+' hours','black',color.white);
        text(313,290,8.6,'TOTAL AMOUNT DUE','bold',color.soft);
        right(554,301,23,currency(total),'black',color.white);
      }else{
        logoBox(43,19,197,49);
        right(569,28,9.2,'ELITE BRIDGE STAFFING LLC','bold',color.forest);
        right(569,45,9,'INVOICE '+String(invoice.invoice_number||''),'regular',color.muted);
        stroke(43,78,569,78,color.gold,1.3);
      }
      const titleY=first?351:93, headY=first?375:117, rowY=first?401:143, rowHeight=first?20:19.4;
      text(43,titleY,11.8,'DETAILED SERVICE ITEMIZATION','bold',color.forest);
      right(569,titleY+2,8.6,headerRange(chunk[0].isoDate,chunk[chunk.length-1].isoDate),'bold',color.muted);
      round(43,headY,526,26,3,color.forest,null);
      [['DATE',55],['SERVICE TYPE',127],['SERVICE TIME',257],['HOURS',410.6],['RATE',477.4],['AMOUNT',520.4]]
        .forEach(pair=>text(pair[1],headY+5.5,7.8,pair[0],'bold',color.white));
      chunk.forEach((row,index)=>{
        const top=rowY+index*rowHeight;
        if(index%2===1)fill(43,top,526,rowHeight,color.row);
        stroke(43,top+rowHeight,569,top+rowHeight,color.border,.45);
        text(55,top+3.3,8.8,row.date,'bold');
        fitted(127,top+3.3,120,9,row.description);
        fitted(257,top+3.3,137,9,row.serviceTime);
        right(436,top+3.3,9,hoursLabel(row.hours),'bold');
        right(493,top+3.3,9,currency(row.rate),'regular',color.muted);
        right(556,top+3.3,9,currency(row.amount),'bold');
      });
      const groupY=rowY+chunk.length*rowHeight+5;
      round(43,groupY,526,28,4,color.row,null);
      const groupHours=chunk.reduce((sum,row)=>sum+row.hours,0);
      const groupTotal=chunk.reduce((sum,row)=>sum+row.amount,0);
      text(55,groupY+6,9.2,groupRange(chunk[0].isoDate,chunk[chunk.length-1].isoDate)+
        '  |  '+chunk.length+' visits  |  '+hoursLabel(groupHours)+' hours','bold',color.forest);
      right(557,groupY+4.5,11,currency(groupTotal),'bold',color.forest);
      if(last){
        if(!first){
          const sumY=Math.max(462,groupY+42);
          summary(sumY);
          payment(sumY+132);
        }else{
          const sumY=groupY+39;
          if(sumY+123+90+9>740)throw new Error('Too many services to display on one invoice page.');
          summary(sumY);
          payment(sumY+123);
        }
      }
      footer();
      const stream=pdfAscii(op.join(NL));
      const pageId=add(null),streamId=add(pdfJoin([
        pdfAscii('<< /Length '+stream.length+' >>'+NL+'stream'+NL),stream,pdfAscii(NL+'endstream')
      ]));
      pdfObjects[pageId]=pdfAscii('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 612 792]'+
        ' /Resources << /Font << /F1 '+regularId+' 0 R /F2 '+boldId+' 0 R /F3 '+blackId+
        ' 0 R >> /XObject << /Im1 '+imageId+' 0 R >> >> /Contents '+streamId+' 0 R >>');
      pageIds.push(pageId);
    });
    pdfObjects[catalogId]=pdfAscii('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
    pdfObjects[pagesId]=pdfAscii('<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>');
    const parts=[pdfAscii('%PDF-1.4'+NL)],offsets=[0];
    let length=parts[0].length;
    for(let id=1;id<pdfObjects.length;id++){
      const before=pdfAscii(id+' 0 obj'+NL),after=pdfAscii(NL+'endobj'+NL);
      offsets[id]=length;parts.push(before,pdfObjects[id],after);
      length+=before.length+pdfObjects[id].length+after.length;
    }
    const xrefOffset=length;
    let xref='xref'+NL+'0 '+pdfObjects.length+NL+'0000000000 65535 f '+NL;
    for(let id=1;id<pdfObjects.length;id++)xref+=String(offsets[id]).padStart(10,'0')+' 00000 n '+NL;
    parts.push(pdfAscii(xref+'trailer'+NL+'<< /Size '+pdfObjects.length+' /Root '+
      catalogId+' 0 R >>'+NL+'startxref'+NL+xrefOffset+NL+'%%EOF'));
    return new Blob([pdfJoin(parts)],{type:'application/pdf'});
  }
  function invoiceFilename(invoice) { return `${String(invoice.invoice_number || 'EliteBridge').replace(/[^a-z0-9_-]/gi, '_')}_Invoice.pdf`; }
  function receiptPdfBlob(receipt) {
    // Generate a private PDF in the authenticated browser from the saved
    // receipt record. Cheque received must never be presented as bank cleared.
    const value = Number(receipt.amount);
    if (!(value > 0) || !Number.isFinite(value)) throw new Error('Receipt amount is invalid.');
    if (!receipt.receipt_number || !receipt.invoice_number || !receipt.client_name) {
      throw new Error('Receipt details are incomplete. Refresh the dashboard.');
    }
    const currency = n => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(n || 0));
    const fullDate = v => {
      const raw = String(v || '').slice(0, 10);
      const date = new Date(raw + 'T12:00:00');
      return /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : raw;
    };
    const method = receipt.payment_method === 'cheque' ? 'Cheque' :
      receipt.payment_method === 'cash' ? 'Cash' :
      receipt.payment_method === 'bank_transfer' ? 'Bank transfer' : 'Other';
    const returned = receipt.clearance_status === 'returned';
    const cleared = receipt.clearance_status === 'cleared';
    const state = returned ? 'Cheque returned' : cleared ? 'Bank cleared' :
      receipt.payment_method === 'cheque' ? 'Bank clearance pending' : 'Confirmation pending';
    const note = returned
      ? 'The cheque was returned. This historical receipt does not confirm payment.'
      : cleared ? 'Bank clearance has been confirmed for the recorded payment.'
      : receipt.payment_method === 'cheque'
        ? 'A cheque was received. This receipt does not certify that funds have cleared the bank.'
        : 'Payment was recorded as received. Final settlement has not been confirmed.';

    const image = document.getElementById('invoicePdfBrandLogo');
    if (!image || !image.complete || !image.naturalWidth) {
      throw new Error('The receipt logo is still loading. Please wait and try again.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare the receipt PDF.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encoded = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
    const logoBytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const NL = String.fromCharCode(10);
    const objects = [null];
    const add = content => { objects.push(content); return objects.length - 1; };
    const rootId = add(null), pagesId = add(null);
    const regularId = add(pdfAscii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
    const boldId = add(pdfAscii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
    const imageId = add(pdfJoin([
      pdfAscii('<< /Type /XObject /Subtype /Image /Width ' + canvas.width +
        ' /Height ' + canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
        ' /Filter /DCTDecode /Length ' + logoBytes.length + ' >>' + NL + 'stream' + NL),
      logoBytes, pdfAscii(NL + 'endstream')
    ]));
    const ink = '1C3029', forest = '064024', gold = 'B9791F', muted = '5C6D62',
      line = 'DFE7E2', pale = 'F5F8F5', white = 'FFFFFF';
    const rgb = hex => hex.match(/.{2}/g).map(part => (parseInt(part,16)/255).toFixed(3)).join(' ');
    const ops = [];
    const fill = (x, top, width, height, hex) =>
      ops.push(rgb(hex) + ' rg ' + x + ' ' + (792-top-height) + ' ' + width + ' ' + height + ' re f');
    const stroke = (x1, y1, x2, y2, hex=line, width=1) =>
      ops.push(rgb(hex) + ' RG ' + width + ' w ' + x1 + ' ' + (792-y1) +
        ' m ' + x2 + ' ' + (792-y2) + ' l S');
    const write = (x, top, size, value, weight='regular', hex=ink) =>
      ops.push(rgb(hex) + ' rg BT /' + (weight==='bold'?'F2':'F1') + ' ' + size +
        ' Tf ' + x + ' ' + (792-top-size) + ' Td (' + pdfEscape(value) + ') Tj ET');
    const measure = (value, size, weight='regular') => {
      ctx.font = (weight==='bold'?'bold ':'') + size + 'px Arial';
      return ctx.measureText(String(value)).width;
    };
    const right = (edge, top, size, value, weight='regular', hex=ink) =>
      write(Math.max(43, edge-measure(value,size,weight)), top, size, value, weight, hex);
    const fit = (x, top, max, size, value, weight='regular', hex=ink) => {
      let font = size;
      while (font > 7 && measure(value,font,weight) > max) font -= 0.3;
      write(x,top,font,value,weight,hex);
    };

    ops.push('q 220 0 0 55 43 ' + (792-29-55) + ' cm /Im1 Do Q');
    right(569,30,10,'ELITE BRIDGE STAFFING LLC','bold',forest);
    right(569,47,8.2,'144 Thissell Ave', 'regular',muted);
    right(569,61,8.2,'Dracut, MA 01826','regular',muted);
    right(569,76,8.2,'(508) 251-9346 | elitebridgestaffing.com','regular',muted);
    stroke(43,101,569,101,gold,1.4);
    write(43,117,26,'PAYMENT RECEIPT','bold',forest);
    write(43,153,10.4,'Acknowledgment of payment instrument received','regular',muted);

    fill(43,191,526,88,forest);
    write(59,202,9,'AMOUNT RECEIVED','bold','C3D7CB');
    write(59,224,28,currency(value),'bold',white);
    right(553,205,9,'PAYMENT METHOD','bold','C3D7CB');
    right(553,230,16,method.toUpperCase(),'bold',white);

    fill(43,295,253,132,pale);
    fill(307,295,262,132,pale);
    write(56,306,8.7,'RECEIVED FROM','bold',gold);
    fit(56,324,228,15,String(receipt.client_name),'bold',forest);
    const address = String(receipt.billing_address||'').split(/\r?\n/).filter(Boolean);
    address.slice(0,2).forEach((lineText,i) => fit(56,349+i*17,226,9.8,lineText,'regular',muted));
    write(320,306,8.7,'RECEIPT DETAILS','bold',gold);
    write(320,327,8.5,'Receipt no.','regular',muted);
    right(555,327,9,receipt.receipt_number,'bold',forest);
    write(320,351,8.5,'Date received','regular',muted);
    right(555,351,9,fullDate(receipt.received_on),'bold',forest);
    write(320,376,8.5,'Payment method','regular',muted);
    right(555,376,9,method,'bold',forest);
    write(320,401,8.5,'Status','regular',muted);
    right(555,401,8.4,state,'bold',returned?'A44743':cleared?forest:gold);

    write(43,447,11,'RELATED INVOICE','bold',forest);
    stroke(43,468,569,468,gold,0.9);
    const items = [
      ['Invoice number',receipt.invoice_number],
      ['Service period',fullDate(receipt.service_start_date) + ' - ' + fullDate(receipt.service_end_date)],
      ['Invoice amount',currency(receipt.invoice_total)],
      ['Receipt amount',currency(value)]
    ];
    items.forEach((pair,index)=>{
      const top=479+index*33;
      if(index%2===1) fill(43,top-4,526,30,pale);
      write(55,top+2,10,pair[0],'regular',muted);
      right(555,top+1,10.2,pair[1],index===3?'bold':'regular',index===3?forest:ink);
      stroke(43,top+29,569,top+29,line,0.45);
    });
    fill(43,629,526,77,pale);
    write(56,639,10,'PAYMENT STATUS','bold',forest);
    write(56,660,9.5,note,'regular',muted);
    write(56,683,8.1,'This document acknowledges receipt; retain it with your billing records.','regular',muted);
    stroke(43,744,569,744,line,1);
    write(43,750,8,'ELITE BRIDGE STAFFING LLC | PAYMENT RECEIPT','bold',muted);
    right(569,750,8,'PAGE 1 OF 1','bold',muted);

    const content = pdfAscii(ops.join(NL));
    const pageId = add(null);
    const streamId = add(pdfJoin([
      pdfAscii('<< /Length ' + content.length + ' >>' + NL + 'stream' + NL),
      content, pdfAscii(NL+'endstream')
    ]));
    objects[pageId] = pdfAscii('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 612 792]' +
      ' /Resources << /Font << /F1 '+regularId+' 0 R /F2 '+boldId+
      ' 0 R >> /XObject << /Im1 '+imageId+' 0 R >> >> /Contents '+streamId+' 0 R >>');
    objects[rootId] = pdfAscii('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
    objects[pagesId] = pdfAscii('<< /Type /Pages /Kids ['+pageId+' 0 R] /Count 1 >>');
    const parts = [pdfAscii('%PDF-1.4' + NL)], offsets = [0];
    let length = parts[0].length;
    for (let id=1;id<objects.length;id++) {
      const head = pdfAscii(id+' 0 obj'+NL), tail=pdfAscii(NL+'endobj'+NL);
      offsets[id]=length;
      parts.push(head,objects[id],tail);
      length+=head.length+objects[id].length+tail.length;
    }
    const xrefAt=length;
    let xref='xref'+NL+'0 '+objects.length+NL+'0000000000 65535 f '+NL;
    for (let id=1;id<objects.length;id++) xref+=String(offsets[id]).padStart(10,'0')+' 00000 n '+NL;
    parts.push(pdfAscii(xref+'trailer'+NL+'<< /Size '+objects.length+' /Root '+rootId+
      ' 0 R >>'+NL+'startxref'+NL+xrefAt+NL+'%%EOF'));
    return new Blob([pdfJoin(parts)],{type:'application/pdf'});
  }

  function renderClientReceipts(loadFailed = false) {
    const container = document.getElementById('clientReceiptList');
    const summary = document.getElementById('clientReceiptSummary');
    const count = document.getElementById('invoiceReceiptCount');
    if (!container) return;
    if (count) count.textContent = String(employerReceipts.length);
    if (loadFailed) {
      if (summary) summary.innerHTML = '';
      renderEmpty(container, 'Receipts unavailable', 'The receipt register could not be loaded. Please refresh the dashboard.');
      return;
    }
    if (!employerReceipts.length) {
      if (summary) summary.innerHTML = '';
      renderEmpty(container, 'No receipts recorded yet', 'Receipts for payments received will appear here, separate from your invoice ledger.');
      return;
    }
    const pending = employerReceipts.filter(receipt => receipt.clearance_status === 'pending_clearance').length;
    const total = employerReceipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);
    if (summary) summary.innerHTML = [
      '<div><span>Recorded receipts</span><strong>' + employerReceipts.length + '</strong></div>',
      '<div><span>Amount recorded</span><strong>' + money(total) + '</strong></div>',
      '<div><span>Awaiting bank clearance</span><strong>' + pending + '</strong></div>'
    ].join('');
    container.innerHTML = employerReceipts.map(receipt => {
      const safe = value => escapeHtml(String(value ?? ''));
      const status = receipt.clearance_status === 'cleared' ? 'Bank cleared' :
        receipt.clearance_status === 'returned' ? 'Cheque returned' : 'Bank clearance pending';
      const state = receipt.clearance_status === 'cleared' ? 'cleared' :
        receipt.clearance_status === 'returned' ? 'returned' : 'pending';
      const method = receipt.payment_method === 'cheque' ? 'Cheque' :
        receipt.payment_method === 'bank_transfer' ? 'Bank transfer' :
        receipt.payment_method === 'cash' ? 'Cash' : 'Other payment';
      return '<article class="receipt-entry" data-searchable>' +
        '<div class="receipt-entry-top">' +
          '<span class="receipt-entry-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"></path><path d="M9 8h6M9 12h6"></path><path d="m9 16 1.5 1.5 3-3"></path></svg></span>' +
          '<div class="receipt-entry-title"><strong>' + safe(receipt.receipt_number) + '</strong>' +
          '<span>' + safe(receipt.client_name) + ' · Invoice ' + safe(receipt.invoice_number) + '</span></div>' +
          '<span class="receipt-state receipt-state--' + state + '">' + safe(status) + '</span>' +
        '</div>' +
        '<div class="receipt-info-grid">' +
          '<div><small>Amount received</small><strong>' + money(receipt.amount) + '</strong></div>' +
          '<div><small>Date received</small><strong>' + safe(formatDateOnly(receipt.received_on)) + '</strong></div>' +
          '<div><small>Payment method</small><strong>' + safe(method) + '</strong></div>' +
          '<div><small>Invoice</small><strong>' + safe(receipt.invoice_number) + '</strong></div>' +
        '</div>' +
        '<div class="receipt-entry-foot">' +
          '<button class="secondary-button receipt-download" type="button" data-receipt-download="' + safe(receipt.id) + '">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"></path></svg> Download receipt PDF</button>' +
          (receipt.receipt_sent_at ? '<span class="receipt-email-status">✓ Emailed ' + safe(formatDateOnly(receipt.receipt_sent_at)) + '</span>' :
            '<span class="receipt-email-status">Not yet emailed</span>') +
        '</div>' +
      '</article>';
    }).join('');
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-receipt-download]');
    if (!button || button.disabled) return;
    const receipt = employerReceipts.find(item => String(item.id) === button.dataset.receiptDownload);
    if (!receipt) { notify('This receipt is not available. Please refresh the dashboard.'); return; }
    try {
      const pdf = receiptPdfBlob(receipt);
      const name = String(receipt.receipt_number || 'Elite_Bridge_Receipt').replace(/[^a-z0-9_-]/gi, '_');
      downloadTimesheetPdf(pdf, name + '_Receipt.pdf');
      notify('Receipt PDF downloaded.');
    } catch (error) {
      notify(error.message || 'Could not generate this receipt PDF.');
    }
  });

  function renderClientInvoices() {
    const container = document.getElementById('clientInvoiceList'); if (!container) return;
    if (!employerInvoices.length) { renderEmpty(container, 'No client invoices yet', 'Create a draft from completed service dates. Client invoices stay separate from payroll timesheets.'); return; }
    container.innerHTML = employerInvoices.map(invoice => {
      const days = Array.isArray(invoice.service_days) ? invoice.service_days.length : 0;
      const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
      const detailRows = lineItems.map(item => `<div class="invoice-detail-row"><span>${escapeHtml(formatDateOnly(item.serviceDate))} · ${escapeHtml(item.description)} · ${escapeHtml(item.startTime)}–${escapeHtml(item.endTime)} · ${escapeHtml(item.caregiver)}</span><strong>${money(item.amount)}</strong></div>`).join('');
      const receiptState = invoice.receipt_clearance_status === 'cleared' ? 'Bank cleared' : invoice.receipt_clearance_status === 'returned' ? 'Cheque returned' : 'Bank clearance pending';
      const receiptLabel = invoice.receipt_number
        ? `<div class="invoice-detail-row"><span><strong>Receipt ${escapeHtml(invoice.receipt_number)}</strong> · ${escapeHtml(formatDateOnly(invoice.receipt_received_on))} · ${escapeHtml(invoice.receipt_method || 'cheque')} · ${escapeHtml(receiptState)}${invoice.receipt_sent_at ? ' · Receipt emailed' : ''}</span><strong>${money(invoice.receipt_amount)}</strong></div>`
        : '';
      const displayStatus = invoice.status === 'cheque_received' ? 'Cheque received' : invoice.status === 'sent' ? 'Sent' : invoice.status === 'draft' ? 'Draft' : String(invoice.status || 'Draft');
      return `<article class="surface-pad invoice-row"><div class="invoice-row-top"><span class="row-icon">$</span><span class="row-copy"><strong>${escapeHtml(invoice.invoice_number)} · ${escapeHtml(invoice.client_name)}</strong><span>${escapeHtml(formatDateOnly(invoice.service_start_date))} – ${escapeHtml(formatDateOnly(invoice.service_end_date))} · ${days} service days</span><span class="invoice-status-line"><span class="status ${invoice.status === 'sent' ? '' : 'neutral'}">${escapeHtml(displayStatus)}</span><small>${invoice.receipt_number ? escapeHtml(receiptState) : 'Due ' + escapeHtml(formatDateOnly(invoice.due_date))}</small></span></span><strong class="invoice-total">${money(invoice.total)}</strong></div><div class="timesheet-actions"><button type="button" class="timesheet-action-button" data-invoice-action="view" data-invoice-id="${invoice.id}">View details</button><button type="button" class="timesheet-action-button" data-invoice-action="download" data-invoice-id="${invoice.id}">Download PDF</button><button type="button" class="timesheet-action-button" data-invoice-action="email" data-invoice-id="${invoice.id}" ${invoice.status !== 'draft' ? 'disabled' : ''}>Email PDF</button></div><div class="invoice-details" data-invoice-details="${invoice.id}" hidden>${detailRows}${receiptLabel}<div class="invoice-detail-row invoice-detail-total"><span>Invoice total</span><strong>${money(invoice.total)}</strong></div></div></article>`;
    }).join('');
  }
  function resetClientInvoiceDates() {
    const form = document.getElementById('clientInvoiceForm'); if (!form) return;
    const today = new Date();
    const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const due = new Date(today); due.setDate(due.getDate() + 7);
    form.elements.invoiceDate.value = localDate(today); form.elements.dueDate.value = localDate(due);
  }
  resetClientInvoiceDates();
  // Future invoices default to seven calendar days from the invoice date.
  const clientInvoiceDateInput = document.getElementById('clientInvoiceForm')?.elements?.invoiceDate;
  clientInvoiceDateInput?.addEventListener('change', () => {
    const form = document.getElementById('clientInvoiceForm');
    const issue = new Date(String(clientInvoiceDateInput.value || '') + 'T12:00:00');
    if (Number.isNaN(issue.getTime()) || !form) return;
    issue.setDate(issue.getDate() + 7);
    const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    form.elements.dueDate.value = localDate(issue);
  });
  renderClientInvoices();
  document.getElementById('clientInvoiceForm')?.addEventListener('submit', async event => {
    event.preventDefault(); if (savingTime) return;
    const form = event.currentTarget, data = new FormData(form), button = form.querySelector('button[type="submit"]');
    const payload = Object.fromEntries(['clientName','clientEmail','billingAddress','invoiceDate','dueDate','serviceStartDate','serviceEndDate','hourlyRate','morningStartTime','morningEndTime','morningCaregiver','eveningStartTime','eveningEndTime','eveningCaregiver','notes'].map(key => [key, String(data.get(key) || '').trim()]));
    payload.includeWeekends = data.get('includeWeekends') === 'on';
    if (data.get('confirmCompletedServices') !== 'on') { notify('Confirm the invoice dates are completed services.'); return; }
    savingTime = true; button.disabled = true; button.textContent = 'Saving draft…';
    try {
      const result = await api('/client-invoices/employer', { method: 'POST', body: JSON.stringify(payload) });
      employerInvoices = [result.invoice, ...employerInvoices]; renderClientInvoices(); form.reset(); resetClientInvoiceDates();
      notify(`Draft invoice ${result.invoice.invoice_number} saved.`);
    } catch (error) { notify(error.message || 'Could not save this invoice.'); }
    finally { savingTime = false; button.disabled = false; button.textContent = 'Save draft invoice'; }
  });
  const clientInvoiceEmailDialog = document.getElementById('clientInvoiceEmailDialog');
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-invoice-action]');
    if (button) {
      const invoice = employerInvoices.find(item => String(item.id) === button.dataset.invoiceId);
      if (!invoice) return;
      if (button.dataset.invoiceAction === 'view') { const details = document.querySelector(`[data-invoice-details="${CSS.escape(String(invoice.id))}"]`); if (details) details.hidden = !details.hidden; return; }
      if (button.dataset.invoiceAction === 'download') { try { downloadTimesheetPdf(invoicePdfBlob(invoice), invoiceFilename(invoice)); notify('Client invoice PDF downloaded.'); } catch (error) { notify(error.message || 'Could not create the invoice PDF.'); } return; }
      const form = document.getElementById('clientInvoiceEmailForm'); form.elements.invoiceId.value = invoice.id; form.elements.recipient.value = invoice.client_email || '';
      form.elements.confirmInvoiceEmail.checked = false; if (form.elements.testOnly) form.elements.testOnly.checked = false; const error = document.getElementById('clientInvoiceEmailError'); if (error) { error.hidden = true; error.textContent = ''; }
      document.getElementById('clientInvoiceEmailSummary').textContent = `Invoice ${invoice.invoice_number} for ${invoice.client_name} (${money(invoice.total)}). Review the attached PDF, then choose a test or official send.`;
      clientInvoiceEmailDialog.showModal(); document.getElementById('clientInvoiceRecipient').focus();
    }
    if (event.target.closest('#clientInvoiceEmailClose, #clientInvoiceEmailCancel')) clientInvoiceEmailDialog?.close();
    if (event.target === clientInvoiceEmailDialog) clientInvoiceEmailDialog.close();
  });
  document.getElementById('clientInvoicePreviewPdf')?.addEventListener('click', () => {
    const id = document.getElementById('clientInvoiceEmailForm')?.elements?.invoiceId?.value;
    const invoice = employerInvoices.find(item => String(item.id) === String(id || ''));
    if (!invoice) { notify('Choose a saved invoice first.'); return; }
    try {
      // The same binary PDF generator is used for both preview/download and email.
      downloadTimesheetPdf(invoicePdfBlob(invoice), invoiceFilename(invoice));
      notify('Approved-layout invoice PDF downloaded for review.');
    } catch (error) { notify(error.message || 'Could not generate the invoice PDF.'); }
  });
  document.addEventListener('submit', async event => {
    const form = event.target; if (!form.matches('[data-client-invoice-email]')) return;
    event.preventDefault(); if (savingTime) return;
    const data = new FormData(form), invoice = employerInvoices.find(item => String(item.id) === String(data.get('invoiceId')));
    if (!invoice || data.get('confirmInvoiceEmail') !== 'on') return;
    const button = form.querySelector('button[type="submit"]'); savingTime = true; button.disabled = true;
    try {
      const blob = invoicePdfBlob(invoice), bytes = new Uint8Array(await blob.arrayBuffer()); let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      await api(`/client-invoices/employer/${encodeURIComponent(String(invoice.id))}/email`, { method: 'POST', body: JSON.stringify({ recipient: String(data.get('recipient') || '').trim(), pdfBase64: btoa(binary), testOnly: data.get('testOnly') === 'true' }) });
      clientInvoiceEmailDialog.close(); form.reset(); notify(data.get('testOnly') === 'true' ? `Test invoice ${invoice.invoice_number} emailed; draft preserved.` : `Invoice ${invoice.invoice_number} emailed to the client.`); await loadEmployer();
    } catch (error) { const message = error.message || 'Could not send the invoice PDF.'; const area = document.getElementById('clientInvoiceEmailError'); if (area) { area.textContent = message; area.hidden = false; } notify(message); }
    finally { savingTime = false; button.disabled = false; }
  });

  function renderClientRecords(clients) {
    const container = document.getElementById('clientRecordList');
    if (!container) return;
    employerClients = clients || [];
    if (!employerClients.length) {
      renderEmpty(container, 'No saved client locations yet', 'Add Barry, Manchester, and Gloucester so schedules and invoices start from clean records.');
      return;
    }
    container.innerHTML = employerClients.map((client) => `
      <article class="client-record-card" data-searchable>
        <div>
          <strong>${escapeHtml(client.clientName)}</strong>
          <span>${escapeHtml(client.locationName)} · ${escapeHtml(client.city)}, ${escapeHtml(client.state)}</span>
          <small>${escapeHtml(client.address || 'Address to be added')}</small>
        </div>
        <div class="client-rate-stack"><span>Bill ${money(client.billingRate)}/hr</span><span>Pay ${money(client.caregiverRate)}/hr</span></div>
      </article>`).join('');
  }

  function savedClientRecords() {
    try { return JSON.parse(localStorage.getItem('eliteBridgeClientRecords') || '[]'); }
    catch (_) { return []; }
  }

  document.getElementById('clientForm')?.addEventListener('submit', async event => {
    event.preventDefault(); if (savingTime) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(['clientName','locationName','address','city','state','zipCode','contactName','contactPhone','billingRate','caregiverRate','notes'].map(key => [key, String(data.get(key) || '').trim()]));
    const button = form.querySelector('button[type="submit"]');
    savingTime = true; button.disabled = true; button.textContent = 'Saving client...';
    try {
      let client;
      try {
        const result = await api('/clients/employer', { method: 'POST', body: JSON.stringify(payload) });
        client = result.client;
      } catch (apiError) {
        client = { ...payload, id: Date.now(), billingRate: Number(payload.billingRate || 40), caregiverRate: Number(payload.caregiverRate || 30), createdAt: new Date().toISOString() };
      }
      const next = [client, ...employerClients];
      localStorage.setItem('eliteBridgeClientRecords', JSON.stringify(next));
      employerClients = next;
      renderClientRecords(next);
      form.reset();
      document.getElementById('clientState').value = 'MA';
      document.getElementById('clientBillingRate').value = '40';
      document.getElementById('clientCaregiverRate').value = '30';
      notify('Client location saved.');
    } catch (error) { notify(error.message || 'Could not save this client record.'); }
    finally { savingTime = false; button.disabled = false; button.textContent = 'Save client location'; }
  });

  let employerExpenses = [];
  let employerClients = [];
  let selectedExpenseReceipt = null;
  const expenseCategories = {
    gas: 'Gas',
    subscriptions: 'Subscriptions',
    advertising: 'Advertising',
    supplies: 'Supplies',
    payroll: 'Payroll',
    insurance: 'Insurance',
    office: 'Office',
    other: 'Other'
  };
  function setExpenseDefaults() {
    const date = document.getElementById('expenseDate');
    if (date && !date.value) date.value = todayInputValue();
  }
  function renderExpenses(data = {}) {
    const expenses = data.expenses || employerExpenses || [];
    employerExpenses = expenses;
    const monthPrefix = todayInputValue().slice(0, 7);
    const monthExpenses = expenses.filter(item => String(item.expense_date || '').slice(0, 7) === monthPrefix);
    const totalFor = category => monthExpenses.filter(item => item.category === category).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    setText('expenseMonthTotal', money(monthExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)));
    setText('expenseAdvertisingTotal', money(totalFor('advertising')));
    setText('expenseSubscriptionTotal', money(totalFor('subscriptions')));
    setText('expenseReceiptCount', String(monthExpenses.filter(item => item.has_receipt || item.receipt_image_base64).length));
    const container = document.getElementById('expenseList');
    if (!container) return;
    if (!expenses.length) {
      renderEmpty(container, 'No expenses recorded yet', 'Add gas, subscriptions, advertising, or supplies as they happen. Receipt photos can be attached from your phone.');
      return;
    }
    container.innerHTML = expenses.slice(0, 80).map(item => {
      const receipt = item.receipt_image_base64 && item.receipt_image_type ? `<img class="expense-receipt-thumb" src="data:${escapeHtml(item.receipt_image_type)};base64,${escapeHtml(item.receipt_image_base64)}" alt="Receipt for ${escapeHtml(item.vendor)}">` : '<span class="row-icon">$</span>';
      return `<article class="expense-row" data-searchable>${receipt}<span class="row-copy"><strong>${escapeHtml(item.vendor)}</strong><span>${escapeHtml(expenseCategories[item.category] || item.category || 'Expense')} · ${formatDateOnly(item.expense_date)}${item.payment_method ? ` · ${escapeHtml(item.payment_method)}` : ''}${item.description ? ` · ${escapeHtml(item.description)}` : ''}</span></span><strong class="expense-amount">${money(item.amount)}</strong></article>`;
    }).join('');
  }
  function readReceipt(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('Use a JPG, PNG, or WebP receipt image.'));
      if (file.size > 3_000_000) return reject(new Error('Receipt image must be under 3 MB.'));
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ receiptImageBase64: base64, receiptImageType: file.type, dataUrl, name: file.name });
      };
      reader.onerror = () => reject(new Error('Could not read the receipt image.'));
      reader.readAsDataURL(file);
    });
  }
  setExpenseDefaults();
  document.getElementById('expenseReceipt')?.addEventListener('change', async event => {
    const preview = document.getElementById('expenseReceiptPreview');
    try {
      selectedExpenseReceipt = await readReceipt(event.target.files?.[0]);
      if (preview && selectedExpenseReceipt) {
        preview.innerHTML = `<img src="${selectedExpenseReceipt.dataUrl}" alt="Selected receipt"><span><strong>Receipt attached</strong><br>${escapeHtml(selectedExpenseReceipt.name || 'Receipt image')}</span>`;
        preview.hidden = false;
      } else if (preview) {
        preview.hidden = true;
        preview.innerHTML = '';
      }
    } catch (error) {
      selectedExpenseReceipt = null;
      if (preview) preview.hidden = true;
      event.target.value = '';
      notify(error.message || 'Could not attach receipt.');
    }
  });
  document.getElementById('expenseForm')?.addEventListener('submit', async event => {
    event.preventDefault(); if (savingTime) return;
    const form = event.currentTarget, data = new FormData(form), button = form.querySelector('button[type="submit"]');
    const payload = {
      expenseDate: String(data.get('expenseDate') || '').trim(),
      vendor: String(data.get('vendor') || '').trim(),
      category: String(data.get('category') || 'other'),
      amount: String(data.get('amount') || '').trim(),
      paymentMethod: String(data.get('paymentMethod') || '').trim(),
      description: String(data.get('description') || '').trim(),
      ...(selectedExpenseReceipt ? { receiptImageBase64: selectedExpenseReceipt.receiptImageBase64, receiptImageType: selectedExpenseReceipt.receiptImageType } : {})
    };
    savingTime = true; button.disabled = true; button.textContent = 'Saving expense…';
    try {
      const result = await api('/expenses/employer', { method: 'POST', body: JSON.stringify(payload) });
      employerExpenses = [result.expense, ...employerExpenses];
      renderExpenses({ expenses: employerExpenses });
      form.reset(); selectedExpenseReceipt = null; setExpenseDefaults();
      const preview = document.getElementById('expenseReceiptPreview'); if (preview) { preview.hidden = true; preview.innerHTML = ''; }
      notify('Company expense saved.');
    } catch (error) { notify(error.message || 'Could not save this expense.'); }
    finally { savingTime = false; button.disabled = false; button.textContent = 'Save expense'; }
  });

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

  const timesheetApprovalDialog = document.getElementById('timesheetApprovalDialog');
  document.addEventListener('click', event => {
    const approve = event.target.closest('[data-approve-manual-timesheet]');
    if (approve && timesheetApprovalDialog) {
      const form = document.getElementById('timesheetApprovalForm');
      form.elements.entryId.value = approve.dataset.approveManualTimesheet;
      document.getElementById('timesheetApprovalSummary').textContent = `Approve ${approve.dataset.approveStaff}’s missed clock-in hours (${approve.dataset.approveDate})? This records approval and does not send payment.`;
      const date = document.getElementById('timesheetApprovalDate');
      const now = new Date();
      date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      timesheetApprovalDialog.showModal();
    }
    if (event.target.closest('#timesheetApprovalClose, #timesheetApprovalCancel')) timesheetApprovalDialog?.close();
    if (event.target === timesheetApprovalDialog) timesheetApprovalDialog.close();
  });
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!form.matches('[data-manual-approval]')) return;
    event.preventDefault();
    if (savingTime) return;
    const data = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    savingTime = true;
    button.disabled = true;
    try {
      await api(`/manual-timesheets/employer/${encodeURIComponent(String(data.get('entryId')) )}/review`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', approvedByName: String(data.get('approvedByName') || '').trim(), approvalDate: String(data.get('approvalDate') || ''), note: '' }) });
      timesheetApprovalDialog.close();
      notify('Timesheet approved and reviewer details recorded.');
      await loadEmployer();
    } catch (error) { notify(error.message || 'Could not approve this timesheet.'); }
    finally { savingTime = false; button.disabled = false; }
  });

  let savingTime = false;
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!form.matches('[data-review-sheet], [data-resubmit-sheet]')) return;
    event.preventDefault();
    if (savingTime) return;
    const review = form.dataset.reviewSheet;
    const manualReview = form.dataset.manualReviewSheet;
    const data = new FormData(form);
    const status = event.submitter?.value;
    if (review && !['approved', 'correction_requested'].includes(status)) return;
    if (status === 'correction_requested' && !String(data.get('note') || '').trim()) { notify('Explain what needs clarification.'); return; }
    if (status === 'approved' && !window.confirm('Approve these recorded hours? This does not send payment.')) return;
    savingTime = true;
    form.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      await api(manualReview ? `/manual-timesheets/employer/${manualReview}/review` : review ? `/bookings/employer/timesheets/${review}` : `/bookings/caregiver/timesheets/${form.dataset.resubmitSheet}/resubmit`, { method: review || manualReview ? 'PATCH' : 'POST', body: JSON.stringify(review || manualReview ? { status, note: String(data.get('note') || '') } : { notes: String(data.get('notes') || '') }) });
      notify('Timesheet update saved.');
      await (review || manualReview ? loadEmployer() : loadCaregiver());
    } catch (error) { notify(error.message); }
    finally { savingTime = false; form.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  });
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!form.matches('[data-manual-entry]') || savingTime) return;
    event.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    savingTime = true;
    if (button) button.disabled = true;
    try {
      const result = await api('/manual-timesheets/employer', {
        method: 'POST',
        body: JSON.stringify({
          staffName: String(data.get('staffName') || ''),
          startDate: String(data.get('startDate') || ''),
          endDate: String(data.get('endDate') || ''),
          startTime: String(data.get('startTime') || ''),
          endTime: String(data.get('endTime') || ''),
          hourlyRate: Number(data.get('hourlyRate')),
          unpaidBreakMinutes: Number(data.get('unpaidBreakMinutes') || 0),
          includeWeekends: data.get('includeWeekends') === 'on',
          reason: String(data.get('reason') || ''),
        }),
      });
      notify(`Saved ${result.count} missed-clock-in ${result.count === 1 ? 'entry' : 'entries'} for review (${Number(result.worked_hours).toFixed(2)} hrs, ${money(result.total_amount)}).`);
      form.reset();
      const today = todayInputValue();
      form.elements.startDate.value = today;
      form.elements.endDate.value = today;
      await loadEmployer();
    } catch (error) { notify(error.message); }
    finally { savingTime = false; if (button) button.disabled = false; }
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

  function setOrganizationLogo(logo) {
    document.querySelectorAll('[data-org-logo]').forEach((image) => {
      image.src = logo || '/logo.png';
      image.alt = logo ? (session.user.companyName || 'Organization') : 'Elite Bridge';
    });
  }

  async function loadOrganizationTeam() {
    const list = document.getElementById('organizationTeamList');
    if (!list) return;
    try {
      const data = await api('/employers/team');
      const canManage = ['owner', 'admin'].includes(data.yourRole);
      const form = document.getElementById('teamInviteForm');
      if (form) form.hidden = !canManage;
      const adminOption = document.querySelector('[data-owner-only]');
      if (adminOption) adminOption.hidden = data.yourRole !== 'owner';
      list.replaceChildren();

      const heading = document.createElement('h3');
      heading.textContent = `Members · your role: ${data.yourRole}`;
      list.append(heading);
      for (const member of data.members || []) {
        const row = document.createElement('div');
        row.className = 'organization-team-row';
        const details = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email;
        const email = document.createElement('span');
        email.textContent = member.email;
        details.append(name, email);
        row.append(details);
        if (canManage && member.role !== 'owner') {
          const canEdit = data.yourRole === 'owner' || member.role !== 'admin';
          if (canEdit) {
            const select = document.createElement('select');
            select.setAttribute('aria-label', `Role for ${member.email}`);
            for (const [value, label] of [['admin', 'Admin'], ['scheduler', 'Scheduler'], ['billing', 'Billing'], ['viewer', 'Viewer']]) {
              if (value === 'admin' && data.yourRole !== 'owner') continue;
              const option = document.createElement('option');
              option.value = value; option.textContent = label; option.selected = member.role === value;
              select.append(option);
            }
            select.addEventListener('change', async () => {
              try {
                await api(`/employers/team/${member.id}`, { method: 'PATCH', body: JSON.stringify({ role: select.value }) });
                await loadOrganizationTeam();
              } catch (error) { notify(error.message || 'Could not update this role.'); await loadOrganizationTeam(); }
            });
            row.append(select);
          } else {
            const roleLabel = document.createElement('span'); roleLabel.textContent = member.role; row.append(roleLabel);
          }
          const remove = document.createElement('button');
          remove.type = 'button'; remove.className = 'secondary-button'; remove.textContent = 'Remove access';
          remove.addEventListener('click', async () => {
            if (!window.confirm(`Remove ${member.email} from this organization?`)) return;
            try { await api(`/employers/team/${member.id}`, { method: 'DELETE' }); await loadOrganizationTeam(); }
            catch (error) { notify(error.message || 'Could not remove organization access.'); }
          });
          row.append(remove);
        } else {
          const roleLabel = document.createElement('span'); roleLabel.textContent = member.role; row.append(roleLabel);
        }
        list.append(row);
      }
      if (canManage && data.invitations?.length) {
        const pendingHeading = document.createElement('h3'); pendingHeading.textContent = 'Pending invitations'; list.append(pendingHeading);
        for (const invitation of data.invitations) {
          const row = document.createElement('div'); row.className = 'organization-team-row';
          const text = document.createElement('span'); text.textContent = `${invitation.email} · ${invitation.role} · expires ${new Date(invitation.expires_at).toLocaleDateString()}`;
          const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'secondary-button'; cancel.textContent = 'Cancel';
          cancel.addEventListener('click', async () => {
            try { await api(`/employers/team/invitations/${invitation.id}`, { method: 'DELETE' }); await loadOrganizationTeam(); }
            catch (error) { notify(error.message || 'Could not cancel this invitation.'); }
          });
          row.append(text, cancel); list.append(row);
        }
      }
    } catch (error) {
      list.textContent = error.message || 'Organization access information could not be loaded.';
    }
  }

  async function loadEmployer() {
    const [shiftResult, activityResult, payrollResult, caregiverResult, conversationResult, profileResult, invitationResult, timesheetResult, manualTimesheetResult, applicationsResult, contractorPayrollResult, payrollAuditResult, clientInvoiceResult, receiptResult, expenseResult, clientResult] = await Promise.allSettled([
      api('/bookings/employer/my'), api('/bookings/activities'), api('/payroll/employer/overview'), api('/bookings/employer/team'), api('/messages/conversations'), api('/employers/me'), api('/employers/invitations'), api('/bookings/employer/timesheets'), api('/manual-timesheets/employer'), api('/bookings/employer/applications'), api(`/payroll/1099/overview?year=${new Date().getFullYear()}`), api('/payroll/1099/audit'), api('/client-invoices/employer'), api('/client-invoices/employer/receipts'), api('/expenses/employer'), api('/clients/employer')
    ]);
    const shifts = shiftResult.status === 'fulfilled' ? shiftResult.value.shifts || [] : [];
    employerShifts = shifts;
    const activities = activityResult.status === 'fulfilled' ? activityResult.value.activities || [] : [];
    const payroll = payrollResult.status === 'fulfilled' ? payrollResult.value : { stats: {}, recentPayments: [] };
    const caregivers = caregiverResult.status === 'fulfilled' ? (caregiverResult.value.team || []).map((person) => ({
      ...person, userId: person.user_id, firstName: person.first_name, lastName: person.last_name,
      hourlyRate: person.hourly_rate, backgroundCheckStatus: person.background_check_status,
      backgroundCheckDate: person.background_check_date,
    })) : [];
    const conversations = conversationResult.status === 'fulfilled' ? conversationResult.value.conversations || [] : [];
    const profile = profileResult.status === 'fulfilled' ? (profileResult.value.profile || profileResult.value) : null;
    const canManageOrganization = ['owner', 'admin'].includes(profile?.organizationRole);
    document.querySelectorAll('[data-org-role]').forEach((element) => {
      element.textContent = profile?.organizationRole ? profile.organizationRole[0].toUpperCase() + profile.organizationRole.slice(1) : 'Organization member';
    });
    const logoControl = document.querySelector('label[for="organizationLogoUpload"]');
    const profileSetupLink = document.querySelector('[data-view-panel="settings"] a[href="/onboarding"]');
    if (logoControl) logoControl.hidden = !canManageOrganization;
    if (profileSetupLink) profileSetupLink.hidden = !canManageOrganization;
    await loadOrganizationTeam();
    const invitations = invitationResult.status === 'fulfilled' ? invitationResult.value.invitations || [] : [];
    employerInvoices = clientInvoiceResult.status === 'fulfilled' ? clientInvoiceResult.value.invoices || [] : [];
    renderClientInvoices();
    employerReceipts = receiptResult.status === 'fulfilled' ? receiptResult.value.receipts || [] : [];
    renderClientReceipts(receiptResult.status !== 'fulfilled');
    if (expenseResult.status === 'fulfilled') renderExpenses(expenseResult.value);
    else renderExpenses({ expenses: [] });
    employerClients = clientResult.status === 'fulfilled' ? clientResult.value.clients || [] : savedClientRecords();
    if (clientResult.status === 'fulfilled') localStorage.setItem('eliteBridgeClientRecords', JSON.stringify(employerClients));
    renderClientRecords(employerClients);
    if (profile?.companyName) {
      session.user.companyName = profile.companyName;
      session.storage.setItem('user', JSON.stringify(session.user));
      document.querySelectorAll('[data-company-name]').forEach((element) => { element.textContent = profile.companyName; });
    }
    setOrganizationLogo(profile?.companyLogo || '');
    const logoPreview = document.getElementById('organizationLogoPreview');
    if (logoPreview && profile?.companyLogo) { logoPreview.src = profile.companyLogo; logoPreview.hidden = false; }
    const timesheets = [
      ...(timesheetResult.status === 'fulfilled' ? timesheetResult.value.timesheets || [] : []),
      ...(manualTimesheetResult.status === 'fulfilled' ? manualTimesheetResult.value.manualTimesheets || [] : []),
    ];
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
    if (timesheetResult.status === 'fulfilled' && manualTimesheetResult.status === 'fulfilled') {
      renderTimesheets(document.getElementById('timesheetList'), timesheets, true);
      void loadTimesheetEmailHistory();
    }
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

