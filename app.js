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

// Supabase client is initialized during app startup after runtime config is loaded.
let supabaseClient;

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
        initializeApp().catch((error) => {
            console.error('Initialization error:', error);
            showError('Failed to initialize application. Please refresh the page.');
        });
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

async function initializeApp() {
    // Load runtime configuration first so .env values can override defaults.
    await loadRuntimeConfig();

    try {
        // Check if required libraries are loaded
        if (typeof openpgp === 'undefined') {
            console.error('OpenPGP library not loaded');
            showConfigurationError();
            return;
        }

        if (!window.supabase) {
            console.error('Supabase library not loaded');
            showConfigurationError();
            return;
        }

        initializeSupabaseClient();

        console.log('Libraries loaded successfully');
        console.log('OpenPGP version:', openpgp.version || 'unknown');

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
        showConfigurationError();
    }
}

async function loadRuntimeConfig() {
    try {
        const response = await fetch('.env', { cache: 'no-store' });
        if (!response.ok) {
            return;
        }

        const envText = await response.text();
        const env = parseEnvText(envText);

        if (env.SUPABASE_URL) {
            CONFIG.SUPABASE_URL = env.SUPABASE_URL;
        }

        if (env.SUPABASE_ANON_KEY) {
            CONFIG.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
        }

        if (env.MESSAGE_POLL_INTERVAL) {
            const pollInterval = Number.parseInt(env.MESSAGE_POLL_INTERVAL, 10);
            if (Number.isFinite(pollInterval) && pollInterval > 0) {
                CONFIG.MESSAGE_POLL_INTERVAL = pollInterval;
            }
        }
    } catch (error) {
        console.warn('Could not load .env file in browser context:', error);
    }
}

function parseEnvText(envText) {
    const parsed = {};
    const lines = envText.split(/\r?\n/);

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = line.substring(0, separatorIndex).trim();
        const value = line.substring(separatorIndex + 1).trim();

        if (!key) {
            continue;
        }

        parsed[key] = value;
    }

    return parsed;
}

function initializeSupabaseClient() {
    if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        throw new Error('Supabase URL not configured. Add SUPABASE_URL to .env or app.js');
    }

    if (!CONFIG.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        throw new Error('Supabase anon key not configured. Add SUPABASE_ANON_KEY to .env or app.js');
    }

    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('Supabase initialized successfully');
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
        <p>Please configure your Supabase credentials in .env or app.js:</p>
        <ol>
            <li>Open .env (preferred) or app.js</li>
            <li>Set SUPABASE_URL to your project URL</li>
            <li>Set SUPABASE_ANON_KEY to your anon key</li>
            <li>Save the file and refresh this page</li>
        </ol>
        <p>You can get these values from your Supabase project settings.</p>
        <p><strong>Library Status:</strong></p>
        <ul>
            <li>OpenPGP.js: ${typeof openpgp !== 'undefined' ? '✅ Loaded' : '❌ Not loaded'}</li>
            <li>Supabase: ${supabaseClient || window.supabase ? '✅ Loaded' : '❌ Not loaded'}</li>
        </ul>
        <p><strong>Troubleshooting:</strong></p>
        <ul>
            <li>Check your internet connection</li>
            <li>Make sure CDNs are accessible</li>
            <li>Try refreshing the page</li>
            <li>Check browser console for detailed errors</li>
        </ul>
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

    // More flexible PGP key validation
    const pgpHeaders = [
        '-----BEGIN PGP PUBLIC KEY BLOCK-----',
        '-----BEGIN PGP PRIVATE KEY BLOCK-----',
        '-----BEGIN PGP MESSAGE-----'
    ];

    const pgpFooters = [
        '-----END PGP PUBLIC KEY BLOCK-----',
        '-----END PGP PRIVATE KEY BLOCK-----',
        '-----END PGP MESSAGE-----'
    ];

    const hasValidHeader = pgpHeaders.some(header => key.includes(header));
    const hasValidFooter = pgpFooters.some(footer => key.includes(footer));

    if (!hasValidHeader) {
        throw new Error('Invalid PGP key format. Key must include PGP headers like "-----BEGIN PGP PUBLIC KEY BLOCK-----"');
    }

    if (!hasValidFooter) {
        throw new Error('Invalid PGP key format. Key must include PGP footers like "-----END PGP PUBLIC KEY BLOCK-----"');
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

// Decrypt a private key with backwards-compatible API handling
async function unlockPrivateKey(privateKeyObj, passphrase) {
    if (!passphrase) {
        return privateKeyObj;
    }

    if (typeof openpgp.decryptKey === 'function') {
        return await openpgp.decryptKey({
            privateKey: privateKeyObj,
            passphrase
        });
    }

    // Fallback for older OpenPGP APIs
    if (typeof privateKeyObj.decrypt === 'function') {
        await privateKeyObj.decrypt(passphrase);
        return privateKeyObj;
    }

    throw new Error('Your OpenPGP version does not support passphrase decryption');
}

// Test PGP keys (for debugging)
window.testPGPKeys = async function(publicKeyArmored, privateKeyArmored, passphrase = '') {
    console.log('Testing PGP keys...');

    try {
        // Test public key
        console.log('Testing public key...');
        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
        console.log('✅ Public key is valid');
        console.log('Key ID:', publicKey.getKeyID().hex);

        // Test private key
        console.log('Testing private key...');
        const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
        console.log('✅ Private key is valid');
        console.log('Key ID:', privateKey.getKeyID().hex);

        // Test decryption if passphrase provided
        if (passphrase) {
            console.log('Testing passphrase...');
            try {
                await unlockPrivateKey(privateKey, passphrase);
                console.log('✅ Passphrase is correct');
            } catch (error) {
                console.error('❌ Passphrase is incorrect');
                throw error;
            }
        }

        // Test encryption/decryption
        console.log('Testing encryption/decryption...');
        const testMessage = 'Hello, World!';
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: testMessage }),
            encryptionKeys: publicKey
        });
        console.log('✅ Encryption successful');

        const { data: decrypted } = await openpgp.decrypt({
            message: await openpgp.readMessage({ armoredMessage: encrypted }),
            decryptionKeys: privateKey
        });
        console.log('✅ Decryption successful');
        console.log('Original:', testMessage);
        console.log('Decrypted:', decrypted);

        if (testMessage === decrypted) {
            console.log('✅ All tests passed!');
            return true;
        } else {
            console.error('❌ Decryption mismatch');
            return false;
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
};

