const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid');

const nodeAddress = uuid.v1().split('-').join('');

const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//get entire blockchain
app.get('/blockchain', function(request, response) {
    response.send(bitcoin);
});

//create a new transaction
app.post('/transaction', function(request, response) {
    const blockIndex = bitcoin.createNewTransaction(request.body.amount, request.body.sender, request.body.recipient);
    response.json({note: `Transaction will be added in ${blockIndex} block.`});
});

//mine a block
app.get('/mine', function(request, response) {

    const lastBlock = bitcoin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    };
    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    bitcoin.createNewTransaction(12.5, "00", nodeAddress);

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);
    response.json({
        note: "New block mined perfectly",
        block: newBlock
    });
});

app.listen(3000, function() {
    console.log('Listening on 3000 ...');
});