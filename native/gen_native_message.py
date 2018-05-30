#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import struct


def usage():
    """Show usage and exit with non-zero status."""
    sys.stderr.write(
        "\n[+] Usage: %s cmd [command] | %s\n"
        % (os.path.basename(__file__), "native_main.py")
    )

    sys.stderr.write("\n   - Note: Use '..' as key-value separator")
    sys.stderr.write(
        "\n   - Example: %s %s %s %s | %s\n"
        % (
            os.path.basename(__file__),
            "cmd..win_restart_firefox",
            "profiledir..auto",
            "browser..firefox",
            "native_main.py",
        )
    )

    exit(-1)


if __name__ == "__main__":
    """Main functionalities are here for now."""
    separator = ".."
    msg = dict()
    if len(sys.argv) > 1:
        for i in range(1, len(sys.argv)):
            key = sys.argv[i].strip().split(separator)[0]
            val = sys.argv[i].strip().split(separator)[1]
            msg[key] = val

    if len(sys.argv) == 1:
        usage()

    msg = json.dumps(msg)
    msg = "\r\n" + msg + "\r\n"
    msg = msg.encode("utf-8")
    packed_len = struct.pack("@I", len(msg))

    sys.stdout.buffer.write(packed_len + msg)
    sys.stdout.flush()
