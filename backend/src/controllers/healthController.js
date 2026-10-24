import mongoose from 'mongoose';

/**
 * Health check controller.
 * Returns API operational status, database connectivity status, timestamp, and environment.
 * Safe for public consumption - does not expose connection strings or credentials.
 */
export const getHealth = (req, res) => {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const isConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    status: 'ok',
    message: 'Vibely API is running',
    database: {
      status: readyStates[mongoose.connection.readyState] || 'unknown',
      connected: isConnected,
    },
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
};

/**
 * Readiness check endpoint for probes and orchestration.
 * Returns 200 if database is connected, 503 if not ready.
 */
export const getReadiness = (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;

  if (isConnected) {
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    status: 'not_ready',
    database: 'disconnected',
    timestamp: new Date().toISOString(),
  });
};

export default {
  getHealth,
  getReadiness,
};
