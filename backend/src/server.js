import 'dotenv/config';
import dns from 'dns';
import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initializeSocket } from './sockets/socket.js';

// Configure DNS resolvers to avoid querySrv ECONNREFUSED on MongoDB Atlas connections
try {
  const dnsServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(',').map((s) => s.trim())
    : ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
  dns.setServers(dnsServers);
} catch (err) {
  console.warn('⚠️  [DNS] Could not set custom DNS servers:', err.message);
}

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Start server
const startServer = async () => {
  // Connect to database
  await connectDB();

  server.listen(PORT, () => {
    console.log(`\n🚀 [Vibely Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`🔗 Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Readiness check available at: http://localhost:${PORT}/api/health/ready\n`);
  });
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ [Unhandled Rejection]:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ [Uncaught Exception]:', err);
  process.exit(1);
});
