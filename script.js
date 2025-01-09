// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyApwujErcMv2TN0SDOBPf0DeZM3uVwEZDI",
    // apiKey: process.env.FIREBASE_API_KEY,
    authDomain: [
        "messenger-fbbf9.firebaseapp.com",
        "https://ritupan-deka.github.io/Whispr/",
        "localhost"
    ],
    projectId: "messenger-fbbf9",
    databaseURL: "https://messenger-fbbf9-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "messenger-fbbf9.firebasestorage.app",
    messagingSenderId: "964023347209",
    appId: "1:964023347209:web:d50f81c15d1dd2a981b0d8",
    measurementId: "G-VSR1VWE445"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Global State
let currentChat = null;
let messagesRef = null;

// ===== Authentication Functions =====
function login() {
    const username = document.getElementById('username').value;
    if (!username) {
        showAlert('Please enter your name');
        return;
    }

    const userRef = db.ref('users/' + username);
    userRef.set({
        name: username,
        status: 'Online',
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        localStorage.setItem('username', username);
        updateUIOnLogin(username);
        loadContacts();
        showWelcomeMessage();
    }).catch(error => {
        showAlert('Connection error: ' + error.message);
    });
}

function updateUIOnLogin(username) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    document.querySelector('#user-profile .name').innerText = username;
}

function addUserToDatabase(username) {
    const userRef = db.ref('users/' + username);
    userRef.set({
        name: username,
        status: 'Online'
    });
}

function logout() {
    localStorage.removeItem('username');
    resetChatState();
    showLoginContainer();
}

function resetChatState() {
    currentChat = null;
    if (messagesRef) {
        messagesRef.off('child_added');
    }
}

function showLoginContainer() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

// ===== Contacts Management =====
function loadContacts() {
    const contactsContainer = document.getElementById('contacts');
    contactsContainer.innerHTML = '';
    const currentUsername = localStorage.getItem('username');

    const connectedRef = db.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            const usersRef = db.ref('users');
            usersRef.on('value', (snapshot) => {
                contactsContainer.innerHTML = '';
                snapshot.forEach((childSnapshot) => {
                    const user = childSnapshot.val();
                    if (user &&
                        user.name &&
                        user.name !== currentUsername &&
                        user.name !== 'undefined') {
                        createContactElement(user);
                    }
                });
            }, (error) => {
                console.error('Error loading contacts:', error);
                showAlert('Error loading contacts. Please check your connection.');
            });
        } else {
            console.log('Not connected to Firebase');
            showAlert('Connection lost. Trying to reconnect...');
        }
    });
}

function createContactElement(user) {
    const contactElement = document.createElement('div');
    contactElement.classList.add('contact');
    contactElement.innerHTML = `
        <div class="contact-info">
            <div class="name">${user.name}</div>
            <div class="status-indicator ${user.status && user.status === 'Online' ? '' : 'offline'}"></div>
        </div>
    `;

    contactElement.addEventListener('click', () => initializeChat(user));
    document.getElementById('contacts').appendChild(contactElement);
}

function filterContacts() {
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    const contacts = document.querySelectorAll('.contact');

    contacts.forEach(contact => {
        const name = contact.querySelector('.name').innerText.toLowerCase();
        contact.style.display = name.includes(searchTerm) ? 'flex' : 'none';
    });
}

// ===== Chat Functions =====
function initializeChat(user) {
    if (messagesRef) {
        messagesRef.off('child_added');
    }

    currentChat = user.name;
    updateChatHeader(user.name);
    showChatInterface();
    loadChatHistory(currentChat);

    // Auto-hide contacts on mobile after selecting a chat
    if (window.innerWidth < 768) {
        const contactsSection = document.querySelector('.contacts-section');
        const chatSection = document.querySelector('.chat-section');
        contactsSection.classList.add('hidden-mobile');
        chatSection.classList.remove('hidden-mobile');
    }
}

function updateChatHeader(contactName) {
    document.getElementById('chat-header').innerHTML = `
        <button class="back-button" onclick="toggleContacts()">
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
        </button>
        <span id="contact-name">${contactName}</span>
    `;
}

function showChatInterface() {
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('chat-header').style.display = 'flex';
}

function loadChatHistory(chatUser) {
    document.getElementById('output').innerHTML = '';
    const username = localStorage.getItem('username');

    messagesRef = db.ref('messages');
    messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        if (isMessageInCurrentChat(message, username, chatUser)) {
            displayMessage(message, username);
        }
    });
}

function isMessageInCurrentChat(message, username, chatUser) {
    return (message.username === username && message.to === chatUser) ||
        (message.username === chatUser && message.to === username);
}

function displayMessage(message, currentUser) {
    const messageClass = message.username === currentUser ? 'sent' : 'received';
    const messageElement = createMessageElement(message, messageClass);
    document.getElementById('output').appendChild(messageElement);
    scrollToBottom();
}

function createMessageElement(message, messageClass) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-container', messageClass);
    messageElement.innerHTML = `
        <div class="message ${messageClass}">
            <div>${message.message}</div>
        </div>
        <div class="timestamp-status">
            <span class="timestamp">${formatTimestamp(message.timestamp)}</span>
            ${messageClass === 'sent' ? `<span class="status">${message.status}</span>` : ''}
        </div>
    `;
    return messageElement;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString([], {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
        }) + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function scrollToBottom() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ===== Message Sending =====
