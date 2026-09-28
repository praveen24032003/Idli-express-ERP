import { test, expect } from "@playwright/test";
import { formatCurrency } from "../../src/utils/format";

test("currency formatting preserves half-rupee prices", () => {
  expect(formatCurrency(3.5)).toContain("3.5");
  expect(formatCurrency(3.5)).not.toContain("4.00");
});

test("setup gate or Supabase staff sign-in renders", async ({ page }) => {
  await page.goto("/");
  const setupGate = page.getByRole("heading", { name: "Supabase setup required" });

  if (await setupGate.isVisible().catch(() => false)) {
    await expect(page.getByText("VITE_SUPABASE_URL", { exact: false })).toBeVisible();
    await expect(page.getByText("VITE_SUPABASE_PUBLISHABLE_KEY", { exact: false })).toBeVisible();
    return;
  }

  await expect(page.getByText("Staff sign in", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("protected routes do not render ERP data before staff sign-in", async ({ page }) => {
  await page.goto("/customers");
  const setupGate = page.getByRole("heading", { name: "Supabase setup required" });
  if (await setupGate.isVisible().catch(() => false)) return;

  await expect(page.getByText("Staff sign in", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customers" })).not.toBeVisible();
});

test("frontend no longer calls the removed Express /api routes", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  await page.goto("/");
  expect(apiRequests).toEqual([]);
});

test("PWA manifest is available", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.name).toBe("Idly Express ERP");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});

test("mobile authentication gate fits viewport without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-specific viewport check");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Supabase setup required|Idly Express ERP/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
});
