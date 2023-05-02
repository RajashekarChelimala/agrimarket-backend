const express = require("express");

const vehiclesControllers = require("../controllers/vehicles-controllers");

const router = express.Router();

router.post(
  "/addnewvehicle",
  vehiclesControllers.protect,
  vehiclesControllers.uploadVehicleImages,
  vehiclesControllers.createVehicle
);

router.patch(
  "/:vehicleId",
  vehiclesControllers.protect,
  vehiclesControllers.uploadVehicleImages,
  vehiclesControllers.updateVehicleById
);

// router
//   .route("/top-5-cheap")

router.get("/allvehicles", vehiclesControllers.getAllVehicles);
router.get("/:vehicleId", vehiclesControllers.getVehicleById);
router.get("/vehicles/:userId", vehiclesControllers.getVehiclesByUserId);
router.delete(
  "/:vehicleId",
  vehiclesControllers.protect,
  vehiclesControllers.deleteVehicleById
);

module.exports = router;