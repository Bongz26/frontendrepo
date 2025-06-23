import axios from "axios";

export const sendWhatsAppNotification = async (clientNumber, orderId, estimatedTime) => {
    try {
        const response = await axios.post("https://api.twilio.com/send", {
            from: "whatsapp:+your_twilio_number",
            to: `whatsapp:${clientNumber}`,
            body: `Your paint mix is in progress! Order No: ${orderId}, ETC: ${estimatedTime} mins. Track via WhatsApp.`
        });
        console.log("WhatsApp Notification Sent:", response.data);
    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
    }
};