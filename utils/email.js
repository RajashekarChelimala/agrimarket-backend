const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  //1) Creater a Transporter
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    //active gmail for less secure apps
  });
  //2) Define the mail Options
  const mailOptions = {
    form: "Sandeep Payili <miniproject@roomie.cse",
    to: options.email,
    subject: options.subject,
    text: options.message,
    //html:
  };
  //3) Actually Send the Mail
  await transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Email is Sent." + info.response);
    }
  });
};

module.exports = sendEmail;
