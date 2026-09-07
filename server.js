import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  }),
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
  },
});

// Waiting users
let waitingUsers = [];

// Matched users
// userA -> userB
// userB -> userA
const peers = new Map();

// =========================
// MATCH USERS
// =========================

function matchUsers() {
  if (waitingUsers.length < 2) {
    return;
  }

  const userA = waitingUsers.shift();
  const userB = waitingUsers.shift();

  peers.set(userA, userB);
  peers.set(userB, userA);

  io.to(userA).emit("matched", {
    peerId: userB,
    initiator: true,
  });

  io.to(userB).emit("matched", {
    peerId: userA,
    initiator: false,
  });
}

// =========================
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  // =========================
  // FIND PERSON
  // =========================

  socket.on("find-person", () => {
    // Put user into waiting queue first
    if (!waitingUsers.includes(socket.id)) {
      waitingUsers.push(socket.id);
    }

    // Find current peer
    const oldPeer = peers.get(socket.id);

    // Remove old peer relationship
    if (oldPeer) {
      io.to(oldPeer).emit("peer-disconnected");

      peers.delete(socket.id);
      peers.delete(oldPeer);
    }

    // Try to find a new person
    matchUsers();
  });

  // =========================
  // SEND MESSAGE
  // =========================

  socket.on("send-message", ({ message }) => {
    const peerId = peers.get(socket.id);

    if (!peerId) {
      return;
    }

    io.to(peerId).emit("receive-message", {
      message,
      senderId: socket.id,
    });
  });

  // =========================
  // OFFER
  // =========================

  socket.on("offer", ({ offer, peerId }) => {
    io.to(peerId).emit("offer", {
      offer,
      peerId: socket.id,
    });
  });

  // =========================
  // ANSWER
  // =========================

  socket.on("answer", ({ answer, peerId }) => {
    io.to(peerId).emit("answer", {
      answer,
      peerId: socket.id,
    });
  });

  // =========================
  // ICE CANDIDATE
  // =========================

  socket.on("ice-candidate", ({ candidate, peerId }) => {
    io.to(peerId).emit("ice-candidate", {
      candidate,
      peerId: socket.id,
    });
  });

  // =========================
  // END CALL
  // =========================

  socket.on("end-call", () => {
    const peerId = peers.get(socket.id);

    if (!peerId) {
      return;
    }

    io.to(peerId).emit("peer-disconnected");

    peers.delete(socket.id);
    peers.delete(peerId);
  });

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    // Remove from waiting queue
    waitingUsers = waitingUsers.filter((id) => id !== socket.id);

    // Find peer
    const peerId = peers.get(socket.id);

    if (peerId) {
      io.to(peerId).emit("peer-disconnected");

      peers.delete(socket.id);
      peers.delete(peerId);
    }
  });

  socket.on("connect-with-friend", ({ friendId }) => {
    if (!friendId) {
      socket.emit("friend-connect-error", {
        message: "Friend ID is required.",
      });
      return;
    }

    if (friendId === socket.id) {
      socket.emit("friend-connect-error", {
        message: "You cannot connect with yourself.",
      });
      return;
    }

    const friend = io.sockets.sockets.get(friendId);

    if (!friend) {
      socket.emit("friend-connect-error", {
        message: "Friend not found. Please refresh and try again.",
      });
      return;
    }

    if (peers.get(friendId)) {
      socket.emit("friend-connect-error", {
        message: "This friend is already connected with someone.",
      });
      return;
    }

    if (peers.get(socket.id)) {
      socket.emit("friend-connect-error", {
        message: "You are already connected with someone.",
      });
      return;
    }

    peers.set(socket.id, friendId);
    peers.set(friendId, socket.id);

    io.to(socket.id).emit("friend-connected", {
      peerId: friendId,
      initiator: true,
    });

    io.to(friendId).emit("friend-connected", {
      peerId: socket.id,
      initiator: false,
    });
  });

  // OFFER
  socket.on("yourfriend-offer", ({ offer, peerId }) => {
    if (peers.get(socket.id) !== peerId) return;

    io.to(peerId).emit("yourfriend-offer", {
      offer,
      peerId: socket.id,
    });
  });

  // ANSWER
  socket.on("yourfriend-answer", ({ answer, peerId }) => {
    if (peers.get(socket.id) !== peerId) return;

    io.to(peerId).emit("yourfriend-answer", {
      answer,
      peerId: socket.id,
    });
  });

  // ICE
  socket.on("yourfriend-ice-candidate", ({ candidate, peerId }) => {
    if (peers.get(socket.id) !== peerId) return;

    io.to(peerId).emit("yourfriend-ice-candidate", {
      candidate,
      peerId: socket.id,
    });
  });

  // MESSAGE
  socket.on("yourfriend-message", ({ message }) => {
    const peerId = peers.get(socket.id);

    if (!peerId) return;

    io.to(peerId).emit("yourfriend-message", {
      message,
      senderId: socket.id,
    });
  });

  // END CALL
  socket.on("yourfriend-end-call", () => {
    const peerId = peers.get(socket.id);

    if (peerId) {
      io.to(peerId).emit("peer-disconnected");

      peers.delete(socket.id);
      peers.delete(peerId);
    }
  });
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
