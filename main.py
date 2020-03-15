import py2p
import sys
import time

port = int(sys.argv[1])
socket = py2p.MeshSocket('localhost', port)
if port != 4444:
    socket.connect('localhost', 4444)

while True:
    time.sleep(3)
    socket.send('sending', 'test')
    message = socket.recv()
    print(message)
