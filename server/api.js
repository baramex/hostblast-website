const express = require("express");
const { default: mongoose } = require("mongoose");
const { Cart } = require("./models/cart.model");
const { Feature } = require("./models/feature.model");
const { Produce } = require("./models/produce.model");
const { ObjectId } = mongoose.Types;
const { Session } = require("./models/session.model");
const { User } = require("./models/user.model");
const { SESSION_EXPIRES_IN, REFRESH_SESSION_EXPIRES_IN } = require("./utils/constants");
const { Auth, CustomError } = require("./utils/middleware");
const paypal = require("paypal-rest-sdk");
const router = express.Router();

const { PAYPAL_CLIENT_ID, PAYPAL_SECRET } = process.env;
paypal.configure({ client_id: PAYPAL_CLIENT_ID, client_secret: PAYPAL_SECRET, mode: "sandbox" });

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
            .cookie("token", session.doc.token, { expires: new Date(SESSION_EXPIRES_IN * 1000 + session.doc.date.getTime()) })
            .cookie("refresh", session.doc.refreshToken, { expires: new Date(REFRESH_SESSION_EXPIRES_IN * 1000 + session.doc.date.getTime()) })
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

        var email = req.body?.email;
        var password = req.body?.password;

        var user = await User.getByEmail(email);
        if (!user || !await user.check(password)) throw new CustomError("WrongCredentials", 401);

        var session = await Session.getByUserId(user.doc._id);
        if (!session) await Session.create(user.doc._id, req.ip);
        else {
            await session.addIp(req.ip);
            await session.enable();
        }

        res.cookie("token", session.doc.token, { expires: new Date(SESSION_EXPIRES_IN * 1000 + session.doc.date.getTime()) })
            .cookie("refresh", session.doc.refreshToken, { expires: new Date(REFRESH_SESSION_EXPIRES_IN * 1000 + session.doc.date.getTime()) })
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

        res.cookie("token", session.doc.token, { expires: new Date(SESSION_EXPIRES_IN * 1000 + session.doc.date.getTime()) })
            .cookie("refresh", session.doc.refreshToken, { expires: new Date(REFRESH_SESSION_EXPIRES_IN * 1000 + session.doc.date.getTime()) })
            .json(user.toJSON());
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// revoke session
router.post("/auth/disconnect", Auth.requiresAuthentification, async (req, res) => {
    try {
        await req.session.disable(true);

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

// create produce
router.post("/produce", Auth.requiresAuthentification, async (req, res) => {
    try {
        if (!req.user.hasPermission("CREATE_PRODUCE")) throw new CustomError("Forbidden", 403);

        var { type, name, price, features } = req.body;
        if (!type || !name || !Number(price) || !Array.isArray(features)) throw new Error("InvalidRequest");

        for (const feature of features) {
            var { type, quantity } = feature;
            if (!type || !quantity) throw new Error("InvalidFeatures");
            var f = await Feature.getByType(type);
            if (!f) throw new Error("TypeDoesNotExist");
        }

        var produce = await Produce.create(type, name, price, features);

        res.status(201).json(produce.doc);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// update produce
router.put("/produce/:id", Auth.requiresAuthentification, async (req, res) => {
    try {
        if (!req.user.hasPermission("MANAGE_PRODUCES")) throw new CustomError("Forbidden", 403);

        if (!ObjectId.isValid(req.params.id)) throw new Error("InvalidRequest");

        var features = req.body.features;
        if (features) {
            for (const feature of features) {
                var { type, quantity } = feature;
                if (!type || !quantity) throw new Error("InvalidFeatures");
                var f = await Feature.getByType(type);
                if (!f) throw new Error("TypeDoesNotExist");
            }
        }

        var produce = await Produce.getById(req.params.id);
        await produce.doc.overwrite(req.body).save({ validateBeforeSave: true });

        res.status(201).json(produce.doc);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// remove produce
router.delete("/produce/:id", Auth.requiresAuthentification, async (req, res) => {
    try {
        if (!req.user.hasPermission("MANAGE_PRODUCES")) throw new CustomError("Forbidden", 403);

        if (!ObjectId.isValid(req.params.id)) throw new Error("InvalidRequest");
        var produce = await Produce.getById(new ObjectId(req.params.id));
        await produce.remove();

        res.sendStatus(200);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
})

// get cart
router.get("/user/@me/cart", Auth.requiresAuthentification, async (req, res) => {
    try {
        var cart = await Cart.getByUserId(req.user.doc._id);

        res.json(cart?.doc?.produces || []);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// push to cart
router.put("/user/@me/cart", Auth.requiresAuthentification, async (req, res) => {
    try {
        var doc = req.body;
        if (!doc || !ObjectId.isValid(doc.id) || !Array.isArray(doc.configuration)) throw new Error("InvalidRequest");

        var cart = await Cart.getByUserId(req.user.doc._id);
        if (!cart) cart = await Cart.create(req.user.doc._id, [doc]);
        else await cart.addProduce(doc);

        res.json(cart.doc);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// edit from cart
router.put("/user/@me/cart/:id", Auth.requiresAuthentification, async (req, res) => {
    try {
        var doc = req.body;
        if (!doc || !ObjectId.isValid(doc.id) || !Array.isArray(doc.configuration)) throw new Error("InvalidRequest");

        var cart = await Cart.getByUserId(req.user.doc._id);
        if (!cart) throw new Error("InvalidCart");

        await cart.updateProduce(req.params.id, doc);

        res.json(cart.doc);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// remove from cart
router.delete("/user/@me/cart/:id", Auth.requiresAuthentification, async (req, res) => {
    try {
        var cart = await Cart.getByUserId(req.user.doc._id);
        var isFound = await cart.removeProduce(req.params.id);

        if (!isFound) throw new Error("ProduceNotFound");

        res.sendStatus(200);
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// buy produces
router.post("/payment/paypal", Auth.requiresAuthentification, async (req, res) => {
    try {
        var cart = await Cart.getByUserId(req.user.doc._id);
        if (!cart || cart.doc.produces.length == 0) throw new Error("EmptyCart");

        var produces = await cart.fetchProduces();

        var paymentData = {
            intent: "sale",
            payer: {
                payment_method: "paypal"
            },
            redirect_urls: {
                return_url: req.headers.referer.split("").reverse().splice(1).reverse().join("") + req.originalUrl + "/success",
                cancel_url: req.headers.referer.split("").reverse().splice(1).reverse().join("") + req.originalUrl + "/error"
            },
            transactions: [{
                item_list: {
                    items: produces.map(p => (
                        {
                            name: p.type + "-" + p.name,
                            sku: p.id, price: p.price,
                            currency: "EUR",
                            quantity: p.quantity
                        }
                    ))
                },
                amount: {
                    currency: "EUR",
                    total: produces.map(p => p.price).reduce((p, c) => p + c, 0)
                },
                description: "Achat de " + produces.length + " items du panier."
            }]
        };

        paypal.payment.create(paymentData, (err, payment) => {
            if (err) return res.status(err.httpStatusCode).send(err.response.error_description || err.response.message);

            res.json({ redirect_url: payment.links.find(a => a.rel == "approval_url").href });
        });
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

router.get("/payment/success", Auth.requiresAuthentification, async (req, res) => {
    try {
        var cart = await Cart.getByUserId(req.user.doc._id);
        if (!cart || cart.doc.produces.length == 0) throw new Error("EmptyCart");

        var produces = await cart.fetchProduces();

        const paymentInfo = {
            paymentId: req.query.paymentId,
            paerId: req.query.PayerID
        };

        const paymentData = {
            payer_id: paymentInfo.paerId,
            transactions: [{
                amount: {
                    currency: "EUR",
                    total: produces.map(p => p.price).reduce((p, c) => p + c, 0)
                }
            }]
        };

        paypal.payment.execute(paymentInfo.paymentId, paymentData, async (err, payment) => {
            try {
                if (err) throw new CustomError(err.response.error_description || err.response.message, err.httpStatusCode);

                await cart.removeAllProduces();
                res.redirect("/");
            } catch (error) {
                res.status(error.status || 400).send(error.message);
            }
        });
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});

// get own produces
// get own produce
// revoke own produce
// update own produce

module.exports = router;