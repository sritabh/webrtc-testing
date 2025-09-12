/* eslint-disable no-undef */
/**
 * WebRTC Connection Speed Testing Module
 * Provides functionality to test connection speed, latency, and quality
 */

// Speed test state management
const speedTest = {
  isRunning: false,
  startTime: null,
  endTime: null,
  bytesSent: 0,
  bytesReceived: 0,
  packetsLost: 0,
  latencyTests: [],
  throughputTests: [],
  testInterval: null,
  latencyInterval: null,
  statsInterval: null,
  testDuration: 10, // seconds
  packetSize: 1024, // bytes
  packetFrequency: 100 // packets per second
};

/**
 * Initialize speed test UI and event listeners
 */
const initSpeedTest = () => {
  // Add speed test UI to both peer tabs
  addSpeedTestUI('A');
  addSpeedTestUI('B');
};

/**
 * Add speed test UI elements to a peer tab
 */
const addSpeedTestUI = (peerLetter) => {
  const peerTab = document.getElementById(`peer-${peerLetter.toLowerCase()}`);

  const speedTestSection = document.createElement('div');
  speedTestSection.className = 'section speed-test-section';
  speedTestSection.innerHTML = `
    <h3>⚡ Connection Speed Test</h3>
    <div class="speed-test-controls">
      <button onclick="startSpeedTest()" id="startSpeedTest${peerLetter}" class="speed-test-btn">
        🚀 Start Speed Test
      </button>
      <button onclick="stopSpeedTest()" id="stopSpeedTest${peerLetter}" class="speed-test-btn" disabled>
        ⏹️ Stop Test
      </button>
      <button onclick="clearSpeedTestResults()" id="clearSpeedTest${peerLetter}" class="speed-test-btn">
        🗑️ Clear Results
      </button>
    </div>

    <div class="speed-test-settings">
      <label>
        Test Duration:
        <select id="testDuration${peerLetter}" onchange="updateSpeedTestSettings()">
        <option value="1">1 seconds</option>
          <option value="5">5 seconds</option>
          <option value="10" selected>10 seconds</option>
          <option value="30">30 seconds</option>
          <option value="60">60 seconds</option>
        </select>
      </label>
      <label>
        Packet Size:
        <select id="packetSize${peerLetter}" onchange="updateSpeedTestSettings()">
          <option value="512">512 bytes</option>
          <option value="1024" selected>1 KB</option>
          <option value="4096">4 KB</option>
          <option value="8192">8 KB</option>
          <option value="16384">16 KB</option>
          <option value="16777216">1 MB</option>
        </select>
      </label>
      <label>
        Frequency:
        <select id="packetFrequency${peerLetter}" onchange="updateSpeedTestSettings()">
          <option value="10">10 packets/sec</option>
          <option value="50">50 packets/sec</option>
          <option value="100" selected>100 packets/sec</option>
          <option value="200">200 packets/sec</option>
          <option value="500">500 packets/sec</option>
          <option value="1000">1000 packets/sec</option>
        </select>
      </label>
    </div>

    <div class="speed-test-results">
      <div class="speed-metrics">
        <div class="metric">
          <span class="metric-label">Throughput:</span>
          <span id="throughput${peerLetter}" class="metric-value">- Mbps</span>
        </div>
        <div class="metric">
          <span class="metric-label">Latency:</span>
          <span id="latency${peerLetter}" class="metric-value">- ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">Packet Loss:</span>
          <span id="packetLoss${peerLetter}" class="metric-value">- %</span>
        </div>
        <div class="metric">
          <span class="metric-label">Jitter:</span>
          <span id="jitter${peerLetter}" class="metric-value">- ms</span>
        </div>
      </div>

      <div class="speed-test-progress">
        <div class="progress-bar">
          <div id="progressBar${peerLetter}" class="progress-fill"></div>
        </div>
        <div id="progressText${peerLetter}" class="progress-text">Ready to test</div>
      </div>

      <div id="speedTestLog${peerLetter}" class="speed-test-log"></div>
    </div>
  `;

  // Insert before the debug section
  const debugSection = peerTab.querySelector('.section:last-child');
  peerTab.insertBefore(speedTestSection, debugSection);
};

