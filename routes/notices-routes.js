const express = require("express");

const noticesControllers = require("../controllers/notices-controllers");

const router = express.Router();

router.post(
  "/addnewnotice",
  noticesControllers.protect,
  noticesControllers.uploadNoticeImages,
  noticesControllers.createNotice
);

router.patch(
  "/:noticeId",
  noticesControllers.protect,
  noticesControllers.uploadNoticeImages,
  noticesControllers.updateNoticeById
);

// router
//   .route("/top-5-cheap")

router.get("/allnotices", noticesControllers.getAllNotices);
router.get("/:noticeId", noticesControllers.getNoticeById);
router.get("/notices/:userId", noticesControllers.getNoticesByUserId);
router.post("/payment",async(req, res)=>{
  try {
      const { paymentMethodId, selectedUserId } = req.body;
      console.log(req.body)
  
      // Create a payment intent with the buyer's payment method ID and the selected user's Stripe account ID
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 100, // replace with the actual amount to charge
        currency: 'inr',
        payment_method: paymentMethodId,
        application_fee_amount: 10, // replace with the actual application fee to charge
        transfer_data: {
          destination: selectedUserId,
        },
      });
  
      // Confirm the payment intent to process the payment
      await stripe.paymentIntents.confirm(paymentIntent.id);
  
      // Payment was successful, return success message to the client
      res.json({ success: true });
    } catch (error) {
      console.log(error)
      // Payment failed, return error message to the client
      res.json({ success: false, message: error.message });
    }
  
});
router.delete(
  "/:noticeId",
  noticesControllers.protect,
  noticesControllers.deleteNoticeById
);

module.exports = router;