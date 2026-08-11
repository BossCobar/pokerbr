import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './src/server/socket-handlers';

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PokerBR Socket.io server');
});

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

setupSocketHandlers(io);

const port = parseInt(process.env.PORT ?? '3001', 10);
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`PokerBR Socket.io server running on port ${port}`);
});
