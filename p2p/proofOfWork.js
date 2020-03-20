const crypto = require('crypto');

const isHashFound = (hash,numberOfZeros) => {
  let hashSubstring = hash.substring(0,numberOfZeros);
  const zeros = "0".repeat(numberOfZeros);
  return hashSubstring.localeCompare(zeros) == 0;
}

const obtainHash = (stringToHash,nonce) => {
  return sha256(stringToHash+nonce)
}

const sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('base64');
}

const proofOfWork = (stringRepresentationOfBlock, numberOfZeros) => {
  let nonceFound = false;
  let nonce = 0;
  let hashedString = ''
  while(!nonceFound){
    hashedString = obtainHash(stringRepresentationOfBlock,nonce)
    if(isHashFound(hashedString,numberOfZeros)){
      nonceFound = true;
    }else{
      nonce += 1;
    }
  }
  return nonce;
}

module.exports = {proofOfWork,sha256}
