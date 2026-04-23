import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { connectMongo, disconnectMongo } from './database/mongo.js';
import { connectRedis, disconnectRedis } from './database/redis.js';
import { setupReplWebSocket } from './routes/repl.routes.js';
import { setupExecutionWebSocket } from './routes/execution.ws.js';
import { setupCollabWebSocket } from './collab/websocketServer.js';

const PORT = process.env.PORT || 3001;

async function start(): Promise<void> {
  await connectMongo();
  await connectRedis();

  const httpServer = createServer(app);
  setupReplWebSocket(httpServer);
  setupExecutionWebSocket(httpServer);
  setupCollabWebSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Execution WebSocket: ws://localhost:${PORT}/ws/execute`);
    console.log(`REPL WebSocket: ws://localhost:${PORT}/ws/repl`);
    console.log(`Collab WebSocket: ws://localhost:${PORT}/ws/collab/:projectId/:fileId`);
  });

  async function shutdown(signal: string) {
    console.log(`\n${signal} received — shutting down`);
    httpServer.close(async () => {
      await disconnectMongo();
      await disconnectRedis();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
