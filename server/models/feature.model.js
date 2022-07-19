const { Schema, model, default: mongoose } = require("mongoose");
const { default: isURL } = require("validator/lib/isURL");

const featureSchema = new Schema({
    type: { type: String, required: true, unique: true },
    icon: { type: String, required: true, validator: isURL },
    units: { type: { quantity: { type: String, required: true }, frequency: String, _id: false }, required: true },
    funcs: { type: { quantity: String, frequency: String, _id: false } }
});

const FeatureModel = model("Feature", featureSchema, "features");

class Feature {
    constructor(doc) {
        if (!doc) throw new Error("InvalidDocument");
        this.doc = doc;
    }

    /**
     * 
     * @param {Number} quantity 
     * @param {Number} [frequency] 
     */
    getPrice(quantity, frequency) {
        if (!this.doc.funcs?.quantity) return 0;
        var price = this.doc.funcs.quantity(quantity);
        if (!frequency || !this.doc.funcs.frequency) return price;
        return price + this.doc.funcs.frequency(frequency);
    }

    /**
     * 
     * @param {String} type 
     * @param {String} icon 
     * @param {{quantity:String,frequency?:String}} units 
     * @param {{quantity?:Function,frequency?:Function}} [func] 
     * @returns 
     */
    static async create(type, icon, units, func) {
        var doc = new FeatureModel({ type, icon, units, func });
        return new Feature(await doc.save());
    }

    static async getByType(type) {
        var doc = await FeatureModel.findOne({ type });
        if (!doc) return false;
        return new Feature(doc);
    }
}

module.exports = { Feature };