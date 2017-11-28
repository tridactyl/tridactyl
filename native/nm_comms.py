"""
Native messenger browser commmunications
"""

import struct
import sys
import json


class BrowserComms(object):
    """ Generic browser comms interface for native message passing """

    def get_message(self):
        raise NotImplementedError

    def send_message(self):
        raise NotImplementedError

    class NoConnectionError(Exception):
        """ Exception thrown when the stdin cannot be read 
        """


class StdioComms(BrowserComms):
    """ Handles the messaging protocol between Firefox and this native program

    The format is:
      - 4 bytes integer holding the size of the payload
      - n bytes of payload, which is JSON
    """

    def __init__(self):
        super().__init__()

    def get_message(self):
        """ Read a message from stdin and decode it.
        """

        raw_length = sys.stdin.buffer.read(4)

        # failed to read from stdin, the connection is gone and there's
        # nothing else we can do here
        if not raw_length:
            raise(self.NoConnectionError)

        message_length = struct.unpack('@I', raw_length)[0]
        message = sys.stdin.buffer.read(message_length)
        return json.loads(message)

    def _encode_message(self, message_content):
        """ Encode a message for transmission, given its content.
        """

        encoded_content = json.dumps(message_content).encode("utf8")
        encoded_length = struct.pack('@I', len(encoded_content))
        return {
            'length': encoded_length,
            'content': encoded_content
        }

    def send_message(self, message_object):
        """ Encodes and sends the message over stdout 
        """

        encoded_message = self._encode_message(message_object)
        sys.stdout.buffer.write(encoded_message['length'])
        sys.stdout.buffer.write(encoded_message['content'])
        sys.stdout.flush()


