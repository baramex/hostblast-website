const { Schema, model, default: mongoose } = require("mongoose");
const { PRODUCE_STATUS } = require("../utils/constants");
const { Feature } = require("./feature.model");
const { ObjectId } = mongoose.Types;

const produceSchema = new Schema({
    type: { type: String, required: true },
    name: { type: String, required: true },
    stock: { type: Number, default: -1 },
    price: { type: Number, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    features: {
        type: [{
            type: { type: String, required: true, unique: true },
            model: String,
            quantity: { type: { canModify: { type: Boolean, default: false }, value: { type: Number, required: true }, min: Number, max: Number, _id: false }, required: true },
            frequency: { type: { canModify: { type: Boolean, default: false }, value: { type: Number, required: true }, min: Number, max: Number, _id: false } },
            _id: false
        }], required: true
    },
    status: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});

const ProduceModel = model("Produce", produceSchema, "produces");

class Produce {
    constructor(doc) {
        if (!doc) throw new Error("InvalidDocument");
        this.doc = doc;
    }

    async calculatePrice(configuration) {
        var price = this.doc.price || 0;

        for (const feature of this.doc.features) {
            var config = configuration.find(a => a.type == feature.type);
            var fconf = { type: feature.type };

            if (!config) {
                fconf.quantity = feature.quantity.value;
                if (feature.frequency) fconf.frequency = feature.frequency.value;
            }
            else {
                if ((feature.quantity.canModify && config.quantity != feature.quantity.value) && config.quantity <= feature.quantity.max && config.quantity >= feature.quantity.min) {
                    fconf.quantity = config.quantity;
                }

                if (feature.frequency) {
                    if ((feature.frequency.canModify && docF.frequency != feature.frequency.value) && docF.frequency <= feature.frequency.max && docF.frequency >= feature.frequency.min) {
                        fconf.frequency = config.frequency;
                    }
                }
            }

            var featureObject = await Feature.getByType(feature.type);
            price += featureObject.getPrice(fconf.quantity, fconf.frequency);
        }

        return price;
    }

    isAvailable() {
        return this.doc.stock > 0 || this.doc.stock == -1;
    }

    remove() {
        return this.doc.remove();
    }

    /**
     * 
     * @param {Number} stock 
     */
    async setStock(stock) {
        if (this.doc.stock == stock) return this;
        this.doc.stock = stock;
        await this.doc.save();
        return this;
    }

    /**
     * 
     * @param {Number} discount 
     */
    async setDiscount(discount) {
        if (this.doc.discount == discount) return this;
        this.doc.discount = discount;
        await this.doc.save();
        return this;
    }

    /**
     * 
     * @param {{type:String,model:String,quantity:{canModify: Boolean, value: Number, min: Number, max: Number},frequency:{canModify: String, value: Number, min: Number, max: Number}}} feature 
     */
    async addFeature(feature) {
        if (this.doc.features.find(a => a.type == feature.type)) return this;
        this.doc.features.push(feature);
        await this.doc.save();
        return this;
    }

    /**
     * 
     * @param {String} type 
     */
    async removeFeature(type) {
        var index = this.doc.features.findIndex(a => a.type == type);
        if (index == -1) return this;
        this.doc.features.splice(index, 1);
        await this.doc.save();
        return this;
    }

    /**
     * 
     * @param {String} type 
     * @param {String} name 
     * @param {Number} price 
     * @param {{type:String,model:String,quantity:{canModify: Boolean, value: Number, min: Number, max: Number},frequency:{canModify: String, value: Number, min: Number, max: Number}}[]} features 
     * @returns 
     */
    static async create(type, name, price, features) {
        var doc = new ProduceModel({ type, name, price, features });
        return new Produce(await doc.save());
    }

    /**
     * 
     * @param {ObjectId} id 
     */
    static async getById(id) {
        var doc = await ProduceModel.findById(id).where("status", PRODUCE_STATUS.AVAILABLE);
        if (!doc) return false;
        return new Produce(doc);
    }

    /**
     * 
     * @param {String} type 
     */
    static async getByType(type) {
        var docs = await ProduceModel.find({ type }).where("status", PRODUCE_STATUS.AVAILABLE);
        if (!docs || docs.length == 0) return false;
        return docs.map(a => new Produce(a));
    }
}

module.exports = { Produce };