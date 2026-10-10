(() => {
  const API = 'https://elite-bridge-shared-api-evans.vercel.app/api/mcp';
  const descriptions = {
    'shifts:read': 'View shifts and coverage',
    'shifts:write': 'Create, assign, or cancel shifts',
    'caregivers:read': 'View caregivers connected to your organization',
    'caregivers:write': 'Create caregiver invitations',
    'invoices:read': 'View official client invoices and totals',
    'invoices:write': 'Create draft client invoices for review',
    'timesheets:read': 'View manual timesheets',
    'timesheets:write': 'Create missed-clock-in timesheets'
  };
  const request = new URLSearchParams(location.search).get('request');
  const list = document.getElementById('scopeList');
  const intro = document.getElementById('intro');
  const actions = document.getElementById('actions');
  const signIn = document.getElementById('signIn');
  const message = document.getElementById('message');
  const stores = [localStorage, sessionStorage];
  const getToken = () => {
    for (const store of stores) {
      const token = store.getItem('token');
      if (token) return token;
    }
    return null;
  };
  const fail = (text) => {
    actions.classList.add('hidden');
    signIn.classList.add('hidden');
    message.className = 'message error';
    message.textContent = text;
  };
  if (!request) {
    fail('This authorization request is missing. Start again from your MCP client.');
    return;
  }
  fetch(API + '/oauth/request-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorizationRequest: request })
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || 'Could not verify the authorization request.');
    intro.textContent = `${data.clientName} is requesting access to your Elite Bridge employer workspace. Review each permission before continuing.`;
    (data.scopes || []).forEach((scope) => {
      const item = document.createElement('li');
      item.textContent = descriptions[scope] || scope;
      list.appendChild(item);
    });
    if (getToken()) actions.classList.remove('hidden');
    else signIn.classList.remove('hidden');
  }).catch((error) => fail(error.message || 'Could not verify the authorization request.'));

  async function finish(path, includeSession) {
    const token = getToken();
    if (includeSession && !token) {
      signIn.classList.remove('hidden');
      return;
    }
    message.className = 'message';
    message.textContent = 'Completing secure connection…';
    try {
      const response = await fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationRequest: request, ...(includeSession ? { appToken: token } : {}) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || 'Could not complete the connection.');
      location.assign(data.redirectUrl);
    } catch (error) {
      message.className = 'message error';
      message.textContent = error.message || 'Could not complete the connection.';
    }
  }
  document.getElementById('approve').addEventListener('click', () => finish('/oauth/approve', true));
  document.getElementById('deny').addEventListener('click', () => finish('/oauth/deny', false));
})();
