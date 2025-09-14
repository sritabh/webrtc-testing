/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/**
 * WebRTC P2P Complete Signaling Demo - Core WebRTC Functions
 * This script handles the WebRTC connection between two peers with complete signaling
 * (SDP + ICE candidates bundled together to avoid timing issues)
 */

// Global WebRTC state management
const peer = {
  pc: null, // RTCPeerConnection
  dc: null, // DataChannel
  pendingCandidates: [], // ICE candidates waiting to be bundled
  iceGatheringComplete: false,
  completeSignalingData: null // Complete SDP + ICE bundle
};

// ICE server configuration
const iceConfig = {
  iceServers: [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.l.google.com:19302'}
  ],
  // Optional: Control candidate gathering
  // iceCandidatePoolSize: 1,           // Limit candidate pool
  // iceTransportPolicy: 'all',         // 'all' or 'relay' (TURN only)
  // bundlePolicy: 'balanced',          // 'balanced', 'max-compat', or 'max-bundle'
};

/**
 * WebRTC Connection Management
 */
const initializePeerConnection = () => {
  peer.pc = new RTCPeerConnection(iceConfig);
  peer.pendingCandidates = [];
  peer.iceGatheringComplete = false;

  // Handle ICE candidate generation
  peer.pc.onicecandidate = (event) => {
    if (event.candidate) {
      peer.pendingCandidates.push(event.candidate);

      // Extract detailed candidate information
      const candidateString = event.candidate.candidate;
      const candidateType = candidateString.includes('typ host') ? 'HOST' :
                           candidateString.includes('typ srflx') ? 'STUN' :
                           candidateString.includes('typ relay') ? 'TURN' : 'OTHER';

      // Parse candidate details
      const parts = candidateString.split(' ');
      const ip = parts[4] || 'unknown';
      const port = parts[5] || 'unknown';
      const protocol = parts[2] || 'unknown';
      const priority = parts[3] || 'unknown';

      addDebugInfo(`🔍 Generated ${candidateType} candidate:`, 'info');
      addDebugInfo(`   📍 ${ip}:${port} (${protocol.toUpperCase()}, priority: ${priority})`, 'info');
    } else {
      // ICE gathering complete (null candidate)
      peer.iceGatheringComplete = true;
      addDebugInfo(`🏁 ICE gathering complete! Total: ${peer.pendingCandidates.length} candidates`, 'success');
      if (peer.completeSignalingData) {
        completeSignalingReady();
      }
    }
  };

  // Handle connection state changes
  peer.pc.onconnectionstatechange = () => {
    const state = peer.pc.connectionState;
    addDebugInfo(`🔗 Connection: ${state.toUpperCase()}`,
                state === 'connected' ? 'success' :
                state === 'failed' ? 'error' : 'info');

    switch (state) {
      case 'connected':
        updateStatus('Connected');
        showSelectedCandidates();
        break;
      case 'connecting':
        updateStatus('Connecting...');
        break;
      case 'disconnected':
      case 'failed':
        updateStatus('Disconnected');
        break;
    }
  };

  // Handle ICE connection state changes for more detailed candidate info
  peer.pc.oniceconnectionstatechange = () => {
    const state = peer.pc.iceConnectionState;
    addDebugInfo(`🧊 ICE: ${state.toUpperCase()}`,
                state === 'connected' || state === 'completed' ? 'success' :
                state === 'failed' ? 'error' : 'info');

    if (state === 'connected') {
      showSelectedCandidates();
    }
  };

  // Handle incoming data channel (for callee)
  peer.pc.ondatachannel = (event) => {
    setupDataChannel(event.channel);
  };
};

const setupDataChannel = (channel) => {
  peer.dc = channel;

  channel.onopen = () => {
    addMessage('Data channel opened - Ready to chat!', 'System');
    updateStatus('Connected');
    addDebugInfo('📡 Data channel opened', 'success');
  };

  channel.onmessage = (event) => {
    const currentPeer = getCurrentPeer();

    // Check if it's a speed test packet
    try {
      const packet = JSON.parse(event.data);
      if (packet.type && ['speed_test', 'speed_test_echo', 'ping', 'pong'].includes(packet.type)) {
        // Handle speed test packet
        if (typeof handleSpeedTestPacket === 'function') {
          handleSpeedTestPacket(event.data);
        }
        return; // Don't display speed test packets in chat
      }
    } catch (e) {
      // Not JSON or not a speed test packet, treat as regular message
    }

    // Regular chat message
    addMessage(event.data, `Peer ${currentPeer === 'A' ? 'B' : 'A'}`);
  };

  channel.onclose = () => {
    addMessage('Data channel closed', 'System');
    updateStatus('Disconnected');
  };
};

/**
 * Signaling Functions
 */
