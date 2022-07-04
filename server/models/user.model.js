const { hash, compare } = require("bcrypt");
const { Schema, model, default: mongoose } = require("mongoose");
const { ObjectId } = mongoose.Types;
const { default: isEmail } = require("validator/lib/isEmail");
const { AVATAR_COUNT } = require("../utils/constants");
const { passwordRegex, nameRegex } = require("../utils/regex");

const userSchema = new Schema({
    name: { type: { firstname: { type: String, validate: nameRegex, required: true }, lastname: { type: String, validate: nameRegex, required: true }, _id: false }, required: true },
    email: { type: String, validate: isEmail, unique: true, required: true },
    avatar: { type: Number, default: 0, min: 0, max: AVATAR_COUNT },
    password: { type: String, required: true, validate: passwordRegex },
    permissions: { type: [{ type: String, uppercase: true, validate: permissionRegex }], default: [] },
    date: { type: Date, default: Date.now }
});

userSchema.pre("save", function (next) {
    this.password = await hash(this.password, 10);
    next();
});

const UserModel = model("User", userSchema, "users");

class User {
    constructor(doc) {
        if (!doc) throw new Error("InvalidDocument");
        this.doc = doc;
    }

    /**
     * 
     * @param {String} password 
     */
    check(password) {
        return compare(password, this.doc.password);
    }

    toJSON() {
        return { name, email, avatar, date } = this.doc;
    }

    /**
     * 
     * @param {String} firstname 
     * @param {String} lastname 
     * @param {String} email 
     * @param {String} password 
     * @param {Number} [avatar]
     * @param {String[]} [permissions]
     */
    static async create(firstname, lastname, email, password, avatar, permissions) {
        var doc = new UserModel({ firstname, lastname, email, password, avatar, permissions });
        return new User(await doc.save());
    }

    /**
     * 
     * @param {ObjectId} id 
     */
    static async getById(id) {
        return new User(await UserModel.findById(id));
    }
}

module.exports = { User };