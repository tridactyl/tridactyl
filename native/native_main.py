#!/usr/bin/env python
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

def get_message():
    """ Read a message from stdin and decode it."""
    raw_length = sys.stdin.read(4)
    if not raw_length:
        raise NoConnectionError
    message_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.read(message_length)
    return json.loads(message)

def encode_message(message_content):
    """ Encode a message for transmission, given its content."""
    encoded_content = json.dumps(message_content)
    encoded_length = struct.pack('@I', len(encoded_content))
    return {'length': encoded_length, 'content': encoded_content}

def send_message(encoded_message):
    """ Send an encoded message to stdout."""
    sys.stdout.write(encoded_message['length'])
    sys.stdout.write(encoded_message['content'])
    sys.stdout.flush()

def _find_user_config_file():
    """ Find a user config file, if it exists. Return the file path, or None
    if not found
    """
    config_dir = _getenv("XDG_CONFIG_HOME", os.path.expandvars('$HOME/.config'))
    candidate_files = [ os.path.join(config_dir, "tridactyl", "tridactylrc") ]

    eprint(candidate_files)
    config_path = None

    # find the first path in the list that exists
    for path in candidate_files:
        eprint("Checking file {}".format(path))
        if os.path.isfile(path):
            config_path = path
            break

    return config_path

def get_user_config():
    # look it up freshly each time - the user could have moved or killed it
    cfg_file = _find_user_config_file()

    # no file, return
    if not cfg_file:
        return None

    # for now, this is a simple file read, but if the files can
    # include other files, that will need more work
    return open(cfg_file, 'r').read()

def handle_message(message):
    """ Generate reply from incoming message. """
    cmd = message["cmd"]
    reply = { 'cmd': cmd }

    if cmd == 'version':
        reply = { 'version': VERSION }

    elif cmd == 'getconfig':
        file_content = get_user_config()
        if file_content:
            reply['content'] = file_content
        else:
            reply['error'] = 'File not found'

    else:
        reply = {
            'cmd': 'error',
            'error': 'Unhandled message'
        }
        eprint('Unhandled message: {}'.format(message))

    return reply

eprint('Starting Native Messenger')
while True:
    try:
        message = get_message()
    except NoConnectionError:
        sys.exit(0)

    reply = handle_message(message)
    send_message(encode_message(reply))