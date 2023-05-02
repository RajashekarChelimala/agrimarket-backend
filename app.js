// all configurations for exprees

const express = require("express");
const app = express(); // will add bunch of methods to app
const morgan = require("morgan"); // HTTP request Logger

const cors = require("cors");
const dotenv = require("dotenv");

const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

const AppError = require("./utils/appError");

// MiddleWares
app.use(express.json()); // body parser

// Data  sanitization against NoSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());

// CORS
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Credentials", "true");
//   res.setHeader(
//     "Access-Control-Allow-Methods",
//     "GET,HEAD,OPTIONS,POST,PUT,PATCH,DELETE"
//   );
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers,Authorization"
//   );
//   next();
// });

// curl -u <YOUR_KEY>:<YOUR_SECRET> \
// -X POST https://api.razorpay.com/v1/payouts \
// -H "Content-Type: application/json" \
// -d '{
//     "account_number": "7878780080316316",
//     "amount": 1000000,
//     "currency": "INR",
//     "mode": "UPI",
//     "purpose": "refund",
//     "fund_account": {
//         "account_type": "vpa",
//         "vpa": {
//             "address": "gauravkumar@exampleupi"
//         },
//         "contact": {
//             "name": "Gaurav Kumar",
//             "email": "gaurav.kumar@example.com",
//             "contact": "9876543210",
//             "type": "self",
//             "reference_id": "Acme Contact ID 12345",
//             "notes": {
//                 "notes_key_1": "Tea, Earl Grey, Hot",
//                 "notes_key_2": "Tea, Earl Grey… decaf."
//             }
//         }
//     },
//     "queue_if_low_balance": true,
//     "reference_id": "Acme Transaction ID 12345",
//     "narration": "Acme Corp Fund Transfer",
//     "notes": {
//         "notes_key_1": "Beam me up Scotty",
//         "notes_key_2": "Engage"
//     }
// }'


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// app.use(morgan("tiny"));
// app.use(express.static(`${__dirname}/routes`));
app.use(express.static(`${__dirname}/public`));

const usersRoutes = require("./routes/users-routes");
const productsRoutes = require("./routes/products-routes");
const vehiclesRoutes = require("./routes/vehicles-routes");
const noticesRoutes = require("./routes/notices-routes");
const paymentRoutes = require("./routes/payment-routes");
app.use("/api",paymentRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/notices", noticesRoutes);

// Routes

app.get("/api/getkey", (req, res) =>
  res.status(200).json({ key: process.env.RAZORPAY_API_KEY })
);




app.all("*", (req, res, next) => {
  next(new AppError(`Can't Find ${req.originalUrl} on this server!`, 404));
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

module.exports = app;
