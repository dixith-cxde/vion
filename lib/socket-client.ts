import { io, Socket } from "socket.io-client";

let socket: Socket;

export function getSocket(userId: string) {
  if (!socket) {
    socket = io("http://localhost:4000");

    socket.on("connect", () => {
      socket.emit("join", { userId });
    });
  }

  return socket;
}
