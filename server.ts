import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database('orders.db');
db.pragma('journal_mode = WAL');

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    customerName TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    totalPrice INTEGER NOT NULL,
    sauces TEXT NOT NULL
  )
`);

try { db.exec(`ALTER TABLE orders ADD COLUMN whatsappNumber TEXT DEFAULT ''`); } catch (e) {}
try { db.exec(`ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'Pending'`); } catch (e) {}
try { db.exec(`ALTER TABLE orders ADD COLUMN profit INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE orders ADD COLUMN menuItem TEXT DEFAULT 'Brulee Bomb'`); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_stock (
    date TEXT PRIMARY KEY,
    stock INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    customerName TEXT NOT NULL,
    message TEXT NOT NULL
  )
`);

try { db.exec(`ALTER TABLE feedback ADD COLUMN rating INTEGER DEFAULT 5`); } catch (e) {}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Send current history from DB to the newly connected user
    try {
      const stmt = db.prepare('SELECT * FROM orders ORDER BY date DESC');
      const history = stmt.all().map((row: any) => ({
        ...row,
        sauces: JSON.parse(row.sauces)
      }));
      socket.emit("initial_history", history);
    } catch (error) {
      console.error("Error fetching history:", error);
      socket.emit("initial_history", []);
    }

    // Send feedback from DB
    try {
      const stmt = db.prepare('SELECT * FROM feedback ORDER BY date DESC');
      socket.emit("initial_feedback", stmt.all());
    } catch (error) {
      console.error("Error fetching feedback:", error);
      socket.emit("initial_feedback", []);
    }

    // Send current stock
    try {
      const today = new Date().toISOString().split('T')[0];
      const stmt = db.prepare('SELECT stock FROM daily_stock WHERE date = ?');
      const row: any = stmt.get(today);
      socket.emit("stock_update", row ? row.stock : null);
    } catch (error) {
      console.error("Error fetching stock:", error);
    }

    socket.on("set_stock", (stock: number) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const stmt = db.prepare('INSERT OR REPLACE INTO daily_stock (date, stock) VALUES (?, ?)');
        stmt.run(today, stock);
        io.emit("stock_update", stock);
      } catch (error) {
        console.error("Error setting stock:", error);
      }
    });

    socket.on("new_order", (order) => {
      console.log("New order received:", order);
      try {
        // Calculate profit (assuming cost is 6000 per unit)
        const sellingPrice = order.menuItem === 'Hikari Sushi' ? 8000 : order.menuItem === 'Bundle' ? 18000 : 10000;
        const costPrice = order.menuItem === 'Bundle' ? 12000 : 6000;
        const profitPerUnit = sellingPrice - costPrice;
        const profit = order.quantity * profitPerUnit;

        // Add to DB
        const insert = db.prepare('INSERT INTO orders (id, date, customerName, quantity, totalPrice, sauces, menuItem, status, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        insert.run(
          order.id,
          order.date,
          order.customerName,
          order.quantity,
          order.totalPrice,
          JSON.stringify(order.sauces),
          order.menuItem || 'Brulee Bomb',
          'Success',
          profit
        );

        // Update stock
        const today = new Date().toISOString().split('T')[0];
        const stockStmt = db.prepare('SELECT stock FROM daily_stock WHERE date = ?');
        const row: any = stockStmt.get(today);
        if (row && row.stock !== null) {
          const stockToSubtract = order.menuItem === 'Bundle' ? order.quantity * 2 : order.quantity;
          const newStock = Math.max(0, row.stock - stockToSubtract);
          db.prepare('UPDATE daily_stock SET stock = ? WHERE date = ?').run(newStock, today);
          io.emit("stock_update", newStock);
        }

        // Broadcast to all clients
        const newOrder = { ...order, status: 'Success', profit, menuItem: order.menuItem || 'Brulee Bomb' };
        io.emit("order_update", newOrder);

      } catch (error) {
        console.error("Error saving order:", error);
      }
    });

    socket.on("submit_feedback", (feedback) => {
      try {
        const insert = db.prepare('INSERT INTO feedback (id, date, customerName, message, rating) VALUES (?, ?, ?, ?, ?)');
        insert.run(feedback.id, feedback.date, feedback.customerName, feedback.message, feedback.rating || 5);
        io.emit("new_feedback", feedback);
      } catch (error) {
        console.error("Error saving feedback:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
