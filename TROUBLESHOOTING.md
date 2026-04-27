# 🔧 Troubleshooting Guide

This guide helps you resolve common issues with the Encrypted Chat application.

## Common Issues and Solutions

### 1. "Invalid PGP key format" Error

**Problem:** The application rejects your PGP keys.

**Solutions:**

#### Check Key Format
Make sure your keys include the proper headers and footers:

**Public Key:**
```
-----BEGIN PGP PUBLIC KEY BLOCK-----
[Your key content here]
-----END PGP PUBLIC KEY BLOCK-----
```

**Private Key:**
```
-----BEGIN PGP PRIVATE KEY BLOCK-----
[Your key content here]
-----END PGP PRIVATE KEY BLOCK-----
```

#### Generate New Keys
If your keys are corrupted, generate new ones:

```bash
# Generate new key pair
gpg --full-generate-key

# Export public key
gpg --armor --export your-email@example.com > public_key.asc

# Export private key
gpg --armor --export-secret-keys your-email@example.com > private_key.asc
```

#### Test Keys in Browser Console
Open your browser's developer console (F12) and run:

```javascript
// Test your keys
testPGPKeys(
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\n[Your public key]\n-----END PGP PUBLIC KEY BLOCK-----',
    '-----BEGIN PGP PRIVATE KEY BLOCK-----\n[Your private key]\n-----END PGP PRIVATE KEY BLOCK-----',
    'your-passphrase'
);
```

### 2. "Failed to decrypt private key" Error

**Problem:** The passphrase is incorrect or the key is corrupted.

**Solutions:**

#### Verify Passphrase
Make sure you're entering the correct passphrase. Check for:
- Extra spaces at the beginning or end
- Wrong case (passphrases are case-sensitive)
- Special characters that might be encoded differently

#### Test Without Passphrase
If your private key doesn't have a passphrase, leave the passphrase field empty.

#### Regenerate Key
If you've forgotten the passphrase, you'll need to generate a new key pair.

### 3. "Configuration Required" Error

**Problem:** Supabase credentials are not configured.

**Solutions:**

#### Update Configuration
Edit `app.js` and update the CONFIG section:

```javascript
const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    // ... other config
};
```

#### Get Credentials
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Go to Settings → API
4. Copy Project URL and anon key

### 4. "OpenPGP library not loaded" Error

**Problem:** The OpenPGP.js library failed to load from CDN.

**Solutions:**

#### Check Internet Connection
Make sure you have an active internet connection.

#### Check CDN Access
Try accessing these URLs directly:
- https://unpkg.com/openpgp@5.11.0/dist/openpgp.min.js
- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2

#### Use Local Copy
Download the libraries and reference them locally:

```html
<script src="openpgp.min.js"></script>
<script src="supabase.js"></script>
```

### 5. Messages Not Appearing

**Problem:** You send messages but they don't appear.

**Solutions:**

#### Check Database Connection
Run this in browser console:

```javascript
// Check app status
debugApp();
```

#### Verify Database Setup
Make sure you've run the SQL setup script in Supabase:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

#### Check Browser Console
Look for error messages in the browser console (F12).

#### Verify Recipient's Public Key
Make sure you've added the recipient with their correct public key.

### 6. "Failed to send message" Error

**Problem:** Message encryption or sending fails.

**Solutions:**

#### Check Recipient's Public Key
Verify the recipient's public key is valid:

```javascript
// Test recipient's key
openpgp.readKey({ armoredKey: 'recipient-public-key' })
    .then(key => console.log('Valid key:', key.getKeyID().hex))
    .catch(err => console.error('Invalid key:', err));
```

#### Check Message Length
Messages must be under 10,000 characters.

#### Check Network Connection
Make sure you can reach your Supabase project.

### 7. Application Not Loading

**Problem:** The page shows blank or errors.

**Solutions:**

#### Check Browser Compatibility
Use a modern browser (Chrome, Firefox, Safari, Edge).

#### Clear Browser Cache
```
Ctrl+Shift+Delete (Windows/Linux)
Cmd+Shift+Delete (Mac)
```

#### Disable Extensions
Try disabling browser extensions that might interfere.

#### Check JavaScript Errors
Open browser console (F12) and look for red error messages.

## Debugging Tools

### Browser Console Commands

#### Check Application Status
```javascript
debugApp();
```

#### Test PGP Keys
```javascript
testPGPKeys(publicKey, privateKey, passphrase);
```

#### View Current User
```javascript
console.log(currentUser);
```

#### View Messages
```javascript
console.log(messages);
```

#### Clear Local Storage
```javascript
localStorage.clear();
location.reload();
```

### Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Look for failed requests (red color)
4. Check response codes and error messages

## Performance Issues

### Slow Message Loading

**Solutions:**
- Check your internet connection
- Verify Supabase project region
- Consider reducing message history limit

### High Memory Usage

**Solutions:**
- Clear old messages from database
- Reduce polling interval
- Close unused browser tabs

## Security Issues

### Keys Not Working After Update

**Solutions:**
- Make sure you're using the same key pair
- Export keys again from GPG
- Verify key format hasn't changed

### Suspicious Activity

**Actions:**
1. Immediately change your Supabase credentials
2. Generate new PGP keys
3. Inform all contacts to use your new public key
4. Check for unauthorized access in Supabase logs

## Getting Help

### Collect Debug Information

Before asking for help, collect this information:

```javascript
// Run in browser console
console.log('=== Debug Info ===');
console.log('Browser:', navigator.userAgent);
console.log('OpenPGP version:', openpgp?.version);
console.log('App state:', debugApp());
console.log('Errors:', console.error);
```

### Where to Get Help

1. **Check this guide** - Most issues are covered here
2. **Browser console** - Look for specific error messages
3. **GitHub Issues** - Search for similar problems
4. **Community forums** - Ask for help with detailed information

### What to Include When Asking for Help

- Browser and version
- Operating system
- Exact error messages
- Steps to reproduce the issue
- Debug console output
- Screenshots if applicable

## Prevention

### Best Practices

1. **Backup your keys** - Keep secure copies of your PGP keys
2. **Use strong passphrases** - At least 12 characters with mixed case
3. **Test regularly** - Verify encryption/decryption works
4. **Keep software updated** - Update browser and dependencies
5. **Monitor logs** - Check for unusual activity

### Regular Maintenance

- Test your keys monthly
- Update dependencies quarterly
- Review security settings annually
- Backup your keys regularly

---

**Still having issues?** Open a GitHub issue with detailed information about your problem.