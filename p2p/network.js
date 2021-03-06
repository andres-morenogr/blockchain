const crypto = require('crypto');
const Swarm = require('discovery-swarm');
const defaults = require('dat-swarm-defaults');
const _ = require('lodash');
const { proofOfWork, sha256 } = require('./proofOfWork');
const { generateMerkleRoot } = require('./generateMerkleRoot')

// reference to redline interface
/**
 * Function for safely call console.log with readline interface active
 */

let rl;

function log() {
  if (rl) {
    rl.clearLine();
    rl.close();
    rl = undefined;
  }
  for (let i = 0, len = arguments.length; i < len; i++) {
    console.log(arguments[i]);
  }
}
/**
 * Here we will save our TCP peer connections
 * using the peer id as key: { peer_id: TCP_Connection }
 */
const peers = {};

let connectionSequence = 0;
let accounts = [];
let blockchain = [];
const difficulty = 2;
// Peer Identity, a random hash for identify your peer
const currentNodeId = crypto.randomBytes(32);
console.log('Your identity: ' + currentNodeId.toString('hex'));

const currentAccountId = `miner#${Date.now()}`;
accounts.push({
  id: currentAccountId,
  balance: 0
});

const addMerkleRootToBlock = function (block) {
  merkleRoot = generateMerkleRoot(block.blockBody);
  block.blockHeader['merkleRoot'] = merkleRoot;
  return;
}

const addDBHashToBlock = function (block) {
  dbHash = sha256(JSON.stringify(accounts));
  block.blockHeader['dbHash'] = dbHash;
  return;
}

const updateBlockHash = function (block) {
  blockHash = sha256(JSON.stringify(block));
  block.blockHeader['blockHash'] = blockHash;
  return;
}

const mineBlock = async () => {
  console.log('Entered mine block');
  let lastBlock = _.last(blockchain);
  addMerkleRootToBlock(lastBlock);
  addDBHashToBlock(lastBlock)
  const nonce = proofOfWork(JSON.stringify(lastBlock), difficulty);
  const previousBlockHash = sha256(JSON.stringify(lastBlock));
  const timestamp = Date.now();

  const blockHeader = {
    previousBlockHash: previousBlockHash,
    nonce: nonce,
    timestamp: timestamp,
    difficulty: difficulty,
    height: blockchain.length
  }

  const newBlock = {
    blockHeader: blockHeader,
    blockBody: []
  }

  blockchain.push(newBlock);

  let message = {
    action: 'addMinedBlock',
    data: newBlock
  }

  for (let id in peers) {
    peers[id].conn.write(JSON.stringify(message));
  }

  let transaction = {
    sender : 'mine',
    receiver : currentAccountId,
    amount : 5,
    message : 'blockMined'
  }

  addTransaction(transaction);

  return 'Block mined'
}

const createAccount = async (account) => {
  console.log('Entered create account')
  accounts.push(account)
  const message = {
    action: 'createAccount',
    data: account
  }

  console.log(JSON.stringify(message))
  for (let id in peers) {
    peers[id].conn.write(JSON.stringify(message));
  }

  return 'Created correctly';
}

const addTransaction = async (transaction) => {
  console.log('Entered add transaction')
  let lastBlock = _.last(blockchain)
  let lastBlockBody = lastBlock['blockBody']

  if (lastBlockBody.length >= 4) {
    return 'Not enough space in block please mine';
  } else {
    lastBlockBody.push(transaction);
    executeTransaction(transaction);
    //updateBlockHash(lastBlock);
    const message = {
      action: 'addTransaction',
      data: transaction
    }

    console.log(accounts);
    console.log(JSON.stringify(message));
    for (let id in peers) {
      peers[id].conn.write(JSON.stringify(message));
    }

    return 'Added correctly';
  }
}

const obtainCurrentBlockchain = async () => {
  console.log('Enetered obtain current blockchain')
  const message = {
    action: 'obtainBlockchain',
    data: currentAccountId
  }
  for (let id in peers) {
    peers[id].conn.write(JSON.stringify(message));
  }
}

const sendCurrentBlockChain = async (nodeId) => {
  console.log('sendcurrentblockchain');
  const message = {
    action: 'sendCurrentBlockchain',
    data: {
      blockchain : blockchain,
      accounts : accounts
    }
  }
  console.log(nodeId.toString());

  peers[nodeId].conn.write(JSON.stringify(message));
}

