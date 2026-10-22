const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("CONNECTED:", socket.id);

  socket.emit("join_room", {
    serviceId: 1,
    userId: 3,
  });

  console.log("JOIN REQUEST SENT: service_1");
  console.log("USER ROOM REQUEST SENT: user_3");
});

socket.on("queue_updated", (data) => {
  console.log("QUEUE UPDATED EVENT RECEIVED!");
  console.log(data);
});

socket.on("your_turn", (data) => {
  console.log("YOUR TURN EVENT RECEIVED!");
  console.log(data);
});

socket.on("disconnect", (reason) => {
  console.log("DISCONNECTED:", reason);
});

socket.on("connect_error", (error) => {
  console.log("CONNECTION ERROR:", error.message);
});
