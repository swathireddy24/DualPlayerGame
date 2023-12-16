document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const createBtn = document.getElementById('create-btn');
    const joinBtn = document.getElementById('join-btn');
    const roomInput = document.getElementById('room-input');
    const gameContainer = document.getElementById('game-container');
    const statusMessage = document.getElementById('status-message');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    let roomCode;
    let myMove; // Store the current player's move

    createBtn.addEventListener('click', () => {
        socket.emit('createRoom');
    });

    joinBtn.addEventListener('click', () => {
        roomCode = roomInput.value.trim().toUpperCase();
        if (roomCode !== '') {
            // Notify the server that a player wants to join a room
            socket.emit('joinRoom', roomCode);
        }
    });

    function sendMessage() {
        const message = messageInput.value.trim();
        if (message !== '') {
            // Emit a 'chatMessage' event to the server
            socket.emit('chatMessage', message);
    
            // Add the message to the chat box locally
    
            // Clear the input field
            messageInput.value = '';
        }
    }
    

    // Add the click event listener to the button
    sendBtn.addEventListener('click', sendMessage);

    function appendMessage(sender, message) {
        // Replace socket IDs with custom names
        const player1 = 'Player 1'; // Customize the name
        const player2 = 'Player 2'; // Customize the name
    
        // Use custom names instead of socket IDs
        const displayName = (sender === socket.id) ? 'You' : 'Other Player';

    
        // Create a new <li> element for the message
        const li = document.createElement('li');
        li.innerText = `${displayName}: ${message}`;
    
        // Append the <li> to the chatMessages <ul>
        chatMessages.appendChild(li);
    }
    

    // Listen for 'chatMessage' event from the server
    socket.on('chatMessage', ({ sender, message }) => {
        // Add the received message to the chat box
        appendMessage(sender, message);
    });

 
    socket.on('roomCreated', (code) => {
        roomCode = code;
        gameContainer.classList.remove('hidden');
       
        statusMessage.innerText = `Room Code: ${roomCode}\nWaiting for another player to join...`;
        hideCreateJoinElements();
        console.log('Room created and joined:', roomCode);
    });

    socket.on('invalidRoom', () => {
        // Handle invalid room or room full
        alert('Invalid room or room full');
        console.log('Invalid room or room full');
    });

    socket.on('gameStart', () => {
        statusMessage.innerText = 'Game Started!';
        //document.getElementById('game-navigation').classList.add('hidden')
        showGameButtons();
        enableGameButtons(); // Enable buttons as soon as the game starts
        document.getElementById('voice-control').classList.remove('hidden');
        document.getElementById('chat-box').classList.remove('hidden')
        document.getElementById('join-create-container').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        console.log('Game started');
    });

    socket.on('disableButtons', () => {
        // Disable buttons once a player makes a move
        disableGameButtons();
        statusMessage.innerText = 'Waiting for the other player...';
    });

    socket.on('enableButtons', () => {
        // Enable buttons when both players have made a move
        enableGameButtons();
        statusMessage.innerText = 'Both players have made a move. Click to see results!';
        
    });

    socket.on('movesUpdated', (moves) => {
        // Update the UI based on the moves (display results, etc.)
        console.log('Moves updated:', moves);

        const socketIds = Object.keys(moves);

        // Make sure there are at least two players
        if (socketIds.length >= 2) {
            const movePlayer1 = moves[socketIds[0]];
            const movePlayer2 = moves[socketIds[1]];

            // Both players have made a move
            disableGameButtons();
            determineWinner(movePlayer1, movePlayer2, socketIds[0], socketIds[1]);
        }
    });

    function hideCreateJoinElements() {
        createBtn.style.display = 'none';
        joinBtn.style.display = 'none';
        roomInput.style.display = 'none';
    }

    function showGameButtons() {
        // Clear previous game elements (buttons, messages, etc.)
        clearGameElements();

        // Add the buttons for rock, paper, and scissors
        const buttonsContainer = document.createElement('div');
        buttonsContainer.innerHTML = `
            <button id="rock-btn" onclick="selectMove('rock')" disabled>Rock</button>
            <button id="paper-btn" onclick="selectMove('paper')" disabled>Paper</button>
            <button id="scissors-btn" onclick="selectMove('scissors')" disabled>Scissors</button>
        `;
        gameContainer.appendChild(buttonsContainer);
    }

    function disableGameButtons() {
        // Disable buttons
        const buttons = document.querySelectorAll('#game-container button');
        buttons.forEach(button => button.disabled = true);
    }

    function enableGameButtons() {
        // Enable buttons
        const buttons = document.querySelectorAll('#game-container button');
        buttons.forEach(button => button.disabled = false);
    }

    function clearGameElements() {
        // Clear previous game elements (buttons, messages, etc.)
        while (gameContainer.firstChild) {
            gameContainer.removeChild(gameContainer.firstChild);
        }
    }

    window.selectMove = function (move) {
        // Notify the server that the player chose a move
        socket.emit('playerMove', move);
        myMove = move;
        disableGameButtons();
        statusMessage.innerText = 'Waiting for the other player...';
    };

    // client.js

// ... (previous code)

function determineWinner(movePlayer1, movePlayer2, player1ID, player2ID) {
    // Notify the server to determine the winner
    socket.emit('determineWinner', movePlayer1, movePlayer2, player1ID, player2ID);

    // Listen for the 'gameResult' event from the server
    socket.on('gameResult', (result) => {
        console.log(result);

        // Example: Display the result message in the statusMessage element
        statusMessage.innerText = result.result;

        // You can also access winner and loser properties if needed
        if (result.winner === socket.id) {
            // Display winner on the winner's screen
            const winnerMessage = document.getElementById('winner-message');
            winnerMessage.innerText = 'You Won!';
        } else if (result.loser === socket.id) {
            // Display loser on the loser's screen
            const loserMessage = document.getElementById('loser-message');
            loserMessage.innerText = 'You Lose!';
        }

        // Reset UI for the next round if needed
        // ...
        enableGameButtons();
        // You can also add further logic based on the game result
        // ...
        setTimeout(() => {
             // Clear result messages
            statusMessage.innerText = 'Make your move!'; // Update status message
        }, 3000);
    });
}

// ... (rest of the code)

    
    
});

