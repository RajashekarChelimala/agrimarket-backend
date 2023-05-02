const express = require("express");
const usersControllers = require("../controllers/users-controllers");

const router = express.Router();

router.param("id", (req, res, next, val) => {
  // validate all params at once in middleware
  console.log(`Id is : ${val}`);
  next();
});


router.get(
  "/:userId",
  // usersControllers.protect,
  usersControllers.getUserDetailsById
);

router.get("/", usersControllers.getUsers);
router.post("/signup", usersControllers.checkBody, usersControllers.signup);
router.post("/login", usersControllers.login);

router.post("/forgotPassword", usersControllers.forgotPassword);
router.patch("/resetPassword/:token", usersControllers.resetPassword);
router.patch(
  "/updateMyPassword",
  usersControllers.protect,
  usersControllers.updatePassword
);
router.patch("/updateMe", usersControllers.protect, usersControllers.updateMe);
router.delete("/deleteMe", usersControllers.protect, usersControllers.deleteMe);

module.exports = router;