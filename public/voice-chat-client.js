const socket = io();
const audioCtx = new AudioContext();
let microphone;
let connection;

navigator.mediaDevices.getUserMedia({ audio: true })
  .then((stream) => {
    // Save the stream for later use if needed
    microphone = audioCtx.createMediaStreamSource(stream);

    // Create the RTCPeerConnection
    connection = new RTCPeerConnection();

    // Add the track to the RTCPeerConnection
    stream.getAudioTracks().forEach((track) => {
      connection.addTrack(track, stream);
    });

    localAudio.srcObject = stream;
    localAudio.play();

    connection.createOffer()
      .then(offer => connection.setLocalDescription(offer))
      .then(() => socket.emit('offer', connection.localDescription));
  })
  .catch((error) => {
    console.error('Error accessing microphone:', error);
  });

const speaker = audioCtx.createMediaStreamDestination();

// Rest of your code...

const localAudio = new Audio();
const remoteAudio = new Audio();


// Initialize variables for call state
let isCalling = false;
let hasRemoteAudio = false;

socket.on('offer', (offer) => {
  console.log('Received offer:', offer);
  isCalling = true;
  connection = new RTCPeerConnection();
  connection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('iceCandidate', event.candidate);
    }
  };
  connection.ontrack = (event) => {
    hasRemoteAudio = true;
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.play();
  };
  connection.ondatachannel = (event) => {
    const dataChannel = event.channel;
    dataChannel.onmessage = (event) => {
      console.log('Data received from peer:', event.data);
    };
  };
  connection.setRemoteDescription(offer);
  connection.addTrack(microphone);
  localAudio.srcObject = new MediaStream([microphone.mediaStreamTrack]);
  localAudio.play();
  connection.createAnswer()
    .then(answer => connection.setLocalDescription(answer))
    .then(() => socket.emit('answer', connection.localDescription));
});

socket.on('answer', (answer) => {
  console.log('Received answer:', answer);
  connection.setRemoteDescription(answer);
});

socket.on('iceCandidate', (candidate) => {
  console.log('Received ice candidate:', candidate);
  connection.addIceCandidate(candidate);
});

socket.on('endCall', () => {
  console.log('Call ended by peer');
  isCalling = false;
  hasRemoteAudio = false;
  connection.close();
  localAudio.srcObject.getTracks().forEach(track => track.stop());
  remoteAudio.srcObject = null;
});

document.getElementById('call-button').addEventListener('click', () => {
  if (isCalling) {
    console.log('Call already in progress');
    return;
  }
  isCalling = true;
  console.log('Initiating call…');
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      connection = new RTCPeerConnection();
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('iceCandidate', event.candidate);
        }
      };
      connection.ontrack = (event) => {
        hasRemoteAudio = true;
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play();
      };
      connection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        dataChannel.onmessage = (event) => {
          console.log('Data received from peer:', event.data);
        };
      };
      connection.addTrack(microphone);
      localAudio.srcObject = new MediaStream([microphone.mediaStreamTrack]);
      localAudio.play();
      connection.createOffer()
        .then(offer => connection.setLocalDescription(offer))
        .then(() => socket.emit('offer', connection.localDescription));
    });
});

document.getElementById('end-call-button').addEventListener('click', () => {
  if (!isCalling) {
    console.log('No active call to end');
    return;
  }
  console.log('Ending call…');
  socket.emit('endCall');
  isCalling = false;
  hasRemoteAudio = false;
  connection.close();
  localAudio.srcObject.getTracks().forEach(track => track.stop());
  remoteAudio.srcObject = null;
});

// Handle potential errors
connection.onerror = (error) => {
  console.error('Error:', error);
};

