const express = require("express");
const { User } = require("./models/user.model");
const { Auth, CustomError } = require("./utils/middleware");
const router = express.Router();

// create user
router.post("/user", Auth.isAuthenticated, (req, res) => {
    try {
        if (this.authenticated) throw new Error("AlreadyAuthed");

        const { firstname, lastname, email, password, avatar } = req.body || {};
        if (!firstname || !lastname || !email || !password) throw new Error("InvalidRequest");

        var user = await User.create(firstname, lastname, email, password, avatar);
        var session = 0;

        res.status(201).json(user.toJSON());
    } catch (error) {
        res.status(error.status || 400).send(error.message);
    }
});
// get user
// update user
// create session
// refresh session
// revoke session
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