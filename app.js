// Configuration
const CONFIG = {
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    MESSAGE_POLL_INTERVAL: 3000,
    MAX_MESSAGE_LENGTH: 10000,
    MAX_USERNAME_LENGTH: 50,
    MIN_USERNAME_LENGTH: 3,
    STORAGE_KEY: 'encrypted_chat_user',
    ENCRYPTION_ALGORITHM: 'PGP'
};

// Initialize Supabase
let supabase;
try {
    if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        throw new Error('Supabase URL not configured. Please update CONFIG.SUPABASE_URL');
    }
    if (!CONFIG.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        throw new Error('Supabase anon key not configured. Please update CONFIG.SUPABASE_ANON_KEY');
    }

    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('Supabase initialized successfully');
} catch (error) {
    console.error('Failed to initialize Supabase:', error.message);
    showConfigurationError();
}

// App State
let currentUser = null;
let currentRecipient = null;
let users = [];
let messages = [];
let pollingInterval = null;
let isLoading = false;
let lastMessageCount = 0;

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
    try {
        loadUserFromStorage();
        if (currentUser) {
            showChatSection();
            loadUsers();
            startPolling();
        } else {
            showSetupSection();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Load user from localStorage
function loadUserFromStorage() {
    try {
        const storedUser = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Validate stored user structure
            if (parsedUser.username && parsedUser.publicKey && parsedUser.privateKey) {
                currentUser = parsedUser;
                console.log('User loaded from storage:', currentUser.username);
            } else {
                console.warn('Invalid user data in storage, clearing...');
                localStorage.removeItem(CONFIG.STORAGE_KEY);
            }
        }
    } catch (error) {
        console.error('Failed to load user from storage:', error);
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    }
}

// Save user to localStorage
function saveUserToStorage() {
    try {
        if (!currentUser) {
            throw new Error('No user to save');
        }

        // Validate user object before saving
        if (!currentUser.username || !currentUser.publicKey || !currentUser.privateKey) {
            throw new Error('Invalid user data');
        }

        const userData = {
            username: currentUser.username,
            publicKey: currentUser.publicKey,
            privateKey: currentUser.privateKey,
            passphrase: currentUser.passphrase || null
        };

        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(userData));
        console.log('User saved to storage');
    } catch (error) {
        console.error('Failed to save user to storage:', error);
        throw error;
    }
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

// Show configuration error
function showConfigurationError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <h2>⚠️ Configuration Required</h2>
        <p>Please configure your Supabase credentials in app.js:</p>
        <ol>
            <li>Open app.js in a text editor</li>
            <li>Update CONFIG.SUPABASE_URL with your project URL</li>
            <li>Update CONFIG.SUPABASE_ANON_KEY with your anon key</li>
            <li>Save the file and refresh this page</li>
        </ol>
        <p>You can get these values from your Supabase project settings.</p>
    `;
    document.body.innerHTML = '';
    document.body.appendChild(errorDiv);
}

// Show error message
function showError(message, duration = 5000) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'toast error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.classList.add('show');
    }, 10);

    setTimeout(() => {
        errorDiv.classList.remove('show');
        setTimeout(() => errorDiv.remove(), 300);
    }, duration);
}

// Show success message
function showSuccess(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.className = 'toast success';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.classList.add('show');
    }, 10);

    setTimeout(() => {
        successDiv.classList.remove('show');
        setTimeout(() => successDiv.remove(), 300);
    }, duration);
}

// Set loading state
function setLoading(loading, element = null) {
    isLoading = loading;

    if (element) {
        if (loading) {
            element.disabled = true;
            element.dataset.originalText = element.textContent;
            element.textContent = 'Loading...';
        } else {
            element.disabled = false;
            element.textContent = element.dataset.originalText || element.textContent;
        }
    }

    // Update cursor
    document.body.style.cursor = loading ? 'wait' : 'default';
}

// Validate username
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        throw new Error('Username is required');
    }

    username = username.trim();

    if (username.length < CONFIG.MIN_USERNAME_LENGTH) {
        throw new Error(`Username must be at least ${CONFIG.MIN_USERNAME_LENGTH} characters`);
    }

    if (username.length > CONFIG.MAX_USERNAME_LENGTH) {
        throw new Error(`Username must not exceed ${CONFIG.MAX_USERNAME_LENGTH} characters`);
    }

    // Allow only alphanumeric characters, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }

    return username;
}

// Validate PGP key
function validatePGPKey(key) {
    if (!key || typeof key !== 'string') {
        throw new Error('Key is required');
    }

    key = key.trim();

    if (!key.includes('-----BEGIN PGP')) {
        throw new Error('Invalid PGP key format. Key must include PGP headers');
    }

    if (!key.includes('-----END PGP')) {
        throw new Error('Invalid PGP key format. Key must include PGP footers');
    }

    return key;
}

// Sanitize input
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }

    // Basic HTML escaping
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Setup user identity
async function setupUser() {
    if (isLoading) return;

    try {
        const username = usernameInput.value.trim();
        const publicKey = publicKeyInput.value.trim();
        const privateKey = privateKeyInput.value.trim();
        const passphrase = privateKeyPassphraseInput.value;

        // Validate inputs
        const validatedUsername = validateUsername(username);
        const validatedPublicKey = validatePGPKey(publicKey);
        const validatedPrivateKey = validatePGPKey(privateKey);

        setLoading(true, setupBtn);

        // Validate keys with OpenPGP
        let publicKeyObj, privateKeyObj;

        try {
            publicKeyObj = await openpgp.readKey({ armoredKey: validatedPublicKey });
        } catch (error) {
            throw new Error('Invalid public key. Please check your PGP public key.');
        }

        try {
            privateKeyObj = await openpgp.readPrivateKey({ armoredKey: validatedPrivateKey });
        } catch (error) {
            throw new Error('Invalid private key. Please check your PGP private key.');
        }

        // Test private key decryption if passphrase provided
        if (passphrase) {
            try {
                await privateKeyObj.decrypt(passphrase);
            } catch (error) {
                throw new Error('Failed to decrypt private key. Please check your passphrase.');
            }
        }

        // Create user object
        currentUser = {
            username: validatedUsername,
            publicKey: validatedPublicKey,
            privateKey: validatedPrivateKey,
            passphrase: passphrase || null
        };

        // Save to localStorage
        saveUserToStorage();

        // Register user in Supabase
        await registerUserInSupabase(validatedUsername, validatedPublicKey);

        // Show success message
        showSuccess('Identity saved successfully!');

        // Show chat section
        showChatSection();
        loadUsers();
        startPolling();

        // Clear form
        usernameInput.value = '';
        publicKeyInput.value = '';
        privateKeyInput.value = '';
        privateKeyPassphraseInput.value = '';

    } catch (error) {
        console.error('Setup error:', error);
        showError(error.message || 'Failed to setup identity. Please try again.');
    } finally {
        setLoading(false, setupBtn);
    }
}

// Register user in Supabase
async function registerUserInSupabase(username, publicKey) {
    if (!supabase) {
        throw new Error('Supabase not initialized');
    }

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
        console.log('User registered in Supabase:', username);
        return data;
    } catch (error) {
        console.error('Failed to register user in Supabase:', error);
        // Don't throw error - allow app to continue even if registration fails
        // User can still use the app, just won't be discoverable
        console.warn('User registration failed, but continuing...');
    }
}

// Load users from Supabase
async function loadUsers() {
    if (!supabase) {
        console.error('Supabase not initialized');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter out current user and validate data
        users = (data || [])
            .filter(user => user.username !== currentUser?.username)
            .filter(user => user.username && user.public_key)
            .map(user => ({
                username: sanitizeInput(user.username),
                public_key: user.public_key,
                created_at: user.created_at
            }));

        renderUserList();
        console.log(`Loaded ${users.length} users`);
    } catch (error) {
        console.error('Failed to load users:', error);
        showError('Failed to load users. Please check your connection.');
    }
}

// Render user list
function renderUserList() {
    userList.innerHTML = '';

    if (users.length === 0) {
        userList.innerHTML = '<div class="no-users">No users available. Add users to start chatting!</div>';
        return;
    }

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        if (currentRecipient && currentRecipient.username === user.username) {
            userItem.classList.add('active');
        }

        userItem.innerHTML = `
            <div class="username">${escapeHtml(user.username)}</div>
            <div class="last-message">Click to start chatting</div>
        `;

        userItem.addEventListener('click', () => selectUser(user));
        userList.appendChild(userItem);
    });
}

// Select user to chat with
function selectUser(user) {
    if (!user || !user.username) {
        console.error('Invalid user selected');
        return;
    }

    currentRecipient = user;
    chatRecipient.textContent = `Chat with ${escapeHtml(user.username)}`;
    renderUserList();
    loadMessages();
}

// Load messages for current conversation
async function loadMessages() {
    if (!currentRecipient || !currentUser || !supabase) {
        return;
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender.eq.${currentUser.username},recipient.eq.${currentRecipient.username}),and(sender.eq.${currentRecipient.username},recipient.eq.${currentUser.username})`)
            .order('created_at', { ascending: true })
            .limit(100); // Limit to last 100 messages

        if (error) throw error;

        const newMessageCount = (data || []).length;
        messages = data || [];

        // Only re-render if we have new messages
        if (newMessageCount !== lastMessageCount) {
            await renderMessages();
            lastMessageCount = newMessageCount;
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
        // Don't show error for polling failures
    }
}

