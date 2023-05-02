// configuration for server

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Razorpay = require("razorpay");
dotenv.config({ path: "./config.env" });
const app = require("./app");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_APT_SECRET,
});

// console.log(app.get("env"));
// console.log(process.env);
// console.log(process.env.PORT);
console.log("ENVIRONMENT = " + process.env.NODE_ENV);
mongoose
  .connect(
    process.env.DATABASE_LOCAL,
    //    {
    //   useNewUrlParser: true,
    //   useCreateIndex: true,
    //   useFindAndModify: false, // to deal with deprecation warnings
    // }
    { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true }
  )
  .then((conn) => {
    // console.log(conn.connections);
    console.log("DB Connection Successful!");
  });
  
  app.post('/api/payment', async (req, res) => {
    
    // try {
    //   const { paymentMethodId, selectedUserId } = req.body;
    //   console.log(req.body)
  
    //   // Create a payment intent with the buyer's payment method ID and the selected user's Stripe account ID
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: 100, // replace with the actual amount to charge
    //     currency: 'inr',
    //     payment_method: paymentMethodId,
    //     application_fee_amount: 10, // replace with the actual application fee to charge
    //     transfer_data: {
    //       destination: selectedUserId,
    //     },
    //   });
  
    //   // Confirm the payment intent to process the payment
    //   await stripe.paymentIntents.confirm(paymentIntent.id);
  
    //   // Payment was successful, return success message to the client
    //   res.json({ success: true });
    // } catch (error) {
    //   console.log(error)
    //   // Payment failed, return error message to the client
    //   res.json({ success: false, message: error.message });
    // }
  
  });

// Starting Server
const port = 5000;
app.listen(port, () => {
  console.log(`App running on port ${port}....`);
});


exports.instance = instance;