const express = require("express");
const { default: mongoose } = require("mongoose");
const { Cart } = require("./models/cart.model");
const { Produce } = require("./models/produce.model");
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
router.post("/user", Auth.isAuthenticated, async (req, res) => {
    try {
        if (req.authenticated) throw new Error("AlreadyAuthenticated");

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
router.put("/user/:id", Auth.requiresAuthentification, async (req, res) => {
    try {
        var id = req.params.id;
        if (id != "@me" && !ObjectId.isValid(id)) throw new Error("InvalidRequest");

        var fields = req.body;
        if (!fields) throw new Error("InvalidRequest");

        var isMe = id == "@me" || id == req.user.doc._id;
        if (!isMe && !req.user.hasPermission("MANAGE_USERS")) throw new CustomError("Forbidden", 403);

        var user = isMe ? req.user : await User.getById(new ObjectId(id));
        if (!user) throw new Error("UserNotFound");

        var can = isMe ? ["email", "password", "avatar"] : ["permissions", "status"];
        if (!Object.keys(fields).every(a => can.includes(a))) throw new CustomError("Forbidden", 403);

        await user.doc.overwrite(fields).save({ validateBeforeSave: true });

        res.json(user.toJSON());
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// login
router.post("/auth/login", Auth.isAuthenticated, async (req, res) => {
    try {
        if (req.authenticated) throw new Error("AlreadyAuthenticated");

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
router.post("/auth/refresh", Auth.isAuthenticated, async (req, res) => {
    try {
        if (req.authenticated) throw new Error("AlreadyAuthenticated");

        var refresh = req.cookies.refresh;
        var session = await Session.getByRefresh(refresh);
        if (!session) throw new Error("InvalidRefresh");

        if (!session.doc.ips.includes(req.ip)) throw new CustomError("Forbidden", 403);

        var user = await User.getById(session.doc.userId);
        if (!user) throw new Error();

        await session.enable();

        res.cookie("token", session.doc.token, { expires: new Date(SESSION_EXPIRES_IN + session.doc.date) })
            .cookie("refresh", session.doc.refreshToken, { expires: new Date(REFRESH_SESSION_EXPIRES_IN + session.doc.date) })
            .json(user.toJSON());
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// revoke session
router.post("/auth/disconnect", Auth.requiresAuthentification, async (req, res) => {
    try {
        await req.session.disable();

        res.sendStatus(200);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// get products by type
router.get("/produces/:type", async (req, res) => {
    try {
        var type = req.params.type;
        if (typeof type != "string") throw new Error("InvalidRequest");

        var produces = await Produce.getByType(type);
        if (!produces) throw new Error("TypeDoesNotExist");

        res.json(produces.map(a => a.doc));
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// update product
// remove product
// get cart
// push to cart
router.put("/user/@me/cart", Auth.requiresAuthentification, async (req, res) => {
    try {
        var doc = req.body;
        if (!doc || !ObjectId.isValid(doc.id) || !Array.isArray(doc.features)) throw new Error("InvalidRequest");

        var produce = await Produce.getById(new ObjectId(doc.id));
        if (!produce) throw new Error("ProduceNotFound");

        var features = produce.features;
        for (const i in features) {
            var feature = features[i];
            var docF = doc.configuration.find(a => a.type == feature.type);
            if ((!feature.quantity.canModify && docF.quantity != feature.quantity.value) || docF.quantity > feature.quantity.max || docF.quantity < feature.quantity.min) throw new Error("InvalidProduce");
            if (feature.frequency) {
                if ((!feature.frequency.canModify && docF.frequency != feature.frequency.value) || docF.frequency > feature.frequency.max || docF.frequency < feature.frequency.min) throw new Error("InvalidProduce");
            }
        }

        var cart = await Cart.getByUserId(req.user.doc._id);
        if (!cart) cart = await Cart.create(req.user.doc._id, [doc]);
        else await cart.addProduce(doc);

        res.json(cart.doc);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// edit cart
// remove from cart
// buy produces
// get own produces
// get own produce
// revoke own produce
// update own produce

module.exports = router;