/**
 * Update speed test settings from UI
 */
const updateSpeedTestSettings = () => {
  const currentPeer = getCurrentPeer();
  speedTest.testDuration = parseInt(document.getElementById(`testDuration${currentPeer}`).value);
  speedTest.packetSize = parseInt(document.getElementById(`packetSize${currentPeer}`).value);
  speedTest.packetFrequency = parseInt(document.getElementById(`packetFrequency${currentPeer}`).value);
};

/**
 * Start the speed test
 */
const startSpeedTest = () => {
  if (!peer.dc || peer.dc.readyState !== 'open') {
    alert('Connection not ready! Please establish connection first.');
    return;
  }

  if (speedTest.isRunning) {
    addSpeedTestLog('⚠️ Speed test already running!', 'warning');
    return;
  }

  // Update settings from UI
  updateSpeedTestSettings();

  // Reset test state
  resetSpeedTestState();

  speedTest.isRunning = true;
  speedTest.startTime = Date.now();

  const currentPeer = getCurrentPeer();

  // Update UI
  document.getElementById(`startSpeedTest${currentPeer}`).disabled = true;
  document.getElementById(`stopSpeedTest${currentPeer}`).disabled = false;
  document.getElementById(`progressText${currentPeer}`).textContent = 'Testing...';

  addSpeedTestLog(`🚀 Starting speed test...`, 'info');
  addSpeedTestLog(`📊 Duration: ${speedTest.testDuration}s, Packet size: ${speedTest.packetSize}B, Frequency: ${speedTest.packetFrequency}/s`, 'info');

  // Start packet transmission
  startPacketStream();

  // Start latency testing
  startLatencyTest();

  // Start statistics collection
  startStatsCollection();

  // Auto-stop after test duration
  setTimeout(() => {
    if (speedTest.isRunning) {
      stopSpeedTest();
    }
  }, speedTest.testDuration * 1000);
};

/**
 * Stop the speed test
 */
const stopSpeedTest = () => {
  if (!speedTest.isRunning) return;

  speedTest.isRunning = false;
  speedTest.endTime = Date.now();

  const currentPeer = getCurrentPeer();

  // Clear intervals
  if (speedTest.testInterval) clearInterval(speedTest.testInterval);
  if (speedTest.latencyInterval) clearInterval(speedTest.latencyInterval);
  if (speedTest.statsInterval) clearInterval(speedTest.statsInterval);

  // Update UI
  document.getElementById(`startSpeedTest${currentPeer}`).disabled = false;
  document.getElementById(`stopSpeedTest${currentPeer}`).disabled = true;
  document.getElementById(`progressText${currentPeer}`).textContent = 'Test completed';
  document.getElementById(`progressBar${currentPeer}`).style.width = '100%';

  // Calculate and display final results
  calculateFinalResults();

  addSpeedTestLog(`✅ Speed test completed!`, 'success');
};

/**
 * Reset speed test state
 */
const resetSpeedTestState = () => {
  speedTest.bytesSent = 0;
  speedTest.bytesReceived = 0;
  speedTest.packetsLost = 0;
  speedTest.latencyTests = [];
  speedTest.throughputTests = [];

  if (speedTest.testInterval) clearInterval(speedTest.testInterval);
  if (speedTest.latencyInterval) clearInterval(speedTest.latencyInterval);
  if (speedTest.statsInterval) clearInterval(speedTest.statsInterval);
};

/**
 * Start continuous packet streaming for throughput testing
 */
const startPacketStream = () => {
  const interval = 1000 / speedTest.packetFrequency; // ms between packets
  let packetId = 0;

  speedTest.testInterval = setInterval(() => {
    if (!speedTest.isRunning || !peer.dc || peer.dc.readyState !== 'open') {
      clearInterval(speedTest.testInterval);
      return;
    }

    // Create test packet with metadata
    const packet = {
      type: 'speed_test',
      id: packetId++,
      timestamp: Date.now(),
      data: 'x'.repeat(Math.max(0, speedTest.packetSize - 100)) // Subtract metadata size
    };

    try {
      const packetString = JSON.stringify(packet);
      peer.dc.send(packetString);
      speedTest.bytesSent += packetString.length;
    } catch (error) {
      addSpeedTestLog(`❌ Error sending packet: ${error.message}`, 'error');
    }
  }, interval);
};

