const crypto = require('crypto')
const Swarm = require('discovery-swarm')
const defaults = require('dat-swarm-defaults')
const readline = require('readline')
const _ = require('lodash');
const {proofOfWork,sha256} = require('./proofOfWork')

let blockchain = []
/**
 * Here we will save our TCP peer connections
 * using the peer id as key: { peer_id: TCP_Connection }
 */
const peers = {}
let accounts = {}
// Counter for connections, used for identify connections
let connectionSequence = 0

// Peer Identity, a random hash for identify your peer
const currentNodeId = crypto.randomBytes(32)
console.log('Your identity: ' + currentNodeId.toString('hex'))

// reference to redline interface
let rl
/**
 * Function for safely call console.log with readline interface active
 */
function log () {
  if (rl) {
    rl.clearLine()
    rl.close()
    rl = undefined
  }
  for (let i = 0, len = arguments.length; i < len; i++) {
    console.log(arguments[i])
  }
}

const mineBlock = async() => {
  const lastBlock = _.last(blockchain);
  const nonce = proofOfWork(JSON.stringify(lastBlock));
  const previousBlockHash = sha256(JSON.stringify(lastBlock));
  const timestamp = Date.now();

  const blockHeader = {
    previousBlockHash : previousBlockHash,
    nonce : nonce,
    timestamp : timestamp
  }

  const newBlock = {
    blockHeader : blockHeader,
    blockBody : []
  }

  blockchain.push(newBlock)

  const message = {
    action : 'addMinedBlock',
    data : newBlock
  }

  for (let id in peers) {
    peers[id].conn.write(JSON.stringify(message));
  }
}

const createAccount = async(account) => {
  console.log('Entered add transaction')
  let lastBlockBody = _.last(blockchain)['blockBody']

  if(lastBlockBody.length >= 2){
    return 'Not enough space in block please mine';
  }else{
    lastBlockBody.push(transaction)

    const message = {
      action : 'addTransaction',
      data : transaction
    }

    console.log(JSON.stringify(message))
    for (let id in peers) {
      peers[id].conn.write(JSON.stringify(message));
    }

    return 'Added correctly';
  }
}

const addTransaction = async(transaction) => {
  console.log('Entered add transaction')
  let lastBlockBody = _.last(blockchain)['blockBody']

  if(lastBlockBody.length >= 2){
    return 'Not enough space in block please mine';
  }else{
    lastBlockBody.push(transaction)

    const message = {
      action : 'addTransaction',
      data : transaction
    }

    console.log(JSON.stringify(message))
    for (let id in peers) {
      peers[id].conn.write(JSON.stringify(message));
    }

    return 'Added correctly';
  }
}

const obtainCurrentBlockchain = async() =>{
  console.log('Enetered obtain current blockchain')
  const message = {
    action : 'obtainBlockchain'
  }
  console.log(peers)

  for (let id in peers) {
    peers[id].conn.write(JSON.stringify(message));
  }
}

const sendCurrentBlockChain = async(nodeId) =>{
  console.log('sendcurrentblockchain')
  const message = {
    action : 'sendCurrentBlockchain',
    data : blockchain
  }
  console.log(nodeId)
  console.log(nodeId.toString())

  peers[nodeId].conn.write(JSON.stringify(message))

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

  sw.listen(port)
  console.log('Listening to port: ' + port)
  sw.join(channel)

  sw.on('connection', (conn, info) => {
    // Connection id
    const seq = connectionSequence

    const peerId = info.id.toString('hex')
    log(`Connected #${seq} to peer: ${peerId}`)

    // Keep alive TCP connection with peer
    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600)
      } catch (exception) {
        log('exception', exception)
      }
    }

    conn.on('data', data => {
      log(
        'Received Message from peer ' + peerId,
        '----> ' + data.toString()
      )
      try{
        message = JSON.parse(data.toString())
      }catch(error){
        console.error(error)
        return;
      }
      action = message.action
      // Here we handle incomming messages
      log(
        'Received Message from peer ' + peerId,
        'Action ----> ' + message.action,
        'Data ----->' + message.data
      )

      switch(action){
        case 'obtainBlockchain':
          sendCurrentBlockChain(peerId)
          break;
        case 'sendCurrentBlockchain':
          console.log(blockchain)
          blockchain = message.data
          break;
        case 'addTransaction':
          let lastBlockBody = _.last(blockchain)['blockBody']
          lastBlockBody.push(message.data)
          break;
        case 'addMinedBlock':
          blockchain.push(message.data)
          break;}
    })

    conn.on('close', () => {
      // Here we handle peer disconnection
      log(`Connection ${seq} closed, peer id: ${peerId}`)
      // If the closing connection is the last connection with the peer, removes the peer
      if (peers[peerId].seq === seq) {
        delete peers[peerId]
      }
    })

    // Save the connection
    if (!peers[peerId]) {
      peers[peerId] = {}
    }
    peers[peerId].conn = conn
    peers[peerId].seq = seq
    connectionSequence++

    if(connectionSequence == 1){
      console.log('asking for blockchain');
      if(!_.isEqual(port,'6000')){
        console.log('asking for current blockchain')
        obtainCurrentBlockchain()
      }
    }

  })

  console.log(port)
  if(_.isEqual(port,'6000')){
    console.log('creating initial block')
    const nonce = 1;
    const previousBlockHash = "0".repeat(64);
    const timestamp = Date.now();

    const blockHeader = {
      previousBlockHash : previousBlockHash,
      nonce : nonce,
      timestamp : timestamp
    }

    const newBlock = {
      blockHeader : blockHeader,
      blockBody : []
    }

    blockchain.push(newBlock)
  }
}

module.exports = { initializePeerToPeer, mineBlock, addTransaction}
