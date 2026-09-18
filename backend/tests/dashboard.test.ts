import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const windows: JSDOM[] = [];
const shift = { id: 71, title: "Overnight coverage", startTime: "2026-09-19T02:00:00Z", endTime: "2026-09-19T10:00:00Z", location: { address: "Test House", city: "Lowell", state: "MA" }, numberOfCaregivers: 2, assignedCaregivers: 1, remainingPositions: 1, hourlyRate: 30, status: "open", assignmentMode: "instant" };
const sheet = { id: 21, shift_id: 71, shift_title: shift.title, first_name: "Test", last_name: "Caregiver", clock_in_at: shift.startTime, clock_out_at: shift.endTime, worked_minutes: 480, total_amount: 240, status: "pending_approval" };

async function dashboard(role: 'caregiver' | 'employer', responses: Record<string, unknown> = {}) {
  const html = readFileSync(`../${role}-dashboard.html`, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: `https://local.example/${role}-dashboard`, runScripts: 'outside-only' });
  windows.push(dom);
  const w = dom.window;
  w.sessionStorage.setItem('user', JSON.stringify({ id: 1, firstName: 'Test', lastName: role, role }));
  w.sessionStorage.setItem('token', 'local-test-only');
  w.scrollTo = vi.fn(); w.confirm = vi.fn(() => true);
  const defaults: Record<string, unknown> = {
    '/bookings/employer/my': { shifts: [shift] }, '/bookings/activities': { activities: [], activeCount: 1 },
    '/bookings/employer/timesheets': { timesheets: [sheet] }, '/bookings/employer/applications': { applications: [] },
    '/bookings/employer/team': { team: [] }, '/payroll/employer/overview': { stats: {} },
    '/employers/invitations': { invitations: [] }, '/messages/conversations': { conversations: [] },
    '/bookings/available': { shifts: [shift] }, '/bookings/caregiver/my-applications': { applications: [{ id: 4, status: 'approved', shift }] },
    '/bookings/caregiver/timekeeping': { activities: [], timesheets: [] }, '/caregivers/1': { profile: {} },
    ...responses,
  };
  const calls: Array<{ path: string; method: string; body: any }> = [];
  w.fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = url.split('/api')[1];
    calls.push({ path, method: init.method || 'GET', body: init.body ? JSON.parse(String(init.body)) : null });
    const data = defaults[path] || {};
    return { ok: !(data instanceof Error), status: data instanceof Error ? 500 : 200, json: async () => data instanceof Error ? { error: data.message } : data };
  }) as any;
  w.eval(readFileSync('../dashboard.js', 'utf8'));
  await vi.waitFor(() => expect(calls.length).toBeGreaterThan(3));
  await new Promise(resolve => setTimeout(resolve, 0));
  return { w, calls, document: w.document };
}
afterEach(() => { for (const dom of windows.splice(0)) dom.window.close(); });

describe('Existing web dashboards', () => {
  it('uses shared attendance counts and saves employer timesheet approvals', async () => {
    const { document, calls } = await dashboard('employer');
    expect(document.getElementById('metricOnDuty')?.textContent).toBe('1');
    expect(document.getElementById('attentionTimesheets')?.textContent).toBe('1');
    expect(document.getElementById('timesheetList')?.textContent).toContain('8.00 hours');
    (document.querySelector('[data-review-sheet] button[value="approved"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(calls.some(c => c.path === '/bookings/employer/timesheets/21' && c.method === 'PATCH' && c.body.status === 'approved')).toBe(true));
  });
  it('submits overnight dates, facility time zone and staffing positions from the existing form', async () => {
    const { w, document, calls } = await dashboard('employer');
    const form = document.getElementById('shiftForm') as HTMLFormElement;
    const values = { title: 'Night coverage', startDate: '2026-09-18', endDate: '2026-09-19', startTime: '22:00', endTime: '06:00', numberOfCaregivers: '3', address: 'Test House', city: 'Lowell', state: 'MA', zipCode: '01852', responsibilities: 'Handover' };
    for (const [name, value] of Object.entries(values)) (form.elements.namedItem(name) as HTMLInputElement).value = value;
    form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(calls.some(c => c.path === '/bookings' && c.method === 'POST')).toBe(true));
    expect(calls.find(c => c.path === '/bookings' && c.method === 'POST')?.body).toMatchObject({ endDate: '2026-09-19', timeZone: 'America/New_York', numberOfCaregivers: 3, assignmentMode: 'review' });
  });
  it('records caregiver time through the shared API without pretending missing GPS is verified', async () => {
    const { document, calls } = await dashboard('caregiver');
    expect(document.getElementById('assignedShiftList')?.textContent).toContain('Overnight coverage');
    (document.querySelector('[data-clock-action="clock-in"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(calls.some(c => c.path === '/bookings/71/clock-in' && c.body.location === null)).toBe(true));
    expect(document.getElementById('toast')?.textContent).toBe('Attendance saved without GPS evidence.');
  });
  it('keeps break-time notes, disables clock-out during a break and resubmits clarification', async () => {
    const { document, calls } = await dashboard('caregiver', {
      '/bookings/caregiver/timekeeping': { activities: [{ id: 1, shift_id: 71, type: 'clock_in', timestamp: shift.startTime }, { id: 2, shift_id: 71, type: 'break_start', timestamp: shift.startTime }], timesheets: [{ ...sheet, id: 22, shift_id: 72, status: 'correction_requested', agency_note: 'Please clarify handover' }] },
    });
    expect((document.querySelector('[data-clock-action="clock-out"]') as HTMLButtonElement).disabled).toBe(true);
    (document.getElementById('clock-note-71') as HTMLTextAreaElement).value = 'Keep this handover note';
    (document.querySelector('[data-clock-action="end"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(calls.some(c => c.path === '/bookings/71/break' && c.body.action === 'end')).toBe(true));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect((document.getElementById('clock-note-71') as HTMLTextAreaElement).value).toBe('Keep this handover note');
    (document.getElementById('response-22') as HTMLTextAreaElement).value = 'Handover completed before leaving';
    (document.querySelector('[data-resubmit-sheet] button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(calls.some(c => c.path === '/bookings/caregiver/timesheets/22/resubmit' && c.body.notes === 'Handover completed before leaving')).toBe(true));
  });
  it('does not show an empty attendance state when the shared API fails', async () => {
    const { document } = await dashboard('caregiver', { '/bookings/caregiver/timekeeping': new Error('Temporary failure') });
    expect(document.getElementById('caregiverClock')?.textContent).toContain('Time records could not be loaded');
    expect(document.querySelector('[data-clock-action]')).toBeNull();
  });
});
