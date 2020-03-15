from length_exceeded_exception import LengthExceededException
from block_header import BlockHeader


class Block:
    MAX_NUMBER_OF_TRANSACTIONS_IN_BODY = 2
    block_header: BlockHeader
    block_body = []

    def __init__(self, block_header, block_body=[]):
        self.block_header = block_header
        self.block_body = block_body

    def add_transaction(self, transaction):
        if len(self.block_body) >= self.MAX_NUMBER_OF_TRANSACTIONS_IN_BODY:
            raise LengthExceededException('Number of transactions in a block exceeded please mine a block')
        self.block_body.append(transaction)

    def __str__(self):
        return f'Block(block_header={self.block_header},block_body={self.block_body})'

    def __repr__(self):
        return f'Block(block_header={self.block_header},block_body={self.block_body})'
