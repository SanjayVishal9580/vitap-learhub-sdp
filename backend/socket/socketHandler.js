const Message = require('../models/Message');

const setupSocket = (io) => {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User comes online
    socket.on('user_online', (userId) => {
      console.log('User online:', userId);
      onlineUsers.set(userId, socket.id);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });

    // Join a group chat room
    socket.on('join_group', (groupId, callback) => {
      try {
        socket.join(`group_${groupId}`);
        console.log(`Socket ${socket.id} joined group_${groupId}`);
        if (callback) callback(null);
      } catch (error) {
        console.error('Error joining group:', error);
        if (callback) callback(error.message);
      }
    });

    // Leave a group chat room
    socket.on('leave_group', (groupId) => {
      socket.leave(`group_${groupId}`);
      console.log(`Socket ${socket.id} left group_${groupId}`);
    });

    // Send message in group (creates in DB then broadcasts)
    socket.on('send_message', async (data, callback) => {
      try {
        const { groupId, senderId, senderName, content, type } = data;
        console.log('Creating message:', { groupId, senderId, senderName, content });
        
        const message = await Message.create({
          groupId, senderId, senderName,
          content, type: type || 'text',
        });
        
        console.log('Message created:', message._id);
        io.to(`group_${groupId}`).emit('new_message', message);
        
        if (callback) callback(null);
      } catch (error) {
        console.error('Socket message error:', error);
        if (callback) callback(error.message);
      }
    });

    // Broadcast an already created message (used for file uploads)
    socket.on('broadcast_new_message', (message) => {
      console.log('Broadcasting message:', message._id);
      io.to(`group_${message.groupId}`).emit('new_message', message);
    });

    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(`group_${data.groupId}`).emit('user_typing', {
        userId: data.userId,
        userName: data.userName,
      });
    });

    socket.on('stop_typing', (data) => {
      socket.to(`group_${data.groupId}`).emit('user_stop_typing', {
        userId: data.userId,
      });
    });

    // Leaderboard update broadcast
    socket.on('xp_update', (data) => {
      io.emit('leaderboard_update', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit('online_users', Array.from(onlineUsers.keys()));
      console.log('User disconnected:', socket.id);
    });

    // Connection error handler
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = setupSocket;
