const express = require("express");

const productsControllers = require("../controllers/products-controllers");

const router = express.Router();

router.post(
  "/addnewproduct",
  productsControllers.protect,
  productsControllers.uploadProductImages,
  productsControllers.createProduct
);

router.patch(
  "/:productId",
  productsControllers.protect,
  productsControllers.uploadProductImages,
  productsControllers.updateProductById
);

// router
//   .route("/top-5-cheap")

router.get("/allproducts", productsControllers.getAllProducts);
router.get("/:productId", productsControllers.getProductById);
router.get("/products/:userId", productsControllers.getProductsByUserId);
router.delete(
  "/:productId",
  productsControllers.protect,
  productsControllers.deleteProductById
);

module.exports = router;