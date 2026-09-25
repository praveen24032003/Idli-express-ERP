import express from "express";
import cors from "cors";
import { customersRouter } from "./routes/customers.js";
import { productsRouter } from "./routes/products.js";
import { ordersRouter } from "./routes/orders.js";
import { templatesRouter } from "./routes/templates.js";
import { productionRouter } from "./routes/production.js";
import { ledgerRouter } from "./routes/ledger.js";
import { reportsRouter } from "./routes/reports.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { ApiError } from "./utils.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/production", productionRouter);
app.use("/api/ledger", ledgerRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/dashboard", dashboardRouter);

// Central error handler — keep last.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err && typeof err === "object" && "issues" in err) {
    // Zod validation error
    return res.status(400).json({ error: "Validation failed", details: (err as { issues: unknown }).issues });
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
