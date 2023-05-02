const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  razorpay_order_id: {
    type: String,
    required: true,
  },
  razorpay_payment_id: {
    type: String,
    required: true,
  },
  razorpay_signature: {
    type: String,
    required: true,
  },
  seller:{
    type: String,
  },
  buyer:{
    type:String,
  },
  amount:{
    type:Number,
  },
  product:{
    type: String,
  }
});

// export const Payment = mongoose.model("Payment", paymentSchema);
module.exports = mongoose.model("Payment", paymentSchema);