const createCompleteOffer = async () => {
  addDebugInfo(`🚀 Creating complete offer...`, 'info');
  updateStatus('Gathering ICE Candidates...');

  if (peer.pc) {
    peer.pc.close();
  }

  initializePeerConnection();

  // Create data channel for messaging
  const dataChannel = peer.pc.createDataChannel('messages', {ordered: true});
  setupDataChannel(dataChannel);

  try {
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);

    peer.completeSignalingData = {
      type: 'offer',
      sdp: offer.sdp,
      candidates: []
    };

    addDebugInfo(`📝 Offer created, gathering ICE candidates...`, 'info');

    // Wait for ICE gathering to complete or timeout after 5 seconds
    if (!peer.iceGatheringComplete) {
      setTimeout(() => {
        if (!peer.iceGatheringComplete) {
          addDebugInfo(`⏰ ICE gathering timeout, using current candidates`, 'warning');
          completeSignalingReady();
        }
      }, 5000);
    }
  } catch (error) {
    addDebugInfo(`❌ Error: ${error.message}`, 'error');
    updateStatus('Error');
  }
};

const completeSignalingReady = () => {
  const currentPeer = getCurrentPeer();

  if (peer.completeSignalingData && currentPeer === 'A') {
    // Bundle ICE candidates with SDP offer
    peer.completeSignalingData.candidates = peer.pendingCandidates;
    document.getElementById('completeOfferA').value = JSON.stringify(peer.completeSignalingData, null, 2);
    updateStatus('Complete Offer Ready');
    addDebugInfo(`✅ Complete offer ready with ${peer.pendingCandidates.length} candidates`, 'success');
  } else if (peer.completeSignalingData && currentPeer === 'B') {
    // Bundle ICE candidates with SDP answer
    peer.completeSignalingData.candidates = peer.pendingCandidates;
    document.getElementById('completeAnswerB').value = JSON.stringify(peer.completeSignalingData, null, 2);
    updateStatus('Complete Answer Ready');
    addDebugInfo(`✅ Complete answer ready with ${peer.pendingCandidates.length} candidates`, 'success');
  }
};

const createCompleteAnswer = async () => {
  try {
    const completeOfferText = document.getElementById('completeOfferB').value;
    if (!completeOfferText.trim()) {
      alert('Please paste the complete offer first!');
      return;
    }

    const completeOffer = JSON.parse(completeOfferText);
    addDebugInfo(`📥 Processing complete offer with ${completeOffer.candidates.length} candidates`, 'info');
    updateStatus('Processing Offer...');

    if (peer.pc) {
      peer.pc.close();
    }

    initializePeerConnection();

    // Set remote description from the offer
    await peer.pc.setRemoteDescription({type: 'offer', sdp: completeOffer.sdp});

    // Add all remote ICE candidates from the offer
    for (const candidate of completeOffer.candidates) {
      await peer.pc.addIceCandidate(candidate);
    }

    addDebugInfo(`✅ Added ${completeOffer.candidates.length} remote candidates`, 'success');

    // Create answer
    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);

    peer.completeSignalingData = {
      type: 'answer',
      sdp: answer.sdp,
      candidates: []
    };

    updateStatus('Gathering ICE Candidates...');
    addDebugInfo(`📝 Answer created, gathering ICE candidates...`, 'info');

    // Wait for ICE gathering or timeout
    if (!peer.iceGatheringComplete) {
      setTimeout(() => {
        if (!peer.iceGatheringComplete) {
          addDebugInfo(`⏰ ICE gathering timeout, using current candidates`, 'warning');
          completeSignalingReady();
        }
      }, 5000);
    }
  } catch (error) {
    addDebugInfo(`❌ Error: ${error.message}`, 'error');
    updateStatus('Error');
  }
};

const setCompleteAnswer = async () => {
  try {
    const completeAnswerText = document.getElementById('completeAnswerA').value;
    if (!completeAnswerText.trim()) {
      alert('Please paste the complete answer first!');
      return;
    }

    const completeAnswer = JSON.parse(completeAnswerText);
    addDebugInfo(`📥 Processing complete answer with ${completeAnswer.candidates.length} candidates`, 'info');
    updateStatus('Connecting...');

    // Set remote description from the answer
    await peer.pc.setRemoteDescription({type: 'answer', sdp: completeAnswer.sdp});

    // Add all remote ICE candidates from the answer
    // for (const candidate of completeAnswer.candidates) {
    //   await peer.pc.addIceCandidate(candidate);
    // }

    addDebugInfo(`✅ Added ${completeAnswer.candidates.length} remote candidates`, 'success');
    addDebugInfo(`🎯 Connection should establish now...`, 'info');
  } catch (error) {
    addDebugInfo(`❌ Error: ${error.message}`, 'error');
    updateStatus('Error');
  }
};

/**
 * Utility Functions
 */
const resetPeer = () => {
  // Close existing connections
  if (peer.pc) {
    peer.pc.close();
    peer.pc = null;
  }
  if (peer.dc) {
    peer.dc = null;
  }

  // Reset state
  peer.pendingCandidates = [];
  peer.iceGatheringComplete = false;
  peer.completeSignalingData = null;

  // Reset UI through utils function
  resetPeerUI();
};

/**
 * Show which ICE candidates were selected for the active connection
 */
