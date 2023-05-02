// route handlers
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const user = require("../models/user");
const User = require("../models/user");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

const signToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const getUsers = async (req, res, next) => {
  const users = await User.find();
  res.send(users);
};

const checkBody = async (req, res, next) => {
  if (!req.body.name || !req.body.password) {
    return res.status(400).json({
      status: "fail",
      message: "Missing Name or Password",
    });
  }
  next();
};

const signup = async (req, res, next) => {
  
  const { name, email, password } = req.body;
  console.log(name,email,password);
  try {
    const checkUserAlreadyExist = await User.find({ email: email });
   
    if (checkUserAlreadyExist.length > 0) {
      throw new Error(
        "Email Already Exists ! Please Try again with another email"
      );
    }
  } catch (err) {
    // console.log("err : ", err);
    return res.json({
      status: "fail",
      message: err.message,
    });
  }

  
  try {
    const createdUser = await User.create({
      name:name,
      email:email,
      password:password,
      admin: false,
    });

    const temp = {user: createdUser._id};
    const token = signToken(temp);
    
    res.status(201).json({
      status: "success",
      token,
      data: {
        user: createdUser,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  //1) if email and password exist

  if (!email || !password) {
    return next(new AppError("Please Provide Email and Password", 400));
  }

  //2) check if user exists and password is correct
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect Email or Password !", 401));
  }

  //3) if everything is ok ,send token to the client
  const payload = {
    id: user._id,
    admin: user.admin
  }
  const token = signToken(payload);
  res.status(200).json({
    status: "success",
    token,
    userId: user._id,
    admin: user.admin
  });
};

const forgotPassword = async (req, res, next) => {
  // console.log(">>", req.body.email);
  // 1) Get user on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with given Email", 404));
  }
  // 2) generate random token

  const resetToken = user.createPasswordResetToken();
  // await user.save();
  await user.save({ validateBeforeSave: false });

  // 3)  Send it to users Email
  // const resetURL = `${req.protocol}://${req.get(
  //   "host"
  // )}/api/users/resetPassword/${resetToken}`;
  const resetURL = `${process.env.REACT_APP_URL}/resetpassword/${resetToken}`;

  // console.log(resetURL);
  const message = `Forgot Your Password ? Submit a PATCH request with your new Password to : ${resetURL}.\nIf you didn't forgot your password,please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (only valid for 10 min)",
      message,
    });

    res.status(200).json({
      stauts: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.createPasswordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error while sending mail.Please try again Later!",
        500
      )
    );
  }
};
const resetPassword = async (req, res, next) => {
  //1) Get User based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  let user;
  try {
    user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  } catch (err) {
    next(new AppError("Invalid Reset Password Token", 404));
  }

  //2) if token is not expired and there is user then set the new password
  if (!user) {
    return next(new AppError("Token is Invalid or has Expired", 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  //3) update changedPasswordAt property  for the user
  // 4) log the user,send JWT
  const token = signToken({user: user._id, admin: user.admin});

  res.status(200).json({
    status: "success",
    token,
  });
};

const updatePassword = async (req, res, next) => {
  //1) Get USer from Collection
  let user = "";
  try {
    user = await User.findById(req.user.id).select("+password");
  } catch (err) {
    return next(new AppError("Error in Fetching User Collection", 500));
  }

  // validation for req.body should contain  passwordCurrent and password
  if (!req.body.passwordCurrent || !req.body.password) {
    return next(new AppError("Please Provide Current and New Password"));
  }

  //2) Check if password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your Current Password is Wrong!", 401));
  }
  //3) if so,update password
  user.password = req.body.password;
  try {
    await user.save(); // User.findByIdAndUpdate() will not work  as intended!
  } catch (err) {
    next(new AppError("Error in Saving to DB", 500));
  }
  //4) log user in and send JWT

  const token = signToken({user: user._id, admin: user.admin});
  res.status(200).json({
    status: "success",
    token,
  });
};

const protect = async (req, res, next) => {
  // console.log("In protect middle ware (req.body) >> ", req.body);
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
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log(decoded);
  } catch (err) {
    // console.log("Error : ", err);
    return next(new AppError("Invalid JWT Token! Please Login Again!", 401));
  }
  //3)Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  //4) Check if user changed password after token was issued
  // if password is changed recently throw error

  // grant access
  req.user = freshUser;
  // console.log("in end of usr protect middleware");
  // console.log("req.user : ", req.user);
  next();
};

const updateMe = async (req, res, next) => {
  // console.log("Req Body : >> ", req.body);
  //1) create error if posts password data
  if (req.body.password) {
    return next(new AppError("This route is not for updating password", 400));
  }
  //2) Update User data
  const user = await User.findById(req.user.id);
  const toUpdate = {
    name: req.body.name || user.name,
    email: req.body.email || user.email,
    phone: req.body.phone || user.phone,
    address: req.body.address || user.address,
  };
  console.log("User  : ", user);
  console.log("to Update : ", toUpdate);
  const updatedUser = await User.findByIdAndUpdate(req.user.id, toUpdate, {
    new: true,
    runValidators: true,
  }); //can't use save method since it runs validations

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
};

const deleteMe = async (req, res, next) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);
    res.json({
      status: "success",
      data: deletedUser,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

const getUserDetailsById = async (req, res, next) => {
  // console.log(req.user);
  try {
    // const userDetails = await User.findById(req.user._id);
    const userDetails = await User.findById(req.params.userId);
    res.json({
      status: "success",
      data: userDetails,
    });
  } catch (err) {
    console.log(
      "Error while getting user details in getUserDetailsById function"
    );
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};


exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.updatePassword = updatePassword;
exports.updateMe = updateMe;
exports.deleteMe = deleteMe;

exports.protect = protect;

exports.getUserDetailsById = getUserDetailsById;
exports.getUsers = getUsers;
exports.signup = signup;
exports.checkBody = checkBody;
exports.login = login;