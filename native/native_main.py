#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import json
import re
import struct
import subprocess
import tempfile
import unicodedata

VERSION = "0.1.4"


class NoConnectionError(Exception):
    """ Exception thrown when stdin cannot be read """


def eprint(*args, **kwargs):
    """ Print to stderr, which gets echoed in the browser console when run
    by Firefox
    """
    print(*args, file=sys.stderr, flush=True, **kwargs)


def getenv(variable, default):
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
    try:
        sys.stdout.buffer.write(encodedMessage['code'])
    except KeyError:
        pass

    sys.stdout.buffer.flush()


def findUserConfigFile():
    """ Find a user config file, if it exists. Return the file path, or None
    if not found
    """
    home = os.path.expanduser('~')
    config_dir = getenv('XDG_CONFIG_HOME', os.path.expanduser('~/.config'))

    # Will search for files in this order
    candidate_files = [
        os.path.join(config_dir, "tridactyl", "tridactylrc"),
        os.path.join(home, '.tridactylrc')
    ]

    config_path = None

    # find the first path in the list that exists
    for path in candidate_files:
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


def sanitizeFilename(fn):
    """ Transform a string to make it suitable for use as a filename.

    From https://stackoverflow.com/a/295466/147356"""

    fn = unicodedata.normalize('NFKD', fn).encode(
        'ascii', 'ignore').decode('ascii')
    fn = re.sub('[^\w\s/.-]', '', fn).strip().lower()
    fn = re.sub('\.\.+', '', fn)
    fn = re.sub('[-/\s]+', '-', fn)
    return fn


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
            reply['code'] = 'File not found'

    elif cmd == 'run':
        commands = message["command"]

        try:
            p = subprocess.check_output(commands, shell=True)
            reply["content"] = p.decode("utf-8")
            reply["code"] = 0

        except subprocess.CalledProcessError as process:
            reply["code"] = process.returncode
            reply["content"] = process.output.decode("utf-8")

    elif cmd == 'eval':
        output = eval(message["command"])
        reply['content'] = output

    elif cmd == 'read':
        try:
            with open(os.path.expandvars(os.path.expanduser(message["file"])), "r") as file:
                reply['content'] = file.read()
                reply['code'] = 0
        except FileNotFoundError:
            reply['content'] = ""
            reply['code'] = 2

    elif cmd == 'mkdir':
        os.makedirs(
            os.path.relpath(message["dir"]), exist_ok=message["exist_ok"]
        )
        reply['content'] = ""
        reply['code'] = 0

    elif cmd == 'write':
        with open(message["file"], "w") as file:
            file.write(message["content"])

    elif cmd == 'temp':
        prefix = message.get('prefix')
        if prefix is None:
            prefix = ''
        prefix = 'tmp_{}_'.format(sanitizeFilename(prefix))

        (handle, filepath) = tempfile.mkstemp(prefix=prefix)
        with os.fdopen(handle, "w") as file:
            file.write(message["content"])
        reply['content'] = filepath

    elif cmd == 'env':
        reply['content'] = getenv(message["var"], "")

    else:
        reply = {'cmd': 'error', 'error': 'Unhandled message'}
        eprint('Unhandled message: {}'.format(message))

    return reply


while True:
    message = getMessage()
    reply = handleMessage(message)
    sendMessage(encodeMessage(reply))
