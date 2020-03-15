import hashlib

from block import Block
from block import BlockHeader
from proof_of_work import proof_of_work
import time

from length_exceeded_exception import LengthExceededException


def create_genesis_block():
    genesis_block_header = BlockHeader('0' * 64, 497822588, time.time())
    genesis_block = Block(genesis_block_header)
    return genesis_block


class BlockChain:
    block_chain = []

    def __init__(self):
        self.block_chain.append(create_genesis_block())

    def add_transaction(self, transaction):
        try:
            last_block = self.block_chain[-1]
            last_block.add_transaction(transaction)
            print('Transaction added correctly')
        except LengthExceededException as err:
            print(err.message)
            return err.message

    def mine_block(self):
        last_block = self.block_chain[-1]
        nonce = proof_of_work(str(last_block))
        previous_block_hash = hashlib.sha256((str(last_block)).encode()).hexdigest()
        new_block_header = BlockHeader(previous_block_hash, nonce, time.time())
        new_block = Block(new_block_header)
        self.block_chain.append(new_block)
        print('New block mined')

    def print_block_chain(self):
        print(self.block_chain)

