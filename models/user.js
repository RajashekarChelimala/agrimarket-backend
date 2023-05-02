const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Please Provide Name"], trim: true },
  email: {
    type: String,
    required: [true, "Please Provide Email"],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please Provide Password"],
    minlength: 6,
    select: false,
  },
  phone: { type: Number, minlength: 10 },
  address: { type: String, trim: true },
  products: [{ type: mongoose.Types.ObjectId, required: false, ref: "Product" }],
  vehicles: [{ type: mongoose.Types.ObjectId, required: false, ref: "Vehicle" }],
  passwordResetToken: String,
  passwordResetExpires: Date,
  admin:{
    type: Boolean,
    required: true
  }
});

userSchema.pre("save", async function (next) {
  // only run this if password was modified
  if (!this.isModified("password")) return next();

  //Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// userSchema.pre("save", function (next) {
//   if (!this.isModified("password") || this.isNew) return next();

//   this.passwordChangedAt
// });

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);