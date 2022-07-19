const token = require("random-web-token");
const { Schema, model, default: mongoose } = require("mongoose");
const { SESSION_EXPIRES_IN } = require("../utils/constants");
const { ObjectId } = mongoose.Types;

const sessionSchema = new Schema({
    userId: { type: ObjectId, required: true, unique: true },
    token: { type: String, default: () => token.generate("extra", 32), unique: true },
    refreshToken: { type: String, default: () => token.generate("extra", 32), unique: true },
    active: { type: Boolean, default: true },
    ips: { type: [String], required: true },
    date: { type: Date, default: Date.now }
});

sessionSchema.post("validate", async function (doc, next) {
    if (doc.isModified("active")) {
        if (doc.active) {
            doc.token = token.generate("extra", 32);
            doc.refreshToken = token.generate("extra", 32);
            doc.date = new Date();

            doc.markModified("token");
            doc.markModified("refreshToken");
            doc.markModified("date");
        }
        else {
            doc.token = undefined;

            doc.markModified("token");
        }
    }

    next();
});

const SessionModel = model("Session", sessionSchema, "sessions");

class Session {
    constructor(doc) {
        if (!doc) throw new Error("InvalidDocument");
        this.doc = doc;
    }

    isExpired() {
        return new Date().getTime() - this.doc.date.getTime() > SESSION_EXPIRES_IN * 1000;
    }

    /**
     * 
     * @param {String} ip 
     */
    async addIp(ip) {
        if (this.doc.ips.includes(ip)) return this;
        this.doc.ips.push(ip);
        await this.doc.save();
        return this;
    }

    async disable(disableRefresh=false) {
        if (!this.doc.active) {
            this.doc.token = undefined;
        }
        this.doc.active = false;
        if(disableRefresh) this.doc.refreshToken = undefined;
        await this.doc.save({ validateBeforeSave: true });
        return this;
    }

    async enable() {
        if (this.doc.active) {
            this.doc.token = token.generate("extra", 32);
            this.doc.refreshToken = token.generate("extra", 32);
            this.doc.date = new Date();
        }
        this.doc.active = true;
        await this.doc.save({ validateBeforeSave: true });
        return this;
    }

    /**
     * 
     * @param {ObjectId} userId 
     * @param {String} ip 
     */
    static async create(userId, ip) {
        var doc = new SessionModel({ userId, ips: [ip] });
        return new Session(await doc.save());
    }

    /**
     * 
     * @param {ObjectId} userId 
     */
    static async getByUserId(userId) {
        var session = await SessionModel.findOne({ userId });
        if (!session) return false;
        return new Session(session);
    }

    /**
     * 
     * @param {String} token 
     * @param {String} ip 
     * @returns 
     */
    static async get(token, ip) {
        var session = await SessionModel.findOne({ token, ips: { $all: [ip] }, active: true });
        if (!session) return false;
        return new Session(session);
    }

    /**
     * 
     * @param {String} refresh 
     * @returns 
     */
    static async getByRefresh(refresh) {
        var session = await SessionModel.findOne({ refreshToken: refresh });
        if (!session) return false;
        return new Session(session);
    }

    static update() {
        SessionModel.updateMany({ active: true, date: { $gt: new Date().getTime() - SESSION_EXPIRES_IN } }, { $set: { active: false } });
    }
}

setInterval(Session.update, 1000 * 60 * 15);

module.exports = { Session };