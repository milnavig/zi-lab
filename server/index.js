const ws = require('ws');
const NodeRSA = require('node-rsa');
const {private_key} = require('./privatekey');
const key = new NodeRSA(private_key);

const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4 } = require('uuid');
const kdc_public_key = require('./kdc_public_key');
const fetch = require('node-fetch');
const aesEcb = require('aes-ecb');

let sessions = [];
let tokens = [];

let users = [
    {
        role: "admin",
        username: "alex",
        password: "123"
    },
    {
        role: "user",
        username: "pavel",
        password: "321"
    },
    {
        role: "user",
        username: "sergey",
        password: "112"
    },
]

const PORT = 5532;

const app = express();

app.use(express.json());

app.use(express.static(path.resolve(__dirname, 'public')));

app.post('/', function(req, res) {
    let body = req.body;
    const key = new NodeRSA();
        
    key.importKey(kdc_public_key.public_key, 'pkcs8-public-pem');
    
    let decrypted = key.decryptPublic(body[1], 'utf8');
    decrypted = JSON.parse(decrypted);

    const pubk1 = new NodeRSA();
        
    pubk1.importKey(decrypted.pubk1, 'pkcs8-public-pem');

    let session = {
        sessionKey: ((new Array(32)).fill(0).map(n => ~~(Math.random() * 10))).join(''),
        sessionId: decrypted.id1
    };
    sessions.push(session);

    let response = {
        number: 110,
        sessionKey: session.sessionKey
    };

    const encrypted = pubk1.encrypt(JSON.stringify(response), 'base64');

    res.json(encrypted);
});

app.listen(PORT, () => console.log('Hello!'));

const wss = new ws.Server({
    port: 5533,
}, () => console.log('WebSocket server was launched'));

wss.on('connection', function connection(ws) {
    ws.id = Date.now();
    console.log('New connection appeared');
    ws.on('message', (message) => {
        message = JSON.parse(message);

        let decrypted = aesEcb.decrypt(sessions[0].sessionKey, JSON.stringify(message));
        decrypted = JSON.parse(decrypted);

        broadcastMessage(decrypted.data, ws.id, decrypted.type);
    })
});

function broadcastMessage(message, id, type) {
    wss.clients.forEach(client => {
        if (id === client.id) {
            if (type === 'login') {
                let user = users.find(u => u.password === message.password && u.username === message.username);

                if (user) {
                    let token = {role: user.role, token: v4()};
                    tokens.push(token);
                    let html = "<b>You are authorized</b>";
                    let data = aesEcb.encrypt(sessions[0].sessionKey, JSON.stringify({status: "Fine", token, html}));
                    client.send(JSON.stringify({data}));
                }
                else {
                    let data = aesEcb.encrypt(sessions[0].sessionKey, JSON.stringify({status: "Incorrect password or username"}));
                    client.send(JSON.stringify({data}));
                } 
            }
            else if (type === 'getUsers') {
                const user = tokens.find(e => message.token === e.token);
                console.log(user)
                if (user.role !== "admin") return;
                let data = aesEcb.encrypt(sessions[0].sessionKey, JSON.stringify({action: "getUsers", users}));
                client.send(JSON.stringify({data}));
            } else if (type === 'deleteUser') {
                users = users.filter(e => message.username !== e.username);

                let data = aesEcb.encrypt(sessions[0].sessionKey, JSON.stringify({action: "updateUsers", users}));
                client.send(JSON.stringify({data}));
            } else if (type === 'getText') {
                const user = tokens.find(e => message.token === e.token);
                const text = 'This text is for user';
                let data = aesEcb.encrypt(sessions[0].sessionKey, JSON.stringify({action: "text", text}));
                client.send(JSON.stringify({data}));
            }
        }
    })
}