// Make helper functions available globally for debugging
window.debugApp = function() {
    console.log('=== Application Debug Info ===');
    console.log('OpenPGP loaded:', typeof openpgp !== 'undefined');
    console.log('OpenPGP version:', openpgp?.version);
    console.log('Supabase loaded:', !!supabaseClient || !!window.supabase);
    console.log('Current user:', currentUser?.username || 'Not set');
    console.log('Current recipient:', currentRecipient?.username || 'Not set');
    console.log('Users loaded:', users.length);
    console.log('Messages loaded:', messages.length);
    console.log('Polling active:', pollingInterval !== null);
    console.log('============================');
};

// Setup user identity
async function setupUser() {
    if (isLoading) return;

    try {
        const username = usernameInput.value.trim();
        const publicKey = publicKeyInput.value.trim();
        const privateKey = privateKeyInput.value.trim();
        const passphrase = privateKeyPassphraseInput.value;

        console.log('Starting setup process...');

        // Validate inputs
        const validatedUsername = validateUsername(username);
        const validatedPublicKey = validatePGPKey(publicKey);
        const validatedPrivateKey = validatePGPKey(privateKey);

        console.log('Inputs validated successfully');

        setLoading(true, setupBtn);

        // Check if OpenPGP is available
        if (typeof openpgp === 'undefined') {
            throw new Error('OpenPGP library not loaded. Please check your internet connection.');
        }

        console.log('OpenPGP version:', openpgp.version);

        // Validate keys with OpenPGP
        let publicKeyObj, privateKeyObj;

        try {
            console.log('Reading public key...');
            publicKeyObj = await openpgp.readKey({ armoredKey: validatedPublicKey });
            console.log('Public key read successfully');
        } catch (error) {
            console.error('Public key error:', error);
            throw new Error('Invalid public key. Please check your PGP public key format.');
        }

        try {
            console.log('Reading private key...');
            privateKeyObj = await openpgp.readPrivateKey({ armoredKey: validatedPrivateKey });
            console.log('Private key read successfully');
        } catch (error) {
            console.error('Private key error:', error);
            throw new Error('Invalid private key. Please check your PGP private key format.');
        }

        // Test private key decryption if passphrase provided
        if (passphrase) {
            try {
                console.log('Testing private key decryption...');
                await unlockPrivateKey(privateKeyObj, passphrase);
                console.log('Private key decrypted successfully');
            } catch (error) {
                console.error('Private key decryption error:', error);
                throw new Error('Failed to decrypt private key. Please check your passphrase.');
            }
        } else {
            console.log('No passphrase provided, skipping decryption test');
        }

        // Create user object
        currentUser = {
            username: validatedUsername,
            publicKey: validatedPublicKey,
            privateKey: validatedPrivateKey,
            passphrase: passphrase || null
        };

        console.log('User object created:', currentUser.username);

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

        console.log('Setup completed successfully');

    } catch (error) {
        console.error('Setup error:', error);
        showError(error.message || 'Failed to setup identity. Please try again.');
    } finally {
        setLoading(false, setupBtn);
    }
}

// Register user in Supabase
async function registerUserInSupabase(username, publicKey) {
    if (!supabaseClient) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        console.error('Supabase not initialized');
        return;
    }

    try {
        const { data, error } = await supabaseClient
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
    if (!currentRecipient || !currentUser || !supabaseClient) {
        return;
    }

    try {
        const { data, error } = await supabaseClient
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
        const { data, error } = await supabaseClient
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
        const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: currentUser.privateKey });

        if (!privateKeyObj) {
            throw new Error('Failed to read private key');
        }

        const privateKey = await unlockPrivateKey(privateKeyObj, currentUser.passphrase);

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
        const { data, error } = await supabaseClient
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
