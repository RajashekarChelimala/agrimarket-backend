const mongoose = require("mongoose");
const multer = require("multer");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const Vehicle = require("../models/vehicle");
const User = require("../models/user");
const AppError = require("../utils/appError");
const { fstat } = require("fs");

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/img/vehicles");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `vehicle-${Date.now()}.${ext}`);
  },
});

// const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please Upload Image Only!"), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const uploadVehicleImages = upload.array("images"); // it will automatically adds  req.files

const createVehicle = async (req, res, next) => {
  let imageFileNames = [];
  req.files.forEach((obj) => {
    imageFileNames.push(obj.filename);
  });

  let createdVehicle = new Vehicle({
    vehiclename: req.body.vehiclename,
    
    author: req.body.author,
    price: req.body.price,
    description: req.body.description,
   
    email: req.body.email,
    phone: req.body.phone,
    upi: req.body.upi,
    location: req.body.location,
    creator: req.user._id,
    images: imageFileNames,
  });


  try {
    console.log("req.user>>>",req.user);
    console.log("createdVehicle >> ",createdVehicle)
    await createdVehicle.save().catch((err)=>{
      console.log(err)
    });
    await User.findOneAndUpdate(
      { _id: req.user._id },
      { $push: { vehicles: createdVehicle } }
    );
    res.json({
      status: "success",
      data: {
        createdVehicle,
      },
    });
  } catch (err) {
    console.log(err.message)
    console.log(err)
    return next(
      new Error("Error While Inserting Created Vehicle Id in Users Vehicle Array!")
    );
  }



};

const updateVehicleById = async (req, res, next) => {

  const to_update = {
    //my code
    vehiclename: req.body.vehiclename,
    
    author: req.body.author,
    price: req.body.price,
    description: req.body.description,
    
    email: req.body.email,
    phone: req.body.phone,
    upi: req.body.upi,
    location: req.body.location,
    creator: req.user._id,
  };

  let imageFileNames = [];
  req.files.forEach((obj) => {
    imageFileNames.push(obj.filename);
  });
  if (imageFileNames.length === 0) {
    // delete
    console.log("zero images");
  } else {
    console.log("non zero images");
    to_update.images = imageFileNames;
  }

  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.vehicleId, to_update, {
      new: true, // to return newly updated document to client
      runValidators: true,
    });

    if (!vehicle) {
      return next(new AppError("No vehicle Found with given ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: vehicle,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};


const getAllVehicles = async (req, res, next) => {
  // console.log(" inside getAllVehicles function ::::::::::");
  try {
    let query = Vehicle.find();    
    let vehicles = await query; 
    if(req.query.q){
      const {q} =req.query;
      console.log("q>>>",q);
      const keys=[
        "vehiclename",
        "author",
        "description",
        "location"
      ];
      const search =  (data) => {
        return data.filter((item) => 
        keys.some((key)=> item[key].toLowerCase().includes(q))
        );
      };
      vehicles = search(vehicles);
    }


    res.json({
      status: "success",
      data: vehicles,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};


const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
    console.log(vehicle, req.params.vehicleId);

    if (!vehicle) {
      return next(new AppError("No vehicle Found with given ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: vehicle,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const getVehiclesByUserId = async (req, res, next) => {
  const userId = req.params.userId;
  let vehicles;
  try {
    vehicles = await User.findById(userId).populate("vehicles");
    console.log(vehicles);
    res.json({
      status: "success",
      data: vehicles,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const deleteVehicleById = async (req, res, next) => {
  let vehicleToDelete;
  try {
    vehicleToDelete = await Vehicle.findById(req.params.vehicleId);
  } catch (err) {
    return next(new AppError("No vehicle Found with given ID", 404));
  }

  console.log("vehicle To Delete >>> ", vehicleToDelete);
  let vehicle;
  try {
    vehicle = await Vehicle.findByIdAndDelete(req.params.vehicleId);
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message || "Error While Deleting vehicle",
    });
  }

  try {
    await User.findOneAndUpdate(
      { _id: vehicleToDelete.creator },
      { $pull: { vehicles: vehicleToDelete._id } }
    );
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message || "Error While poppig vehicle id from user document",
    });
  }

  // deleting uploaded vehicle Images
  if (process.env.VEHICLE_IMG_FILE_PATH) {
    for (let img_file of vehicleToDelete.images) {
      fs.unlink(`${process.env.VEHICLE_IMG_FILE_PATH}${img_file}`, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
  } else {
    console.log("Please Configure Path to files in env");
  }

  res.json({
    status: "success",
    data: vehicle,
  });
};

const protect = async (req, res, next) => {
  //1)Getting Token
  // console.log(req.headers);
  let token = "";
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new AppError("Your are not Logged In!", 401));
  }
  //2)Verification

  let decoded = "";
  // console.log(token)
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log("decoded :: ",decoded);
    const freshUser = await User.findById(decoded.id);
    console.log(" fresh user :: ",freshUser);
    req.user = freshUser;
  if (!freshUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }else if(decoded.admin===true){
      console.log("iam admin");
      return next();
    }
    else{
      console.log("in else condition");
      console.log(" req params :: ",req.params);
      let {vehicleId} = req.params;
      Vehicle.findById({id: vehicleId}, (err, doc)=>{
        if(err){
          // console.log("protect checked next, vehicle id not found")
          next()
        }
        else if(!doc || doc===null){
          res.status(404).json({message: `id:${vehicleId}, vehicle not found`})
        }else if(JSON.stringify(decoded._id)===JSON.stringify(doc.creator)){
          next()
        }
        else{
          res.status(403).json({message: "you do not have this permission"})
        }
      })
    }
  } catch (err) {
    return next(new AppError("Invalid JWT Token! Please Login Again!", 401));
  }
  //3)Check if user still exists
  // const freshUser = await User.findById(decoded.id);
  // if (!freshUser) {
  //   return next(
  //     new AppError(
  //       "The user belonging to this token does no longer exist.",
  //       401
  //     )
  //   );
  // }

  //4) Check if user changed password after token was issued
  // if password is changed recently throw error

  // grant access
};


exports.uploadVehicleImages = uploadVehicleImages;
exports.createVehicle = createVehicle;
exports.updateVehicleById = updateVehicleById;
exports.deleteVehicleById = deleteVehicleById;
exports.protect = protect;

exports.getAllVehicles = getAllVehicles;
exports.getVehicleById = getVehicleById;
exports.getVehiclesByUserId = getVehiclesByUserId;