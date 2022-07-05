const { default: mongoose } = require("mongoose");
const { Session } = require("../models/session.model");
const { User } = require("../models/user.model");
const { ObjectId } = mongoose.Types;

class Auth {
    static requiresAuthentification(req, res, next) {
        try {
            var token = req.cookies?.token;

            if (!token || !ObjectId.isValid(token)) throw new CustomError("Unauthorized", 401);

            var session = await Session.get(new ObjectId(token), req.ip);
            if (!session) throw new CustomError("Unauthorized", 401);

            var profile = await User.getById(session.doc.userId);
            if (!profile) throw new CustomError("Unauthorized", 401);

            req.session = session;
            req.profile = profile;
            next();
        } catch (error) {
            return res.status(error.satus || 400).send(error.message);
        }
    }

    static isAuthenticated(req, res, next) {
        try {
            var token = req.cookies?.token;

            if (!token || !ObjectId.isValid(token)) throw new Error();

            var session = await Session.get(new ObjectId(token), req.ip);
            if (!session) throw new Error();

            var profile = await User.getById(session.doc.userId);
            if (!profile) throw new Error();

            req.authenticated = true;
        } catch (error) {
            req.authenticated = false;
        }
        next();
    }
}


class CustomError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

module.exports = { Auth, CustomError };