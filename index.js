const { initializePeerToPeer, mineBlock, addTransaction, createAccount, getCurrentBlockchain, getCurrentAccounts } = require('./p2p/network');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');

var args = process.argv.slice(2);
console.log('myArgs: ', args);
initializePeerToPeer(args[0], 'blockchain')

let app = new express()
app.set('port', args[1]);
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.listen(app.get('port'), _ => {
  console.log(`Running on port... ${app.get('port')} `);
})

app.post('/transaction', async function (req, res) {
  const response = await addTransaction(req.body)
  res.send({message:response})
})

app.post('/createaccount', async function (req, res) {
  const response = await createAccount(req.body)
  res.send({message:response})
})

app.post('/mine', async function (req, res) {
  const response = await mineBlock()
  res.send({message:response})
})

app.get('/blockchain', async function (req, res) {
  response = await getCurrentBlockchain();
  res.send(response)
})

app.get('/accounts', async function (req, res) {
  response = await getCurrentAccounts();
  res.send(response)
})
