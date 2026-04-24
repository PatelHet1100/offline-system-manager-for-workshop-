import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs-extra';
import Database from 'better-sqlite3';
import multer from 'multer';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const DB_PATH = path.join(DATA_DIR, 'workshop.db');

// Ensure directories exist
fs.ensureDirSync(IMAGES_DIR);

// DB Setup
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 1. Ensure tables exist first
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT
  );

  CREATE TABLE IF NOT EXISTS product_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    product_type_id INTEGER NOT NULL,
    custom_name TEXT,
    manufacturing_status TEXT DEFAULT 'Pending',
    payment_status TEXT DEFAULT 'Unpaid',
    total_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    delivery_date TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (product_type_id) REFERENCES product_types(id)
  );

  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_type_id INTEGER NOT NULL,
    order_id INTEGER REFERENCES orders(id),
    file_path TEXT NOT NULL,
    FOREIGN KEY (product_type_id) REFERENCES product_types(id)
  );
`);

// 2. Simple migration logic for older databases
const tableInfo = db.prepare("PRAGMA table_info(orders)").all() as any[];
const hasTotalAmount = tableInfo.some(c => c.name === 'total_amount');
const hasPaidAmount = tableInfo.some(c => c.name === 'paid_amount');
const hasDeliveryDate = tableInfo.some(c => c.name === 'delivery_date');

if (!hasTotalAmount && tableInfo.some(c => c.name === 'amount')) {
  db.exec("ALTER TABLE orders RENAME COLUMN amount TO total_amount");
}
if (!hasPaidAmount) {
  db.exec("ALTER TABLE orders ADD COLUMN paid_amount REAL DEFAULT 0");
}
if (!hasDeliveryDate) {
  db.exec("ALTER TABLE orders ADD COLUMN delivery_date TEXT");
}

const hasDescription = tableInfo.some(c => c.name === 'description');

if (!hasDescription) db.exec("ALTER TABLE orders ADD COLUMN description TEXT");

const imgTableInfo = db.prepare("PRAGMA table_info(images)").all() as any[];
const hasOrderId = imgTableInfo.some(c => c.name === 'order_id');
if (!hasOrderId) {
  db.exec("ALTER TABLE images ADD COLUMN order_id INTEGER REFERENCES orders(id)");
}

const app = express();
app.use(express.json());

// Logic: Normalize Name
const normalize = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^\w]/g, '') // Remove everything except alphanumeric and underscore
    .trim();
};

// Multer Storage Logic
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productName = req.body.productName || 'misc';
    const normName = normalize(productName);
    const dir = path.join(IMAGES_DIR, normName);
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// API: Customers
app.get('/api/customers', (req, res) => {
  const q = req.query.q as string || '';
  const query = `%${q.toLowerCase()}%`;
  
  const rows = db.prepare(`
    SELECT DISTINCT c.*, 
    (SELECT custom_name FROM orders WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_order
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    WHERE LOWER(c.name) LIKE ? 
       OR LOWER(c.phone) LIKE ? 
       OR LOWER(o.custom_name) LIKE ?
       OR LOWER(o.description) LIKE ?
    ORDER BY c.name ASC
  `).all(query, query, query, query);
  res.json(rows);
});

app.post('/api/customers', (req, res) => {
  const { name, phone } = req.body;
  const info = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run(name, phone);
  res.json({ id: info.lastInsertRowid });
});

app.delete('/api/customers/:id', (req, res) => {
  const customerId = req.params.id;
  console.log(`[BACKEND] Deleting customer: ${customerId}`);
  
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM orders WHERE customer_id = ?').run(customerId);
    db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
    
    // Cleanup unused product types (only if no orders AND no images reference them)
    db.prepare('DELETE FROM product_types WHERE id NOT IN (SELECT product_type_id FROM orders) AND id NOT IN (SELECT product_type_id FROM images)').run();
  });
  tx();
  res.json({ success: true });
});

// API: Orders
app.get('/api/orders/:customerId', (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, p.normalized_name,
    (SELECT GROUP_CONCAT(file_path) FROM images WHERE order_id = o.id) as order_images,
    (SELECT GROUP_CONCAT(file_path) FROM images WHERE product_type_id = p.id AND order_id IS NULL) as reference_images
    FROM orders o
    JOIN product_types p ON o.product_type_id = p.id
    WHERE o.customer_id = ?
    ORDER BY o.created_at ASC
  `).all(req.params.customerId);
  res.json(rows);
});

