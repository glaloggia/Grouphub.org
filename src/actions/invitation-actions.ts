
'use server';

/**
 * @fileOverview Handles sending invitations.
 *
 * - S_sendInvitationEmail - A function that simulates sending an invitation email.
 */

interface SendInvitationParams {
    recipientEmail: string;
    senderId: string;
    senderName: string;
}

export async function S_sendInvitationEmail(
    params: SendInvitationParams
): Promise<{ success: boolean; message: string }> {
    const { recipientEmail, senderName, senderId } = params;

    // Basic email validation
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        return { success: false, message: "Please provide a valid email address." };
    }

    // In a real application, you would integrate an email service like SendGrid, Resend, or use Firebase Extensions.
    // For this simulation, we will log the action to the console as if an email were sent.

    const inviteLink = `https://grouphub-2305e.web.app/signup?ref=${senderId}`;
    const emailBody = `
        Hello,

        Your friend ${senderName} has invited you to join GroupHub!

        GroupHub is a community platform where you can join groups, attend events, and connect with people who share your interests.

        Click here to sign up: ${inviteLink}

        See you there!
        The GroupHub Team
    `;

    console.log("--- SIMULATING EMAIL INVITATION ---");
    console.log(`To: ${recipientEmail}`);
    console.log(`From: noreply@grouphub.org`);
    console.log(`Subject: ${senderName} has invited you to join GroupHub!`);
    console.log(`Body: ${emailBody}`);
    console.log("------------------------------------");
    
    // You could optionally log this invitation to a Firestore collection for tracking.
    // For now, we'll just simulate the send.

    return { success: true, message: `Invitation successfully sent to ${recipientEmail}.` };
}
