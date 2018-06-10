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
VERSION = "0.1.7"
NATIVE_DIRNAME = ".tridactyl"
PRE_RESTART_HOOK_PREFIX = "pre_restart_hook-"


class Utility(object):
    """ A simple class of utility functions for internal use within
        the native_main.py.
    """

    def remove_empty_items(self, items):
        """ Remove empty or whitespaced items from a list of given
            items.
        """
        for item in items:
            if len(item.strip()) == 0:
                items.remove(item)

        return items

    def count_lines(self, path):
        """ Return the number of lines in the specified path. """
        try:
            with open(path, "r") as fh:
                return len(fh.readlines())
        except:
            return -1

    def add_firefox_pref(self, js_path, pref_key, pref_val):
        """ Add a single Firefox preference into the file specified
            in 'js_path'.
        """
        count_added = 0

        if os.path.isfile(js_path):
            # Remove empty/whitespace lines
            js_lines = self.remove_empty_items(
                open(js_path).readlines()
            )

            # Remove previous entry for the same 'pref_key'
            for line in js_lines:
                if line.find(pref_key) >= 0:
                    js_lines.remove(line)

            # Add the new user_pref() line
            pref_line = "{func}({key}, {val});".format(
                func="user_pref",
                key=json.dumps(pref_key),
                val=json.dumps(pref_val),
            )

            js_lines.append(pref_line)

            # Write to 'js_path' i.e. user.js, prefs.js etc.
            with open(js_path, "w+") as js_file:
                for line in js_lines:
                    js_file.write(line.strip() + "\n")

            count_added = count_added + 1

        return count_added

    def remove_firefox_pref(self, js_path, pref_key):
        """ Remove a single Firefox preference from the file
            specified in 'js_path'.
        """
        count_removed = 0

        if os.path.isfile(js_path):
            # Remove empty/whitespace lines
            js_lines = self.remove_empty_items(
                open(js_path).readlines()
            )

            # Remove previous entry for the same 'pref_key'
            for line in js_lines:
                if line.find(pref_key) >= 0:
                    js_lines.remove(line)
                    count_removed = count_removed + 1

            # Write to 'js_path' i.e. user.js, prefs.js etc.
            with open(js_path, "w+") as js_file:
                for line in js_lines:
                    js_file.write(line.strip() + "\n")

        return count_removed


class NoConnectionError(Exception):
    """ Exception thrown when stdin cannot be read. """


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
        when run by Firefox.
    """
    print(*args, file=sys.stderr, flush=True, **kwargs)


def getenv(variable, default):
    """ Get an environment variable value, or use the default
        provided.
    """
    return os.environ.get(variable) or default


def getMessage():
    """ Read a message from stdin and decode it.

        Each message is serialized using JSON, UTF-8 encoded and is
        preceded with a 32-bit value containing the message length
        in native byte order. [0]

        [0] https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging#App_side
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
    """ Encode a message for transmission, given its content. """
    encodedContent = json.dumps(messageContent).encode("utf-8")
    encodedLength = struct.pack("@I", len(encodedContent))
    return {"length": encodedLength, "content": encodedContent}


# Send an encoded message to stdout
def sendMessage(encodedMessage):
    """ Send an encoded message to stdout. """
    sys.stdout.buffer.write(encodedMessage["length"])
    sys.stdout.buffer.write(encodedMessage["content"])
    try:
        sys.stdout.buffer.write(encodedMessage["code"])
    except KeyError:
        pass

    sys.stdout.buffer.flush()


def findUserConfigFile():
    """ Find a user config file, if it exists. Return the file path,
        or None if not found.
    """
    home = os.path.expanduser("~")
    config_dir = getenv(
        "XDG_CONFIG_HOME", os.path.expanduser("~/.config")
    )

    # Will search for files in this order
    candidate_files = [
        os.path.join(config_dir, "tridactyl", "tridactylrc"),
        os.path.join(home, ".tridactylrc"),
    ]

    config_path = None

    # find the first path in the list that exists
    for path in candidate_files:
        if os.path.isfile(path):
            config_path = path
            break

    return config_path


def getUserConfig():
    # look it up freshly each time - the user could have moved or
    # killed it
    cfg_file = findUserConfigFile()

    # no file, return
    if not cfg_file:
        return None

    # for now, this is a simple file read, but if the files can
    # include other files, that will need more work
    return open(cfg_file, "r").read()


def sanitizeFilename(fn):
    """ Transform a string to make it suitable for use as a
        filename.

        Source: https://stackoverflow.com/a/295466/147356
    """

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