function sendMessage() {
    if (!currentChat) {
        showAlert('Please select a contact to chat with.');
        return;
    }

    const messageInput = document.getElementById('message');
    const message = messageInput.value;
    if (!message) return;

    saveMessage(message);
    messageInput.value = '';
}

function sendMedia() {
    if (!currentChat) {
        showAlert('Please select a contact to chat with.');
        return;
    }

    const file = document.getElementById('media').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const mediaMessage = `<img src="${e.target.result}" alt="media" style="max-width: 50vw; max-height: 50vh;">`;
        saveMessage(mediaMessage);
    };
    reader.readAsDataURL(file);
}

function saveMessage(message) {
    const username = localStorage.getItem('username');
    const timestamp = new Date().getTime();

    db.ref('messages').push().set({
        username: username,
        message: message,
        timestamp: timestamp,
        status: 'sent',
        to: currentChat
    });
}

// ===== Chat Management =====
function deleteChatHistory() {
    if (!currentChat) {
        showAlert('Please select a contact to delete chat history.');
        return;
    }

    const username = localStorage.getItem('username');
    db.ref('messages').once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            if (isMessageInCurrentChat(message, username, currentChat)) {
                childSnapshot.ref.remove();
            }
        });
    }).then(() => {
        document.getElementById('output').innerHTML = '';
        showWelcomeMessage();
        showAlert('Chat history deleted.');
    });
}

// ===== UI Helpers =====
function showWelcomeMessage() {
    document.getElementById('output').innerHTML = `
        <div id="welcome-message">
            <h2>Welcome to Messenger App</h2>
            <p>Select a contact to start chatting.</p>
        </div>`;
    document.getElementById('input-area').style.display = 'none';
    document.getElementById('chat-header').style.display = 'none';

    // On mobile, show contacts when no chat is selected
    if (window.innerWidth < 768) {
        const contactsSection = document.querySelector('.contacts-section');
        const chatSection = document.querySelector('.chat-section');
        contactsSection.classList.remove('hidden-mobile');
        chatSection.classList.add('hidden-mobile');
    }
}

function showAlert(message) {
    const alertModal = document.getElementById('alert-modal');
    document.getElementById('alert-message').innerText = message;
    alertModal.style.display = 'flex';
}

// ===== Modal Management =====
function showDeleteConfirmation() {
    document.getElementById('custom-alert').style.display = 'flex';
}

function closeDeleteConfirmation() {
    document.getElementById('custom-alert').style.display = 'none';
}

function confirmDeleteChat() {
    closeDeleteConfirmation();
    deleteChatHistory();
}

function showLogoutConfirmation() {
    document.getElementById('logout-alert').style.display = 'flex';
}

function closeLogoutConfirmation() {
    document.getElementById('logout-alert').style.display = 'none';
}

function confirmLogout() {
    closeLogoutConfirmation();
    const username = localStorage.getItem('username');
    const userRef = db.ref('users/' + username);
    userRef.update({ status: 'Offline' }).then(() => logout());
}

// ===== Event Listeners =====
window.onload = () => {
    const username = localStorage.getItem('username');
    if (username) {
        updateUIOnLogin(username);
        cleanupInvalidUsers();
        loadContacts();
        showWelcomeMessage();
        
        // Add resize handler for responsive behavior
        window.addEventListener('resize', handleResize);
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                handleAppStateChange();
            }
        });
    } else {
        showLoginContainer();
    }
};

document.getElementById('search-bar').addEventListener('input', filterContacts);
document.getElementById('alert-ok-button').addEventListener('click', () => {
    document.getElementById('alert-modal').style.display = 'none';
});

// Add this function to handle app state changes
function handleAppStateChange() {
    const username = localStorage.getItem('username');
    if (username) {
        const userRef = db.ref('users/' + username);
        userRef.update({
            status: 'Online',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

// Add these event listeners at the bottom of your script
window.addEventListener('online', handleAppStateChange);
window.addEventListener('focus', handleAppStateChange);

// Handle mobile browser back button and app switching
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        handleAppStateChange();
    }
});

// Add this function to clean up invalid users
function cleanupInvalidUsers() {
    const usersRef = db.ref('users');
    usersRef.once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (!user || !user.name || user.name === 'undefined') {
                // Remove invalid user entry
                childSnapshot.ref.remove();
            }
        });
    });
}

// Add these functions at the bottom of your script
function toggleContacts() {
    const contactsSection = document.querySelector('.contacts-section');
    const chatSection = document.querySelector('.chat-section');
    
    if (contactsSection.classList.contains('hidden-mobile')) {
        // Show contacts, hide chat
        contactsSection.classList.remove('hidden-mobile');
        chatSection.classList.add('hidden-mobile');
    } else {
        // Hide contacts, show chat
        contactsSection.classList.add('hidden-mobile');
        chatSection.classList.remove('hidden-mobile');
    }
}

// Add resize handler function
function handleResize() {
    const contactsSection = document.querySelector('.contacts-section');
    const chatSection = document.querySelector('.chat-section');
    
    if (window.innerWidth >= 768) {
        // Remove mobile-specific classes on tablet and larger screens
        contactsSection.classList.remove('hidden-mobile');
        chatSection.classList.remove('hidden-mobile');
    } else if (!currentChat) {
        // On mobile, if no chat is selected, show contacts
        contactsSection.classList.remove('hidden-mobile');
        chatSection.classList.add('hidden-mobile');
    }
}
