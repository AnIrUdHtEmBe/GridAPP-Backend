const WebSocket = require("ws");
const mongoose = require("mongoose");
require("dotenv").config();
const Block = require("./models/Block");

const PORT = process.env.PORT || 3001;

const wss = new WebSocket.Server({ port: PORT });
console.log("WebSocket server started!");

mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("MongoDB connected!");

    // Initialize blocks from DB or insert defaults
    let blocks = await Block.find();

    if (blocks.length === 0) {
      blocks = Array(9).fill().map((_, i) => new Block({ id: i, content: "", lockedBy: null }));
      await Block.insertMany(blocks);
      blocks = await Block.find(); // re-fetch for consistency
    }

    wss.on("connection", (ws) => {
      console.log("Client connected");

      // Send initial block data
      ws.send(JSON.stringify({ type: "init", blocks }));

      ws.on("message", async (message) => {
        const data = JSON.parse(message);

        if (data.type === "lock") {
          await Block.updateOne({ id: data.blockId }, { lockedBy: data.deviceId || null });
        }

        if (data.type === "update") {
          await Block.updateOne({ id: data.blockId }, { content: data.content });
        }

        if (data.type === "clear") {
          // Reset all blocks in the DB
          await Block.updateMany({}, { $set: { content: "", lockedBy: null } });

          // Refresh in-memory state
          blocks = await Block.find();

          // Broadcast the cleared state to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "clear" }));
            }
          });

          return; // don't rebroadcast original clear message
        }

        // Broadcast update/lock to all clients
        if (data.type === "update" || data.type === "lock") {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      });
    });

  })
  .catch((err) => console.error("MongoDB connection error:", err));
