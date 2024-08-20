import { validationResult } from "express-validator";
import { EventModel } from "../model/Event.Model.js";
import nodemailer from "nodemailer";
import dotenv from 'dotenv';
import mongoose from "mongoose";
import { UserEventDetailsModel } from "../model/UserEventDetails.Model.js";

// for using dotenv file
dotenv.config();

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SEND_EMAIL, // Your email address
    pass: process.env.SEND_EMAIL_PASSWORD, // Your email password
  },
});

// ADD NEW EVENT
export const addEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    const event = await EventModel.create(req.body);
    return res
      .status(201)
      .json({ msg: "Event successfully created...", event });
  } catch (error) {
    console.error("Error during adding event:", err);
    return res.status(500).json({ msg: "Internal server error..." });
  }
};

// FIND OUR EVENT
export const readOurEvent = async (req, res, next) => {
  try {
    const { userId } = req.body; // Assuming userId is passed in the request body

    if (!userId) {
      return res.status(400).json({ msg: "User ID is required" });
    }

    // Find events where userId matches
    const allEvents = await EventModel.find({ userId });

    // Log the retrieved events
    console.log("Retrieved events:", allEvents);

    if (allEvents.length === 0) {
      return res
        .status(404)
        .json({ msg: "No events found for the given user ID", allEvents });
    }

    return res
      .status(200)
      .json({ msg: "Events retrieved successfully", allEvents });
  } catch (error) {
    console.error("Error during get all events:", error);
    return res.status(500).json({ msg: "Internal server error..." });
  }
};

// READ ALL THE EVENTS
export const readAllEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    const allEvents = await EventModel.find();
    return res
      .status(201)
      .json({ msg: "Get all events successfully", allEvents });
  } catch (error) {
    console.error("Error during get all events:", error);
    return res.status(500).json({ msg: "Internal server error..." });
  }
};

// DELETE PARTICULAR EVENT
export const deleteEvent = async (req, res, next) => {
  try {
    const { _id } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    // get the event details for send the user as a delete the event
    const eventDetails = await EventModel.findById({ _id });

    if (!eventDetails) {
        return res.status(404).json({ msg: "Event not found" });
    }

    // ============================== for check the event ======================================
    const userListInEvent = await UserEventDetailsModel.find({ eventId: _id });

    if (!userListInEvent) {
      console.log("NO USER FOUND.....");
    }

    // =================================FOR SEND MAIL ======================================

    console.log("USER EMAIL LIST FOR THIS EVENT");

    // FOR OF LOOP FOR GETTING THE ALL EMAIL IN OBJECT OF ARRAY
    for (const user of userListInEvent) {
      // Prepare email content for event deletion
      const mailOptions = {
        from: "thegreatayurveda@gmail.com",
        to: user.email,
        subject: `Cancellation Notice: ${eventDetails.title} Event`,
        text: `
Dear ${user.username},

We regret to inform you that the "${
          eventDetails.title
        }" event, originally scheduled for:

  - **Date:** ${new Date(eventDetails.date).toDateString()}
  - **Time:** ${eventDetails.time}
  - **Location:** ${eventDetails.location}

has been cancelled.

We apologize for any inconvenience this cancellation may cause. If you have any questions or need further assistance, please do not hesitate to contact us.

Thank you for your understanding.

Best regards,
Event Management Team`,
      };

      // Send email
      await transporter.sendMail(mailOptions);
    }

    // =====================================================================================

    const deleteOneEvent = await EventModel.deleteOne({ _id });

    if (deleteOneEvent.deletedCount > 0) {
      if (userListInEvent.length != 0) {
        return res
          .status(200)
          .json({
            msg: "Event successfully deleted and send mail all the user",
            deleteOneEvent,
          });
      } else {
        return res
          .status(200)
          .json({
            msg: "Event successfully deleted and no any user for this event",
            deleteOneEvent,
          });
      }
    } else {
      return res.status(404).json({ msg: "Event not found" });
    }
  } catch (error) {
    console.error("Error during delete one event:", error);
    return res.status(500).json({ msg: "Internal server error..." });
  }
};

// UPDATE PARTICULAR EVENT
export const updateEvent = async (req, res, next) => {
  try {
    // Extract and validate input data
    const { id, title, description, date, time, location, capacity } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Invalid Event ID format" });
    }

    // ============================== for check the event ======================================
    const userListInEvent = await UserEventDetailsModel.find({ eventId: id });

    if (!userListInEvent) {
      console.log("NO USER FOUND.....");
    }

    // =========================================================================================

    // Update the event document
    const updatedEvent = await EventModel.findByIdAndUpdate(
      id,
      { title, description, date, time, location, capacity },
      { new: true, runValidators: true } // `new: true` returns the updated document, `runValidators: true` applies schema validation
    );

    if (!updatedEvent) {
      return res.status(404).json({ msg: "Event not found" });
    }

    // =================================FOR SEND MAIL ======================================

    console.log("USER EMAIL LIST FOR THIS EVENT");

    // FOR OF LOOP FOR GETTING THE ALL EMAIL IN OBJECT OF ARRAY
    for (const user of userListInEvent) {
      console.log(user.email); // Accesses the email property in each object

      // Prepare email content for event update
      const mailOptions = {
        from: "thegreatayurveda@gmail.com",
        to: user.email,
        subject: `Update: Changes to the ${title} Event`,
        text: `
Dear ${user.username},

We wanted to inform you about some important updates to the "${title}" event that you have registered for.

  **Updated Event Details:**
 - **Title:** ${title}
 - **Date:** ${new Date(date).toDateString()}
 - **Time:** ${time}
 - **Location:** ${location}

Please review the updated event details above. We apologize for any inconvenience these changes may cause and appreciate your understanding.

If you have any questions or need further assistance, feel free to contact us.

Best regards,
Event Management Team`,
      };

      // Send email
      await transporter.sendMail(mailOptions);
    }

    // =====================================================================================

    if (userListInEvent.length != 0) {
      return res.status(200).json({
        msg: "Event updated successfully and send mail all the user",
        updatedEvent,
      });
    } else {
      return res.status(200).json({
        msg: "Event updated successfully No user found cursponding this event",
        updatedEvent,
      });
    }
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};
