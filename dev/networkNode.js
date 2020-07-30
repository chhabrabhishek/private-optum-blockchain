const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid');
const port = process.argv[2];
const requestPromise = require('request-promise');

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

//register a node and broadcast it in the network
app.post('/register-and-broadcast-node', function(request, response) {
    const newNodeUrl = request.body.newNodeUrl;
    if(bitcoin.networkNodes.indexOf(newNodeUrl) == -1) bitcoin.networkNodes.push(newNodeUrl);

    const registerNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: {newNodeUrl: newNodeUrl},
            json: true
        };

        registerNodesPromises.push(requestPromise(requestOptions));
    });
    Promise.all(registerNodesPromises)
    .then(data => {
        const bulkRegisterOptions = {
            uri: newNodeUrl + '/register-nodes-bulk',
            method: 'POST',
            body: {allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl]},
            json: true
        };

        return requestPromise(bulkRegisterOptions);
    })
    .then(data => {
        response.json({note: 'New node registered with network successfully!'});7
    })
    .catch(function(err){
        console.log(err);
    });
});

//register a node with the network
app.post('/register-node', function(request, response) {
    const newNodeUrl = request.body.newNodeUrl;
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
    if(nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);
    
    response.json({note: 'New node registered successfully!'});
});

//register multiple nodes at once
app.post('/register-nodes-bulk', function(request, response) {
    const allNetworkNodes = request.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
        if(nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl);
    });

    response.json({note: 'Bulk registration successful!'});
});

app.listen(port, function() {
    console.log(`Listening on ${port} ...`);
});