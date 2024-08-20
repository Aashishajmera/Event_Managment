import { validationResult } from 'express-validator';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { UserEventDetailsModel } from '../model/UserEventDetails.Model.js';

// for using dotenv file
dotenv.config();

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SEND_EMAIL, // Your email address
        pass: process.env.SEND_EMAIL_PASSWORD, // Your email password
    },
});

// ADD NEW REGISTRATION
export const RegistrationForEvent = async (req, res, next) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }

        // Create user event registration
        const userEventDetails = await UserEventDetailsModel.create(req.body);

        // Populate the event details
        const populatedUserEventDetails = await UserEventDetailsModel
            .findById(userEventDetails._id)
            .populate('eventId');

        // Extract specific fields
        const { username, email } = populatedUserEventDetails;
        const { title, date, time, location } = populatedUserEventDetails.eventId;

        // Prepare email content
        const mailOptions = {
            from: 'thegreatayurveda@gmail.com',
            to: email,
            subject: `Registration Successful for ${title} event`,
            text: `
Dear ${username},
We are delighted to inform you that your registration for the event "${title}" has been successfully completed.

  **Event Details:**
 - **Title:** ${title}
 - **Date:** ${new Date(date).toDateString()}
 - **Time:** ${time}
 - **Location:** ${location}

Thank you for registering. We look forward to seeing you at the event

Best regards,
Event Managment Team`,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // Respond with success
        return res.status(201).json({
            msg: "User registered successfully and email sent.",
            userEventDetails: populatedUserEventDetails,
        });

    } catch (error) {
        console.error('Error during user registration or sending email', error);
        return res.status(500).json({ msg: "Internal server error..." });
    }
};
