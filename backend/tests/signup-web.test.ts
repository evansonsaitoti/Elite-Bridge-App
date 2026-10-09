import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const windows: JSDOM[] = [];

afterEach(() => windows.splice(0).forEach((dom) => dom.window.close()));

function loadSignup() {
  const html = readFileSync("../signup.html", "utf8");
  const dom = new JSDOM(html, { url: "https://local.example/signup?role=caregiver", runScripts: "outside-only" });
  windows.push(dom);
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] || "";
  dom.window.eval(script);
  return { w: dom.window, d: dom.window.document };
}

it("shows the join-team gate and does not submit caregiver registration without an invite", async () => {
  const { w, d } = loadSignup();
  const fetch = vi.fn();
  w.fetch = fetch as any;

  expect(d.getElementById("inviteRequired")?.classList.contains("active")).toBe(true);
  expect((d.getElementById("signupForm") as HTMLFormElement).style.display).toBe("none");

  await (w as any).handleSignup(new w.Event("submit", { bubbles: true, cancelable: true }));
  expect(fetch).not.toHaveBeenCalled();
});
