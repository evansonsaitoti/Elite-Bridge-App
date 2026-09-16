(function () {
  const API_BASE = 'https://elite-bridge-shared-api-evans.vercel.app/api';
  const readSession = () => {
    const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
    try {
      return { storage, user: JSON.parse(storage.getItem('user') || 'null'), token: storage.getItem('token') };
    } catch (_) {
      return { storage, user: null, token: null };
    }
  };

  const session = readSession();
  if (!session.user || !session.token) {
    window.location.replace('/');
    return;
  }

  const role = session.user.role === 'employer' ? 'employer' : 'caregiver';
  const dashboardUrl = role === 'employer' ? '/employer-dashboard' : '/caregiver-dashboard';
  const completionKey = `eliteBridgeOnboarding:${session.user.id}:${role}`;
  let step = 1;

  const form = document.getElementById('onboardingForm');
  const error = document.getElementById('onboardingError');
  const nextButton = document.getElementById('nextButton');
  const backButton = document.getElementById('backButton');
  const skipButton = document.getElementById('skipButton');
  const exitLink = document.getElementById('exitLink');

  document.querySelectorAll('[data-role-fields]').forEach((element) => {
    element.hidden = element.dataset.roleFields !== role;
    element.querySelectorAll('input, select, textarea').forEach((input) => {
      input.disabled = element.hidden;
    });
  });

  if (role === 'employer') {
    document.getElementById('asideTitle').textContent = 'Build your care operations hub.';
    document.getElementById('asideCopy').textContent = 'Set up your organization once, then coordinate shifts, caregivers, timesheets and communication from mobile or web.';
    document.getElementById('stepOneTitle').textContent = 'Tell us about your care operation';
    document.getElementById('stepOneIntro').textContent = 'We will shape your workspace around the way your organization or household coordinates care.';
    document.getElementById('serviceTitle').textContent = 'What care do you coordinate?';
    document.getElementById('detailsTitle').textContent = 'Shape your organization workspace';
    document.getElementById('detailsIntro').textContent = 'These details make scheduling, matching and team management more useful.';
    document.getElementById('reviewTitle').textContent = 'Employer workspace';
    document.getElementById('companyName').value = session.user.companyName || '';
  }

  function selectedServices() {
    return Array.from(form.querySelectorAll('input[name="services"]:checked')).map((input) => input.value);
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    error.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function validateCurrentStep() {
    error.hidden = true;
    const panel = form.querySelector(`[data-step="${step}"]`);
    const invalid = Array.from(panel.querySelectorAll('input, select, textarea')).find((input) => !input.disabled && !input.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    if (step === 2 && selectedServices().length === 0) {
      showError('Choose at least one care service to continue.');
      return false;
    }
    return true;
  }

  function renderStep() {
    form.querySelectorAll('[data-step]').forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.step) === step));
    document.querySelectorAll('[data-dot]').forEach((dot) => {
      const number = Number(dot.dataset.dot);
      dot.classList.toggle('active', number === step);
      dot.classList.toggle('done', number < step);
      dot.textContent = number < step ? '✓' : number;
    });
    document.querySelectorAll('.step-line').forEach((line, index) => line.classList.toggle('done', index + 1 < step));
    backButton.hidden = step === 1;
    skipButton.hidden = step === 4;
    nextButton.textContent = step === 4 ? 'Open my dashboard' : 'Continue';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveProfile() {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` };
    let endpoint;
    let body;
    if (role === 'caregiver') {
      endpoint = `${API_BASE}/caregivers/${session.user.id}`;
      const certificationValue = document.getElementById('certifications').value;
      body = {
        bio: document.getElementById('caregiverBio').value.trim(),
        hourlyRate: Number(document.getElementById('hourlyRate').value || 0),
        yearsExperience: Number(document.getElementById('yearsExperience').value || 0),
        specialties: selectedServices(),
        certifications: certificationValue.split(',').map((item) => item.trim()).filter(Boolean),
        availability: { preference: [document.getElementById('availability').value] }
      };
    } else {
      endpoint = `${API_BASE}/employers/${session.user.id}`;
      body = {
        companyName: document.getElementById('companyName').value.trim(),
        companyDescription: document.getElementById('companyDescription').value.trim(),
        website: document.getElementById('website').value.trim(),
        industry: document.getElementById('organizationType').value,
        teamSize: Number(document.getElementById('teamSize').value || 1),
        zipCode: document.getElementById('zipCode').value.trim(),
        servicesOffered: selectedServices()
      };
    }
    const response = await fetch(endpoint, { method: 'PUT', headers, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'We could not save your setup.');
    if (role === 'employer' && body.companyName) {
      session.user.companyName = body.companyName;
      session.storage.setItem('user', JSON.stringify(session.user));
    }
  }

  function completeLocally() {
    localStorage.setItem(completionKey, new Date().toISOString());
    window.location.assign(dashboardUrl);
  }

  nextButton.addEventListener('click', async () => {
    if (!validateCurrentStep()) return;
    if (step < 4) {
      step += 1;
      renderStep();
      return;
    }
    nextButton.disabled = true;
    nextButton.textContent = 'Saving…';
    try {
      await saveProfile();
      completeLocally();
    } catch (saveError) {
      showError(saveError instanceof TypeError ? 'Elite Bridge could not be reached. Check your connection and try again.' : saveError.message);
      nextButton.disabled = false;
      nextButton.textContent = 'Open my dashboard';
    }
  });

  backButton.addEventListener('click', () => {
    if (step > 1) step -= 1;
    renderStep();
  });

  function skipSetup(event) {
    event.preventDefault();
    completeLocally();
  }
  skipButton.addEventListener('click', skipSetup);
  exitLink.addEventListener('click', skipSetup);
  renderStep();
})();
