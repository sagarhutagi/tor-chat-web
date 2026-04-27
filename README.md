# Encrypted Chat App

A privacy-focused chat application with client-side OpenPGP encryption, designed to be hosted on Tor (.onion) services.

## Features

- **Client-side encryption**: Messages are encrypted/decrypted using OpenPGP
- **Zero-knowledge backend**: Server never sees plaintext messages
- **Simple authentication**: Username + PGP key pair
- **Real-time updates**: Polling for new messages
- **Tor-ready**: Designed for .onion hosting

## Security Architecture

- Private keys are stored locally in browser localStorage
- Only encrypted messages are sent to the server
- Server (Supabase) only stores: sender, recipient, encrypted_message, timestamp
- Encryption/decryption happens entirely in the browser

## Prerequisites

- Node.js (for local development server, optional)
- Supabase account
- PGP key pair (generate one if needed)

## Quick Start

### 1. Generate PGP Keys (if needed)

```bash
# Using GPG
gpg --full-generate-key

# Export public key
gpg --armor --export your-email@example.com > public.key

# Export private key
gpg --armor --export-secret-keys your-email@example.com > private.key
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to SQL Editor and run the following:

```sql
-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    encrypted_message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_sender ON messages(sender);
CREATE INDEX idx_messages_recipient ON messages(recipient);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security (optional, for additional security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow public access (for this demo)
CREATE POLICY "Public read access for users" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert access for users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for users" ON users FOR UPDATE USING (true);
CREATE POLICY "Public read access for messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Public insert access for messages" ON messages FOR INSERT WITH CHECK (true);
```

4. Get your Supabase credentials:
   - Go to Project Settings → API
   - Copy Project URL and anon/public key

### 3. Configure the App

Edit `app.js` and update the Supabase configuration:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual Supabase credentials.

### 4. Run Locally

#### Option A: Simple HTTP Server (Python)

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option B: Node.js HTTP Server

```bash
# Install http-server globally
npm install -g http-server

# Run
http-server -p 8000
```

#### Option C: PHP Built-in Server

```bash
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### 5. Set Up Your Identity

1. Enter your username
2. Paste your PGP public key
3. Paste your PGP private key (stored locally only)
4. Enter your private key passphrase if protected
5. Click "Save Identity"

### 6. Start Chatting

1. Click "+ Add User" to add contacts
2. Enter their username and public key
3. Select a user from the list
4. Start chatting!

## Tor Deployment

### Option 1: Tor Hidden Service (.onion)

1. **Install Tor**

```bash
# Ubuntu/Debian
sudo apt install tor

# macOS
brew install tor
```

2. **Configure Tor Hidden Service**

Edit `/etc/tor/torrc` (or create `torrc` in your Tor directory):

```torrc
HiddenServiceDir /var/lib/tor/hidden_service/
HiddenServicePort 80 127.0.0.1:8000
```

3. **Start Tor**

```bash
sudo systemctl start tor
# or
tor
```

4. **Get your .onion address**

```bash
sudo cat /var/lib/tor/hidden_service/hostname
```

5. **Run your web server**

```bash
python -m http.server 8000
```

6. **Access via Tor Browser**

Open Tor Browser and navigate to your `.onion` address.

### Option 2: Using Torsocks

```bash
# Install torsocks
sudo apt install torsocks  # Ubuntu/Debian
brew install torsocks     # macOS

# Run your server through Tor
torsocks python -m http.server 8000
```

## File Structure

```
tor-web/
├── index.html          # Main HTML structure
├── styles.css          # Styling
├── app.js              # Main application logic
└── README.md           # This file
```

## How It Works

### Encryption Flow

1. **User A sends message to User B:**
   - User A types message
   - App encrypts message with User B's public key
   - Only encrypted message sent to server
   - Server stores encrypted message

2. **User B receives message:**
   - App fetches encrypted message from server
   - User B's private key decrypts message locally
   - Plaintext message displayed

### Security Guarantees

- Server never sees private keys
- Server never sees plaintext messages
- Each message encrypted with recipient's public key
- Only recipient can decrypt with their private key

## Troubleshooting

### Common Issues

**"Invalid PGP keys" error:**
- Ensure you're pasting the complete key including `-----BEGIN PGP PUBLIC KEY BLOCK-----` headers
- Check that keys are in ASCII-armored format

**"Failed to decrypt private key" error:**
- Verify your passphrase is correct
- Make sure you're using the correct private key

**Messages not appearing:**
- Check Supabase credentials in app.js
- Verify database tables were created correctly
- Check browser console for errors

**Tor connection issues:**
- Ensure Tor service is running
- Check torrc configuration
- Verify firewall settings

## Development Notes

### Adding Features

- **Message signing**: Add signature verification using `openpgp.sign()` and `openpgp.verify()`
- **File encryption**: Extend to support encrypted file attachments
- **Group chats**: Implement multi-recipient encryption
- **Real-time**: Replace polling with Supabase Realtime subscriptions

### Security Considerations

- This is a minimal MVP - production use needs additional security hardening
- Consider adding: key verification, message authentication, forward secrecy
- Private keys in localStorage - consider using secure storage alternatives
- No key rotation mechanism implemented

## License

MIT License - Feel free to use and modify for your needs.

## Contributing

This is a minimal educational project. Suggestions and improvements welcome!

## Disclaimer

This is a demonstration project. For production use, conduct thorough security audits and consider additional hardening measures.
