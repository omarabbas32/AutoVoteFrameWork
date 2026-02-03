import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { runVote } from "./core/runner.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/autovote";
mongoose.connect(mongoURI)
    .then(() => console.log("Connected to local MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

// Site Schema
const SiteSchema = new mongoose.Schema({
    name: { type: String, required: true },
    loginUrl: { type: String, required: true },
    voteUrl: { type: String, required: true },
    defaultIterations: { type: Number, default: 1 }
});
const Site = mongoose.model("Site", SiteSchema);

app.use(express.json());
app.use(express.static("public"));

let logClients = [];

// SSE for log updates
app.get("/api/logs", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const client = { id: Date.now(), res };
    logClients.push(client);

    req.on("close", () => {
        logClients = logClients.filter(c => c.id !== client.id);
    });
});

function broadcastLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${message}`;
    logClients.forEach(client => {
        client.res.write(`data: ${JSON.stringify({ message: formatted })}\n\n`);
    });
}

// Site API
app.get("/api/sites", async (req, res) => {
    try {
        const sites = await Site.find();
        res.json(sites);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/sites", async (req, res) => {
    try {
        const { name, loginUrl, voteUrl, defaultIterations } = req.body;
        const site = new Site({ name, loginUrl, voteUrl, defaultIterations });
        await site.save();
        res.json({ success: true, site });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/sites/:id", async (req, res) => {
    try {
        await Site.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Voting API
app.post("/api/start-vote", async (req, res) => {
    const { id, choiceIndex, siteId, iterations } = req.body;

    if (!id || !siteId) {
        return res.status(400).json({ success: false, error: "ID and Site Selection are required" });
    }

    try {
        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ error: "Site configuration not found" });

        res.json({ success: true, message: `Voting started for ${site.name}` });

        runVote({
            id,
            choiceIndex: parseInt(choiceIndex) || 0,
            loginUrl: site.loginUrl,
            voteUrl: site.voteUrl,
            maxIterations: parseInt(iterations) || site.defaultIterations,
            logger: broadcastLog
        }).catch(error => {
            broadcastLog(`Fatal Error: ${error.message}`);
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`AutoVote Dashboard running at http://localhost:${PORT}`);
});
