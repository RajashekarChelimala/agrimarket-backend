const express = require("express");

const paymentController = require("../controllers/payment-controllers");

const router = express.Router();

router.post("/checkout",paymentController.checkout);
router.post("/paymentverification",paymentController.paymentVerification);
router.get("/transactions/:userId",paymentController.getTransactions);
// router.post();

module.exports = router;
