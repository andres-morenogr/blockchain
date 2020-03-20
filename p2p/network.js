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

const mineBlock = async () => {
  console.log('Entered mine block');
  let lastBlock = _.last(blockchain);
  addMerkleRootToBlock(lastBlock);
  addDBHashToBlock(lastBlock)
  const difficulty = 2;
  const nonce = proofOfWork(JSON.stringify(lastBlock), difficulty);
  const previousBlockHash = sha256(JSON.stringify(lastBlock));
  const timestamp = Date.now();

  const blockHeader = {
    previousBlockHash: previousBlockHash,
    nonce: nonce,
    timestamp: timestamp,
    difficulty: difficulty,
    height : blockchain.length
  }

  const newBlock = {
    blockHeader: blockHeader,
    blockBody: []
  }

  blockchain.push(newBlock);

  const message = {
    action: 'addMinedBlock',
    data: newBlock
  }

  for (let id in peers) {
    peers[id].conn.write(JSON.stringify(message));
  }

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
  let lastBlockBody = _.last(blockchain)['blockBody']

  if (lastBlockBody.length >= 4) {
    return 'Not enough space in block please mine';
  } else {
    lastBlockBody.push(transaction)
    executeTransaction(transaction)
    const message = {
      action: 'addTransaction',
      data: transaction
    }
    console.log(accounts)
    console.log(JSON.stringify(message))
    for (let id in peers) {
      peers[id].conn.write(JSON.stringify(message));
    }

    return 'Added correctly';
  }
}

const obtainCurrentBlockchain = async () => {
  console.log('Enetered obtain current blockchain')
  const message = {
    action: 'obtainBlockchain'
  }
  console.log(peers)

  for (let id in peers) {
    peers[id].conn.write(JSON.stringify(message));
  }
}

const obtainCurrentAccounts = async () => {
  console.log('Enetered obtain current accounts')
  const message = {
    action: 'obtainAccounts'
  }
  console.log(peers)

  for (let id in peers) {
    peers[id].conn.write(JSON.stringify(message));
  }
}

const sendCurrentAccounts = async (nodeId) => {
  console.log('sendcurrentaccounts');
  const message = {
    action: 'sendCurrentAccounts',
    data: accounts
  }
  console.log(nodeId.toString());

  peers[nodeId].conn.write(JSON.stringify(message));
}

const sendCurrentBlockChain = async (nodeId) => {
  console.log('sendcurrentblockchain');
  const message = {
    action: 'sendCurrentBlockchain',
    data: blockchain
  }
  console.log(nodeId.toString());

  peers[nodeId].conn.write(JSON.stringify(message));
}

const getCurrentBlockchain = async () => {
  console.log('getcurrentblockchain');
  return blockchain;
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
          break;
        case 'sendCurrentBlockchain':
          blockchain = message.data;
          break;
        case 'addTransaction':
          let lastBlockBody = _.last(blockchain)['blockBody'];
          lastBlockBody.push(message.data);
          executeTransaction(message.data)
          break;
        case 'addMinedBlock':
          let lastBlock = _.last(blockchain);
          addMerkleRootToBlock(lastBlock);
          addDBHashToBlock(lastBlock)
          blockchain.push(message.data);
          break;
        case 'createAccount':
          accounts.push(message.data);
          break;
        case 'obtainAccounts':
          sendCurrentAccounts(peerId);
          break;
        case 'sendCurrentAccounts':
          accounts = message.data.concat(accounts);
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

    if (connectionSequence != 1 && !_.isEqual(currentNodeId,peerId)) {
      console.log('asking for blockchain');
      if (!_.isEqual(port, '6000')) {
        console.log('asking for current blockchain')
        obtainCurrentBlockchain();
        obtainCurrentAccounts();
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
      difficulty : difficulty,
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

    blockchain.push(newBlock);
    console.log(accounts);
    console.log(blockchain);
    console.log(blockchain[0].blockBody);
  }
}

module.exports = { initializePeerToPeer, mineBlock, addTransaction, createAccount, getCurrentBlockchain }
