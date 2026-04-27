// Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    console.error('Failed to initialize Supabase:', error);
}

// App State
let currentUser = null;
let currentRecipient = null;
let users = [];
let messages = [];
let pollingInterval = null;

// DOM Elements
const setupSection = document.getElementById('setup-section');
const chatSection = document.getElementById('chat-section');
const addUserModal = document.getElementById('add-user-modal');
const usernameInput = document.getElementById('username');
const publicKeyInput = document.getElementById('public-key');
const privateKeyInput = document.getElementById('private-key');
const privateKeyPassphraseInput = document.getElementById('private-key-passphrase');
const setupBtn = document.getElementById('setup-btn');
const addUserBtn = document.getElementById('add-user-btn');
const userList = document.getElementById('user-list');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const chatRecipient = document.getElementById('chat-recipient');
const newUsernameInput = document.getElementById('new-username');
const newPublicKeyInput = document.getElementById('new-public-key');
const cancelAddUserBtn = document.getElementById('cancel-add-user');
const saveUserBtn = document.getElementById('save-user');

// Initialize app
function init() {
    loadUserFromStorage();
    if (currentUser) {
        showChatSection();
        loadUsers();
        startPolling();
    }
}

// Load user from localStorage
function loadUserFromStorage() {
    const storedUser = localStorage.getItem('encrypted_chat_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
}

// Save user to localStorage
function saveUserToStorage() {
    localStorage.setItem('encrypted_chat_user', JSON.stringify(currentUser));
}

// Show chat section
function showChatSection() {
    setupSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
}

// Show setup section
function showSetupSection() {
    setupSection.classList.remove('hidden');
    chatSection.classList.add('hidden');
}

// Setup user identity
async function setupUser() {
    const username = usernameInput.value.trim();
    const publicKey = publicKeyInput.value.trim();
    const privateKey = privateKeyInput.value.trim();
    const passphrase = privateKeyPassphraseInput.value;

    if (!username || !publicKey || !privateKey) {
        alert('Please fill in all fields');
        return;
    }

    try {
        // Validate keys
        const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
        const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: privateKey });

        if (passphrase) {
            try {
                await privateKeyObj.decrypt(passphrase);
            } catch (error) {
                alert('Failed to decrypt private key. Check passphrase.');
                return;
            }
        }

        // Create user object
        currentUser = {
            username,
            publicKey,
            privateKey,
            passphrase
        };

        // Save to localStorage
        saveUserToStorage();

        // Register user in Supabase
        await registerUserInSupabase(username, publicKey);

        // Show chat section
        showChatSection();
        loadUsers();
        startPolling();

    } catch (error) {
        console.error('Setup error:', error);
        alert('Invalid PGP keys. Please check your keys and try again.');
    }
}

// Register user in Supabase
async function registerUserInSupabase(username, publicKey) {
    try {
        const { data, error } = await supabase
            .from('users')
            .upsert({
                username,
                public_key: publicKey
            }, {
                onConflict: 'username'
            });

        if (error) throw error;
        console.log('User registered:', data);
    } catch (error) {
        console.error('Failed to register user:', error);
    }
}

// Load users from Supabase
async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;

        users = data.filter(user => user.username !== currentUser.username);
        renderUserList();
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Render user list
function renderUserList() {
    userList.innerHTML = '';
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        if (currentRecipient && currentRecipient.username === user.username) {
            userItem.classList.add('active');
        }

        userItem.innerHTML = `
            <div class="username">${user.username}</div>
            <div class="last-message">Click to start chatting</div>
        `;

        userItem.addEventListener('click', () => selectUser(user));
        userList.appendChild(userItem);
    });
}

// Select user to chat with
function selectUser(user) {
    currentRecipient = user;
    chatRecipient.textContent = `Chat with ${user.username}`;
    renderUserList();
    loadMessages();
}

// Load messages for current conversation
async function loadMessages() {
    if (!currentRecipient) return;

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender.eq.${currentUser.username},recipient.eq.${currentRecipient.username}),and(sender.eq.${currentRecipient.username},recipient.eq.${currentUser.username})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        messages = data;
        renderMessages();
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

// Render messages
async function renderMessages() {
    messagesContainer.innerHTML = '';

    for (const message of messages) {
        const messageEl = document.createElement('div');
        const isSent = message.sender === currentUser.username;
        messageEl.className = `message ${isSent ? 'sent' : 'received'}`;

        try {
            // Decrypt message
            const decryptedText = await decryptMessage(message.encrypted_message);

            messageEl.innerHTML = `
                <div class="sender">${message.sender}</div>
                <div class="content">${escapeHtml(decryptedText)}</div>
                <div class="timestamp">${formatTimestamp(message.created_at)}</div>
            `;
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            messageEl.innerHTML = `
                <div class="sender">${message.sender}</div>
                <div class="content">[Encrypted - Failed to decrypt]</div>
                <div class="timestamp">${formatTimestamp(message.created_at)}</div>
            `;
        }

        messagesContainer.appendChild(messageEl);
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentRecipient) return;

    try {
        // Encrypt message
        const encryptedMessage = await encryptMessage(text, currentRecipient.public_key);

        // Send to Supabase
        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender: currentUser.username,
                recipient: currentRecipient.username,
                encrypted_message: encryptedMessage
            });

        if (error) throw error;

        // Clear input
        messageInput.value = '';

        // Reload messages
        await loadMessages();
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('Failed to send message. Please try again.');
    }
}

// Encrypt message
async function encryptMessage(text, recipientPublicKey) {
    try {
        const publicKey = await openpgp.readKey({ armoredKey: recipientPublicKey });

        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text }),
            encryptionKeys: publicKey
        });

        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
}

// Decrypt message
async function decryptMessage(encryptedMessage) {
    try {
        const privateKey = await openpgp.readPrivateKey({ armoredKey: currentUser.privateKey });

        if (currentUser.passphrase) {
            await privateKey.decrypt(currentUser.passphrase);
        }

        const message = await openpgp.readMessage({ armoredMessage: encryptedMessage });

        const { data: decrypted } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKey
        });

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
}

// Add new user
async function addUser() {
    const username = newUsernameInput.value.trim();
    const publicKey = newPublicKeyInput.value.trim();

    if (!username || !publicKey) {
        alert('Please fill in all fields');
        return;
    }

    try {
        // Validate public key
        await openpgp.readKey({ armoredKey: publicKey });

        // Add to Supabase
        const { data, error } = await supabase
            .from('users')
            .upsert({
                username,
                public_key: publicKey
            }, {
                onConflict: 'username'
            });

        if (error) throw error;

        // Close modal
        addUserModal.classList.add('hidden');

        // Clear inputs
        newUsernameInput.value = '';
        newPublicKeyInput.value = '';

        // Reload users
        await loadUsers();

        alert('User added successfully!');
    } catch (error) {
        console.error('Failed to add user:', error);
        alert('Invalid public key. Please check and try again.');
    }
}

// Start polling for new messages
function startPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    pollingInterval = setInterval(() => {
        if (currentRecipient) {
            loadMessages();
        }
    }, 3000); // Poll every 3 seconds
}

// Stop polling
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Event listeners
setupBtn.addEventListener('click', setupUser);
addUserBtn.addEventListener('click', () => addUserModal.classList.remove('hidden'));
cancelAddUserBtn.addEventListener('click', () => addUserModal.classList.add('hidden'));
saveUserBtn.addEventListener('click', addUser);
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