const getCurrentBlockchain = async () => {
  console.log('getcurrentblockchain');
  return blockchain;
}

const getCurrentAccounts = async () => {
  console.log('getcurrentaccounts');
  return accounts;
}

const executeTransaction = async (transaction) => {
  sender = accounts.find(account => _.isEqual(account.id, transaction.sender));
  receiver = accounts.find(account => _.isEqual(account.id, transaction.receiver));
  senderIndex = accounts.findIndex(account => _.isEqual(account.id, transaction.sender));
  receiverIndex = accounts.find(account => _.isEqual(account.id, transaction.receiver));
  if (sender.balance < transaction.amount) {
    return;
  }
  sender.balance -= transaction.amount;
  receiver.balance += transaction.amount;
}

const config = defaults({
  // peer-id
  id: currentNodeId,
})

/**
 * discovery-swarm library establishes a TCP p2p connection and uses
 * discovery-channel library for peer discovery
 */
const sw = Swarm(config);

const initializePeerToPeer = async (port, channel) => {

  sw.listen(port);
  console.log('Listening to port: ' + port);
  sw.join(channel);

  sw.on('connection', (conn, info) => {
    const seq = connectionSequence;

    const peerId = info.id.toString('hex');
    console.log(`Connected #${seq} to peer: ${peerId}`);

    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600);
      } catch (exception) {
        console.log('exception', exception);
      }
    }

    conn.on('data', data => {
      log(
        'Received Message from peer ' + peerId,
        '----> ' + data.toString()
      )
      try {
        message = JSON.parse(data.toString())
      } catch (error) {
        console.error(error)
        return;
      }

      action = message.action;
      log(
        'Action ----> ' + message.action,
        'Data ----->' + message.data
      );

      switch (action) {
        case 'obtainBlockchain':
          sendCurrentBlockChain(peerId);
          accounts.push({ id: message.data, balance: 0 });
          accounts = _.uniqBy(accounts,"id")
          break;
        case 'sendCurrentBlockchain':
          blockchain = message.data.blockchain;
          accounts = message.data.accounts.concat(accounts);
          accounts = _.uniqBy(accounts,"id")
          break;
        case 'addTransaction':
          let lastBlockBody = _.last(blockchain)['blockBody'];
          lastBlockBody.push(message.data);
          executeTransaction(message.data)
          break;
        case 'addMinedBlock':
          let lastBlock = _.last(blockchain);
          addMerkleRootToBlock(lastBlock);
          addDBHashToBlock(lastBlock);
          //updateBlockHash(lastBlock);
          blockchain.push(message.data);
          break;
        case 'createAccount':
          accounts.push(message.data);
          accounts = _.uniq(accounts,'id')
          break;
      }
    });

    conn.on('close', () => {
      console.log(`Connection ${seq} closed, peer id: ${peerId}`)
      if (peers[peerId].seq === seq) {
        delete peers[peerId];
      }
    })

    if (!peers[peerId]) {
      peers[peerId] = {};
    }
    peers[peerId].conn = conn;
    peers[peerId].seq = seq;
    connectionSequence++;

    if (connectionSequence != 0 && !_.isEqual(currentNodeId, peerId)) {
      if (!_.isEqual(port, '6000')) {
        console.log('asking for current accounts')
        obtainCurrentBlockchain();
      }
    }

  });

  console.log(port)
  if (_.isEqual(port, '6000')) {
    console.log('creating initial block');
    const nonce = 1;
    const previousBlockHash = "0".repeat(64);
    const timestamp = Date.now();

    accounts.push({
      id: 'mine',
      balance: 21000
    })

    const blockHeader = {
      previousBlockHash: previousBlockHash,
      nonce: nonce,
      timestamp: timestamp,
      difficulty: difficulty,
      height: 0
    }

    let newBlock = {
      blockHeader: blockHeader,
      blockBody: []
    }

    const initialTransaction = {
      sender: 'mine',
      receiver: currentAccountId,
      amount: 5,
      message: 'First transaction'
    }

    newBlock.blockBody.push(initialTransaction);
    executeTransaction(initialTransaction);
    //updateBlockHash(newBlock);
    blockchain.push(newBlock);
    console.log(accounts);
    console.log(blockchain);
    console.log(blockchain[0].blockBody);
  }
}

module.exports = { initializePeerToPeer, mineBlock, addTransaction, createAccount, getCurrentBlockchain, getCurrentAccounts }
