#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys
import struct


# Read a message from stdin and decode it.
def get_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        sys.exit(0)
    message_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length)
    return json.loads(message)


# Encode a message for transmission, given its content.
def encode_message(message_content):
    encoded_content = json.dumps(message_content).encode("utf8")
    encoded_length = struct.pack('@I', len(encoded_content))
    return {'length': encoded_length, 'content': encoded_content}


# Send an encoded message to stdout.
def send_message(encoded_message):
    sys.stdout.buffer.write(encoded_message['length'])
    sys.stdout.buffer.write(encoded_message['content'])
    sys.stdout.flush()


def main():

    while True:
        message = get_message()
        if message == "ping":
            send_message(encode_message("pong"))


if __name__ == "__main__":
    main()
