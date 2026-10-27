import p5 from 'p5';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Conectado ao servidor Socket.IO');
});

const root = document.getElementById('canvas-container');

new p5((sketch) => {
  sketch.setup = () => {
    sketch.createCanvas(960, 600);
    sketch.noLoop();
  };

  sketch.draw = () => {
    sketch.background(12, 18, 30);
    sketch.stroke(90, 120, 160);
    sketch.noFill();

    for (let x = 0; x < 12; x += 1) {
      for (let y = 0; y < 8; y += 1) {
        sketch.rect(x * 70 + 30, y * 60 + 30, 60, 50);
      }
    }

    sketch.fill(125, 211, 252);
    sketch.circle(120, 120, 30);
  };
}, root);

const personagemCard = document.getElementById('personagem-card');
personagemCard.innerHTML = `
  <p><strong>Classe:</strong> Guerreiro</p>
  <p><strong>HP:</strong> 20 / 20</p>
  <p><strong>Nível:</strong> 1</p>
`;

const chatLog = document.getElementById('chat-log');
chatLog.innerHTML = `
  <p>🧙 Mestre: A porta da masmorra range.</p>
  <p>⚔️ Você: Entrando na sala com cautela.</p>
`;
