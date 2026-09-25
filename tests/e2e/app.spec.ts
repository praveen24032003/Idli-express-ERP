import { test, expect } from "@playwright/test";

const routes = [
  ["/", "Dashboard"],
  ["/customers", "Customers"],
  ["/products", "Products"],
  ["/orders", "Orders"],
  ["/templates", "Recurring Templates"],
  ["/production", "Production Planning"],
  ["/ledger", "Customer Ledger"],
  ["/reports", "Reports"],
] as const;

test.describe("application navigation", () => {
  for (const [route, heading] of routes) {
    test(`${route} renders ${heading}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test("dashboard shows seeded operational data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Orders Today")).toBeVisible();
  await expect(page.getByText("Revenue Today")).toBeVisible();
  await expect(page.getByText("Revenue Trend (Last 7 Days)")).toBeVisible();
  await expect(page.getByText("Morning Required")).toBeVisible();
  await expect(page.getByText("Evening Required")).toBeVisible();
});

test("customers can be searched and customer form validates required fields", async ({ page }) => {
  await page.goto("/customers");
  await expect(page.getByText("Sri Balaji Bhavan")).toBeVisible();

  await page.getByPlaceholder("Search by name, phone, or code...").fill("Balaji");
  await expect(page.getByText("Sri Balaji Bhavan")).toBeVisible();
  await expect(page.getByText("Hotel Saravana Residency")).not.toBeVisible();

  await page.getByRole("button", { name: /New Customer/ }).click();
  await expect(page.getByRole("heading", { name: "New Customer" })).toBeVisible();
  await page.getByRole("button", { name: "Create Customer" }).click();
  await expect(page.getByText("Name is required")).toBeVisible();
  await expect(page.getByText("Enter a valid phone number")).toBeVisible();
});

test("products show seeded pricing and product form validates", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByText("Idli", { exact: true })).toBeVisible();
  await expect(page.getByText("Chapati", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /New Product/ }).click();
  await page.getByRole("button", { name: "Create Product" }).click();
  await expect(page.getByText("Name is required")).toBeVisible();
});

test("orders filter by date and new order calculates total amount", async ({ page }) => {
  await page.goto("/orders");
  await expect(page.getByRole("table").getByText("Sri Balaji Bhavan")).toBeVisible();
  await page.getByRole("button", { name: /New Order/ }).click();
  await page.getByLabel("Customer *").selectOption({ label: "Sri Balaji Bhavan (CUST001)" });
  await page.getByLabel("Product *").selectOption({ label: "Idli" });
  await page.getByLabel("Quantity *").fill("100");
  await expect(page.getByText("₹400")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("recurring templates expose generation workflow", async ({ page }) => {
  await page.goto("/templates");
  await expect(page.getByText("Sri Balaji Bhavan")).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate Today's Orders/ })).toBeVisible();
  await page.getByRole("button", { name: /New Template/ }).click();
  await expect(page.getByRole("heading", { name: "New Recurring Template" })).toBeVisible();
  await page.getByRole("button", { name: "Create Template" }).click();
  await expect(page.getByText("Select a customer")).toBeVisible();
});

test("production page shows session planning and completion metrics", async ({ page }) => {
  await page.goto("/production");
  await expect(page.getByText("Required", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Produced", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Balance", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Completion", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Evening/ })).toBeVisible();
});

test("ledger shows outstanding balances and payment form", async ({ page }) => {
  await page.goto("/ledger");
  await expect(page.getByText("Outstanding by Customer")).toBeVisible();
  await expect(page.getByText("Payment History")).toBeVisible();
  await page.getByRole("button", { name: /Record Payment/ }).click();
  await expect(page.getByRole("heading", { name: "Record Payment" })).toBeVisible();
  await page.getByRole("button", { name: "Record Payment" }).last().click();
  await expect(page.getByText("Select a customer")).toBeVisible();
});

test("reports switch report tabs and export CSV/PDF controls are available", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByText("Daily Sales Report")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "CSV" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  await page.getByRole("button", { name: "Product Sales" }).click();
  await expect(page.getByRole("columnheader", { name: "Product" })).toBeVisible();
  await page.getByRole("button", { name: "Outstanding" }).click();
  await expect(page.getByRole("columnheader", { name: "Balance" })).toBeVisible();
});

test("PWA manifest is available", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.name).toBe("Idly Express ERP");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});

test("mobile layout exposes bottom navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Bottom navigation is intentionally mobile-only");
  await page.goto("/");
  const nav = page.locator("nav").last();
  await expect(nav).toBeVisible();
  await expect(nav.getByText("Dashboard")).toBeVisible();
  await expect(nav.getByText("Orders")).toBeVisible();
});
