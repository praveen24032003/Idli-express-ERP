/**
 * Seed script for Idly Express ERP.
 * Creates 20 customers, 4 products, recurring templates, production, and payments.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AREAS = ["T Nagar", "Adyar", "Velachery", "Anna Nagar", "Mylapore", "Guindy", "Tambaram", "Porur"];
const ROUTES = ["Route A", "Route B", "Route C", "Route D"];

const CUSTOMER_TYPES = ["HOTEL", "RESTAURANT", "CATERING", "CORPORATE", "RETAIL"] as const;

const CUSTOMER_NAMES: { name: string; type: (typeof CUSTOMER_TYPES)[number] }[] = [
  { name: "Sri Balaji Bhavan", type: "HOTEL" },
  { name: "Hotel Saravana Residency", type: "HOTEL" },
  { name: "Annapoorna Hotel", type: "HOTEL" },
  { name: "Ganga Restaurant", type: "RESTAURANT" },
  { name: "Sangeetha Restaurant", type: "RESTAURANT" },
  { name: "Murugan Idli Shop", type: "RESTAURANT" },
  { name: "Vasanta Bhavan", type: "HOTEL" },
  { name: "Rayar's Mess", type: "RESTAURANT" },
  { name: "Amudha Caterers", type: "CATERING" },
  { name: "Sri Krishna Caterers", type: "CATERING" },
  { name: "Royal Feast Catering", type: "CATERING" },
  { name: "TCS Chennai Cafeteria", type: "CORPORATE" },
  { name: "Infosys Campus Canteen", type: "CORPORATE" },
  { name: "Zoho Office Pantry", type: "CORPORATE" },
  { name: "Cognizant Cafeteria", type: "CORPORATE" },
  { name: "Meena Retail Store", type: "RETAIL" },
  { name: "Kumar Provision Store", type: "RETAIL" },
  { name: "Lakshmi Stores", type: "RETAIL" },
  { name: "Anand Bhavan Restaurant", type: "RESTAURANT" },
  { name: "Green Leaf Caterers", type: "CATERING" },
];

const PRODUCTS = [
  { name: "Idli", category: "IDLI", wholesalePrice: 4, retailPrice: 6 },
  { name: "Chapati", category: "CHAPATI", wholesalePrice: 5, retailPrice: 7 },
  { name: "Idiyappam", category: "IDIYAPPAM", wholesalePrice: 5, retailPrice: 8 },
  { name: "Sandhagai", category: "SANDHAGAI", wholesalePrice: 6, retailPrice: 9 },
];

function randomPhone(i: number) {
  return `98${(4000000000 + i * 137).toString().slice(0, 8)}`;
}

function pick<T>(arr: readonly T[], i: number): T {
  const len = arr.length;
  return arr[((i % len) + len) % len];
}

async function main() {
  console.log("Seeding database...");

  await prisma.payment.deleteMany();
  await prisma.production.deleteMany();
  await prisma.templateDay.deleteMany();
  await prisma.orderTemplate.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  const products = [];
  for (const p of PRODUCTS) {
    const product = await prisma.product.create({ data: p });
    products.push(product);
  }
  console.log(`Created ${products.length} products`);

  const customers = [];
  for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
    const c = CUSTOMER_NAMES[i];
    const customer = await prisma.customer.create({
      data: {
        customerCode: `CUST${String(i + 1).padStart(3, "0")}`,
        name: c.name,
        phone: randomPhone(i),
        address: `${i + 1}, Main Road`,
        area: pick(AREAS, i),
        route: pick(ROUTES, i),
        customerType: c.type,
        active: true,
      },
    });
    customers.push(customer);
  }
  console.log(`Created ${customers.length} customers`);

  // Recurring templates for wholesale-type customers (hotels, restaurants, catering, corporate)
  const wholesaleCustomers = customers.filter((c) => c.customerType !== "RETAIL");
  let templateCount = 0;
  for (const customer of wholesaleCustomers.slice(0, 10)) {
    const product = products[templateCount % products.length];
    const template = await prisma.orderTemplate.create({
      data: {
        customerId: customer.id,
        productId: product.id,
        active: true,
        days: {
          create: [
            { dayOfWeek: 1, quantity: 300 }, // Monday
            { dayOfWeek: 2, quantity: 300 }, // Tuesday
            { dayOfWeek: 3, quantity: 300 }, // Wednesday
            { dayOfWeek: 4, quantity: 300 }, // Thursday
            { dayOfWeek: 5, quantity: 300 }, // Friday
            { dayOfWeek: 6, quantity: 400 }, // Saturday
            { dayOfWeek: 0, quantity: 500 }, // Sunday
          ],
        },
      },
    });
    templateCount++;
    void template;
  }
  console.log(`Created ${templateCount} recurring templates`);

  // Sample orders for today and past few days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let orderCount = 0;
  for (let dayOffset = -2; dayOffset <= 0; dayOffset++) {
    const deliveryDate = new Date(today);
    deliveryDate.setDate(deliveryDate.getDate() + dayOffset);

    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const product = pick(products, i + dayOffset);
      const session = i % 2 === 0 ? "MORNING" : "EVENING";
      const priceType = customer.customerType === "RETAIL" ? "RETAIL" : "WHOLESALE";
      const unitPrice = priceType === "RETAIL" ? product.retailPrice : product.wholesalePrice;
      const quantity = customer.customerType === "RETAIL" ? 20 + (i % 5) * 5 : 100 + (i % 4) * 50;
      const totalAmount = quantity * unitPrice;

      await prisma.order.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          quantity,
          priceType,
          unitPrice,
          totalAmount,
          session,
          deliveryDate,
          channel: i % 3 === 0 ? "PHONE" : i % 3 === 1 ? "DIRECT" : "ONLINE",
        },
      });
      orderCount++;
    }
  }
  console.log(`Created ${orderCount} orders`);

  // Production records for today, derived from today's orders
  const todaysOrders = await prisma.order.findMany({ where: { deliveryDate: today } });
  const requirementMap = new Map<string, number>();
  for (const o of todaysOrders) {
    const key = `${o.productId}|${o.session}`;
    requirementMap.set(key, (requirementMap.get(key) ?? 0) + o.quantity);
  }
  let productionCount = 0;
  for (const [key, requiredQuantity] of requirementMap) {
    const [productId, session] = key.split("|");
    await prisma.production.create({
      data: {
        date: today,
        productId,
        session,
        requiredQuantity,
        producedQuantity: session === "MORNING" ? requiredQuantity : Math.round(requiredQuantity * 0.6),
      },
    });
    productionCount++;
  }
  console.log(`Created ${productionCount} production records`);

  // Sample payments / ledger entries
  let paymentCount = 0;
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    if (i % 2 !== 0) continue; // half the customers have ledger history
    const invoiceAmount = 5000 + i * 350;
    const paidAmount = i % 4 === 0 ? invoiceAmount : Math.round(invoiceAmount * 0.6);
    const balanceAmount = invoiceAmount - paidAmount;
    const paymentDate = new Date(today);
    paymentDate.setDate(paymentDate.getDate() - (i % 5));

    await prisma.payment.create({
      data: {
        customerId: customer.id,
        invoiceAmount,
        paidAmount,
        balanceAmount,
        paymentDate,
        remarks: balanceAmount > 0 ? "Partial payment received" : "Fully settled",
      },
    });
    paymentCount++;
  }
  console.log(`Created ${paymentCount} payment records`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
