import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database.Database;

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Starting server: NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}`);
  console.log(`__dirname: ${__dirname}`);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Test route to verify reachability
  app.get("/api/test", (req, res) => {
    res.send("Server is reachable");
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  try {
    console.log("Initializing database...");
    db = new Database("hanout.db");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        shop_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        barcode TEXT UNIQUE,
        purchase_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        expiration_date TEXT,
        category_id INTEGER,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        total_price REAL NOT NULL,
        profit REAL NOT NULL,
        sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      INSERT OR IGNORE INTO categories (id, name_ar, name_en) VALUES 
        (1, 'مشروبات', 'Beverages'),
        (2, 'معلبات', 'Canned Goods'),
        (3, 'ألبان', 'Dairy'),
        (4, 'مخبوزات', 'Bakery'),
        (5, 'خضروات وفواكه', 'Fruits & Vegetables'),
        (6, 'منظفات', 'Cleaning Supplies');
    `);
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { username, password, shop_name } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (username, password, shop_name) VALUES (?, ?, ?)").run(username, password, shop_name);
      res.json({ id: info.lastInsertRowid, username, shop_name });
    } catch (error: any) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username, shop_name: user.shop_name });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Products Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, c.name_ar as category_ar, c.name_en as category_en 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(products);
  });

  app.get("/api/products/search", (req, res) => {
    const { q } = req.query;
    const products = db.prepare(`
      SELECT p.*, c.name_ar as category_ar, c.name_en as category_en 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.name LIKE ? OR p.barcode = ?
    `).all(`%${q}%`, q);
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, barcode, purchase_price, selling_price, quantity, expiration_date, category_id, image_url } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO products (name, barcode, purchase_price, selling_price, quantity, expiration_date, category_id, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, barcode, purchase_price, selling_price, quantity, expiration_date, category_id, image_url);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, barcode, purchase_price, selling_price, quantity, expiration_date, category_id, image_url } = req.body;
    db.prepare(`
      UPDATE products 
      SET name = ?, barcode = ?, purchase_price = ?, selling_price = ?, quantity = ?, expiration_date = ?, category_id = ?, image_url = ?
      WHERE id = ?
    `).run(name, barcode, purchase_price, selling_price, quantity, expiration_date, category_id, image_url, id);
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM products WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: "لا يمكن حذف المنتج لأنه مرتبط بعمليات بيع أو استيراد." });
    }
  });

  // Sales Routes
  app.post("/api/sales", (req, res) => {
    const { product_id, quantity } = req.body;
    try {
      db.transaction(() => {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as any;
        if (!product || product.quantity < quantity) {
          throw new Error("Insufficient stock");
        }
        const total_price = product.selling_price * quantity;
        const profit = (product.selling_price - product.purchase_price) * quantity;
        db.prepare("INSERT INTO sales (product_id, quantity, total_price, profit) VALUES (?, ?, ?, ?)").run(
          product_id, quantity, total_price, profit
        );
        db.prepare("UPDATE products SET quantity = quantity - ? WHERE id = ?").run(quantity, product_id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/sales/history", (req, res) => {
    const sales = db.prepare(`
      SELECT s.*, p.name as product_name 
      FROM sales s 
      JOIN products p ON s.product_id = p.id 
      ORDER BY s.sale_date DESC
    `).all();
    res.json(sales);
  });

  // Imports Routes
  app.post("/api/imports", (req, res) => {
    const { product_id, quantity, unit_price } = req.body;
    const total_price = unit_price * quantity;
    try {
      db.transaction(() => {
        db.prepare("INSERT INTO imports (product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?)").run(
          product_id, quantity, unit_price, total_price
        );
        db.prepare("UPDATE products SET quantity = quantity + ?, purchase_price = ? WHERE id = ?").run(quantity, unit_price, product_id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/imports/history", (req, res) => {
    const imports = db.prepare(`
      SELECT i.*, p.name as product_name 
      FROM imports i 
      JOIN products p ON i.product_id = p.id 
      ORDER BY i.import_date DESC
    `).all();
    res.json(imports);
  });

  // Stats Route
  app.get("/api/stats", (req, res) => {
    try {
      const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
      const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity < 5").get() as any;
      const expiringSoon = db.prepare("SELECT COUNT(*) as count FROM products WHERE expiration_date <= date('now', '+30 days')").get() as any;
      const todaySales = db.prepare(`
        SELECT SUM(total_price) as income, SUM(profit) as profit, COUNT(*) as count 
        FROM sales 
        WHERE date(sale_date) = date('now')
      `).get() as any;
      const salesChart = db.prepare(`
        SELECT date(sale_date) as date, SUM(total_price) as total 
        FROM sales 
        WHERE sale_date >= date('now', '-7 days')
        GROUP BY date(sale_date)
      `).all();
      const todayHourlySales = db.prepare(`
        SELECT strftime('%H', sale_date) as hour, SUM(total_price) as total 
        FROM sales 
        WHERE date(sale_date) = date('now')
        GROUP BY hour
        ORDER BY hour ASC
      `).all();

      res.json({
        totalProducts: totalProducts.count,
        lowStock: lowStock.count,
        expiringSoon: expiringSoon.count,
        todayIncome: todaySales.income || 0,
        todayProfit: todaySales.profit || 0,
        todayCount: todaySales.count || 0,
        salesChart,
        todayHourlySales
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  app.post("/api/reset", (req, res) => {
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM sales").run();
        db.prepare("DELETE FROM imports").run();
        db.prepare("DELETE FROM products").run();
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Vite / Static Files
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      app.get("*", async (req, res, next) => {
        console.log(`Catch-all route hit: ${req.url}`);
        if (req.originalUrl.startsWith('/api')) return next();
        try {
          const indexPath = path.resolve(__dirname, "index.html");
          if (!fs.existsSync(indexPath)) {
            console.error(`index.html not found at ${indexPath}`);
            return res.status(500).send("index.html not found");
          }
          let template = fs.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          console.error("Vite transform error:", e);
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (viteError) {
      console.error("Failed to initialize Vite:", viteError);
    }
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

startServer().catch(err => {
  console.error("Critical server failure:", err);
  process.exit(1);
});
