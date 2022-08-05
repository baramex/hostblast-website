const { Schema, model, default: mongoose } = require("mongoose");
const { Produce } = require("./produce.model");
const { ObjectId } = mongoose.Types;

const cartSchema = new Schema({
    userId: { type: ObjectId, required: true },
    produces: {
        type: [{
            id: { type: ObjectId, required: true },
            configuration: [{
                type: { type: String, required: true, unique: true },
                quantity: Number,
                frequency: Number,
                _id: false
            }],
            quantity: { type: Number, default: 1, min: 1, max: 5 }
        }], default: []
    },
    date: { type: Date, default: Date.now }
});

const CartModel = model("Cart", cartSchema, "carts");

class Cart {
    constructor(doc) {
        if (!doc) throw new Error("InvalidDocument");
        this.doc = doc;
    }

    async fetchProduces() {
        var produces = [];
        for (const p of this.doc.produces) {
            var id = p.id;
            var fp = await Produce.getById(id);
            var price = await fp.calculatePrice(p.configuration);
            produces.push({ ...(fp.doc._doc), ...p._doc, price });
        }
        return produces;
    }

    async removeAllProduces() {
        this.doc.produces = [];
        await this.doc.save();
        return this;
    }

    async totalPrice() {
        return this.doc.produces.map(async a => await (await Produce.getById(a.id)).calculatePrice(a.configuration)).reduce((p, c) => p + c, 0);
    }

    /**
     * 
     * @param {ObjectId} id 
     */
    async removeProduce(id) {
        var l = this.doc.produces.length;
        this.doc.produces = this.doc.produces.filter(a => !a._id.equals(id));
        await this.doc.save();
        return l != this.doc.produces.length;
    }

    /**
     * 
     * @param {ObjectId} id 
     */
    getProduce(id) {
        return this.doc.produces.find(a => a._id == id);
    }

    /**
     * 
     * @param {ObjectId} id 
     * @param {*} doc 
     */
    async updateProduce(id, doc) {
        var prod = this.getProduce(id);
        if (!prod) throw new Error("ProduceNotFound");
        if (!await Cart.validateProduce(doc)) throw new Error("InvalidProduce");
        prod = doc;
        return await this.doc.save();
    }

    addProduce(produce) {
        return this.addProduces([produce]);
    }

    /**
     * 
     * @param {[]} produces 
     */
    async addProduces(produces) {
        if (!await Cart.validateProduces(produces)) throw new Error("InvalidProduces");
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
        if (!await Cart.validateProduces(produces)) throw new Error("InvalidProduces");
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

    static async validateProduces(docs) {
        return docs.every(async a => await Cart.validateProduce(a));
    }

    static async validateProduce(doc) {
        var produce = await Produce.getById(new ObjectId(doc.id));
        if (!produce) return false;

        var features = produce.features;
        for (const feature of features) {
            var docF = doc.configuration.find(a => a.type == feature.type);
            if ((!feature.quantity.canModify && docF.quantity != feature.quantity.value) || docF.quantity > feature.quantity.max || docF.quantity < feature.quantity.min) return false;
            if (feature.frequency) {
                if ((!feature.frequency.canModify && docF.frequency != feature.frequency.value) || docF.frequency > feature.frequency.max || docF.frequency < feature.frequency.min) return false;
            }
        }

        return true;
    }
}

module.exports = { Cart };