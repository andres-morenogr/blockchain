class BlockHeader:

    def __init__(self, previous_block_hash, nonce, timestamp):
        self.previous_block_hash = previous_block_hash
        self.nonce = nonce
        self.timestamp = timestamp

    def __str__(self):
        return f'BlockHeader(previous_block_hash={self.previous_block_hash}' \
               f',nonce={self.nonce},timestamp={self.timestamp}'

    def __repr__(self):
        return f'BlockHeader(previous_block_hash={self.previous_block_hash}' \
               f',nonce={self.nonce},timestamp={self.timestamp}'
