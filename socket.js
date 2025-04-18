const socketIO = require('socket.io');
const Message = require('./models/message');
const User = require('./models/user');

let io;

function initializeSocket(server) {
    io = socketIO(server, {
        cors: {
            origin: ['http://local.myapp.com:8080', 'http://127.0.0.1:8080', 'http://192.168.0.18:8080'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            // Verify user session (simplified example)
            const userId = socket.handshake.auth.userId;
            if (!userId) {
                return next(new Error('Authentication error'));
            }

            const user = await User.getById(userId);
            if (!user) {
                return next(new Error('User not found'));
            }

            socket.userId = userId;
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // Join room for user's own ID for private messages
        socket.join(socket.userId);

        // Handle message sending
        socket.on('send_message', async (messageData, callback) => {
            try {
                const message = await Message.create({
                    sender_id: socket.userId,
                    recipient_id: messageData.recipient_id,
                    content: messageData.content,
                    project_id: messageData.project_id || null
                });

                // Эмитим полный объект сообщения с дополнительными данными
                const fullMessage = {
                    ...message,
                    sender_name: socket.userName, // Добавляем имя отправителя
                    sender_username: socket.userName // Или другое поле с именем
                };

                // Отправляем получателю и отправителю полный объект сообщения
                io.to(messageData.recipient_id).emit('new_message', fullMessage);
                io.to(socket.userId).emit('new_message', fullMessage);

                if (callback) callback({ success: true, message: fullMessage });
            } catch (error) {
                console.error('Error sending message:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        // Handle marking messages as read
        socket.on('mark_as_read', async (messageIds, callback) => {
            try {
                const updatedMessages = await Message.markAsRead(messageIds, socket.userId);

                // Notify sender that messages were read
                updatedMessages.forEach(message => {
                    io.to(message.sender_id).emit('messages_read', [message.message_id]);
                });

                if (callback) callback({ success: true });
            } catch (error) {
                console.error('Error marking messages as read:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        // Handle typing indicator
        socket.on('typing', ({ recipientId, isTyping }) => {
            io.to(recipientId).emit('typing', {
                userId: socket.userId,
                isTyping
            });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
        });
    });
}

function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}

module.exports = {
    initializeSocket,
    getIO
};