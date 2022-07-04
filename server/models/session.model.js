const token = require("random-web-token");
const { Schema, model, default: mongoose } = require("mongoose");
const { ObjectId } = mongoose.Types;

const sessionSchema = new Schema({
    userId: { type: ObjectId, required: true, unique: true },
    token: { type: String, default: () => token.generate("extra", 32), unique: true },
    refreshTokem: { type: String, default: () => token.generate("extra", 32), unique: true },
    active: { type: Boolean, default: true },
    ips: { type: [String], required: true },
    expiresIn: { type: Number, default: 86400 },
    date: { type: Date, default: Date.now }
});

const SessionModel = model("Session", sessionSchema, "sessions");

class Session {

}

module.exports = { SessionModel, Session };