// Firebase Configuration
const firebaseConfig = {    
    // apiKey: "AIzaSyApwujErcMv2TN0SDOBPf0DeZM3uVwEZDI",
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "messenger-fbbf9.firebaseapp.com",
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

    localStorage.setItem('username', username);
    updateUIOnLogin(username);
    addUserToDatabase(username);
    loadContacts();
    showWelcomeMessage();
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

    const usersRef = db.ref('users');
    usersRef.on('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.name !== currentUsername) {
                createContactElement(user);
            }
        });
    });
}

function createContactElement(user) {
    const contactElement = document.createElement('div');
    contactElement.classList.add('contact');
    contactElement.innerHTML = `
        <div class="contact-info">
            <div class="name">${user.name}</div>
            <div class="status-indicator ${user.status === 'Online' ? '' : 'offline'}"></div>
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
}

function updateChatHeader(contactName) {
    document.getElementById('contact-name').innerText = contactName;
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
        loadContacts();
        showWelcomeMessage();
    } else {
        showLoginContainer();
    }
};

document.getElementById('search-bar').addEventListener('input', filterContacts);
document.getElementById('alert-ok-button').addEventListener('click', () => {
    document.getElementById('alert-modal').style.display = 'none';
});
