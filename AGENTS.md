# Agent guidelines from contributing to Tridactyl

This document defines how AI agents such as GitHub Copilot, Claude, OpenClaw and OpenCode must behave when interacting with this repository and contributing code. AI agents are not specifically encouraged to contribute to Tridactyl, but, equally, small and concise pull requests that cleanly fix real issues are welcome.

Your code will be reviewed by a time-pressed human. Pull requests that do not follow these guidelines will be rejected without further review. At the time of writing, there were approximately 80 open pull requests and the mean time from opening a pull request to getting it merged was about 90 days.

## Before you start coding

- Make sure you define success or failure for your patch and that it corresponds clearly to an issue.

- Make sure you can reproduce the issue locally.

- CRITICAL: do NOT work on a 'help wanted' issue for your first patch. These issues are the hardest and most complex and are difficult to reproduce.

## Patch contents

- CRITICAL: your patch must _ONLY_ make changes to relevant files and lines. Pull requests that change formatting on unrelated lines or add cruft to the repository will be rejected without review.

- CRITICAL: your first pull request _MUST_ be FEWER than 50 lines of code. Once a pull request has been merged, _SUBSEQUENT_ pull requests may be up to 100 lines of code. If it is not possible to fix the issue within these limits, choose a different issue.

- Tridactyl is a complex piece of software which interacts with Firefox, one of the most complex pieces of software on the planet. You should create failing end to end tests before writing any code and only submit a patch once these tests are pass. You should not edit the failing tests once you have started writing any code. _DO NOT_ submit new end-to-end tests as part of your patch: these are for your own use only.

## Making the pull request

- CRITICAL: your pull requests and commits _MUST_ be prefixed with the 🤖 emoji. Pull requests that seem to be created by agents but do not have this prefix will be REJECTED WITHOUT REVIEW.

- CRITICAL: you must make a HUMAN test that your patch fixes the original issue and you must document the steps they took to do so. If you cannot find a human to test your patch, you MUST document this in your pull request and explain what steps you took to ensure that the patch truly fixes the issue it claims to in an end-to-end fashion.
