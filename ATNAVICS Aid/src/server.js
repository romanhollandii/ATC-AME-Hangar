const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from project root (index.html, app.js, refs/*, images, etc.)
const ROOT_DIR = path.join(__dirname, "..");
app.use(express.static(ROOT_DIR));

// SPA fallback ONLY for non-file routes
app.use((req, res) => {
  const hasFileExtension = path.extname(req.path) !== "";
  if (hasFileExtension) {
    return res.status(404).send("Not found");
  }
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