const showSelectedCandidates = async () => {
  try {
    const stats = await peer.pc.getStats();

    // Collect all candidate info first
    const localCandidates = new Map();
    const remoteCandidates = new Map();

    stats.forEach((report) => {
      if (report.type === 'local-candidate') {
        localCandidates.set(report.id, report);
      } else if (report.type === 'remote-candidate') {
        remoteCandidates.set(report.id, report);
      }
    });

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        const localCandidate = localCandidates.get(report.localCandidateId);
        const remoteCandidate = remoteCandidates.get(report.remoteCandidateId);

        if (localCandidate && remoteCandidate) {
          // Enhanced type detection
          const localType = localCandidate.candidateType ||
                           (localCandidate.address && localCandidate.address.includes('.local') ? 'host' : 'unknown');
          const remoteType = remoteCandidate.candidateType || 'unknown';

          // Better address formatting with fallback to address field
          const localAddr = localCandidate.address && localCandidate.port ?
                           `${localCandidate.address}:${localCandidate.port}` :
                           `${localCandidate.ip || 'unknown'}:${localCandidate.port || '?'}`;
          const remoteAddr = remoteCandidate.address && remoteCandidate.port ?
                            `${remoteCandidate.address}:${remoteCandidate.port}` :
                            `${remoteCandidate.ip || 'unknown'}:${remoteCandidate.port || '?'}`;

          addDebugInfo(`🎯 SELECTED PAIR:`, 'success');
          addDebugInfo(`   Local: ${localType.toUpperCase()} ${localAddr}`, 'success');
          addDebugInfo(`   Remote: ${remoteType.toUpperCase()} ${remoteAddr}`, 'success');

          // Show protocol info
          if (localCandidate.protocol) {
            addDebugInfo(`   Protocol: ${localCandidate.protocol.toUpperCase()}`, 'info');
          }

          // Show additional connection details
          if (report.bytesSent !== undefined) {
            addDebugInfo(`   📊 Bytes sent: ${report.bytesSent}, received: ${report.bytesReceived}`, 'info');
          }
          if (report.currentRoundTripTime !== undefined) {
            addDebugInfo(`   ⏱️ RTT: ${Math.round(report.currentRoundTripTime * 1000)}ms`, 'info');
          }

          // Show priority comparison
          if (localCandidate.priority && remoteCandidate.priority) {
            addDebugInfo(`   🏆 Priority: Local ${localCandidate.priority}, Remote ${remoteCandidate.priority}`, 'info');
          }

          // Analyze connection type
          analyzeConnectionType(localType, remoteType, localAddr, remoteAddr);
        }
      }
    });
  } catch (error) {
    addDebugInfo(`❌ Could not get connection stats: ${error.message}`, 'warning');
  }
};

/**
 * Analyze and explain the connection type being used
 * @param {string} localType - Type of local candidate (host, srflx, etc.)
 * @param {string} remoteType - Type of remote candidate (host, srflx, etc.)
 * @param {string} localAddr - Local address:port
 * @param {string} remoteAddr - Remote address:port
 */
const analyzeConnectionType = (localType, remoteType, localAddr, remoteAddr) => {
  let explanation = '💡 ';

  if (localType === 'host' && remoteType === 'host') {
    explanation += 'Direct peer-to-peer connection (both on same network)';
  } else if (localType === 'host' && remoteType === 'prflx') {
    explanation += 'Peer-reflexive connection (remote peer discovered via connectivity checks)';
  } else if (localType === 'host' && remoteType === 'srflx') {
    explanation += 'Connection through STUN server (NAT traversal successful)';
  } else if (localType === 'srflx' && remoteType === 'srflx') {
    explanation += 'Both peers using STUN servers (both behind NAT)';
  } else if (localType.includes('relay') || remoteType.includes('relay')) {
    explanation += 'Connection through TURN relay server (direct connection failed)';
  } else if (remoteType === 'prflx') {
    explanation += 'Using peer-reflexive candidate (discovered during connectivity checks)';
  } else {
    explanation += `Connection type: Local(${localType}) ↔ Remote(${remoteType})`;
  }

  // Check if using local network addresses (.local) vs public/remote addresses
  const localIsLocal = localAddr.includes('.local');
  const remoteIsLocal = remoteAddr.includes('.local');

  if (localIsLocal && remoteIsLocal) {
    explanation += ' - Both using local network addresses';
  } else if (localIsLocal && !remoteIsLocal) {
    explanation += ' - Local network to public/remote address';
  } else if (!localIsLocal && remoteIsLocal) {
    explanation += ' - Public/remote to local network address';
  } else {
    explanation += ' - Both using public/remote addresses';
  }

  addDebugInfo(explanation, 'info');
};

// Export functions for use in other modules (if using modules)
// If not using modules, these functions are available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    peer,
    iceConfig,
    initializePeerConnection,
    setupDataChannel,
    createCompleteOffer,
    completeSignalingReady,
    createCompleteAnswer,
    setCompleteAnswer,
    resetPeer,
    showSelectedCandidates,
    analyzeConnectionType
  };
}
