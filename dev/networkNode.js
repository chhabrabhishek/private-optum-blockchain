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
    const newTransaction = request.body;
    const blockIndex = bitcoin.addTransactionToPendingTransaction(newTransaction);
    response.json({note: `Transaction will be added in block ${blockIndex} !`});
});

app.post('/transaction/broadcast', function(request, response) {
    const newTransaction = bitcoin.createNewTransaction(request.body.amount, request.body.sender, request.body.recipient);
    bitcoin.addTransactionToPendingTransaction(newTransaction);
    const requestPromises = [];

    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        };

        requestPromises.push(requestPromise(requestOptions));
    });

    Promise.all(requestPromises)
    .then(data => {
        response.json({note: 'Transaction created and broadcast successfully, it will be added to next mined block! Check the pending transactions in the blockchain!'});
    })
    .catch(function(error){
        response.json({note: 'Something went wrong!'});
        console.log(error);
    });
});

//mine a block
app.post('/mine', function(request, response) {
    const fname = request.body.fname;
    const lname = request.body.lname;
    const patientId = request.body.patientId;
    const facility = request.body.facility;
    const lastBlock = bitcoin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        fname: fname,
        lname: lname,
        patientId: patientId,
        facility: facility,
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    };
    let patientPresent = false;
    bitcoin.chain.forEach(block => {
        if(block.patientData['patientId'] == patientId){
            patientPresent = true;
        }
    });
    if(patientPresent){
        response.json({note: 'This patient have been added to chain. Please refer blockchain to check the patient id'});
    }
    else{
        const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
        const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);
        const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash, {fname: fname, lname: lname, patientId: patientId, facility: facility});

        const requestPromises = [];
        bitcoin.networkNodes.forEach(networkNodeUrl => {
            const requestOptions = {
                uri: networkNodeUrl + '/receive-new-block',
                method: 'POST',
                body: {newBlock: newBlock},
                json: true
            }

            requestPromises.push(requestPromise(requestOptions));
        });

        Promise.all(requestPromises)
        .then(data => {
            const requestOptions = {
                uri: bitcoin.currentNodeUrl + '/transaction/broadcast',
                method: 'POST',
                body: {
                    amount: 12.5,
                    sender: '00',
                    recipient: nodeAddress
                },
                json: true
            };

            return requestPromise(requestOptions);
        })
        .then(data => {
            response.json({
                note: "New block mined and broadcast successfully! Check the last block in blockchain, you'll find all your pending transactions in this block!",
                reward: "A reward of 12.5 has been added to the pending transactions for the block mined",
                block: newBlock
            });
        });
    }

});

app.post('/receive-new-block', function(request, response) {
    const newBlock = request.body.newBlock;
    const lastBlock = bitcoin.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

    if(correctHash && correctIndex) {
        bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions = [];
        response.json({
            note: 'New block received and accepted!',
            newBlock: newBlock
        });
    }
    else{
        response.json({
            note: 'New block rejected!',
            newBlock: newBlock
        });
    }
});

//register a node and broadcast it in the network
app.post('/register-and-broadcast-node', function(request, response) { 
    const newNodeUrl = request.body.newNodeUrl;
    if(bitcoin.networkNodes.indexOf(newNodeUrl) == -1 && bitcoin.currentNodeUrl !== newNodeUrl) bitcoin.networkNodes.push(newNodeUrl);

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
        response.json({note: `New node registered with network successfully! Go to ${newNodeUrl}/block-explorer and check the network nodes. Don't forget to click the consensus, to get the latest blockchain.`});
    })
    .catch(function(err){
        response.json({note: 'Something went wrong!'});
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

app.get('/consensus', function(request, response) {
    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            json: true
        };

        requestPromises.push(requestPromise(requestOptions));
    });

    Promise.all(requestPromises)
    .then(blockchains => {
        const currentChainLength = bitcoin.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransactions = null;

        blockchains.forEach(blockchain => {
            if(blockchain.chain.length > maxChainLength){
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            }
        });

        if(!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))){
            response.json({
                note: 'Current node chain has not been replaced',
                chain: bitcoin.chain
            });
        }
        else{
            bitcoin.chain = newLongestChain;
            bitcoin.pendingTransactions = newPendingTransactions;
            response.json({
                note: 'This chain has been replaced! Refer the blockchain to check!',
                chain: bitcoin.chain
            })
        }
    })
    .catch(function(err){
        console.log(err);
    });
});

app.get('/block/:blockHash', function(request, response) {
    const blockHash = request.params.blockHash;
    const correctBlock = bitcoin.getBlock(blockHash);

    response.json({
        block: correctBlock
    })
});

app.get('/transaction/:transactionId', function(request, response) {
    const transactionId = request.params.transactionId;
    const transactionData = bitcoin.getTransaction(transactionId);
    response.json({
        transaction: transactionData.transaction,
        block: transactionData.block
    })
});

app.get('/address/:address', function(request, response) {
    const address = request.params.address;
    const addressData = bitcoin.getAddressData(address);
    response.json({
        addressData: addressData
    });
});

app.get('/block-explorer', function(request, response) {
    response.sendFile('./block-explorer/index.html', {root: __dirname});
});

app.get('/blockchain/json', function(request, response) {
    response.sendFile('./block-explorer/blockchain.html', {root: __dirname});
});

app.get('/mine/json', function(request, response) {
    response.sendFile('./block-explorer/mine.html', {root: __dirname});
});

app.get('/consensus/json', function(request, response) {
    response.sendFile('./block-explorer/consensus.html', {root: __dirname});
});

app.listen(port, function() {
    console.log(`Listening on ${port} ...`);
});