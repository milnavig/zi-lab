const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4 } = require('uuid');
const NodeRSA = require('node-rsa');
const {private_key} = require('./privatekey');
const kdc_public_key = require('./kdc_public_key');
const key = new NodeRSA(private_key);
const fetch = require('node-fetch');
const aesEcb = require('aes-ecb');

let session;

const PORT = 5531;

const app = express();

app.use(express.json());

app.use(express.static(path.resolve(__dirname, 'public')));

app.get('/connect', function(req, res) {
    let data = {
        "type": "auth",
        "id1": "http://localhost:5531",
        "id2": "http://localhost:5532"
    };

    fetch('http://localhost:5530/', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
    }).then(res => res.json()).then(arr => {
        const kdc_key = new NodeRSA();
        
        kdc_key.importKey(kdc_public_key.public_key, 'pkcs8-public-pem');
        
        let decrypted = kdc_key.decryptPublic(arr[1], 'utf8');
        decrypted = JSON.parse(decrypted);
        
        const openKeyB = new NodeRSA();
        openKeyB.importKey(decrypted.pubk2, 'pkcs8-public-pem');
        const encrypted = openKeyB.encrypt( 
            {
                r1: 10,
                idA: 'http://localhost:5531'
            }, 
            'utf8'
        );
        let message_to_b = [encrypted, arr[0]];

        fetch('http://localhost:5532/', {
            method: 'POST',
            body: JSON.stringify(message_to_b),
            headers: {
            'Content-Type': 'application/json'
            }
        }).then(res => res.json()).then(message => {
            let result = key.decrypt(message, 'utf8');
            result = JSON.parse(result);
            console.log(result);

            session = result.sessionKey;

            res.json({session});
        })
    })
});

app.post('/encrypt', function(req, res) {
    let encrypt = aesEcb.encrypt(session, JSON.stringify(req.body));

    res.json(encrypt);
});

app.post('/decrypt', function(req, res) {
    //console.log(req.body)
    let decrypt = aesEcb.decrypt(session, JSON.stringify(req.body.data));

    res.json(decrypt);
});

app.listen(PORT, () => console.log('Hello!'));