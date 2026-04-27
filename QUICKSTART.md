# Quick Start Guide

Get your encrypted chat app running in 5 minutes!

## Step 1: Generate PGP Keys (2 minutes)

If you don't have PGP keys:

```bash
# Generate keys
gpg --full-generate-key

# Export public key
gpg --armor --export your-email@example.com > public.key

# Export private key  
gpg --armor --export-secret-keys your-email@example.com > private.key
```

## Step 2: Set Up Supabase (2 minutes)

1. Go to [supabase.com](https://supabase.com) → Create free account
2. Create new project
3. Go to SQL Editor → Paste contents of `supabase-setup.sql`
4. Run the SQL
5. Go to Project Settings → API → Copy URL and anon key

## Step 3: Configure App (30 seconds)

Edit `app.js`:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## Step 4: Run App (30 seconds)

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js (after npm install)
npm run dev

# Option 3: PHP
php -S localhost:8000
```

Open http://localhost:8000 in your browser!

## Step 5: Start Chatting

1. Enter your username
2. Paste your public key
3. Paste your private key
4. Click "Save Identity"
5. Add users with their public keys
6. Start chatting!

## Tor Deployment (Optional)

```bash
# Install Tor
sudo apt install tor  # Ubuntu/Debian

# Configure hidden service
sudo cp torrc.example /etc/tor/torrc

# Start Tor
sudo systemctl start tor

# Get your .onion address
sudo cat /var/lib/tor/hidden_service/hostname

# Run your server
python -m http.server 8000
```

Access via Tor Browser using your .onion address!

## Troubleshooting

**Keys not working?**
- Make sure to include the full key including `-----BEGIN PGP PUBLIC KEY BLOCK-----`
- Verify keys are in ASCII-armored format

**Can't connect to Supabase?**
- Check your URL and API key
- Verify Supabase project is active
- Check browser console for errors

**Messages not appearing?**
- Ensure both users have added each other
- Check that database tables were created
- Verify polling is working (check console)

## Security Notes

⚠️ **Important Security Reminders:**

- Private keys are stored in browser localStorage
- This is a demo - production use needs additional security
- Never share your private key
- Use strong passphrases for your keys
- Consider using a password manager

## Next Steps

- Set up Tor hidden service for .onion access
- Add message signing and verification
- Implement proper authentication
- Add file encryption support
- Set up Supabase Row Level Security policies

## Need Help?

Check the full README.md for detailed documentation and troubleshooting.
