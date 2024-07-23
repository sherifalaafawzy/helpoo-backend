const axios = require("axios");

class Notification {
   sendMessage(token, id, type) {
      const serverKey = process.env.FIREBASE_KEY;

      const notificationData = {
         data: {
            id: id,
            type: type,
         },
         to: token,
      };
      const headers = {
         "Content-Type": "application/json",
         Authorization: `key=${serverKey}`,
      };
      axios
         .post("https://fcm.googleapis.com/fcm/send", notificationData, {
            headers,
         })
         .then((response) => {
            console.log("Notification sent successfully:", response.data);
         })
         .catch((error) => {
            console.error("Error sending notification:", error);
         });
      return { message: "ok" };
   }

   sendNotification(token, title, body) {
      const serverKey = process.env.FIREBASE_KEY;

      const notificationData = {
         notification: {
            title: title,
            body: body,
         },
         to: token,
      };

      const headers = {
         "Content-Type": "application/json",
         Authorization: `key=${serverKey}`,
      };
      axios
         .post("https://fcm.googleapis.com/fcm/send", notificationData, {
            headers,
         })
         .then((response) => {
            console.log("Notification sent successfully:", response.data);
         })
         .catch((error) => {
            console.error("Error sending notification:", error);
         });
      return { message: "ok" };
   }

   sendNotificationWithData(token, title, body, id, type, useKey) {
      let serverKey = process.env.FIREBASE_KEY;
      if (useKey) {
         serverKey = process.env.INSPECTION_FIREBASE_KEY;
      }
      console.log(serverKey);
      console.log(token, title, body);
      const notificationData = {
         data: {
            id: id,
            type: type,
         },
         notification: {
            title: title,
            body: body,
         },
         to: token,
      };
      const headers = {
         "Content-Type": "application/json",
         Authorization: `key=${serverKey}`,
      };
      axios
         .post("https://fcm.googleapis.com/fcm/send", notificationData, {
            headers,
         })
         .then((response) => {
            console.log("Notification sent successfully:", response.data);
         })
         .catch((error) => {
            console.error("Error sending notification:", error);
         });
      return { message: "ok" };
   }
}

const notification = new Notification();
module.exports = notification;
