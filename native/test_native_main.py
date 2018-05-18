#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import struct


def usage():
    """Show usage and exit with non-zero status."""
    sys.stderr.write("[+] usage: %s cmd [command] | %s\n" % \
        (os.path.basename(__file__),
        "native_main.py"))
    exit(-1)

if __name__ == "__main__":
    msg = dict()
    if len(sys.argv) > 1:
        msg["cmd"] = sys.argv[1]
    if len(sys.argv) > 2:
        msg["command"] = sys.argv[2]
    if len(sys.argv) == 1:
        usage()

    msg = json.dumps(msg)
    msg = "\r\n" + msg + "\r\n"
    msg = msg.encode("utf-8")
    packed_len = struct.pack("@I", len(msg))

    sys.stdout.buffer.write(packed_len + msg)
