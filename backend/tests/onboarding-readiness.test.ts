import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const windows: JSDOM[] = [];

afterEach(() => windows.splice(0).forEach((dom) => dom.window.close()));

it("calculates employer setup from saved profile, invitations, and shifts", async () => {
  const dom = new JSDOM(readFileSync("../employer-dashboard.html", "utf8"), {
    url: "https://local.example/employer-dashboard",
    runScripts: "outside-only",
  });
  windows.push(dom);
  const w = dom.window as any;
  w.scrollTo = vi.fn();
  w.sessionStorage.setItem("user", JSON.stringify({ id: 7, role: "employer", firstName: "E", lastName: "S" }));
  w.sessionStorage.setItem("token", "test-token");
  w.fetch = vi.fn(async (url: string) => {
    const path = url.split("/api")[1];
    const body = path === "/bookings/employer/my"
      ? { shifts: [] }
      : path === "/bookings/activities"
        ? { activities: [], activeCount: 0 }
        : path === "/payroll/employer/overview"
          ? { stats: {}, recentPayments: [] }
          : path === "/bookings/employer/team"
            ? { team: [] }
            : path === "/messages/conversations"
              ? { conversations: [] }
              : path === "/employers/7"
                ? { companyName: "Sunrise Home", serviceArea: ["Companionship"], billingAddress: { address: "1 Main St", city: "Lowell", state: "MA", zipCode: "01852" } }
                : path === "/employers/invitations"
                  ? { invitations: [{ id: 1, status: "pending", expiresAt: "2026-09-25", createdAt: "2026-09-18" }] }
                  : path === "/bookings/employer/timesheets"
                    ? { timesheets: [] }
                    : path === "/bookings/employer/applications"
                      ? { applications: [] }
                      : {};
    return { ok: true, status: 200, json: async () => body };
  });

  w.eval(readFileSync("../dashboard.js", "utf8"));
  await vi.waitFor(() => expect(w.document.getElementById("employerSetupPercent")?.textContent).toBe("80%"));
  expect(w.document.querySelectorAll("#employerSetupList .done")).toHaveLength(4);
  expect(w.document.getElementById("employerSetupAction")?.textContent).toBe("Publish your first shift");
});

it("saves employer location and scheduling contact during onboarding", async () => {
  const dom = new JSDOM(readFileSync("../onboarding.html", "utf8"), {
    url: "https://local.example/onboarding",
    runScripts: "outside-only",
  });
  windows.push(dom);
  const w = dom.window as any;
  w.scrollTo = vi.fn();
  w.sessionStorage.setItem("user", JSON.stringify({ id: 7, role: "employer", companyName: "Sunrise Home" }));
  w.sessionStorage.setItem("token", "test-token");
  const calls: Array<{ url: string; init: RequestInit }> = [];
  w.fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ profile: {} }) };
  });
  w.eval(readFileSync("../onboarding.js", "utf8"));
  await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));

  (w.document.getElementById("service-companion") as HTMLInputElement).checked = true;
  (w.document.getElementById("facilityAddress") as HTMLInputElement).value = "1 Main St";
  (w.document.getElementById("facilityCity") as HTMLInputElement).value = "Lowell";
  (w.document.getElementById("facilityState") as HTMLInputElement).value = "ma";
  (w.document.getElementById("zipCode") as HTMLInputElement).value = "01852";
  (w.document.getElementById("organizationPhone") as HTMLInputElement).value = "9785550123";
  const next = w.document.getElementById("nextButton") as HTMLButtonElement;
  next.click(); next.click(); next.click(); next.click();

  await vi.waitFor(() => expect(calls.some((call) => call.init.method === "PUT")).toBe(true));
  const saved = calls.find((call) => call.init.method === "PUT")!;
  expect(saved.url).toContain("/employers/me");
  expect(JSON.parse(String(saved.init.body))).toMatchObject({
    address: "1 Main St",
    city: "Lowell",
    state: "MA",
    zipCode: "01852",
    phone: "+19785550123",
    servicesOffered: ["Companionship"],
  });
});
