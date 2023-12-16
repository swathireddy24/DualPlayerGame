// server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const rooms = {};
const users = {};

app.use(express.static('public'));

// Game-related events
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        handlePlayerDisconnect(socket.id);
    });

    socket.on('createRoom', () => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = { players: [socket.id], moves: {} };
        socket.join(roomCode);
        console.log(`Room created: ${roomCode}, Player 1: ${socket.id}`);
        io.to(roomCode).emit('roomCreated', roomCode);
    });

    socket.on('joinRoom', (roomCode) => {
        const room = rooms[roomCode];
        if (room && room.players.length === 1) {
            room.players.push(socket.id);
            socket.join(roomCode);
            console.log(`Player 2 joined room: ${roomCode}, Player 2: ${socket.id}`);
            io.to(roomCode).emit('gameStart');
        } else {
            socket.emit('invalidRoom');
        }
    });

    socket.on('chatMessage', (message) => {
        // Broadcast the chat message to all clients in the same room
        const roomCode = findRoomByPlayer(socket.id);
        if (roomCode) {
            io.to(roomCode).emit('chatMessage', { sender: socket.id, message });
        }
    });

    socket.on('playerMove', (move) => {
        const roomCode = findRoomByPlayer(socket.id);
        if (roomCode) {
            rooms[roomCode].moves[socket.id] = move;
            io.to(roomCode).emit('movesUpdated', rooms[roomCode].moves);

            // Check if both players have made a move
            if (Object.keys(rooms[roomCode].moves).length === 2) {
                console.log('hello');
                determineWinnerAndNotify(roomCode);
            }
        }
    });

    socket.on('determineWinner', (movePlayer1, movePlayer2, player1Id, player2Id) => {
        const result = determineGameResult(movePlayer1, movePlayer2, player1Id, player2Id);
        io.to(player1Id).emit('gameResult', result);
        io.to(player2Id).emit('gameResult', result);

        // Reset moves for the next round
        rooms[findRoomByPlayer(player1Id)].moves = {};
    });

    function handlePlayerDisconnect(playerId) {
        const roomCode = findRoomByPlayer(playerId);
        if (roomCode) {
            // Handle disconnection logic (e.g., notify the other player, leave room)
            const otherPlayerId = rooms[roomCode].players.find(id => id !== playerId);
            io.to(otherPlayerId).emit('opponentDisconnected');
            delete rooms[roomCode];
        }
    }

    function determineWinnerAndNotify(roomCode) {
        const moves = rooms[roomCode].moves;
        const result = determineGameResult(moves);
        console.log(result);
        io.to(roomCode).emit('gameResult', result);

        // Reset moves for the next round
        rooms[roomCode].moves = {};
    }

    function generateRoomCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    function findRoomByPlayer(playerId) {
        for (const [roomCode, room] of Object.entries(rooms)) {
            if (room.players.includes(playerId)) {
                return roomCode;
            }
        }
        return null;
    }

    function determineGameResult(moves) {
       
        const playerIds = Object.keys(moves);
        const movePlayer1 = moves[playerIds[0]];
        const movePlayer2 = moves[playerIds[1]];

        if (movePlayer1 === movePlayer2) {
            return { result: 'It\'s a draw!' };
        } else if (
            (movePlayer1 === 'rock' && movePlayer2 === 'scissors') ||
            (movePlayer1 === 'paper' && movePlayer2 === 'rock') ||
            (movePlayer1 === 'scissors' && movePlayer2 === 'paper')
        ) {
            console.log(playerIds[0]);
            return { winner: playerIds[0], loser: playerIds[1], result: 'You win!' };
        } else {
            return { winner: playerIds[1], loser: playerIds[0], result: 'You lose!' };
        }
    }
});

// Voice chat signaling
io.of('/voice-chat').on('connection', (socket) => {
    console.log(`Voice chat client connected: ${socket.id}`);

    users[socket.id] = socket;

    socket.on('offer', (offer, remoteId) => {
        if (users[remoteId]) {
            users[remoteId].emit('offer', offer);
        }
    });

    socket.on('answer', (answer, remoteId) => {
        if (users[remoteId]) {
            users[remoteId].emit('answer', answer);
        }
    });

    socket.on('iceCandidate', (candidate, remoteId) => {
        if (users[remoteId]) {
            users[remoteId].emit('iceCandidate', candidate);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Voice chat client disconnected: ${socket.id}`);
        delete users[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
//const HOST='192.168.137.1'
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
