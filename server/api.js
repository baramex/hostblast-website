const express = require("express");
const { default: mongoose } = require("mongoose");
const { ObjectId } = mongoose.Types;
const { Session } = require("./models/session.model");
const { User } = require("./models/user.model");
const { SESSION_EXPIRES_IN, REFRESH_SESSION_EXPIRES_IN } = require("./utils/constants");
const { Auth, CustomError } = require("./utils/middleware");
const router = express.Router();

router.use((req, res, next) => {
    req.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    next();
});

// create user
router.post("/user", Auth.isAuthenticated, (req, res) => {
    try {
        if (this.authenticated) throw new Error("AlreadyAuthenticated");

        const { firstname, lastname, email, password, avatar } = req.body || {};
        if (!firstname || !lastname || !email || !password) throw new Error("InvalidRequest");

        var user = await User.create(firstname, lastname, email, password, avatar);
        var session = await Session.create(user.doc._id, req.ip);

        res.status(201)
            .cookie("token", session.doc.token, { expires: new Date(SESSION_EXPIRES_IN + session.doc.date) })
            .cookie("refresh", session.doc.refreshToken, { expires: new Date(REFRESH_SESSION_EXPIRES_IN + session.doc.date) })
            .json(user.toJSON());
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// get user
router.get("/user/:id", Auth.requiresAuthentification, async (req, res) => {
    try {
        var id = req.params.id;
        if (id != "@me" && !ObjectId.isValid(id)) throw new Error("InvalidRequest");

        var isMe = id == "@me" || id == req.user.doc._id;
        if (!isMe && !req.user.hasPermission("VIEW_USERS")) throw new CustomError("Forbidden", 403);

        var user = isMe ? req.user : await User.getById(new ObjectId(id));
        if (!user) throw new Error("UserNotFound");

        res.json(user.toJSON());
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// update user

// login
router.post("/auth/login", Auth.isAuthenticated, async (req, res) => {
    try {
        if (this.authenticated) throw new Error("AlreadyAuthenticated");

        var username = req.body?.username;
        var password = req.body?.password;

        var user = await User.getByEmail(username);
        if (!user || !await user.check(password)) throw new CustomError("WrongCredentials", 401);

        var session = await Session.getByUserId(user.doc._id);
        if (!session) await Session.create(user.doc._id, req.ip);
        else {
            await session.addIp(ip);
            await session.enable();
        }

        res.cookie("token", session.doc.token, { expires: new Date(SESSION_EXPIRES_IN + session.doc.date) })
            .cookie("refresh", session.doc.refreshToken, { expires: new Date(REFRESH_SESSION_EXPIRES_IN + session.doc.date) })
            .json(user.toJSON());
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// refresh session
// revoke session
router.post("/auth/disconnect", Auth.requiresAuthentification, async (req, res) => {
    try {
        await req.session.disable();

        res.sendStatus(200);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// get products
// update product
// remove product
// push to cart
// edit cart
// remove from cart
// buy items
// get services
// get service
// revoke service
// update service

module.exports = router;