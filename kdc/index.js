const express = require('express');
const NodeRSA = require('node-rsa');
const {private_key} = require('./privatekey');
//const key = new NodeRSA({b: 512});
const key = new NodeRSA(private_key);

//console.log(key.exportKey());
//console.log(key.exportKey('public'));

const pk_a = require('./keys/public_key_client');
const pk_b = require('./keys/public_key_server');

const PORT = 5530;

const app = express();

app.use(express.json());

//const a_id = 'http://localhost:5531';
//const b_id = 'http://localhost:5532';

let data = {
    'http://localhost:5531': pk_a.public_key,
    'http://localhost:5532': pk_b.public_key,
}

app.post('/', function(req, res) {
    let message = req.body;
    let infos = [];

    if (message.type === 'auth') {
        if (message.id1 in data) {
            let info = {};
            info.id1 = message.id1;
            info.pubk1 = data[message.id1];
            infos.push(info);
        }
        

        if (message.id2 in data) {
            let info = {};
            info.id2 = message.id2;
            info.pubk2 = data[message.id2];
            infos.push(info);
        }

        infos = infos.map(el => {
            return key.encryptPrivate(JSON.stringify(el), 'base64');
        })
        console.log(infos)
    }

    res.json(infos)
    // res.send('qwerty') sets the content type to text/Html
});

app.listen(PORT, () => console.log('Hello!'));