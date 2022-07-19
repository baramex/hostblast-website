const { hash, compare } = require("bcrypt");
const { Schema, model, default: mongoose } = require("mongoose");
const { ObjectId } = mongoose.Types;
const { default: isEmail } = require("validator/lib/isEmail");
const { AVATAR_COUNT } = require("../utils/constants");
const { passwordRegex, nameRegex, permissionRegex } = require("../utils/regex");

const userSchema = new Schema({
    name: { type: { firstname: { type: String, validate: nameRegex, trim: true, required: true }, lastname: { type: String, validate: nameRegex, trim: true, required: true }, _id: false }, required: true },
    email: { type: String, validate: isEmail, unique: true, required: true, trim: true },
    avatar: { type: Number, default: 0, min: 0, max: AVATAR_COUNT },
    password: { type: String, required: true, validate: passwordRegex, trim: true },
    permissions: { type: [{ type: String, uppercase: true, validate: permissionRegex, trim: true }], default: [] },
    status: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) this.password = await hash(this.password, 10);
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

    /**
     * 
     * @param {String} permission 
     */
    hasPermission(permission) {
        if (this.doc.permissions.includes("*")) return true;
        return this.doc.permissions.includes(permission);
    }

    toJSON() {
        return { name: this.doc.name, email: this.doc.email, avatar: this.doc.avatar, date: this.doc.date };
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
        var doc = new UserModel({ name: { firstname, lastname }, email, password, avatar, permissions });
        return new User(await doc.save());
    }

    /**
     * 
     * @param {ObjectId} id 
     */
    static async getById(id) {
        var user = await UserModel.findById(id);
        if (!user) return false;
        return new User(user);
    }

    /**
     * 
     * @param {String} email 
     */
    static async getByEmail(email) {
        var user = await UserModel.findOne({ email });
        if (!user) return false;
        return new User(user);
    }
}

module.exports = { User };