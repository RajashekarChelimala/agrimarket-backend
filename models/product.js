const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  
  productname: {type: String,required:true, trim: true},
  author:{type: String, required:true, trim: true},
  price:{type: Number, required:true, trim:true},
  quintals:{type: Number, required:true, trim:true},
  description:{type: String, required: false},
  images: [String],
 
  
  email: { type: String, required: false },
  phone: { type: Number, minlength: 10, required: false },
  upi: { type: String, required: true },
  location:{type: String, required: true},
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Product", productSchema);