def add_firefox_prefs(message):
    """ Handle 'add_firefox_prefs' message. """
    reply = {}
    prefs_to_add = None
    profile_dir = None
    userjs_path = None

    try:
        profile_dir = message["profiledir"].strip()
        prefs_to_add = message["prefs"].strip()
    except:
        reply = {
            "code": -1,
            "cmd": "error",
            "error": "Error parsing 'add_firefox_prefs' message.",
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
        return reply

    elif prefs_to_add:
        try:
            util = Utility()

            prefs_to_add = json.loads(prefs_to_add)
            prefs_to_add = util.remove_empty_items(prefs_to_add)

            for pref_key in prefs_to_add.keys():
                pref_val = prefs_to_add[pref_key]

        except (json.decoder.JSONDecodeError, AttributeError):
            reply = {
                "code": -1,
                "cmd": "error",
                "error": "%s %s"
                % (
                    "Error decoding JSON object.",
                    "Invalid 'prefs' list specified.",
                ),
            }
            return reply

        userjs_path = profile_dir + "/user.js"

        added = 0
        userjs_added = 0

        for pref_key in prefs_to_add.keys():
            pref_val = prefs_to_add[pref_key]
            added = util.add_firefox_pref(
                userjs_path, pref_key, pref_val
            )
            userjs_added = userjs_added + added

        reply = {
            "code": 0,
            "content": "Added %d preferences to %s. %s"
            % (
                userjs_added,
                userjs_path,
                "Restart Firefox to activate.",
            ),
        }

    return reply


def remove_firefox_prefs(message):
    """ Handle 'remove_firefox_prefs' message. """
    reply = {}
    prefs_to_remove = None
    profile_dir = None
    userjs_path = None

    try:
        profile_dir = message["profiledir"].strip()
        prefs_to_remove = message["prefs"].strip()
    except:
        reply = {
            "code": -1,
            "cmd": "error",
            "error": "Error parsing 'remove_firefox_prefs' message.",
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

    elif prefs_to_remove:
        try:
            prefs_to_remove = json.loads(prefs_to_remove)
        except json.decoder.JSONDecodeError:
            reply = {
                "code": -1,
                "cmd": "error",
                "error": "%s %s"
                % (
                    "Error decoding JSON object.",
                    "Invalid 'prefs' list specified.",
                ),
            }

        util = Utility()
        prefs_to_remove = util.remove_empty_items(prefs_to_remove)

        removed = 0
        userjs_removed = 0
        userjs_path = profile_dir + "/user.js"
        userjs_total = util.count_lines(userjs_path)

        for pref in prefs_to_remove:
            removed = util.remove_firefox_pref(userjs_path, pref)
            userjs_removed = userjs_removed + removed

        removed = 0
        prefsjs_removed = 0
        prefsjs_path = profile_dir + "/prefs.js"
        prefsjs_total = util.count_lines(prefsjs_path)

        for pref in prefs_to_remove:
            removed = util.remove_firefox_pref(prefsjs_path, pref)
            prefsjs_removed = prefsjs_removed + removed

        # Removing preferences from 'prefs.js' here turns out to be
        # insuffcient. Firefox tends to write them back immediately
        # before quitting from internal memory. The only way around
        # this so far seems to be the following:
        #
        #   1. Manually reset the target preference(s) from
        #      about:config
        #
        #   2. Reset 'prefs.js' _after_ Firefox quit, and _before_
        #      Firefox restarted
        #
        # We are resorting to [2] below for the sake of automation,
        # and hence introducing the pre-restart hooks below. The
        # hook functionality is likely to be useful for clean-up
        # activities, adding/removing preferences etc. later on as
        # well.

        hook_ps1_path = "%s\\%s\\%s" % (
            os.path.expanduser("~"),
            NATIVE_DIRNAME,
            "pre_restart_hook-remove_firefox_prefs.ps1",
        )

        hook_ps1_content = """
Write-Host "*****************************"
Write-Host "-----REMOVE-FIREFOX-PREFS----"
Write-Host "*****************************"

$debug = {debug}
$profileDir = "{profile_dir}"
$prefsjsPath = "{prefsjs_path}"
$prefsjsPathNew = "{prefsjs_path_new}"
""".format(
            debug="$True" if DEBUG else "$False",
            profile_dir=profile_dir,
            prefsjs_path=profile_dir + "/prefs.js",
            prefsjs_path_new=profile_dir + "/prefs.js-new",
        )

        open(hook_ps1_path, "a+").write(hook_ps1_content)

        for pref in prefs_to_remove:
            hook_ps1_content = """
Write-Host "[+] Removing user_pref() = {pref}"

if ((Test-Path $prefsjsPathNew) -eq $True) {{
    Remove-Item `
        -Path "$prefsjsPathNew" `
        -Force
}}

Get-Content `
    -Path "$prefsjsPath" `
    | Select-String `
        -Pattern "{pref}" `
        -NotMatch `
        | Out-File "$prefsjsPathNew" `
            -Encoding ascii `
            -Force

if ((Test-Path $prefsjsPath) -eq $True) {{
    Remove-Item `
        -Path "$prefsjsPath" `
        -Force
}}

Rename-Item `
    -Path "$prefsjsPathNew" `
    -NewName "$prefsjsPath" `
    -Force

if ($debug -eq $True) {{
  Read-Host -Prompt "Press ENTER to continue ..."
}}
""".format(pref=pref)

            open(hook_ps1_path, "a+").write(hook_ps1_content)

        reply = {
            "code": 0,
            "content": "%d %s: %s=[%d/%d] %s=[%d/%d]. %s"
            % (
                userjs_removed + prefsjs_removed,
                "user_pref() call(s) removed",
                "user.js",
                userjs_removed,
                userjs_total,
                "prefs.js",
                prefsjs_removed,
                prefsjs_total,
                "Restart Firefox with `:restart` to activate!",
            ),
        }

    else:
        reply = {
            "code": -1,
            "cmd": "error",
            "error": "%s %s"
            % ("Empty 'user.js' found.", "No changes were made."),
        }

    return reply


def win_firefox_restart(message):
    """ Handle 'win_firefox_restart' message. """
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
            restart_ps1_path = "%s\\%s\\%s" % (
                os.path.expanduser("~"),
                NATIVE_DIRNAME,
                "win_firefox_restart.ps1",
            )

            restart_ps1_content = """
$debug = {debug}

Set-Location -Path {ff_bin_dir}
$env:PATH=$env:PATH;{ff_bin_dir}

$profileDir = "{profile_dir}"
$nativeDir = "$env:USERPROFILE/{native_dir}"

if ($profileDir -ne "auto") {{
  $lockFilePath = {ff_lock_path}
  $locked = $true
  $num_try = 15
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
  $errorMsg = "Restart failed. Please restart Firefox manually."
  Write-Host "$errorMsg"
}} else {{
  $hookFilesGlob = "$nativeDir/{pre_restart_hook_prefix}*.ps1"
  if ( (Test-Path "$hookFilesGlob") -eq $True) {{
        Get-ChildItem "$hookFilesGlob" `
          | Sort-Object -Property LastWriteTime `
          | ForEach-Object {{
        Write-Host "[+] Executing pre-restart-hook $_ ..."
          & "$_";
          if ($debug -eq $False) {{
            Remove-Item `
              -Path "$_" `
              -Force | Out-Null
          }} else {{
            Rename-Item `
                -Path "$_" `
                -NewName "debug-$(Split-Path "$_" -Leaf)" `
                -Force | Out-Null
          }}
      }}
  }}
  Write-Host "[+] Restarting Firefox ..."
  Start-Process `
      -WorkingDirectory {ff_bin_dir} `
      -FilePath {ff_bin_path} `
      -ArgumentList {ff_args} `
      -WindowStyle Normal

  if ($debug -eq $False) {{
    Remove-Item `
      -Path "{restart_ps1_path}" `
      -Force | Out-Null
  }} else {{
    Read-Host -Prompt "Press ENTER to continue ..."
  }}
}}
""".format(
                ff_bin_dir=ff_bin_dir,
                profile_dir=profile_dir,
                native_dir=NATIVE_DIRNAME,
                ff_lock_path=ff_lock_path,
                ff_bin_path=ff_bin_path,
                ff_args=ff_args,
                pre_restart_hook_prefix=PRE_RESTART_HOOK_PREFIX,
                debug="$True" if DEBUG else "$False",
                restart_ps1_path=restart_ps1_path,
            )

            delay_sec = 2
            task_name = "firefox-restart"

            powershell_cmd = "powershell"
            powershell_args = "%s %s" % (
                "-NoProfile",
                "-ExecutionPolicy Bypass",
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

    debug_log_path = "%s\\%s\\%s" % (
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

    elif cmd == "run":
        commands = message["command"]

        try:
            p = subprocess.check_output(commands, shell=True)
            reply["content"] = p.decode("utf-8")
            reply["code"] = 0

        except subprocess.CalledProcessError as process:
            reply["code"] = process.returncode
            reply["content"] = process.output.decode("utf-8")

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

    # FIXME: "write" below currently overwrite the previous content
    # of the the target which may not be desired.
    elif cmd == "write":
        with open(message["file"], "w") as file:
            file.write(message["content"])

    elif cmd == "temp":
        prefix = message.get("prefix")
        if prefix is None:
            prefix = ""
        prefix = "tmp_{}_".format(sanitizeFilename(prefix))

        (handle, filepath) = tempfile.mkstemp(prefix=prefix)
        with os.fdopen(handle, "w") as file:
            file.write(message["content"])
        reply["content"] = filepath

    elif cmd == "env":
        reply["content"] = getenv(message["var"], "")

    elif cmd == "win_firefox_restart":
        reply = win_firefox_restart(message)

    elif cmd == "remove_firefox_prefs":
        reply = remove_firefox_prefs(message)

    elif cmd == "add_firefox_prefs":
        reply = add_firefox_prefs(message)

    else:
        reply = {"cmd": "error", "error": "Unhandled message"}
        eprint("Unhandled message: {}".format(message))

    return reply


# The empty main() is primarily here so that 'native_main.py' can
# be imported as module. It should not interfere with any other
# functionalities.
def main():
    pass

if __name__ == "__main__":
  while True:
      message = getMessage()
      reply = handleMessage(message)
      sendMessage(encodeMessage(reply))
