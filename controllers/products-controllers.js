const mongoose = require("mongoose");
const multer = require("multer");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const Product = require("../models/product");
const User = require("../models/user");
const AppError = require("../utils/appError");
const { fstat } = require("fs");

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/img/products");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `product-${Date.now()}.${ext}`);
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

const uploadProductImages = upload.array("images"); // it will automatically adds  req.files

const createProduct = async (req, res, next) => {
  let imageFileNames = [];
  req.files.forEach((obj) => {
    imageFileNames.push(obj.filename);
  });

  let createdProduct = new Product({
    productname: req.body.productname,
    
    author: req.body.author,
    price: req.body.price,
    quintals: req.body.quintals,
    description: req.body.description,
   
    email: req.body.email,
    phone: req.body.phone,
    creator: req.user._id,
    upi:req.body.upi,
    location:req.body.location,
    images: imageFileNames,
  });


  try {
    console.log("req.user>>>",req.user);
    console.log("createdProduct >> ",createdProduct)
    await createdProduct.save().catch((err)=>{
      console.log(err)
    });
    await User.findOneAndUpdate(
      { _id: req.user._id },
      { $push: { products: createdProduct } }
    );
    res.json({
      status: "success",
      data: {
        createdProduct,
      },
    });
  } catch (err) {
    console.log(err.message)
    console.log(err)
    return next(
      new Error("Error While Inserting Created Product Id in Users Product Array!")
    );
  }



};

const updateProductById = async (req, res, next) => {

  const to_update = {
    //my code
    productname: req.body.productname,
    
    author: req.body.author,
    price: req.body.price,
    quintals: req.body.quintals,
    description: req.body.description,
    
    email: req.body.email,
    phone: req.body.phone,
    creator: req.user._id,
    upi:req.body.upi,
    location:req.body.location,
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
    const product = await Product.findByIdAndUpdate(req.params.productId, to_update, {
      new: true, // to return newly updated document to client
      runValidators: true,
    });

    if (!product) {
      return next(new AppError("No product Found with given ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};


const getAllProducts = async (req, res, next) => {
  try {

    let query = Product.find();
    // console.log("products >>",products);
    
    let products = await query; 
    if(req.query.q){
      const {q} =req.query;
      console.log("q>>>",q);
      const keys=[
        "productname",
        "author",
        "description",
        "location"
      ];
      const search =  (data) => {
        return data.filter((item) => 
        keys.some((key)=> item[key].toLowerCase().includes(q))
        );
      };
      products = search(products);
    }

    res.json({
      status: "success",
      data: products,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    console.log(product, req.params.productId);

    if (!product) {
      return next(new AppError("No product Found with given ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const getProductsByUserId = async (req, res, next) => {
  const userId = req.params.userId;
  let products;
  try {
    products = await User.findById(userId).populate("products");
    console.log(products);
    res.json({
      status: "success",
      data: products,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const deleteProductById = async (req, res, next) => {
  let productToDelete;
  try {
    productToDelete = await Product.findById(req.params.productId);
  } catch (err) {
    return next(new AppError("No product Found with given ID", 404));
  }

  console.log("product To Delete >>> ", productToDelete);
  let product;
  try {
    product = await Product.findByIdAndDelete(req.params.productId);
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message || "Error While Deleting product",
    });
  }

  try {
    await User.findOneAndUpdate(
      { _id: productToDelete.creator },
      { $pull: { products: productToDelete._id } }
    );
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message || "Error While poppig product id from user document",
    });
  }

  // deleting uploaded product Images
  if (process.env.PRODUCT_IMG_FILE_PATH) {
    for (let img_file of productToDelete.images) {
      fs.unlink(`${process.env.PRODUCT_IMG_FILE_PATH}${img_file}`, (err) => {
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
    data: product,
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
    const freshUser = await User.findById(decoded.id);
    req.user = freshUser
  if (!freshUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }
    else if(decoded.admin===true){
      console.log("iam admin")
      return next()
    }
    else{
      console.log("in else condition");
      console.log(" req params :: ",req.params);
      let {productId} = req.params;
      Product.findById({id: productId}, (err, doc)=>{
        if(err){
          // console.log("protect  checked next, product id not found")
          next()
        }
        else if(!doc || doc===null){
          res.status(404).json({message: `id:${productId}, product not found`})
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


exports.uploadProductImages = uploadProductImages;
exports.createProduct = createProduct;
exports.updateProductById = updateProductById;
exports.deleteProductById = deleteProductById;
exports.protect = protect;

exports.getAllProducts = getAllProducts;
exports.getProductById = getProductById;
exports.getProductsByUserId = getProductsByUserId;