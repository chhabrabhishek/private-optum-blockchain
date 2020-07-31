const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();

// bitcoin.createNewBlock(100, '0IAJDHJ767V', 'HDHH678GH');

// bitcoin.createNewTransaction(1000, 'MUMMY5657GH', 'ABHISHEK6767F');

// bitcoin.createNewBlock(200, 'HJHKD67k', 'SSDTYD8976Y');

bitcoin.createNewTransaction(2000, 'MUMMY5657GH', 'ABHISHEK6767F');
// bitcoin.createNewTransaction(3000, 'MUMMY5657GH', 'ABHISHEK6767F');
// bitcoin.createNewTransaction(4000, 'MUMMY5657GH', 'ABHISHEK6767F');

// bitcoin.createNewBlock(300, 'HJHKD67k', 'SSDTYD8976Y');

// const previousBlockHash = 'KFHKHDKH686857HHFKHI';
// const currentBlockData = [
//     {
//         amount: 10,
//         sender: 'JKHFKHKFD',
//         recipient: 'KHDHFUIGDFGDYUG'
//     },
//     {
//         amount: 20,
//         sender: 'LJHKDKUFIO',
//         recipient: 'RASTRSERT'
//     },
//     {
//         amount: 30,
//         sender: 'LDJLFUDOFYEUIDHFK',
//         recipient: 'YUETRYTDCJBEK'
//     }
// ];

console.log(bitcoin.createNewTransaction(2000, 'MUMMY5657GH', 'ABHISHEK6767F'));