/**
 * Start latency testing with ping packets
 */
const startLatencyTest = () => {
  speedTest.latencyInterval = setInterval(() => {
    if (!speedTest.isRunning || !peer.dc || peer.dc.readyState !== 'open') {
      clearInterval(speedTest.latencyInterval);
      return;
    }

    const pingPacket = {
      type: 'ping',
      timestamp: Date.now(),
      id: Math.random().toString(36).substring(7)
    };

    try {
      peer.dc.send(JSON.stringify(pingPacket));
    } catch (error) {
      addSpeedTestLog(`❌ Error sending ping: ${error.message}`, 'error');
    }
  }, 1000); // Send ping every second
};

/**
 * Start statistics collection and UI updates
 */
const startStatsCollection = () => {
  let lastUpdate = Date.now();
  let lastBytesSent = 0;

  speedTest.statsInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - speedTest.startTime) / 1000;
    const progress = Math.min((elapsed / speedTest.testDuration) * 100, 100);

    // Update progress bar
    const currentPeer = getCurrentPeer();
    document.getElementById(`progressBar${currentPeer}`).style.width = `${progress}%`;
    document.getElementById(`progressText${currentPeer}`).textContent =
      `Testing... ${Math.round(progress)}% (${Math.round(elapsed)}/${speedTest.testDuration}s)`;

    // Calculate current throughput
    const bytesDelta = speedTest.bytesSent - lastBytesSent;
    const timeDelta = (now - lastUpdate) / 1000;
    const currentThroughput = (bytesDelta * 8) / (timeDelta * 1024 * 1024); // Mbps

    if (timeDelta > 0) {
      speedTest.throughputTests.push(currentThroughput);
    }

    // Update real-time metrics
    updateSpeedMetrics();

    lastUpdate = now;
    lastBytesSent = speedTest.bytesSent;
  }, 500); // Update every 500ms
};

/**
 * Handle incoming speed test packets
 */
const handleSpeedTestPacket = (data) => {
  try {
    const packet = JSON.parse(data);

    switch (packet.type) {
      case 'speed_test':
        speedTest.bytesReceived += data.length;
        // Echo back for bidirectional testing
        if (peer.dc && peer.dc.readyState === 'open') {
          const echo = {
            type: 'speed_test_echo',
            originalId: packet.id,
            timestamp: Date.now()
          };
          peer.dc.send(JSON.stringify(echo));
        }
        break;

      case 'speed_test_echo':
        // Handle echo response (can be used for additional metrics)
        break;

      case 'ping':
        // Respond to ping
        if (peer.dc && peer.dc.readyState === 'open') {
          const pong = {
            type: 'pong',
            originalTimestamp: packet.timestamp,
            id: packet.id,
            timestamp: Date.now()
          };
          peer.dc.send(JSON.stringify(pong));
        }
        break;

      case 'pong':
        // Calculate latency
        const latency = Date.now() - packet.originalTimestamp;
        speedTest.latencyTests.push(latency);
        break;
    }
  } catch (error) {
    // Not a speed test packet, ignore
  }
};

/**
 * Update speed metrics in UI
 */
const updateSpeedMetrics = () => {
  const currentPeer = getCurrentPeer();

  // Calculate average throughput
  let avgThroughput = 0;
  if (speedTest.throughputTests.length > 0) {
    avgThroughput = speedTest.throughputTests.reduce((a, b) => a + b, 0) / speedTest.throughputTests.length;
  }

  // Calculate latency statistics
  let avgLatency = 0;
  let jitter = 0;
  if (speedTest.latencyTests.length > 0) {
    avgLatency = speedTest.latencyTests.reduce((a, b) => a + b, 0) / speedTest.latencyTests.length;

    // Calculate jitter (standard deviation of latency)
    const variance = speedTest.latencyTests.reduce((acc, lat) => acc + Math.pow(lat - avgLatency, 2), 0) / speedTest.latencyTests.length;
    jitter = Math.sqrt(variance);
  }

  // Update UI
  document.getElementById(`throughput${currentPeer}`).textContent = `${avgThroughput.toFixed(2)} Mbps`;
  document.getElementById(`latency${currentPeer}`).textContent = `${avgLatency.toFixed(1)} ms`;
  document.getElementById(`packetLoss${currentPeer}`).textContent = `${speedTest.packetsLost} %`;
  document.getElementById(`jitter${currentPeer}`).textContent = `${jitter.toFixed(1)} ms`;
};

