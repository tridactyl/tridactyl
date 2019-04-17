#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import pathlib
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import unicodedata

DEBUG = False
VERSION = "0.1.10"


class NoConnectionError(Exception):
    """ Exception thrown when stdin cannot be read """


def is_command_on_path(command):
    """ Returns 'True' if the if the specified command is found on
        user's $PATH.
    """
    if shutil.which(command):
        return True
    else:
        return False


def eprint(*args, **kwargs):
    """ Print to stderr, which gets echoed in the browser console
        when run by Firefox
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
    messageLength = struct.unpack("@I", rawLength)[0]
    message = sys.stdin.buffer.read(messageLength).decode("utf-8")
    return json.loads(message)


# Encode a message for transmission,
# given its content.
def encodeMessage(messageContent):
    """ Encode a message for transmission, given its content."""
    encodedContent = json.dumps(messageContent).encode("utf-8")
    encodedLength = struct.pack("@I", len(encodedContent))
    return {"length": encodedLength, "content": encodedContent}


# Send an encoded message to stdout
def sendMessage(encodedMessage):
    """ Send an encoded message to stdout."""
    sys.stdout.buffer.write(encodedMessage["length"])
    sys.stdout.buffer.write(encodedMessage["content"])
    try:
        sys.stdout.buffer.write(encodedMessage["code"])
    except KeyError:
        pass

    sys.stdout.buffer.flush()


def findUserConfigFile():
    """ Find a user config file, if it exists. Return the file path, or None
    if not found
    """
    home = os.path.expanduser("~")
    config_dir = getenv(
        "XDG_CONFIG_HOME", os.path.expanduser("~/.config")
    )

    # Will search for files in this order
    candidate_files = [
        os.path.join(config_dir, "tridactyl", "tridactylrc"),
        os.path.join(home, ".tridactylrc"),
        os.path.join(home, "_config", "tridactyl", "tridactylrc"),
        os.path.join(home, "_tridactylrc"),
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
    return open(cfg_file, "r").read()


def sanitizeFilename(fn):
    """ Transform a string to make it suitable for use as a filename.

    From https://stackoverflow.com/a/295466/147356"""

    fn = (
        unicodedata.normalize("NFKD", fn)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    fn = re.sub("[^\w\s/.-]", "", fn).strip().lower()
    fn = re.sub("\.\.+", "", fn)
    fn = re.sub("[-/\s]+", "-", fn)
    return fn


def is_valid_firefox_profile(profile_dir):
    is_valid = False
    validity_indicator = "times.json"

    if pathlib.WindowsPath(profile_dir).is_dir():
        test_path = "%s\\%s" % (profile_dir, validity_indicator)

        if pathlib.WindowsPath(test_path).is_file():
            is_valid = True

    return is_valid


def win_firefox_restart(message):
    """Handle 'win_firefox_restart' message."""
    reply = {}
    profile_dir = None
    browser_cmd = None

    try:
        profile_dir = message["profiledir"].strip()
        browser_cmd = message["browsercmd"].strip()
    except KeyError:
        reply = {
            "code": -1,
            "cmd": "error",
            "error": "Error parsing 'restart' message.",
        }
        return reply

    if (
        profile_dir
        and profile_dir != "auto"
        and not is_valid_firefox_profile(profile_dir)
    ):
        reply = {
            "code": -1,
            "cmd": "error",
            "error": "%s %s %s"
            % (
                "Invalid profile directory specified.",
                "Vaild profile directory path(s) can be found by",
                "navigating to 'about:support'.",
            ),
        }

    elif browser_cmd and not is_command_on_path(browser_cmd):
        reply = {
            "code": -1,
            "cmd": "error",
            "error": "%s %s %s"
            % (
                "'{0}' wasn't found on %PATH%.".format(browser_cmd),
                "Please set valid browser by",
                "'set browser [browser-command]'.",
            ),
        }

    else:
        # {{{
        # Native messenger can't seem to create detached process on
        # Windows while Firefox is quitting, which is essential to
        # trigger restarting Firefox. So, below we are resorting to
        # create a scheduled task with the task start-time set in
        # the near future.
        #

        #
        # subprocess.Popen(
        #    [ff_bin_path, "-profile", profile_dir],
        #    shell=False,
        #    creationflags=0x208 \
        #    | subprocess.CREATE_NEW_PROCESS_GROUP)
        #

        #
        # 'schtasks.exe' is limited as in it doesn't support
        # task-time with granularity in seconds. So, falling back
        # to PowerShell as the last resort.
        #

        # out_str = ""
        # task_time = time.strftime("%H:%M",
        #                           time.localtime(
        #                               time.time() + 60))
        #
        # out_str = subprocess.check_output(
        #     ["schtasks.exe",
        #      "/Create",
        #      "/F",
        #      "/SC",
        #      "ONCE",
        #      "/TN",
        #      "tridactyl",
        #      "/TR",
        #      "calc",
        #      "/IT",
        #      "/ST",
        #      task_time],
        #     shell=True)
        # }}}

        ff_lock_name = "parent.lock"

        ff_bin_name = browser_cmd
        ff_bin_path = '"%s"' % shutil.which(ff_bin_name)

        ff_bin_dir = '"%s"' % str(
            pathlib.WindowsPath(shutil.which(ff_bin_name)).parent
        )

        if profile_dir == "auto":
            ff_lock_path = ff_bin_path
            ff_args = '"%s"' % ("-foreground")
        else:
            ff_lock_path = '"%s/%s"' % (profile_dir, ff_lock_name)
            ff_args = '"%s","%s","%s"' % (
                "-foreground",
                "-profile",
                profile_dir,
            )

        try:
            restart_ps1_content = """
$env:PATH=$env:PATH;{ff_bin_dir}
Set-Location -Path {ff_bin_dir}
$profileDir = "{profile_dir}"
if ($profileDir -ne "auto") {{
    $lockFilePath = {ff_lock_path}
    $locked = $true
    $num_try = 10
}} else {{
    $locked = $false
}}
while (($locked -eq $true) -and ($num_try -gt 0)) {{
try {{
    [IO.File]::OpenWrite($lockFilePath).close()
    $locked=$false
}} catch {{
    $num_try-=1
    Write-Host "[+] Trial: $num_try [lock == true]"
    Start-Sleep -Seconds 1
}}
}}
if ($locked -eq $true) {{
$errorMsg = "Restarting Firefox failed. Please restart manually."
Write-Host "$errorMsg"
# Add-Type -AssemblyName System.Windows.Forms
# [System.Windows.MessageBox]::Show(
#     $errorMsg,
#     "Tridactyl")
}} else {{
Write-Host "[+] Restarting Firefox ..."
Start-Process `
  -WorkingDirectory {ff_bin_dir} `
  -FilePath {ff_bin_path} `
  -ArgumentList {ff_args} `
  -WindowStyle Normal
}}
""".format(
                ff_bin_dir=ff_bin_dir,
                profile_dir=profile_dir,
                ff_lock_path=ff_lock_path,
                ff_bin_path=ff_bin_path,
                ff_args=ff_args,
            )

            delay_sec = 1.5
            task_name = "firefox-restart"
            native_messenger_dirname = ".tridactyl"

            powershell_cmd = "powershell"
            powershell_args = "%s %s" % (
                "-NoProfile",
                "-ExecutionPolicy Bypass",
            )

            restart_ps1_path = "%s\\%s\\%s" % (
                os.path.expanduser("~"),
                native_messenger_dirname,
                "win_firefox_restart.ps1",
            )

            task_cmd = "cmd"
            task_arg = '/c "%s %s -File %s"' % (
                powershell_cmd,
                powershell_args,
                restart_ps1_path,
            )

            open(restart_ps1_path, "w+").write(restart_ps1_content)

            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

            subprocess.check_output(
                [
                    "powershell",
                    "-NonInteractive",
                    "-NoProfile",
                    "-WindowStyle",
                    "Minimized",
                    "-InputFormat",
                    "None",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-Command",
                    "Register-ScheduledTask \
                     -TaskName '%s' \
                     -Force \
                     -Action (New-ScheduledTaskAction \
                     -Execute '%s' \
                     -Argument '%s') \
                     -Trigger (New-ScheduledTaskTrigger \
                     -Once \
                     -At \
                 (Get-Date).AddSeconds(%d).ToString('HH:mm:ss'))"
                    % (task_name, task_cmd, task_arg, delay_sec),
                ],
                shell=False,
                startupinfo=startupinfo,
            )

            reply = {
                "code": 0,
                "content": "Restarting in %d seconds..."
                % delay_sec,
            }

        except subprocess.CalledProcessError:
            reply = {
                "code": -1,
                "cmd": "error",
                "error": "error creating restart task.",
            }

    return reply


def write_log(msg):
    debug_log_dirname = ".tridactyl"
    debug_log_filename = "native_main.log"

    debug_log_path = os.path.join(
        os.path.expanduser("~"),
        debug_log_dirname,
        debug_log_filename,
    )

    open(debug_log_path, "a+").write(msg)


def handleMessage(message):
    """ Generate reply from incoming message. """
    cmd = message["cmd"]
    reply = {"cmd": cmd}

    if DEBUG:
        msg = "%s %s\n" % (
            time.strftime("%H:%M:%S %p", time.localtime()),
            str(message),
        )
        write_log(msg)

    if cmd == "version":
        reply = {"version": VERSION}

    elif cmd == "getconfig":
        file_content = getUserConfig()
        if file_content:
            reply["content"] = file_content
        else:
            reply["code"] = "File not found"

    elif cmd == "getconfigpath":
        reply["content"] = findUserConfigFile()
        reply["code"] = 0
        if reply["content"] is None:
            reply["code"] = "Path not found"

    elif cmd == "run":
        commands = message["command"]
        stdin = message.get("content", "").encode("utf-8")

        p = subprocess.Popen(commands, shell=True,
                             stdin=subprocess.PIPE,
                             stdout=subprocess.PIPE)

        reply["content"] = p.communicate(stdin)[0].decode("utf-8")
        reply["code"] = p.returncode

    elif cmd == "eval":
        output = eval(message["command"])
        reply["content"] = output

    elif cmd == "read":
        try:
            with open(
                os.path.expandvars(
                    os.path.expanduser(message["file"])
                ),
                "r",
            ) as file:
                reply["content"] = file.read()
                reply["code"] = 0
        except FileNotFoundError:
            reply["content"] = ""
            reply["code"] = 2

    elif cmd == "mkdir":
        os.makedirs(
            os.path.relpath(message["dir"]),
            exist_ok=message["exist_ok"],
        )
        reply["content"] = ""
        reply["code"] = 0

    elif cmd == "move":
        dest = os.path.expanduser(message["to"])
        if (os.path.isfile(dest)):
            reply["code"] = 1
        else:
            try:
                shutil.move(os.path.expanduser(message["from"]), dest)
                reply["code"] = 0
            except Exception:
                reply["code"] = 2

    elif cmd == "write":
        with open(message["file"], "w") as file:
            file.write(message["content"])

    elif cmd == "temp":
        prefix = message.get("prefix")
        if prefix is None:
            prefix = ""
        prefix = "tmp_{}_".format(sanitizeFilename(prefix))

        (handle, filepath) = tempfile.mkstemp(prefix=prefix, suffix=".txt")
        with os.fdopen(handle, "w") as file:
            file.write(message["content"])
        reply["content"] = filepath

    elif cmd == "env":
        reply["content"] = getenv(message["var"], "")

    elif cmd == "win_firefox_restart":
        reply = win_firefox_restart(message)

    elif cmd == "list_dir":
        path = os.path.expanduser(message.get("path"))
        reply["sep"] = os.sep
        reply["isDir"] = os.path.isdir(path)
        if not reply["isDir"]:
            path = os.path.dirname(path)
            if not path:
                path = "./"
        reply["files"] = os.listdir(path)

    else:
        reply = {"cmd": "error", "error": "Unhandled message"}
        eprint("Unhandled message: {}".format(message))

    return reply


while True:
    message = getMessage()
    reply = handleMessage(message)
    sendMessage(encodeMessage(reply))
