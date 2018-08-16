# Parser

We need to parse series of keypresses into `ex` commands, and then parse those commands into internal functions. We also need autocompletion of commands (maybe also in normal mode, qutebrowser style, to aid their discoverability), and the parser needs to change in real-time such that binds can be remapped.

We are considering:

*   writing our own parser
*   Nearley: https://github.com/Hardmath123/nearley
    *   Upsides: uses Earley, can use CoffeeScript
*   PEG.js
    *   Downsides: uses PEG

Currently, we are erring on the side of writing our own parser, as neither of the other options allow for changing the parser sensibly, and do not seem to support partial matches. Generally, neither seem to be written with the expectation of interactive uses.
