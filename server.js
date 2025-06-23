// server.js
const WebSocket = require('ws');

require('dotenv').config(); 
const PORT = process.env.PORT || 3001;

const wss = new WebSocket.Server({ port: PORT });
console.log("Server Started!");

let blocks = Array(9).fill().map((_, i) => ({ id: i, content: "", lockedBy: null }));

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'init', blocks }));
  console.log("connected!");
  

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'lock') {
      blocks[data.blockId].lockedBy = data.deviceId || null;
    }

    if (data.type === 'update') {
      blocks[data.blockId].content = data.content;
    }

    // broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });
});
