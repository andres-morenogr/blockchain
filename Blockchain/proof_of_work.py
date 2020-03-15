import hashlib
from collections import Counter


def is_valid_pow_hash(hash_to_validate, number_of_zeros=5):
    hash_fragment = hash_to_validate[0:number_of_zeros]
    count = Counter(hash_fragment)
    return count['0'] == number_of_zeros


def obtain_hash_string(hash_string='default', nonce=0):
    # It's necessary to encode the unicode string before passing it to the sha256 function
    to_hash = (hash_string + str(nonce)).encode()
    return hashlib.sha256(to_hash).hexdigest()


def proof_of_work(hash_string='TEST', number_of_zeros=5):
    nonce_found = False
    nonce = 0
    while not nonce_found:
        hash_result = obtain_hash_string(hash_string, nonce)
        if is_valid_pow_hash(hash_result, number_of_zeros):
            nonce_found = True
        else:
            nonce = nonce + 1
    return nonce


def main():
    proof_of_work('STRINGGG', 5)


if __name__ == "__main__":
    # execute only if run as a script
    main()
