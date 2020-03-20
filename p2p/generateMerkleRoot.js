let {sha256} = require('./proofOfWork')

function generateMerkleRoot(transactions){
  if(transactions.length == 1){
    return transactions.pop()
  }else{
    if(transactions.length % 2 != 0){
      transactions.push(transactions.slice(0,1))
    }

    const halfLength = Math.ceil(transactions.length / 2);
    let newNodes = []
    let hash = '';

    for(let i = 0; i < halfLength; i += 1){
      hash = sha256(JSON.stringify(transactions[i*2]) + JSON.stringify(transactions[(i*2)+1]))
      newNodes.push(hash)
    }
    return generateMerkleRoot(newNodes)
  }
}

module.exports = {generateMerkleRoot}
