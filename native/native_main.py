#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys

import nm_comms
import user_config
import nm_utils


VERSION = "1.6.0"


class NativeMessenger(object):

    def __init__(self):

        self.config_mgr = user_config.ConfigManager()

    def handle_message(self, message):
        """ Handles an incoming message and returns a reply
        """

        if message["cmd"] == "version":
            reply = {
                "cmd": "version",
                "version": VERSION
            }

        elif message['cmd'] == 'getconfig':
            file_content = self.config_mgr.get_user_config()

            reply = {
                "cmd": "getconfig"
            }

            if file_content:
                reply["content"] = file_content
            else:
                reply["error"] = "File not found"

        else:
            reply = {
                "cmd": "error",
                "error": "Unhandled messsage"
            }
            nm_utils.eprint("Unhandled message: {}".format(message))

        return reply


def main():

    nm = NativeMessenger()
    comms = nm_comms.StdioComms()

    nm_utils.eprint("Starting Native Messenger")

    while True:

        try:
            message = comms.get_message()
        except comms.NoConnectionError:
            sys.exit(0)

        reply = nm.handle_message(message)

        comms.send_message(reply)


if __name__ == "__main__":
    main()
