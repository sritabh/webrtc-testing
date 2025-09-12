/* eslint-disable valid-jsdoc */
/**
 * UI Utility Functions
 * Handles tab management, status updates, messaging UI, and other interface elements
 */

// Global UI state
let currentPeer = 'A';

/**
 * Tab Management Functions
 */
const switchTab = (tabId) => {
  // Remove active class from all tabs and buttons
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Add active class to selected tab and button
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');

  // Update current peer and URL hash
  currentPeer = tabId === 'peer-a' ? 'A' : 'B';
  window.location.hash = currentPeer === 'A' ? 'peer1' : 'peer2';
};

const initializeFromHash = () => {
  const hash = window.location.hash;
  if (hash === '#peer1' || hash === '#peer2') {
    const tabId = hash === '#peer1' ? 'peer-a' : 'peer-b';
    currentPeer = hash === '#peer1' ? 'A' : 'B';

    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
  }
};

/**
 * Status and Debug UI Functions
 */
const updateStatus = (status) => {
  const statusEl = document.getElementById(`status${currentPeer}`);
  statusEl.textContent = status;
  statusEl.className = `status ${status.toLowerCase().replace(/[^a-z]/g, '')}`;
};

const addDebugInfo = (message, type = 'info') => {
  const debugEl = document.getElementById(`debug${currentPeer}`);
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
  debugEl.appendChild(msgEl);
  debugEl.scrollTop = debugEl.scrollHeight;
};

const addMessage = (message, sender) => {
  const messagesEl = document.getElementById(`messages${currentPeer}`);
  const msgEl = document.createElement('div');
  msgEl.innerHTML = `<strong>${sender}:</strong> ${message}`;
  messagesEl.appendChild(msgEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

/**
 * Clipboard and Input Functions
 */
const copyToClipboard = (elementId) => {
  const element = document.getElementById(elementId);
  element.select();
  navigator.clipboard.writeText(element.value);

  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '✅ Copied!';
  setTimeout(() => {
    btn.innerHTML = originalText;
  }, 2000);
};

/**
 * Messaging UI Functions
 */
const sendMessage = () => {
  const input = document.getElementById(`messageInput${currentPeer}`);
  const message = input.value.trim();

  if (message && peer.dc && peer.dc.readyState === 'open') {
    peer.dc.send(message);
    addMessage(message, `Peer ${currentPeer}`);
    input.value = '';
  } else if (!message) {
    alert('Please enter a message!');
  } else {
    alert('Connection not ready!');
  }
};

/**
 * UI Reset Functions
 */
const resetPeerUI = () => {
  // Clear UI elements
  document.getElementById(`completeOffer${currentPeer}`).value = '';
  document.getElementById(`completeAnswer${currentPeer}`).value = '';
  document.getElementById(`messages${currentPeer}`).innerHTML = '';
  document.getElementById(`debug${currentPeer}`).innerHTML = '';

  updateStatus('Disconnected');
  addDebugInfo(`🔄 Peer ${currentPeer} reset`, 'info');
};

/**
 * Getter function for current peer (used by script.js)
 */
const getCurrentPeer = () => currentPeer;

/**
 * Setter function for current peer (used by script.js)
 */
const setCurrentPeer = (peer) => {
  currentPeer = peer;
};

/**
 * Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  updateStatus('Disconnected');
  initializeFromHash();
});

// Export functions for use in other modules (if using modules)
// If not using modules, these functions are available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    switchTab,
    initializeFromHash,
    updateStatus,
    addDebugInfo,
    addMessage,
    copyToClipboard,
    sendMessage,
    resetPeerUI,
    getCurrentPeer,
    setCurrentPeer
  };
}
