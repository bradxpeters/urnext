/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
admin.initializeApp();

// Initialize SendGrid with your API key
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  throw new Error("SENDGRID_API_KEY environment variable is not set");
}
sgMail.setApiKey(apiKey);

interface PendingInvite {
  email: string;
  watchlistId: string;
  watchlistName: string;
  invitedBy: string;
  invitedByName: string;
  createdAt: admin.firestore.Timestamp;
}

export const handleNewInvite = functions.region("us-central1").firestore
  .document("pendingInvites/{inviteId}")
  .onCreate(async (snapshot: functions.firestore.QueryDocumentSnapshot) => {
    const invite = snapshot.data() as PendingInvite;
    if (!invite) {
      console.error("No invite data found");
      return;
    }

    // Create a unique signup link that includes the invite ID
    const signupLink = `https://ur-next.com/signup?invite=${snapshot.id}`;

    const msg = {
      to: invite.email,
      from: process.env.SENDGRID_FROM_EMAIL || "",
      subject: `${invite.invitedByName} invited you to join their watchlist`,
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
        ">
          <h2>You've been invited to join a watchlist!</h2>
          <p>
            ${invite.invitedByName} has invited you to join their watchlist 
            "${invite.watchlistName}" on urNext.
          </p>
          <p>
            urNext is an app that helps couples manage their shared watchlist
            of movies and TV shows.
          </p>
          <div style="margin: 30px 0;">
            <a href="${signupLink}" style="
              background-color: #1976d2; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 4px;
            ">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 0.9em;">
            If you can't click the button, copy and paste this link into your 
            browser:<br>
            ${signupLink}
          </p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      console.log("Email sent successfully to:", invite.email);

      // Update the invite document to mark it as sent
      await snapshot.ref.update({
        emailSent: true,
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send invitation email");
    }
  });
