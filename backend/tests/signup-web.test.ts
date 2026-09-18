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

it("normalizes phone numbers and shows backend registration errors", async () => {
  const { w, d } = loadSignup();
  const calls: Array<{ body: Record<string, unknown> }> = [];
  w.fetch = vi.fn(async (_url: string, init: RequestInit = {}) => {
    calls.push({ body: JSON.parse(String(init.body)) });
    return {
      ok: false,
      status: 409,
      json: async () => ({ error: "User with this email already exists" }),
    };
  }) as any;

  (d.getElementById("firstName") as HTMLInputElement).value = " Evanson ";
  (d.getElementById("lastName") as HTMLInputElement).value = " Saitoti ";
  (d.getElementById("email") as HTMLInputElement).value = " EVANSONSAITOTI@GMAIL.COM ";
  (d.getElementById("phone") as HTMLInputElement).value = "9789679928";
  (d.getElementById("password") as HTMLInputElement).value = "password123";
  (d.getElementById("confirmPassword") as HTMLInputElement).value = "password123";
  await (w as any).handleSignup(new w.Event("submit", { bubbles: true, cancelable: true }));

  await vi.waitFor(() => expect(d.getElementById("errorMessage")?.textContent).toBe("User with this email already exists"));
  expect(calls[0].body).toMatchObject({
    email: "evansonsaitoti@gmail.com",
    phone: "+19789679928",
  });
});
