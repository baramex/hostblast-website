const { Schema, model, default: mongoose } = require("mongoose");
const { Produce } = require("./produce.model");
const { ObjectId } = mongoose.Types;

const cartSchema = new Schema({
    userId: { type: ObjectId, required: true },
    produces: [{
        type: [{
            id: { type: ObjectId, required: true },
            configuration: [{
                type: { type: String, required: true, unique: true },
                quantity: Number,
                frequency: Number,
                _id: false
            }],
            quantity: { type: Number, default: 1, min: 1, max: 5 },
            _id: false
        }], default: []
    }],
    date: { type: Date, default: Date.now }
});

const CartModel = model("Cart", cartSchema, "carts");

class Cart {
    constructor(doc) {
        if (!doc) throw new Error("InvalidDocument");
        this.doc = doc;
    }

    async removeAllProduces() {
        this.doc.produces = [];
        await this.doc.save();
        return this;
    }

    async totalPrice() {
        return this.doc.produces.map(async a => await (await Produce.getById(a.id)).calculatePrice(a.configuration)).reduce((p, c) => p + c, 0);
    }

    async addProduce(produce) {
        return await this.addProduces([produce]);
    }

    /**
     * 
     * @param {[]} produces 
     */
    async addProduces(produces) {
        this.doc.produces.push(...produces);
        await this.doc.save();
        return this;
    }

    /**
     * 
     * @param {ObjectId} userId 
     * @param {[]} produces 
     * @returns 
     */
    static async create(userId, produces) {
        var doc = new CartModel({ userId, produces });
        return new Cart(await doc.save());
    }

    /**
     * 
     * @param {ObjectId} userId 
     */
    static async getByUserId(userId) {
        var doc = await CartModel.findOne({ userId });
        if (!doc) return false;
        return new Cart(doc);
    }
}

module.exports = { Cart };