// models/Block.js
const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  id: Number,
  content: String,
  lockedBy: String
});

module.exports = mongoose.model('Block', blockSchema);
