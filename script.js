// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApwujErcMv2TN0SDOBPf0DeZM3uVwEZDI",
  authDomain: "messenger-fbbf9.firebaseapp.com",
  projectId: "messenger-fbbf9",
  databaseURL:"https://messenger-fbbf9-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "messenger-fbbf9.firebasestorage.app",
  messagingSenderId: "964023347209",
  appId: "1:964023347209:web:d50f81c15d1dd2a981b0d8",
  measurementId: "G-VSR1VWE445"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentChat = null;
let messagesRef = null;

function login() {
    const username = document.getElementById('username').value;
    if (username) {
        localStorage.setItem('username', username);
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        document.querySelector('#user-profile .name').innerText = username;
        loadContacts();
        showWelcomeMessage();
    } else {
        alert('Please enter your name');
    }
}

function logout() {
    localStorage.removeItem('username');
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function loadContacts() {
    const contacts = [
        { name: 'Alice', status: 'Online' },
        { name: 'Bob', status: 'Offline' },
        { name: 'Charlie', status: 'Online' }
    ];
    const contactsContainer = document.getElementById('contacts');
    contactsContainer.innerHTML = '';
    contacts.forEach(contact => {
        const contactElement = document.createElement('div');
        contactElement.classList.add('contact');
        contactElement.innerHTML = `
            <div>
                <div class="name">${contact.name}</div>
            </div>
        `;
        contactElement.addEventListener('click', () => {
            if (messagesRef) {
                messagesRef.off('child_added');
            }
            currentChat = contact.name;
            document.getElementById('contact-name').innerText = contact.name;
            document.getElementById('input-area').style.display = 'flex';
            loadChatHistory(currentChat);
        });
        contactsContainer.appendChild(contactElement);
    });
}

function filterContacts() {
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    const contacts = document.querySelectorAll('.contact');
    contacts.forEach(contact => {
        const name = contact.querySelector('.name').innerText.toLowerCase();
        if (name.includes(searchTerm)) {
            contact.style.display = 'flex';
        } else {
            contact.style.display = 'none';
        }
    });
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadChatHistory(chatUser) {
    document.getElementById('output').innerHTML = '';
    const username = localStorage.getItem('username');
    messagesRef = db.ref('messages');
    messagesRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        if ((data.username === username && data.to === chatUser) || (data.username === chatUser && data.to === username)) {
            const messageClass = data.username === username ? 'sent' : 'received';
            const messageElement = document.createElement('div');
            messageElement.classList.add('message-container', messageClass);
            messageElement.innerHTML = `
                <div class="message ${messageClass}">
                    <div>
                        <strong>${data.username}</strong>
                        ${data.message}
                    </div>
                </div>
                <div class="timestamp-status">
                    <span class="timestamp">${formatTimestamp(data.timestamp)}</span>
                    ${data.username === username ? `<span class="status">${data.status}</span>` : ''}
                </div>
            `;
            document.getElementById('output').appendChild(messageElement);
            document.getElementById('chat-window').scrollTop = document.getElementById('chat-window').scrollHeight;
        }
    });
}

function showWelcomeMessage() {
    document.getElementById('output').innerHTML = `
        <div id="welcome-message">
            <h2>Welcome to Messenger App</h2>
            <p>Select a contact to start chatting.</p>
        </div>`;
    document.getElementById('input-area').style.display = 'none';
}

function sendMessage() {
    if (!currentChat) {
        alert('Please select a contact to chat with.');
        return;
    }
    const username = localStorage.getItem('username');
    const message = document.getElementById('message').value;
    const timestamp = new Date().getTime();
    db.ref('messages').push().set({
        username: username,
        message: message,
        timestamp: timestamp,
        status: 'sent',
        to: currentChat
    });
    document.getElementById('message').value = '';
    db.ref('typing').remove();
}

function sendMedia() {
    if (!currentChat) {
        alert('Please select a contact to chat with.');
        return;
    }
    const file = document.getElementById('media').files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const username = localStorage.getItem('username');
        const timestamp = new Date().getTime();
        db.ref('messages').push().set({
            username: username,
            message: `<img src="${e.target.result}" alt="media" style="max-width: 100%;">`,
            timestamp: timestamp,
            status: 'sent',
            to: currentChat
        });
    };
    reader.readAsDataURL(file);
}

function deleteChatHistory() {
    if (!currentChat) {
        alert('Please select a contact to delete chat history.');
        return;
    }
    const username = localStorage.getItem('username');
    db.ref('messages').once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if ((data.username === username && data.to === currentChat) || (data.username === currentChat && data.to === username)) {
                childSnapshot.ref.remove();
            }
        });
    }).then(() => {
        document.getElementById('output').innerHTML = '';
        showWelcomeMessage();
        alert('Chat history deleted.');
    });
}

document.getElementById('search-bar').addEventListener('input', filterContacts);

// document.getElementById('message').addEventListener('keypress', () => {
//     const username = localStorage.getItem('username');
//     db.ref('typing').set({
//         username: username
//     });
// });

// document.getElementById('message').addEventListener('blur', () => {
//     db.ref('typing').remove();
// });

// db.ref('typing').on('value', (snapshot) => {
//     const data = snapshot.val();
//     if (data) {
//         document.getElementById('feedback').innerHTML = `<p><em>${data.username} is typing...</em></p>`;
//     } else {
//         document.getElementById('feedback').innerHTML = '';
//     }
// });

window.onload = () => {
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        document.querySelector('#user-profile .name').innerText = username;
        loadContacts();
        showWelcomeMessage();
    } else {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
};
