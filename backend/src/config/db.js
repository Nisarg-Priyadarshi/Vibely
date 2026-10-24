import dns from 'dns';
import mongoose from 'mongoose';

// Fix for Node.js / Windows querySrv ECONNREFUSED when resolving MongoDB Atlas SRV records
try {
  const dnsServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(',').map((s) => s.trim())
    : ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
  dns.setServers(dnsServers);
} catch (err) {
  console.warn('⚠️  [DNS] Could not set custom DNS servers:', err.message);
}

/**
 * Connects to MongoDB using the URI specified in MONGODB_URI.
 * Configured with safe timeouts and sanitized logging to never leak credentials.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('<username>') || uri.includes('placeholder')) {
    console.warn('\n⚠️  [MongoDB] MONGODB_URI is not configured or contains placeholders in .env.');
    console.warn('⚠️  [MongoDB] Running without an active database connection until configured.\n');
    return null;
  }

  try {
    const dbName = process.env.DB_NAME || 'Vibely';
    const conn = await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 5000, // Fail fast (5s) for IP whitelist / network blocks
    });
    console.log(`✅ [MongoDB] Connected successfully to database: "${conn.connection.name}"`);
    return conn;
  } catch (error) {
    // Sanitize any credentials from error messages before logging
    const sanitizedMessage = (error.message || '').replace(
      /\/\/[^:]+:[^@]+@/g,
      '//***:***@'
    );
    console.error(`❌ [MongoDB] Connection error: ${sanitizedMessage}`);
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  [MongoDB] Database connection disconnected');
});

export default connectDB;