// Render messages
async function renderMessages() {
    messagesContainer.innerHTML = '';

    if (messages.length === 0) {
        messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
        return;
    }

    for (const message of messages) {
        const messageEl = document.createElement('div');
        const isSent = message.sender === currentUser.username;
        messageEl.className = `message ${isSent ? 'sent' : 'received'}`;

        try {
            // Decrypt message
            const decryptedText = await decryptMessage(message.encrypted_message);

            // Validate and sanitize message content
            const sanitizedContent = sanitizeInput(decryptedText);
            const truncatedContent = sanitizedContent.length > CONFIG.MAX_MESSAGE_LENGTH
                ? sanitizedContent.substring(0, CONFIG.MAX_MESSAGE_LENGTH) + '...'
                : sanitizedContent;

            messageEl.innerHTML = `
                <div class="sender">${escapeHtml(message.sender)}</div>
                <div class="content">${escapeHtml(truncatedContent)}</div>
                <div class="timestamp">${formatTimestamp(message.created_at)}</div>
            `;
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            messageEl.innerHTML = `
                <div class="sender">${escapeHtml(message.sender)}</div>
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
    if (isLoading) return;

    const text = messageInput.value.trim();

    if (!text) {
        showError('Please enter a message');
        return;
    }

    if (!currentRecipient) {
        showError('Please select a user to chat with');
        return;
    }

    if (!currentUser) {
        showError('Please set up your identity first');
        return;
    }

    // Validate message length
    if (text.length > CONFIG.MAX_MESSAGE_LENGTH) {
        showError(`Message too long. Maximum ${CONFIG.MAX_MESSAGE_LENGTH} characters.`);
        return;
    }

    try {
        setLoading(true, sendBtn);

        // Encrypt message
        const encryptedMessage = await encryptMessage(text, currentRecipient.public_key);

        if (!encryptedMessage) {
            throw new Error('Failed to encrypt message');
        }

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

        showSuccess('Message sent!');

    } catch (error) {
        console.error('Failed to send message:', error);
        showError('Failed to send message. Please try again.');
    } finally {
        setLoading(false, sendBtn);
    }
}

// Encrypt message
async function encryptMessage(text, recipientPublicKey) {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid message text');
    }

    if (!recipientPublicKey) {
        throw new Error('Recipient public key required');
    }

    try {
        const publicKey = await openpgp.readKey({ armoredKey: recipientPublicKey });

        if (!publicKey) {
            throw new Error('Failed to read public key');
        }

        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text }),
            encryptionKeys: publicKey
        });

        if (!encrypted) {
            throw new Error('Encryption failed');
        }

        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt message');
    }
}

// Decrypt message
async function decryptMessage(encryptedMessage) {
    if (!encryptedMessage) {
        throw new Error('No encrypted message provided');
    }

    if (!currentUser || !currentUser.privateKey) {
        throw new Error('User private key not available');
    }

    try {
        const privateKey = await openpgp.readPrivateKey({ armoredKey: currentUser.privateKey });

        if (!privateKey) {
            throw new Error('Failed to read private key');
        }

        // Decrypt private key if passphrase is provided
        if (currentUser.passphrase) {
            try {
                await privateKey.decrypt(currentUser.passphrase);
            } catch (error) {
                throw new Error('Failed to decrypt private key with passphrase');
            }
        }

        const message = await openpgp.readMessage({ armoredMessage: encryptedMessage });

        if (!message) {
            throw new Error('Failed to read encrypted message');
        }

        const { data: decrypted } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKey
        });

        if (!decrypted) {
            throw new Error('Decryption returned no data');
        }

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt message');
    }
}

// Add new user
async function addUser() {
    if (isLoading) return;

    const username = newUsernameInput.value.trim();
    const publicKey = newPublicKeyInput.value.trim();

    if (!username || !publicKey) {
        showError('Please fill in all fields');
        return;
    }

    try {
        // Validate inputs
        const validatedUsername = validateUsername(username);
        const validatedPublicKey = validatePGPKey(publicKey);

        setLoading(true, saveUserBtn);

        // Validate public key
        try {
            await openpgp.readKey({ armoredKey: validatedPublicKey });
        } catch (error) {
            throw new Error('Invalid public key format');
        }

        // Add to Supabase
        const { data, error } = await supabase
            .from('users')
            .upsert({
                username: validatedUsername,
                public_key: validatedPublicKey
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

        showSuccess('User added successfully!');

    } catch (error) {
        console.error('Failed to add user:', error);
        showError(error.message || 'Failed to add user. Please try again.');
    } finally {
        setLoading(false, saveUserBtn);
    }
}

// Start polling for new messages
function startPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    console.log('Starting message polling...');

    pollingInterval = setInterval(() => {
        if (currentRecipient && !isLoading) {
            loadMessages();
        }
    }, CONFIG.MESSAGE_POLL_INTERVAL);
}

// Stop polling
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('Stopped message polling');
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimestamp(timestamp) {
    if (!timestamp) {
        return '';
    }

    try {
        const date = new Date(timestamp);

        if (isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Failed to format timestamp:', error);
        return '';
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopPolling();
});

// Handle visibility change (pause polling when tab is not visible)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Tab hidden, pausing polling');
        stopPolling();
    } else {
        console.log('Tab visible, resuming polling');
        if (currentUser && currentRecipient) {
            startPolling();
            loadMessages();
        }
    }
});

// Event listeners
setupBtn.addEventListener('click', setupUser);
addUserBtn.addEventListener('click', () => addUserModal.classList.remove('hidden'));
cancelAddUserBtn.addEventListener('click', () => addUserModal.classList.add('hidden'));
saveUserBtn.addEventListener('click', addUser);
sendBtn.addEventListener('click', sendMessage);

// Handle Enter key in message input
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Handle Enter key in setup form
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        setupUser();
    }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !addUserModal.classList.contains('hidden')) {
        addUserModal.classList.add('hidden');
    }
});

// Close modal when clicking outside
addUserModal.addEventListener('click', (e) => {
    if (e.target === addUserModal) {
        addUserModal.classList.add('hidden');
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
