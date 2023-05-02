const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/payment");
const Product = require("../models/product");

const instance = new Razorpay({
  key_id: "rzp_test_4B0NYZua4ZFh1G",
  key_secret: "llEZj5k9wBhLjcxzmyQL6Ma0"
});

const checkout = async (req, res) => {
  console.log("in checkout function ::::::::::");
  const options = {
    amount: Number(req.body.amount * 100),
    currency: "INR",
  };
  let order;
  try{
    order = await instance.orders.create(options);
  }catch(err){
    console.log("ERROR IN PAYMENT CONTROLLER :: ",err);
  }

  res.status(200).json({
    success: true,
    order,
  });
};

const getTransactions= async(req,res)=>{
  const userId = req.params.userId;
  let transactions;
  try {
    transactions = await Payment.find({$or:[{seller:userId},{buyer:userId}]});
    console.log("Get Transactionsss+++++>",transactions);
    transactions.reverse();
    res.json({
      status: "success",
      data: transactions,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }


}

const paymentVerification = async (req, res) => {
  // const {seller,buyer}=req.params;
  // console.log("REQ Params",req.params);
  console.log("----REQ Query----",req.query.seller,req.query.buyer,req.query.amount,req.query.product,req.query.productId);
  // console.log("REQ body",req.body);
  // console.log("REQ body NOTES",req.body.notes);

  const {seller,buyer,amount,product,productId} = req.query;
  console.log("Deatils=======",seller,buyer,amount,product);

  console.log("Inside Verification::::::::::::::::::::::");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

    console.log("BODY++++++",req.body);


  const body = razorpay_order_id + "|" + razorpay_payment_id;

  console.log("Body >> ",body);

  const expectedSignature = crypto
    // .createHmac("sha256", process.env.RAZORPAY_APT_SECRET)
    .createHmac("sha256", "llEZj5k9wBhLjcxzmyQL6Ma0")
    .update(body.toString())
    .digest("hex");

    console.log("Expecteed sign",expectedSignature);
  const isAuthentic = expectedSignature === razorpay_signature;

  console.log("isAuthentic :: ",isAuthentic);
  if (isAuthentic) {
    // Database comes here
console.log("if block first");
    await Payment.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      seller,
      buyer,
      amount,
      product
    });
    console.log("if block lastr");

    if(productId){
      await Product.findByIdAndDelete(productId);
    }
    res.redirect(
      `${process.env.REACT_APP_URL}/paymentsuccess?reference=${razorpay_payment_id}`
    );
  } else {
    console.log("else condition ::::");
    res.status(400).json({
      success: false,
    });
  }
};


exports.paymentVerification = paymentVerification;
exports.checkout = checkout;
exports.getTransactions=getTransactions;