const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const easymidi = require('easymidi');
const fs = require('fs');
const { exec } = require('child_process');

const PUERTO_WEB = 3000;
const NOMBRE_PUERTO_MIDI = 'ControladorMidi';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static('public'));

server.on('connection', (socket) => { socket.setNoDelay(true); });

app.get('/api/faders', (req, res) => {
    try { res.json(JSON.parse(fs.readFileSync('faders.json', 'utf8'))); } 
    catch (err) { res.status(500).json({ error: "No se pudo leer faders.json" }); }
});

app.post('/api/faders', (req, res) => {
    try {
        fs.writeFileSync('faders.json', JSON.stringify(req.body, null, 2));
        wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'RELOAD' })); });
        res.json({ message: "Guardado" });
    } catch (err) { res.status(500).json({ error: "Error al guardar" }); }
});

let output;
try {
    output = new easymidi.Output(NOMBRE_PUERTO_MIDI); 
    console.log(`✅ Conectado a loopMIDI: "${NOMBRE_PUERTO_MIDI}"`);
} catch (e) { console.error(`❌ ERROR MIDI: No se encontró "${NOMBRE_PUERTO_MIDI}".`); }

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // 1. PROCESAR MIDI
            if (data.type === 'MIDI' && output) {
                console.log(`🎵 MIDI -> CC: ${data.cc} | Valor: ${data.val}`);
                output.send('cc', { controller: parseInt(data.cc), value: parseInt(data.val), channel: 0 });
            }
            
            // 2. PROCESAR AUDIO APP
            if (data.type === 'AUDIO') {
                const volMIDI = parseInt(data.val); 
                let target = data.target.toLowerCase().replace(/[:\s]/g, ''); 
                
                if (target === 'master' || target === 'windows') {
                    const masterVol = Math.round((volMIDI / 127) * 65535);
                    exec(`nircmd.exe setsysvolume ${masterVol}`);
                    console.log(`🔊 Audio MASTER -> ${Math.round((volMIDI/127)*100)}%`);
                } else {
                    const appVol = (volMIDI / 127).toFixed(2);
                    const exeName = target.endsWith('.exe') ? target : `${target}.exe`;
                    exec(`nircmd.exe setappvolume ${exeName} ${appVol}`);
                    console.log(`🔊 Audio APP (${exeName}) -> ${Math.round((volMIDI/127)*100)}%`);
                }
            }

            // 3. PROCESAR HOTKEYS
            if (data.type === 'HOTKEY') {
                let key = data.key.toLowerCase();
                const macroKeys = {
                    'media_play_pause': '0xB3',
                    'media_stop': '0xB2',
                    'media_prev_track': '0xB1',
                    'media_next_track': '0xB0',
                    'volume_mute': '0xAD',
                    'volume_down': '0xAE',
                    'volume_up': '0xAF',
                    'browser_home': '0xAC',
                    'browser_refresh': '0xA8'
                };

                if (macroKeys[key]) key = macroKeys[key];
                exec(`nircmd.exe sendkeypress ${key}`);
                console.log(`⌨️ Tecla enviada -> ${data.key} (Código a Windows: ${key})`);
            }

            // 4. PROCESAR ABRIR APP (.exe)
            if (data.type === 'OPEN_APP') {
                const exePath = data.path;
                // El comando 'start "" "ruta"' le dice a Windows que lo abra aunque tenga espacios
                exec(`start "" "${exePath}"`, (error) => {
                    if (error) console.error(`❌ Error abriendo app: ${exePath}`, error);
                });
                console.log(`🚀 Ejecutando App -> ${exePath}`);
            }

        } catch (e) { console.error('Error procesando:', e); }
    });
});

const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false; ws.ping(); 
    });
}, 30000);

wss.on('close', () => { clearInterval(pingInterval); });
server.listen(PUERTO_WEB, '0.0.0.0', () => { console.log(`🚀 Servidor en puerto ${PUERTO_WEB}`); });