#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import json
import struct

VERSION = "0.1.1"


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
    """ Read a message from stdin and decode it."""
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


def findUserConfigFile():
    """ Find a user config file, if it exists. Return the file path, or None
    if not found
    """
    config_dir = _getenv("XDG_CONFIG_HOME",
                         os.path.expandvars('$HOME/.config'))
    candidate_files = [os.path.join(config_dir, "tridactyl", "tridactylrc")]

    eprint(candidate_files)
    config_path = None

    # find the first path in the list that exists
    for path in candidate_files:
        eprint("Checking file {}".format(path))
        if os.path.isfile(path):
            config_path = path
            break

    return config_path


def getUserConfig():
    # look it up freshly each time - the user could have moved or killed it
    cfg_file = findUserConfigFile()

    # no file, return
    if not cfg_file:
        return None

    # for now, this is a simple file read, but if the files can
    # include other files, that will need more work
    return open(cfg_file, 'r').read()


def handleMessage(message):
    """ Generate reply from incoming message. """
    cmd = message["cmd"]
    reply = {'cmd': cmd}

    if cmd == 'version':
        reply = {'version': VERSION}

    elif cmd == 'getconfig':
        file_content = getUserConfig()
        if file_content:
            reply['content'] = file_content
        else:
            reply['error'] = 'File not found'

    else:
        reply = {'cmd': 'error', 'error': 'Unhandled message'}
        eprint('Unhandled message: {}'.format(message))

    return reply


eprint('Starting Native Messenger')
while True:
    message = getMessage()
    reply = handleMessage(message)
    sendMessage(encodeMessage(reply))