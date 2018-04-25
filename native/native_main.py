#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import json
import struct
import subprocess
import tempfile

VERSION = "0.1.0"


class NoConnectionError(Exception):
    """ Exception thrown when stdin cannot be read """


def eprint(*args, **kwargs):
    """ Print to stderr, which gets echoed in the browser console when run
    by Firefox
    """
    print(*args, file=sys.stderr, flush=True, **kwargs)


def _getenv(variable, default):
    """ Get an environment variable value, or use the default provided """
    return os.environ.get(variable) or default


def getMessage():
    """Read a message from stdin and decode it.

    "Each message is serialized using JSON, UTF-8 encoded and is preceded with
    a 32-bit value containing the message length in native byte order."

    https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_side

    """
    rawLength = sys.stdin.buffer.read(4)
    if len(rawLength) == 0:
        sys.exit(0)
    messageLength = struct.unpack('@I', rawLength)[0]
    message = sys.stdin.buffer.read(messageLength).decode('utf-8')
    return json.loads(message)


# Encode a message for transmission,
# given its content.
def encodeMessage(messageContent):
    """ Encode a message for transmission, given its content."""
    encodedContent = json.dumps(messageContent).encode('utf-8')
    encodedLength = struct.pack('@I', len(encodedContent))
    return {'length': encodedLength, 'content': encodedContent}


# Send an encoded message to stdout
def sendMessage(encodedMessage):
    """ Send an encoded message to stdout."""
    sys.stdout.buffer.write(encodedMessage['length'])
    sys.stdout.buffer.write(encodedMessage['content'])
    sys.stdout.buffer.flush()


def handleMessage(message):
    """ Generate reply from incoming message. """
    cmd = message["cmd"]
    reply = {'cmd': cmd}

    if cmd == 'version':
        reply = {'version': VERSION}

    elif cmd == 'run':
        commands = message["command"].split("|")
        p1 = subprocess.Popen(commands[0].split(" "),stderr=subprocess.STDOUT,stdout=subprocess.PIPE)
        p2 = p1
        for command in commands[1:]:
            command = list(filter(None,command.split(" ")))
            p2 = subprocess.Popen(command,stdin=p1.stdout,stderr=subprocess.STDOUT,stdout=subprocess.PIPE)
            p1.stdout.close()
            p1 = p2
        output = p2.communicate()[0].decode("utf-8")
        reply['content'] = output if output else ""

    elif cmd == 'eval':
        output = eval(message["command"])
        reply['content'] = output

    elif cmd == 'read':
        with open(message["file"],"r") as file:
            reply['content'] = file.read()

    elif cmd == 'write':
        with open(message["file"],"w") as file:
            file.write(message["content"])

    elif cmd == 'temp':
        (handle,filepath) = tempfile.mkstemp()
        with open(filepath,"w") as file:
            file.write(message["content"])
        reply['content'] = filepath

    else:
        reply = {'cmd': 'error', 'error': 'Unhandled message'}
        eprint('Unhandled message: {}'.format(message))

    return reply


while True:
    message = getMessage()
    reply = handleMessage(message)
    sendMessage(encodeMessage(reply))
