import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup multer for logo upload
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const dir = './public';
      if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
      }
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      cb(null, 'logo.png');
    }
  });
  const upload = multer({ storage: storage });

  app.use(express.json());

  // API to handle logo upload if needed
  app.post("/api/upload-logo", upload.single('logo'), (req, res) => {
    res.json({ status: "ok", path: "/logo.png" });
  });

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
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
