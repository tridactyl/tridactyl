#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import struct


def usage():
    """Show usage and exit with non-zero status."""
    sys.stderr.write("[+] Usage: %s cmd [command] | %s\n" %
                     (os.path.basename(__file__),
                      "native_main.py"))

    sys.stderr.write("\nNote: Use '##' as key-value separator")
    sys.stderr.write("\nExample: %s %s %s | %s" %
                     (os.path.basename(__file__),
                      'win_restart_firefox',
                      'profiledir##auto',
                      'native_main.py'))

    exit(-1)


if __name__ == "__main__":
    """Main functionalities are here for now."""
    msg = dict()
    if len(sys.argv) > 1:
        msg["cmd"] = sys.argv[1]
    if len(sys.argv) > 2:
        key = sys.argv[2].strip().split("##")[0]
        val = sys.argv[2].strip().split("##")[1]
        msg[key] = val

    if len(sys.argv) == 1:
        usage()

    msg = json.dumps(msg)
    msg = "\r\n" + msg + "\r\n"
    msg = msg.encode("utf-8")
    packed_len = struct.pack("@I", len(msg))

    sys.stdout.buffer.write(packed_len + msg)
    sys.stdout.flush()
