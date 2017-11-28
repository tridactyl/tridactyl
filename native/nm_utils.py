"""
Utility functions for native messaging
"""


import sys


def eprint(*args, **kwargs):
    """ Print to stderr, which gets echoed in the browsewr console when
    run by Firefox
    """
    print(*args, file=sys.stderr, flush=True, **kwargs)
