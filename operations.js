(function () {
  "use strict";
  const storage = localStorage.getItem("user") ? localStorage : sessionStorage;
  let user;
  try {
    user = JSON.parse(storage.getItem("user") || "null");
  } catch (_) {
    /* Redirect below */
  }
  const token = storage.getItem("token");
  if (!user || !token) {
    location.replace("/");
    return;
  }
  const employer = user.role === "employer";
  const base = "https://elite-bridge-shared-api-evans.vercel.app/api";
  const feedback = document.getElementById("feedback");
  const say = (text) => {
    feedback.textContent = text;
  };
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  document.getElementById("back").href = employer
    ? "/employer-dashboard"
    : "/caregiver-dashboard";
  document.querySelectorAll("[data-employer]").forEach((e) => {
    e.hidden = !employer;
  });
  async function api(path, method = "GET", body, raw = false) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401) {
      location.replace("/");
      throw new Error("Sign in again.");
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message || data.error || "Request failed. Please try again.",
      );
    }
    return raw
      ? response.blob()
      : response.status === 204
        ? {}
        : response.json();
  }
  function bindForm(id, action) {
    const form = document.getElementById(id);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector(
        'button[type="submit"],button:not([type])',
      );
      button.disabled = true;
      try {
        await action(Object.fromEntries(new FormData(form)), form);
      } catch (e) {
        say(e.message);
      } finally {
        button.disabled = false;
      }
    });
  }
  async function loadIncidents() {
    const { incidents } = await api("/operations/incidents");
    document.getElementById("incidents").innerHTML = incidents.length
      ? incidents
          .map(
            (i) =>
              `<article><h3>#${i.id} · ${escape(i.shift_title)}</h3><p>${escape(i.category)} · ${escape(i.severity)} · ${escape(i.status)} · ${escape(new Date(i.occurred_at).toLocaleString())}</p><pre>${escape(i.description)}</pre>${i.updates.map((u) => `<p>${escape(new Date(u.created_at).toLocaleString())} · ${escape(u.status)}</p><pre>${escape(u.note)}</pre>`).join("")}${employer ? `<form data-review="${i.id}"><label>Review status<select name="status"><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="open">Reopen</option></select></label><label>Review note<textarea name="note" minlength="5" maxlength="4000" required></textarea></label><button class="secondary-button">Save review</button></form>` : ""}</article>`,
          )
          .join("")
      : "<p>No incident reports.</p>";
  }
  async function loadShifts() {
    const { shifts } = await api("/operations/shifts");
    document.querySelectorAll(".shift-options").forEach((select) => {
      const previous = select.value;
      select.innerHTML =
        '<option value="">Choose a shift</option>' +
        shifts
          .map(
            (s) =>
              `<option value="${s.id}">#${s.id} · ${escape(s.title)} · ${escape(String(s.start_time).slice(0, 10))}</option>`,
          )
          .join("");
      select.value = previous;
    });
    document.getElementById("fences").innerHTML = shifts
      .filter((s) => s.radius_meters)
      .map(
        (s) =>
          `<p>#${s.id} ${escape(s.title)}: ${escape(s.latitude)}, ${escape(s.longitude)} · ${s.radius_meters} meters</p>`,
      )
      .join("");
  }
  async function loadSms() {
    const data = await api("/sms/preferences");
    document.getElementById("smsStatus").textContent = !data.configured
      ? "SMS provider activation is pending. Email and in-app alerts remain available."
      : data.preference?.opted_in
        ? `Alerts enabled for ${data.preference.phone}`
        : "SMS alerts are off. Verify your number to opt in.";
    document
      .querySelectorAll("#phoneForm button,#codeForm button")
      .forEach((b) => {
        b.disabled = !data.configured;
      });
    document.getElementById("smsHistory").innerHTML = data.deliveries
      .map(
        (d) =>
          `<p>${escape(new Date(d.created_at).toLocaleString())} · ${escape(d.status)}</p>`,
      )
      .join("");
  }
  bindForm("incidentForm", async (data, form) => {
    const result = await api("/operations/incidents", "POST", {
      ...data,
      shiftId: Number(data.shiftId),
      occurredAt: new Date(data.occurredAt).toISOString(),
    });
    form.elements.description.value = "";
    await loadIncidents();
    say(
      `Report #${result.incident.id} saved.${result.employerEmailSent ? " Employer email submitted." : " Employer email could not be confirmed; contact your supervisor directly."}`,
    );
  });
  document
    .getElementById("incidents")
    .addEventListener("submit", async (event) => {
      const form = event.target.closest("[data-review]");
      if (!form) return;
      event.preventDefault();
      form.querySelector("button").disabled = true;
      try {
        await api(
          `/operations/incidents/${form.dataset.review}`,
          "PATCH",
          Object.fromEntries(new FormData(form)),
        );
        await loadIncidents();
        say("Review saved.");
      } catch (e) {
        say(e.message);
        form.querySelector("button").disabled = false;
      }
    });
  bindForm("fenceForm", async (data) => {
    await api(`/operations/shifts/${data.shiftId}/geofence`, "PUT", {
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusMeters: Number(data.radiusMeters),
    });
    await loadShifts();
    say("Clock-in area saved.");
  });
  document.getElementById("useLocation").onclick = () => {
    if (!navigator.geolocation) {
      say("Location is unavailable. Enter facility coordinates.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const form = document.getElementById("fenceForm");
        form.elements.latitude.value = p.coords.latitude;
        form.elements.longitude.value = p.coords.longitude;
        say("Coordinates filled. Confirm this is the facility before saving.");
      },
      () => say("Location permission unavailable. Enter facility coordinates."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };
  bindForm("exportForm", async (data) => {
    const blob = await api(
      "/payroll/export?" + new URLSearchParams(data),
      "GET",
      undefined,
      true,
    );
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `elite-payroll-${data.from}-${data.to}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("Approved hours exported. Review the file before processing payroll.");
  });
  bindForm("phoneForm", async (data) => {
    const result = await api("/sms/verify/start", "POST", data);
    say(result.message);
  });
  bindForm("codeForm", async (data) => {
    await api("/sms/verify/complete", "POST", {
      code: data.code,
      consent: data.consent === "on",
    });
    await loadSms();
    say("SMS alerts enabled.");
  });
  document.getElementById("disableSms").onclick = async () => {
    try {
      await api("/sms/preferences", "DELETE");
      await loadSms();
      say("SMS alerts turned off.");
    } catch (e) {
      say(e.message);
    }
  };
  async function refresh() {
    const results = await Promise.allSettled([
      loadShifts(),
      loadIncidents(),
      loadSms(),
      ...(employer
        ? [
            api("/payroll/integrations").then((d) => {
              document.getElementById("integrations").innerHTML = d.integrations
                .map(
                  (i) =>
                    `<article><h3>${escape(i.name)}</h3><p>${escape(i.message)}</p></article>`,
                )
                .join("");
            }),
          ]
        : []),
    ]);
    const failed = results.filter((r) => r.status === "rejected");
    say(
      failed.length
        ? failed.map((r) => r.reason.message).join(" ")
        : "Shared records are up to date.",
    );
  }
  document.getElementById("refresh").onclick = refresh;
  void refresh();
})();
