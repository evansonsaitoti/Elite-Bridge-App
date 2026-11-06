import { afterEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
let dom: JSDOM;
afterEach(() => dom?.window.close());
function setup(extra: any = {}) {
  dom = new JSDOM(
    '<div id="managementSchedule"></div><div id="managementApprovals"></div>',
    { runScripts: "outside-only" },
  );
  const w = dom.window;
  w.eval(readFileSync("../management-board.js", "utf8"));
  const openShift = vi.fn(),
    navigate = vi.fn();
  const shifts = [
    {
      id: 1,
      title: "Night visit",
      careRecipientName: "Client <script>",
      startTime: "2026-11-06T02:00:00Z",
      endTime: "2026-11-06T07:00:00Z",
      status: "assigned",
      numberOfCaregivers: 2,
      assignedCaregivers: 1,
      remainingPositions: 1,
      location: { city: "Lowell" },
    },
  ];
  (w as any).EliteManagementBoard.update({
    shifts,
    applications: [
      {
        id: 3,
        shift_id: 1,
        caregiver_id: 8,
        first_name: "Example",
        last_name: "Staff",
        status: "approved",
      },
    ],
    timesheets: [],
    available: true,
    organizationRole: "owner",
    openShift,
    navigate,
    ...extra,
  });
  const date = w.document.getElementById("managementDate") as HTMLInputElement;
  date.value = "2026-11-05";
  date.dispatchEvent(new w.Event("change", { bubbles: true }));
  return { w, document: w.document, openShift, navigate };
}
describe("Management weekly schedule", () => {
  it("places overnight visits on their Eastern start day and opens the existing shift", () => {
    const { document, openShift } = setup();
    const card = document.querySelector(
      '[data-board-shift="1"]',
    ) as HTMLButtonElement;
    expect(card.textContent).toContain("9:00 PM");
    expect(card.textContent).toContain("(+1 day)");
    expect((card.parentElement as HTMLTableCellElement)?.cellIndex).toBe(4);
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(document.body.textContent).toContain("Example Staff");
    card.click();
    expect(openShift).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
  it("groups clients without duplicating visits for partial coverage", () => {
    const { w, document } = setup();
    const group = document.getElementById(
      "managementGroup",
    ) as HTMLSelectElement;
    group.value = "client";
    group.dispatchEvent(new w.Event("change", { bubbles: true }));
    expect(document.querySelectorAll("[data-board-shift]")).toHaveLength(1);
    expect(
      document.querySelector(".management-metrics")?.textContent,
    ).toContain("5.0");
  });
  it("distinguishes unavailable timesheets and limits approval controls by role", () => {
    const { document } = setup({
      organizationRole: "viewer",
      timesheets: null,
      applications: [
        {
          id: 4,
          status: "pending",
          first_name: "Example",
          shift_title: "Visit",
        },
      ],
    });
    expect(
      document.getElementById("managementApprovals")?.textContent,
    ).toContain("Timesheets could not be loaded");
    expect(document.querySelector("[data-decision]")).toBeNull();
  });
  it("offers manager approval through the existing action handler", () => {
    const { document } = setup({
      applications: [
        {
          id: 4,
          status: "pending",
          first_name: "Example",
          shift_title: "Visit",
        },
      ],
    });
    expect(
      document.querySelector(
        '[data-application-id="4"][data-decision="approved"]',
      ),
    ).not.toBeNull();
  });
  it("navigates weeks and displays empty results honestly", () => {
    const { document } = setup();
    (document.querySelector('[data-week="7"]') as HTMLButtonElement).click();
    expect(document.querySelectorAll("[data-board-shift]")).toHaveLength(0);
    expect(document.body.textContent).toContain("No shifts match");
  });
});
