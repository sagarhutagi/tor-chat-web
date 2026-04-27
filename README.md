# 🔐 Encrypted Chat - Tor & PGP Secure Messaging

A privacy-focused, end-to-end encrypted chat application designed for use over the Tor network. Built with PGP encryption, Supabase backend, and modern web technologies.

## ✨ Features

- **🔒 End-to-End Encryption**: PGP-based encryption for all messages
- **🌐 Tor Network Ready**: Designed to work seamlessly over Tor
- **👤 User Management**: Secure user identity with PGP key pairs
- **💬 Real-time Messaging**: Polling-based message updates
- **🎨 Modern UI**: Clean, responsive interface with dark theme
- **📱 Cross-Platform**: Works on desktop, tablet, and mobile devices
- **🛡️ Privacy First**: No message metadata stored, only encrypted content

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn
- A Supabase project (free tier works)
- PGP keys (you can generate new ones)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/encrypted-chat-tor.git
   cd encrypted-chat-tor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Set up Supabase database**
   ```bash
   # Run the SQL setup script in your Supabase SQL editor
   cat supabase-setup.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:8000`

## 📋 Setup Guide

### Supabase Configuration

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon key
4. Add them to your `.env` file

### Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    encrypted_message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert users"
    ON users FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can upsert users"
    ON users FOR UPSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can read messages"
    ON messages FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert messages"
    ON messages FOR INSERT
    WITH CHECK (true);
```

### PGP Key Generation

Generate your PGP keys using GPG:

```bash
# Generate a new key pair
gpg --full-generate-key

# Export your public key
gpg --armor --export your-email@example.com > public_key.asc

# Export your private key
gpg --armor --export-secret-keys your-email@example.com > private_key.asc
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | Required |
| `MESSAGE_POLL_INTERVAL` | Message polling interval (ms) | `3000` |

### Tor Integration (Optional)

To use over Tor:

1. Install Tor: `sudo apt install tor` (Linux) or download Tor Browser
2. Configure your Tor proxy settings
3. Access the application through Tor

## 🏗️ Project Structure

```
encrypted-chat-tor/
├── index.html              # Main HTML file
├── styles.css              # Modern styling
├── app.js                  # Application logic
├── supabase-setup.sql      # Database setup script
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json            # Node.js dependencies
└── README.md               # This file
```

## 🔒 Security Features

- **End-to-End Encryption**: Messages are encrypted on the client side
- **PGP Standards**: Uses industry-standard PGP encryption
- **No Server-Side Decryption**: Server never sees plaintext messages
- **Secure Key Storage**: Private keys stored locally only
- **Input Validation**: All inputs are validated and sanitized
- **XSS Protection**: Content is properly escaped

## 🚢 Deployment

### Static Hosting

Deploy to any static hosting service:

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**GitHub Pages:**
```bash
# Build and deploy to gh-pages branch
git subtree push --prefix dist origin gh-pages
```

### Environment Setup

For production, ensure you:

1. Set up production environment variables
2. Use HTTPS (required for secure communication)
3. Enable proper CORS settings in Supabase
4. Consider rate limiting for API calls
5. Monitor for suspicious activity

## 🧪 Development

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with auto-open
npm test           # Run tests (when implemented)
npm run build      # Build for production (when implemented)
```

### Code Style

- Use modern JavaScript (ES6+)
- Follow existing code conventions
- Add comments for complex logic
- Keep functions focused and small

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write clean, readable code
- Add tests for new features
- Update documentation as needed
- Follow the existing code style
- Test thoroughly before submitting

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is provided as-is for educational and privacy-conscious communication. While we implement strong encryption practices:

- Always verify your recipient's public keys
- Keep your private keys secure and never share them
- Use strong passphrases for your private keys
- Be aware that no system is 100% secure
- Use at your own risk

## 🙏 Acknowledgments

- [OpenPGP.js](https://openpgpjs.org/) for client-side PGP implementation
- [Supabase](https://supabase.com/) for the backend infrastructure
- The Tor Project for privacy networking inspiration

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments

## 🔮 Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] File sharing with encryption
- [ ] Voice/video calls with encryption
- [ ] Mobile app (React Native)
- [ ] Enhanced Tor integration
- [ ] Message expiration
- [ ] Two-factor authentication
- [ ] Backup and restore functionality

---

**Built with ❤️ for privacy and secure communication**
