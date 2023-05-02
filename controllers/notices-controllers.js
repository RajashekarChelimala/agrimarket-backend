const mongoose = require("mongoose");
const multer = require("multer");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const Notice = require("../models/notice");
const User = require("../models/user");
const AppError = require("../utils/appError");
const { fstat } = require("fs");

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/img/notices");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `notice-${Date.now()}.${ext}`);
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

const uploadNoticeImages = upload.array("images"); // it will automatically adds  req.files

const createNotice = async (req, res, next) => {
  // let imageFileNames = [];
  // req.files.forEach((obj) => {
  //   imageFileNames.push(obj.filename);
  // });

  let createdNotice = new Notice({
    noticename: req.body.noticename,
    
    // author: req.body.author,
    // price: req.body.price,
    description: req.body.description,
   
    // email: req.body.email,
    // phone: req.body.phone,
    // creator: req.user._id,
    // images: imageFileNames,
  });


  try {
    console.log("req.user>>>",req.user);
    console.log("createdNotice >> ",createdNotice)
    await createdNotice.save().catch((err)=>{
      console.log(err)
    });
    await User.findOneAndUpdate(
      { _id: req.user._id },
      { $push: { notices: createdNotice } }
    );
    res.json({
      status: "success",
      data: {
        createdNotice,
      },
    });
  } catch (err) {
    console.log(err.message)
    console.log(err)
    return next(
      new Error("Error While Inserting Created Notice Id in Users Notice Array!")
    );
  }



};

const updateNoticeById = async (req, res, next) => {

  const to_update = {
    //my code
    noticename: req.body.noticename,
    
    author: req.body.author,
    price: req.body.price,
    description: req.body.description,
    
    email: req.body.email,
    phone: req.body.phone,
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
    const notice = await Notice.findByIdAndUpdate(req.params.noticeId, to_update, {
      new: true, // to return newly updated document to client
      runValidators: true,
    });

    if (!notice) {
      return next(new AppError("No notice Found with given ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: notice,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};


const getAllNotices = async (req, res, next) => {
  // console.log(" inside getAllNotices function ::::::::::");
  try {
    let query = Notice.find();    
    let notices = await query; 
    if(req.query.q){
      const {q} =req.query;
      console.log("q>>>",q);
      const keys=[
        "noticename",
        "description",
      ];
      const search =  (data) => {
        return data.filter((item) => 
        keys.some((key)=> item[key].toLowerCase().includes(q))
        );
      };
      notices = search(notices);
    }
    console.log("noticess >>>>>>>>>",notices);
    notices.reverse();
    console.log("noticess reverse :: >>>>>>>>>",notices);
    res.json({
      status: "success",
      data: notices,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};


const getNoticeById = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.noticeId);
    console.log(notice, req.params.noticeId);

    if (!notice) {
      return next(new AppError("No notice Found with given ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: notice,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const getNoticesByUserId = async (req, res, next) => {
  const userId = req.params.userId;
  let notices;
  try {
    notices = await User.findById(userId).populate("notices");
    console.log(notices);
    res.json({
      status: "success",
      data: notices,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const deleteNoticeById = async (req, res, next) => {
  let noticeToDelete;
  try {
    noticeToDelete = await Notice.findById(req.params.noticeId);
  } catch (err) {
    return next(new AppError("No notice Found with given ID", 404));
  }

  console.log("notice To Delete >>> ", noticeToDelete);
  let notice;
  try {
    notice = await Notice.findByIdAndDelete(req.params.noticeId);
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message || "Error While Deleting notice",
    });
  }

  try {
    await User.findOneAndUpdate(
      { _id: noticeToDelete.creator },
      { $pull: { notices: noticeToDelete._id } }
    );
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message || "Error While poppig notice id from user document",
    });
  }

  // deleting uploaded notice Images
  if (process.env.NOTICE_IMG_FILE_PATH) {
    for (let img_file of noticeToDelete.images) {
      fs.unlink(`${process.env.NOTICE_IMG_FILE_PATH}${img_file}`, (err) => {
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
    data: notice,
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
      let {noticeId} = req.params;
      Notice.findById({id: noticeId}, (err, doc)=>{
        if(err){
          // console.log("protect checked next, notice id not found")
          next()
        }
        else if(!doc || doc===null){
          res.status(404).json({message: `id:${noticeId}, notice not found`})
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


exports.uploadNoticeImages = uploadNoticeImages;
exports.createNotice = createNotice;
exports.updateNoticeById = updateNoticeById;
exports.deleteNoticeById = deleteNoticeById;
exports.protect = protect;

exports.getAllNotices = getAllNotices;
exports.getNoticeById = getNoticeById;
exports.getNoticesByUserId = getNoticesByUserId;