// Socket helper to avoid circular dependencies
let socketIO = null;

export const setSocketIO = (io) => {
  socketIO = io;
};

export const getSocketIO = () => {
  return socketIO;
};

