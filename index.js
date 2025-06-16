require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dns = require("dns");
const urlModule = require("url");
const app = express();
const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/short_url")
  .then(() => console.log("MongoDB conectado"))
  .catch((err) => console.error("Error al conectar", err));

const Urls = mongoose.model(
  "urls",
  new mongoose.Schema({
    original_url: String,
    short_url: Number,
  })
);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", async (req, res) => {
  const inputUrl = req.body.url;

  let hostname;
  try {
    hostname = new URL(inputUrl).hostname;
  } catch (err) {
    return res.json({ error: "invalid url" });
  }

  dns.lookup(hostname, async (error, address) => {
    if (error || !address) {
      return res.json({ error: "invalid url" });
    }

    try {
      const existingUrl = await Urls.findOne({ original_url: inputUrl });
      if (existingUrl) {
        return res.json({
          original_url: existingUrl.original_url,
          short_url: existingUrl.short_url,
        });
      }
      const counts = await Urls.countDocuments();
      const urlFormat = {
        original_url: inputUrl,
        short_url: counts + 1,
      };
      await Urls.create(urlFormat);
      res.json(urlFormat);
    } catch (dbErr) {
      res.status(500).json({ error: "error saving URL" });
    }
  });
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const short_url = Number(req.params.short_url);
  try {
    const url = await Urls.findOne({ short_url: short_url });
    if (!url) {
      return res.json({ error: "invalid url" });
    }
    res.redirect(url.original_url);
  } catch (err) {
    return res.json({ error: "server error" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
