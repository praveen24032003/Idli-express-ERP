import { test, expect } from "@playwright/test";
import { formatCurrency, todayISO } from "../../src/utils/format";
import { planPendingTemplateOrderSync } from "../../src/features/templates/template-order-sync";

test("currency formatting preserves half-rupee prices", () => {
  expect(formatCurrency(3.5)).toContain("3.5");
  expect(formatCurrency(3.5)).not.toContain("4.00");
});

test("todayISO uses the local calendar date as a date-only value", () => {
  const now = new Date();
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  expect(todayISO()).toBe(expected);
});

test("editing a template plans product and price updates only for its pending generated orders", async ({ request }, testInfo) => {
  void request;
  test.skip(testInfo.project.name !== "desktop", "Pure template-order synchronization test");
  const plan = planPendingTemplateOrderSync(
    {
      customerId: "customer-1",
      productId: "product-new",
      product: { wholesalePrice: 3.5 },
      days: [{ id: "day-1", templateId: "template-1", dayOfWeek: 1, session: "MORNING", quantity: 180 }],
    },
    [
      { id: "morning-today", deliveryDate: "2026-09-28", session: "MORNING" },
      { id: "evening-today", deliveryDate: "2026-09-28", session: "EVENING" },
      { id: "morning-next-week", deliveryDate: "2026-10-05", session: "MORNING" },
      { id: "historical-order", deliveryDate: "2026-09-27", session: "MORNING" },
    ],
    "2026-09-28",
  );

  expect(plan.updates).toEqual([
    {
      id: "morning-today",
      values: {
        customerId: "customer-1",
        productId: "product-new",
        quantity: 180,
        priceType: "WHOLESALE",
        unitPrice: 3.5,
        remarks: "Auto-generated from recurring template",
      },
    },
    {
      id: "morning-next-week",
      values: {
        customerId: "customer-1",
        productId: "product-new",
        quantity: 180,
        priceType: "WHOLESALE",
        unitPrice: 3.5,
        remarks: "Auto-generated from recurring template",
      },
    },
  ]);
  expect(plan.removals).toEqual(["evening-today"]);
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
