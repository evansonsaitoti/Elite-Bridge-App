(function () {
  "use strict";
  const host = document.getElementById("managementSchedule");
  if (!host) return;
  const zone = "America/New_York";
  const esc = (value) =>
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
  const day = (value) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const add = (date, count) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + count);
    return d.toISOString().slice(0, 10);
  };
  const monday = (date) =>
    add(date, -(new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7);
  const time = (value) =>
    new Date(value).toLocaleTimeString("en-US", {
      timeZone: zone,
      hour: "numeric",
      minute: "2-digit",
    });
  const label = (date) =>
    new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    });
  let week = monday(day(new Date())),
    group = "staff",
    filter = "all",
    query = "",
    snapshot;
  const remaining = (s) =>
    Math.max(
      0,
      Number(
        s.remainingPositions ??
          Number(s.numberOfCaregivers || 1) - Number(s.assignedCaregivers || 0),
      ),
    );
  const hours = (s) =>
    Math.max(0, (new Date(s.endTime) - new Date(s.startTime)) / 3600000);
  function render() {
    if (!snapshot) return;
    if (!snapshot.available) {
      host.innerHTML =
        '<p role="alert">Schedule unavailable. Use Refresh to try again.</p>';
      renderApprovals();
      return;
    }
    const allWeek = snapshot.shifts.filter(
      (s) => day(s.startTime) >= week && day(s.startTime) < add(week, 7),
    );
    const current = allWeek.filter((s) => s.status !== "cancelled");
    const visible = allWeek.filter(
      (s) =>
        (filter === "all" ||
          (filter === "unfilled"
            ? remaining(s) > 0 && !["cancelled", "completed"].includes(s.status)
            : s.status === filter)) &&
        [
          s.title,
          s.careRecipientName,
          s.location?.city,
          ...(snapshot.applications || [])
            .filter(
              (a) =>
                String(a.shift_id) === String(s.id) && a.status === "approved",
            )
            .map((a) => `${a.first_name} ${a.last_name}`),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
    const approved = (snapshot.applications || []).filter(
      (a) => a.status === "approved",
    );
    const rows = new Map();
    if (group === "staff")
      rows.set("unassigned", { name: "Unassigned positions", shifts: [] });
    visible.forEach((s) => {
      const people = approved.filter(
        (a) => String(a.shift_id) === String(s.id),
      );
      const keys =
        group === "client"
          ? [
              {
                id:
                  "client:" +
                  JSON.stringify([
                    s.careRecipientName,
                    s.location?.address,
                    s.location?.city,
                  ]),
                name: [s.careRecipientName || s.title, s.location?.city]
                  .filter(Boolean)
                  .join(" · "),
              },
            ]
          : people.map((a) => ({
              id: "staff:" + a.caregiver_id,
              name:
                [a.first_name, a.last_name].filter(Boolean).join(" ") ||
                "Caregiver",
            }));
      if (
        group === "staff" &&
        remaining(s) > 0 &&
        !["cancelled", "completed"].includes(s.status)
      )
        keys.push({ id: "unassigned", name: "Unassigned positions" });
      if (!keys.length)
        keys.push({
          id: "other",
          name:
            snapshot.applications === null
              ? "Assignments unavailable"
              : "Other shifts",
        });
      keys.forEach((key) => {
        if (!rows.has(key.id)) rows.set(key.id, { name: key.name, shifts: [] });
        rows.get(key.id).shifts.push(s);
      });
    });
    let overlapCount = 0;
    const conflicts = new Set();
    for (const [key, row] of rows)
      if (key.startsWith("staff:")) {
        const shifts = row.shifts.filter((s) => s.status !== "cancelled");
        for (let i = 0; i < shifts.length; i++)
          for (let j = i + 1; j < shifts.length; j++)
            if (
              new Date(shifts[i].startTime) < new Date(shifts[j].endTime) &&
              new Date(shifts[j].startTime) < new Date(shifts[i].endTime)
            ) {
              conflicts.add(shifts[i].id);
              conflicts.add(shifts[j].id);
              overlapCount++;
            }
      }
    const days = Array.from({ length: 7 }, (_, i) => add(week, i));
    host.innerHTML = `<div class="management-heading"><div><p class="eyebrow">Weekly planning</p><h2>${label(week)} – ${label(add(week, 6))}, ${week.slice(0, 4)}</h2><p>America/New_York · Click a shift to review details. Overnight visits appear on their start day.</p></div><button class="primary-button" data-board-new>Post a shift</button></div>
      <div class="management-metrics"><span><strong>${current.length}</strong> visits</span><span><strong>${current.reduce((n, s) => n + hours(s), 0).toFixed(1)}</strong> visit hours</span><span><strong>${current.filter((s) => s.status !== "completed").reduce((n, s) => n + remaining(s), 0)}</strong> unfilled positions</span><span><strong>${overlapCount}</strong> overlaps in this view</span></div>
      <div class="management-tools"><button class="secondary-button" data-week="-7" aria-label="Previous week">←</button><button class="secondary-button" data-week="today">This week</button><button class="secondary-button" data-week="7" aria-label="Next week">→</button><label>Week of <input type="date" id="managementDate" value="${week}"></label><label>View <select id="managementGroup"><option value="staff" ${group === "staff" ? "selected" : ""}>Staff</option><option value="client" ${group === "client" ? "selected" : ""}>Clients / locations</option></select></label><label>Status <select id="managementFilter">${[
        ["all", "All shifts"],
        ["unfilled", "Unfilled"],
        ["open", "Open"],
        ["assigned", "Assigned"],
        ["in_progress", "In progress"],
        ["completed", "Completed"],
        ["cancelled", "Cancelled"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${filter === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select></label><label>Search <input id="managementSearch" type="search" value="${esc(query)}" placeholder="Client, staff or location"></label></div>
      ${snapshot.applications === null ? '<p role="alert">Staff assignments could not be loaded. Coverage counts come from the shift records.</p>' : ""}
      <div class="management-grid-scroll" tabindex="0" aria-label="Scroll weekly schedule"><table class="management-grid"><thead><tr><th scope="col">${group === "staff" ? "Caregiver" : "Client / location"}</th>${days.map((d) => `<th scope="col" ${d === day(new Date()) ? 'class="is-today"' : ""}>${new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}<br>${label(d)}</th>`).join("")}</tr></thead><tbody>${[
        ...rows,
      ]
        .map(
          ([key, row]) =>
            `<tr><th scope="row">${esc(row.name)}<small>${row.shifts.length} visits${
              key.startsWith("staff:")
                ? " · " +
                  row.shifts
                    .filter((s) => s.status !== "cancelled")
                    .reduce((n, s) => n + hours(s), 0)
                    .toFixed(1) +
                  " hrs"
                : ""
            }</small></th>${days
              .map(
                (d) =>
                  `<td>${row.shifts
                    .filter((s) => day(s.startTime) === d)
                    .sort(
                      (a, b) => new Date(a.startTime) - new Date(b.startTime),
                    )
                    .map(
                      (s) =>
                        `<button class="management-shift ${s.status === "cancelled" ? "is-cancelled" : ""} ${remaining(s) > 0 ? "is-open" : ""}" data-board-shift="${esc(s.id)}"><strong>${esc(time(s.startTime))} – ${esc(time(s.endTime))}${day(s.endTime) !== d ? " (+1 day)" : ""}</strong><span>${esc(s.careRecipientName || s.title)}</span><small>${esc(s.location?.city || "")} · ${esc(s.status)}</small>${conflicts.has(s.id) ? '<small class="management-warning">Overlapping assignment</small>' : ""}${remaining(s) > 0 && !["cancelled", "completed"].includes(s.status) ? `<small>${remaining(s)} unfilled</small>` : ""}</button>`,
                    )
                    .join("")}</td>`,
              )
              .join("")}</tr>`,
        )
        .join(
          "",
        )}</tbody></table></div>${!visible.length ? '<p class="management-empty">No shifts match this week and these filters.</p>' : ""}`;
    renderApprovals();
  }
  function renderApprovals() {
    const box = document.getElementById("managementApprovals");
    if (!box) return;
    const pending = (snapshot.applications || []).filter(
      (a) => a.status === "pending",
    );
    const sheets = (snapshot.timesheets || []).filter(
      (t) =>
        t.status === "pending_approval" || t.status === "correction_requested",
    );
    const canSchedule = ["owner", "admin", "scheduler"].includes(
      snapshot.organizationRole,
    );
    box.innerHTML = `<h2>Shift requests · ${snapshot.applications === null ? "Unavailable" : pending.length}</h2>${snapshot.applications === null ? "<p>Requests could not be loaded. Refresh to retry.</p>" : pending.map((a) => `<article class="management-review"><div><strong>${esc([a.first_name, a.last_name].filter(Boolean).join(" "))}</strong><p>${esc(a.shift_title)} · ${esc(a.city || "")}</p></div>${canSchedule ? `<button class="primary-button" data-application-id="${esc(a.id)}" data-decision="approved">Approve caregiver</button><button class="secondary-button" data-application-id="${esc(a.id)}" data-decision="rejected">Decline</button>` : "<span>Manager review required</span>"}</article>`).join("") || "<p>No pending shift requests.</p>"}<h2>Timesheets needing attention · ${snapshot.timesheets === null ? "Unavailable" : sheets.length}</h2>${snapshot.timesheets === null ? "<p>Timesheets could not be loaded. Refresh to retry.</p>" : sheets.map((t) => `<article class="management-review"><div><strong>${esc([t.first_name, t.last_name].filter(Boolean).join(" ") || t.staff_name || "Caregiver")}</strong><p>${esc(t.shift_title || t.shift_date || "Reported hours")} · ${esc(t.status.replaceAll("_", " "))}</p></div><button class="secondary-button" data-board-timesheets>Review hours</button></article>`).join("") || "<p>No timesheets need review.</p>"}`;
  }
  document.addEventListener("click", (event) => {
    const el = event.target.closest("button");
    if (!el || !snapshot) return;
    if (el.hasAttribute("data-week")) {
      week =
        el.dataset.week === "today"
          ? monday(day(new Date()))
          : add(week, Number(el.dataset.week));
      render();
    }
    if (el.dataset.boardShift)
      snapshot.openShift(
        snapshot.shifts.find((s) => String(s.id) === el.dataset.boardShift),
      );
    if (el.hasAttribute("data-board-new")) {
      document
        .getElementById("shiftForm")
        .scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("shiftTitle").focus();
    }
    if (el.hasAttribute("data-board-timesheets"))
      snapshot.navigate("timesheets");
  });
  host.addEventListener("change", (event) => {
    const el = event.target;
    if (el.id === "managementDate" && /^\d{4}-\d{2}-\d{2}$/.test(el.value))
      week = monday(el.value);
    if (el.id === "managementGroup") group = el.value;
    if (el.id === "managementFilter") filter = el.value;
    if (el.id === "managementSearch") query = el.value.trim().toLowerCase();
    render();
  });
  window.EliteManagementBoard = {
    update(data) {
      snapshot = data;
      render();
    },
  };
})();