/**
 * Calculate and display final results
 */
const calculateFinalResults = () => {
  const testDuration = (speedTest.endTime - speedTest.startTime) / 1000;
  const totalMbits = (speedTest.bytesSent * 8) / (1024 * 1024);
  const avgThroughput = totalMbits / testDuration;

  let avgLatency = 0;
  let minLatency = 0;
  let maxLatency = 0;
  let jitter = 0;

  if (speedTest.latencyTests.length > 0) {
    avgLatency = speedTest.latencyTests.reduce((a, b) => a + b, 0) / speedTest.latencyTests.length;
    minLatency = Math.min(...speedTest.latencyTests);
    maxLatency = Math.max(...speedTest.latencyTests);

    const variance = speedTest.latencyTests.reduce((acc, lat) => acc + Math.pow(lat - avgLatency, 2), 0) / speedTest.latencyTests.length;
    jitter = Math.sqrt(variance);
  }

  addSpeedTestLog(`📊 Final Results:`, 'success');
  addSpeedTestLog(`   Throughput: ${avgThroughput.toFixed(2)} Mbps`, 'info');
  addSpeedTestLog(`   Data sent: ${(speedTest.bytesSent / 1024 / 1024).toFixed(2)} MB`, 'info');
  addSpeedTestLog(`   Data received: ${(speedTest.bytesReceived / 1024 / 1024).toFixed(2)} MB`, 'info');
  addSpeedTestLog(`   Latency: ${avgLatency.toFixed(1)}ms (min: ${minLatency}ms, max: ${maxLatency}ms)`, 'info');
  addSpeedTestLog(`   Jitter: ${jitter.toFixed(1)}ms`, 'info');
  addSpeedTestLog(`   Test duration: ${testDuration.toFixed(1)}s`, 'info');
};

/**
 * Clear speed test results
 */
const clearSpeedTestResults = () => {
  const currentPeer = getCurrentPeer();

  // Reset metrics display
  document.getElementById(`throughput${currentPeer}`).textContent = '- Mbps';
  document.getElementById(`latency${currentPeer}`).textContent = '- ms';
  document.getElementById(`packetLoss${currentPeer}`).textContent = '- %';
  document.getElementById(`jitter${currentPeer}`).textContent = '- ms';

  // Clear progress
  document.getElementById(`progressBar${currentPeer}`).style.width = '0%';
  document.getElementById(`progressText${currentPeer}`).textContent = 'Ready to test';

  // Clear log
  document.getElementById(`speedTestLog${currentPeer}`).innerHTML = '';

  addSpeedTestLog('🗑️ Results cleared', 'info');
};

/**
 * Add message to speed test log
 */
const addSpeedTestLog = (message, type = 'info') => {
  const currentPeer = getCurrentPeer();
  const logEl = document.getElementById(`speedTestLog${currentPeer}`);
  const timestamp = new Date().toLocaleTimeString();

  const colors = {
    info: '#007bff',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545'
  };

  const msgEl = document.createElement('div');
  msgEl.style.color = colors[type] || '#007bff';
  msgEl.innerHTML = `[${timestamp}] ${message}`;
  logEl.appendChild(msgEl);
  logEl.scrollTop = logEl.scrollTop;
};

// Initialize speed test when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for the main UI to load
  setTimeout(initSpeedTest, 100);
});

// Export functions for global access
if (typeof window !== 'undefined') {
  window.startSpeedTest = startSpeedTest;
  window.stopSpeedTest = stopSpeedTest;
  window.clearSpeedTestResults = clearSpeedTestResults;
  window.updateSpeedTestSettings = updateSpeedTestSettings;
  window.handleSpeedTestPacket = handleSpeedTestPacket;
}