app.post('/api/orders', upload.array('photos'), (req, res) => {
  const { 
    customerId, 
    productName, 
    mStatus, 
    amount, 
    paidAmount, 
    isReference, 
    deliveryDate,
    description
  } = req.body;
  const totalAmountValue = parseFloat(amount || '0');
  const paidAmountValue = parseFloat(paidAmount || '0');
  const normName = normalize(productName);

  // Derive status
  let pStatus = 'Unpaid';
  if (paidAmountValue >= totalAmountValue && totalAmountValue > 0) {
    pStatus = 'Paid';
  } else if (paidAmountValue > 0) {
    pStatus = 'Partial';
  }

  const tx = db.transaction(() => {
    // 1. Get or Create Product Type
    db.prepare('INSERT OR IGNORE INTO product_types (name, normalized_name) VALUES (?, ?)').run(productName, normName);
    const ptRow = db.prepare('SELECT id FROM product_types WHERE normalized_name = ?').get(normName) as { id: number };
    const ptId = ptRow.id;

    // 2. Insert Order
    const orderInfo = db.prepare(`
      INSERT INTO orders (
        customer_id, product_type_id, custom_name, manufacturing_status, 
        payment_status, total_amount, paid_amount, delivery_date,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId, ptId, productName, mStatus, 
      pStatus, totalAmountValue, paidAmountValue, deliveryDate,
      description
    );

    const orderId = orderInfo.lastInsertRowid;

    // 3. Save Images
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((f: any) => {
        const orderIdValue = isReference === 'true' ? null : orderId;
        db.prepare('INSERT INTO images (product_type_id, order_id, file_path) VALUES (?, ?, ?)').run(ptId, orderIdValue, `${normName}/${f.filename}`);
      });
    }
    return orderId;
  });

  const orderId = tx();
  res.json({ success: true, orderId });
});

app.put('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const { 
    productName, 
    mStatus, 
    amount, 
    paidAmount, 
    deliveryDate,
    description
  } = req.body;
  const totalAmountValue = parseFloat(amount || '0');
  const paidAmountValue = parseFloat(paidAmount || '0');
  const normName = normalize(productName);

  // Derive payment status
  let pStatus = 'Unpaid';
  if (paidAmountValue >= totalAmountValue && totalAmountValue > 0) {
    pStatus = 'Paid';
  } else if (paidAmountValue > 0) {
    pStatus = 'Partial';
  }

  const tx = db.transaction(() => {
    // 1. Update Product Type handle
    db.prepare('INSERT OR IGNORE INTO product_types (name, normalized_name) VALUES (?, ?)').run(productName, normName);
    const ptRow = db.prepare('SELECT id FROM product_types WHERE normalized_name = ?').get(normName) as { id: number };
    const ptId = ptRow.id;

    // 2. Update Order
    db.prepare(`
      UPDATE orders 
      SET custom_name = ?, manufacturing_status = ?, payment_status = ?, total_amount = ?, 
          paid_amount = ?, delivery_date = ?, product_type_id = ?,
          description = ?
      WHERE id = ?
    `).run(
      productName, mStatus, pStatus, totalAmountValue, 
      paidAmountValue, deliveryDate, ptId,
      description,
      orderId
    );

    // Optional: Cleanup unused product types
    db.prepare('DELETE FROM product_types WHERE id NOT IN (SELECT product_type_id FROM orders) AND id NOT IN (SELECT product_type_id FROM images)').run();
  });
  
  tx();
  res.json({ success: true });
});

app.delete('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  console.log(`[BACKEND] Deleting order: ${orderId}`);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    
    // Optional: Cleanup unused product types
    db.prepare('DELETE FROM product_types WHERE id NOT IN (SELECT product_type_id FROM orders) AND id NOT IN (SELECT product_type_id FROM images)').run();
  });
  tx();
  res.json({ success: true });
});

// API: Reports
app.get('/api/reports/pending', (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, c.name as customer_name, p.normalized_name,
    (SELECT file_path FROM images WHERE (order_id = o.id OR (product_type_id = p.id AND order_id IS NULL)) LIMIT 1) as preview_image
    FROM orders o 
    JOIN customers c ON o.customer_id = c.id 
    JOIN product_types p ON o.product_type_id = p.id
    WHERE o.manufacturing_status != 'Completed' OR o.payment_status != 'Paid'
    ORDER BY o.created_at DESC
  `).all();
  res.json(rows);
});

app.get('/api/reports/financials', (req, res) => {
  const rows = db.prepare(`
    SELECT c.name, SUM(o.paid_amount) as total 
    FROM orders o 
    JOIN customers c ON o.customer_id = c.id 
    GROUP BY c.id
    ORDER BY total DESC
  `).all();
  res.json(rows);
});

// API: Images
app.get('/api/images', (req, res) => {
  const rows = db.prepare(`
    SELECT i.*, p.name as product_name
    FROM images i
    JOIN product_types p ON i.product_type_id = p.id
    ORDER BY i.id DESC
  `).all();
  res.json(rows);
});

app.delete('/api/images/:id', (req, res) => {
  const id = req.params.id;
  console.log(`[BACKEND] Deleting image: ${id}`);
  const img = db.prepare('SELECT file_path FROM images WHERE id = ?').get(id) as { file_path: string } | undefined;
  
  if (img) {
    const fullPath = path.join(IMAGES_DIR, img.file_path);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error("Failed to delete file:", fullPath, err);
      }
    }
    db.prepare('DELETE FROM images WHERE id = ?').run(id);
    
    // Cleanup unused product types
    db.prepare('DELETE FROM product_types WHERE id NOT IN (SELECT product_type_id FROM orders) AND id NOT IN (SELECT product_type_id FROM images)').run();
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Image not found" });
  }
});

