import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './src/server/socket-handlers';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });
  setupSocketHandlers(io);
  const port = parseInt(process.env.PORT ?? '3000', 10);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
