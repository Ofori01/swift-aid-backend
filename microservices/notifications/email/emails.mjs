import nodemailer from 'nodemailer'


const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com", 
    port: 465,
    secure: true,
    auth: {
      user: "your_email@gmail.com", //our email
      pass: "your_app_password", //app password for gmail after 2 step verification
    },
  });

// function createMail(recipient, subject, htmlMessage ) {
//   let mailOptions = {
//     from: 'oforidarkwah7@gmail.com',
//     to: recipient,
//     subject: subject,
//     html: htmlMessage
//   };
//   try {
//     transporter.sendMail(mailOptions, function(err, data) {
//       if (err) {
//         console.log("Error " + err);
//       } else {
//         console.log("Email sent successfully");
//       }
//     });
//   } catch (error) {
    
//   }
// }

// export {createMail}