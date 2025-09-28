// // import nodemailer from "nodemailer";

// // const transporter = nodemailer.createTransport({
// //   service: "gmail",
// //   auth: {
// //     user: process.env.APP_EMAIL,
// //     pass: process.env.APP_PASSWORD,
// //   },
// // });

// // // Send mail
// // const mailOptions = {
// //   from: "gogulkanan143@gmailcom",
// //   to: "gogul@renambl.com",
// //   subject: "Hello from OAuth2!",
// //   html: "<p>This is a test email</p>",
// // };

// // export const sendMail = async () => {
// //   try {
// //     await transporter.sendMail(mailOptions);
// //   } catch (error) {
// //     console.log("errror-->", error);
// //   }
// // };

// import nodemailer from "nodemailer";
// import ejs from "ejs";
// import path from "path";
// import { fileURLToPath } from "url";

// // Get current directory for ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const transporter = nodemailer.createTransporter({
//   service: "gmail",
//   auth: {
//     user: process.env.APP_EMAIL,
//     pass: process.env.APP_PASSWORD,
//   },
// });

// export const sendOTPMail = async (recipientEmail, otpData) => {
//   try {
//     // Define the path to your EJS template
//     const templatePath = path.join(__dirname, "../views/email.ejs");

//     // Data to pass to the EJS template
//     const templateData = {
//       userName: otpData.userName || "Rider",
//       otp: otpData.otp,
//       expiryTime: otpData.expiryTime || "10 minutes",
//     };

//     // Render the EJS template
//     const htmlContent = await ejs.renderFile(templatePath, templateData);

//     // Mail options with rendered HTML
//     const mailOptions = {
//       from: process.env.APP_EMAIL, // Use environment variable
//       to: recipientEmail,
//       subject: "Indian Bikes - OTP Verification",
//       html: htmlContent,
//     };

//     // Send the email
//     const result = await transporter.sendMail(mailOptions);
//     console.log("Email sent successfully:", result.messageId);
//     return { success: true, messageId: result.messageId };
//   } catch (error) {
//     console.log("Error sending email:", error);
//     return { success: false, error: error.message };
//   }
// };

// // Alternative function if you want to keep the original structure
// export const sendMail = async (recipientEmail, userData = {}) => {
//   try {
//     const templatePath = path.join(__dirname, "../views/email.ejs");

//     const templateData = {
//       userName: userData.name || "Rider",
//       otp: userData.otp || "123456",
//       expiryTime: userData.expiryTime || "10 minutes",
//     };

//     const htmlContent = await ejs.renderFile(templatePath, templateData);

//     const mailOptions = {
//       from: process.env.APP_EMAIL,
//       to: recipientEmail,
//       subject: "Indian Bikes - OTP Verification",
//       html: htmlContent,
//     };

//     await transporter.sendMail(mailOptions);
//     console.log("Email sent successfully");
//   } catch (error) {
//     console.log("Error:", error);
//   }
// };

import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { ContactInput } from "../modules/contact/contact.model.ts";
import { success } from "zod";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.APP_EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

export const sendOTPMail = async (
  recipientEmail: string,
  otpData: Record<string, any>
) => {
  try {
    // Define the path to your EJS template
    const templatePath = path.join(__dirname, "../view/email.ejs");

    // Data to pass to the EJS template
    const templateData = {
      userName: otpData.userName || "Rider",
      otp: otpData.otp,
      expiryTime: otpData.expiryTime || "10 minutes",
    };

    // Render the EJS template
    const htmlContent = await ejs.renderFile(templatePath, templateData);

    // Mail options with rendered HTML
    const mailOptions = {
      from: process.env.APP_EMAIL, // Use environment variable
      to: recipientEmail,
      subject: "Indian Bikes - OTP Verification",
      html: htmlContent,
    };

    // Send the email
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.log("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

// Alternative function if you want to keep the original structure
export const sendMail = async (recipientEmail: string, message: string) => {
  try {
    const templatePath = path.join(__dirname, "../views/email.ejs");

    // const htmlContent = await ejs.renderFile(templatePath, templateData);

    // const mailOptions = {
    //   from: process.env.APP_EMAIL,
    //   to: recipientEmail,
    //   subject: "Indian Bikes - OTP Verification",
    //   html: htmlContent,
    // };

    // await transporter.sendMail(mailOptions);
    // console.log("Email sent successfully");
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};