// Backup All (DB + Images)
app.get('/api/backup/full', (req, res) => {
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.attachment('workshop_full_backup.zip');
  
  archive.on('error', (err) => res.status(500).send({ error: err.message }));
  archive.pipe(res);
  
  archive.file(DB_PATH, { name: 'workshop.db' });
  archive.directory(IMAGES_DIR, 'images');
  
  archive.finalize();
});

// Search Images across all customers by product name
app.get('/api/search/images', (req, res) => {
  const query = req.query.q as string;
  const normQuery = normalize(query || '');
  const rows = db.prepare(`
    SELECT i.*, p.name as product_name
    FROM images i
    JOIN product_types p ON i.product_type_id = p.id
    WHERE p.normalized_name LIKE ?
    ORDER BY i.id DESC
  `).all(`%${normQuery}%`);
  res.json(rows);
});

// Search Orders (Advanced)
app.get('/api/search/orders', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase();
  const rows = db.prepare(`
    SELECT o.*, c.name as customer_name, p.normalized_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN product_types p ON o.product_type_id = p.id
    WHERE LOWER(o.custom_name) LIKE ? 
       OR LOWER(o.description) LIKE ? 
    ORDER BY o.created_at DESC
  `).all(`%${query}%`, `%${query}%`);
  res.json(rows);
});

// Export Database Only (Legacy support)
app.get('/api/export', (req, res) => {
  res.download(DB_PATH, 'workshop_backup.db');
});

// Serve Uploads
app.use('/uploads', express.static(IMAGES_DIR));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    
    // Auto-open browser in local environment
    if (process.env.NODE_ENV !== 'production' && !process.env.AIS_DISABLE_AUTO_OPEN) {
      const url = `http://localhost:${PORT}`;
      const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
      exec(`${start} ${url}`);
    }
  });
}

startServer();
