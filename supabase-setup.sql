-- Encrypted Chat App - Supabase Setup Script
-- Run this in your Supabase SQL Editor

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
-- In production, you should implement proper authentication
CREATE POLICY "Public read access for users" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert access for users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for users" ON users FOR UPDATE USING (true);

CREATE POLICY "Public read access for messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Public insert access for messages" ON messages FOR INSERT WITH CHECK (true);

-- Optional: Add a function to get messages between two users
CREATE OR REPLACE FUNCTION get_conversation_messages(user1 TEXT, user2 TEXT)
RETURNS TABLE (
    id UUID,
    sender TEXT,
    recipient TEXT,
    encrypted_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM messages
    WHERE (sender = user1 AND recipient = user2)
       OR (sender = user2 AND recipient = user1)
    ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;
