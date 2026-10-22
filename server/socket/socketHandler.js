const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_room", ({ serviceId, userId }) => {
      const serviceRoom = `service_${serviceId}`;

      socket.join(serviceRoom);

      console.log(`Socket ${socket.id} joined ${serviceRoom}`);

      if (userId) {
        const userRoom = `user_${userId}`;

        socket.join(userRoom);

        console.log(`Socket ${socket.id} joined ${userRoom}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
