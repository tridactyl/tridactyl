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
DEFAULT_UNIX_SHELL = "/bin/sh"
WIN_NATIVE_DIRNAME = ".tridactyl"
HOOKS_DIRNAME = "hooks"
PRE_RESTART_HOOK_PREFIX = "pre-restart"
POST_RESTART_HOOK_PREFIX = "post-restart"


class Utility(object):
    """ A simple class of utility functions for internal use within
        the native_main.py.
    """

    def unix_detect_firefox(self, ff_args):
        """ Detect current Firefox binary binary path, directory,
            binary/command name etc. given the 'ff_args', usually
            collected via 'unix_find_firefox_args()'
        """
        ff_bin_path = None
        ff_bin_name = None
        ff_bin_dir = None

        if ff_args:
            ff_args = ff_args.split()
            if len(ff_args) >= 1:
                ff_bin_path = ff_args[0]
                if pathlib.Path(ff_bin_path).is_file():
                    ff_bin_name = os.path.basename(ff_bin_path)
                    ff_bin_dir = os.path.dirname(ff_bin_path)

        if (
            (not ff_bin_dir)
            or (not ff_bin_name)
            or (not ff_bin_path)
        ):
            return (None, None, None)
        else:
            return (ff_bin_path, ff_bin_dir, ff_bin_name)

    def unix_find_firefox_args(self):
        """ Returns the arguments Firefox was invoked with on Unix
          systems.
      """
        garbage = ["\n", "''"]

        try:
            ff_args = (
                subprocess.check_output(
                    [
                        "ps",
                        "--pid",
                        str(os.getppid()),
                        "--format",
                        "args=''",
                    ]
                )
                .decode("utf-8")
                .strip()
            )

            for _ in garbage:
                ff_args = ff_args.replace(_, "")

        except (subprocess.CalledProcessError, UnicodeDecodeError):
            ff_args = None

        return ff_args

    def write_log(self, msg):
        """ Save log messages for debugging. """
        debug_log_filename = "native_main.log"
        debug_log_dirname = self.get_native_dir()

        if self.is_windows():
            debug_log_path = "%s\\%s" % (
                debug_log_dirname,
                debug_log_filename,
            )
        else:
            debug_log_path = "%s/%s" % (
                debug_log_dirname,
                debug_log_filename,
            )

        open(debug_log_path, "a+").write(msg)

    def is_command_on_path(self, cmd):
        """ Returns 'True' if the if the specified command is found
            on user's $PATH.
        """
        if shutil.which(cmd):
            return True
        else:
            return False

    def windows_restart_firefox(self, profile_dir, browser_cmd):
        """ Restart Firefox on Windows. """
        reply = {}
        ff_lock_name = "parent.lock"

        ff_bin_name = browser_cmd
        ff_bin_path = '"%s"' % shutil.which(ff_bin_name)

        ff_bin_dir = '"%s"' % str(
            pathlib.Path(shutil.which(ff_bin_name)).parent
        )

        if profile_dir == "auto":
            ff_lock_path = ff_bin_path
            ff_args = '"%s"' % ("-foreground")
        else:
            ff_lock_path = '"%s\\%s"' % (profile_dir, ff_lock_name)
            ff_args = '"%s","%s","%s"' % (
                "-foreground",
                "-profile",
                profile_dir,
            )

        # {{{
        # Native messenger can't seem to create detached process on
        # Windows while Firefox is quitting, which is essential to
        # trigger restarting Firefox. So, below we are resorting to
        # create a scheduled task with the task start-time set in
        # the near future.

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

        try:
            restart_ps1_name = "restart_firefox.ps1"
            restart_ps1_dirname = self.get_native_dir()

            restart_ps1_path = "%s\\%s" % (
                restart_ps1_dirname,
                restart_ps1_name,
            )

            restart_ps1_content = """
$debug = {debug}

Set-Location -Path {ff_bin_dir}
$env:PATH=$env:PATH;{ff_bin_dir}

$profileDir = "{profile_dir}"
$nativeDir = "{native_dir}"

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
  $hookFilesGlob = `
    "$nativeDir/{hooks_dir}/{pre_restart_hook_prefix}*.ps1"

  if ((Test-Path "$hookFilesGlob") -eq $True) {{
        Get-ChildItem "$hookFilesGlob" `
          | Sort-Object -Property LastWriteTime `
          | ForEach-Object {{

            $hookPath = "$_"

            Write-Host `
              "[+] Executing pre-restart-hook(s) $hookPath ..."
            & "$hookPath";

            if ($debug -eq $False) {{
              Remove-Item `
                -Path "$hookPath" `
                -Force | Out-Null
            }} else {{
              $newHookPath = `
                "{native_dir}\\{hooks_dir}\\debug-$( `
                    Split-Path "$hookPath" -Leaf)"

              if ((Test-Path "$newHookPath") -eq $True) {{
                Remove-Item `
                  -Path "$newHookPath" `
                  -Force | Out-Null
              }}

              Rename-Item `
                  -Path "$hookPath" `
                  -NewName  $newHookPath `
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
                native_dir=self.get_native_dir(),
                ff_lock_path=ff_lock_path,
                ff_bin_path=ff_bin_path,
                ff_args=ff_args,
                hooks_dir=HOOKS_DIRNAME,
                pre_restart_hook_prefix=PRE_RESTART_HOOK_PREFIX,
                debug="$True" if DEBUG else "$False",
                restart_ps1_path=restart_ps1_path,
            )

            open(restart_ps1_path, "w+").write(restart_ps1_content)

            delay_sec = 2
            task_name = "restart-firefox"

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
                "error": "Error creating restart task.",
            }

        return reply

    def unix_restart_firefox(self, profile_dir, browser_cmd):
        """ Restart Firefox on Unix like systems. """

        reply = {}
        ff_lock_name = "lock"

        util = Utility()

        ff_args = util.unix_find_firefox_args()
        (
            ff_bin_path,
            ff_bin_dir,
            ff_bin_name,
        ) = util.unix_detect_firefox(ff_args)

        if DEBUG:
            msg = "%s %s\n" % (
                time.strftime("%H:%M:%S %p", time.localtime()),
                str(ff_args),
            )
            util.write_log(msg)

        if not ff_bin_path:
            ff_bin_name = browser_cmd

            ff_bin_path = '"%s"' % shutil.which(ff_bin_name)

            ff_bin_dir = '"%s"' % str(
                pathlib.Path(shutil.which(ff_bin_name)).parent
            )

            if profile_dir == "auto":
                ff_args = "%s %s" % (ff_bin_path, "-foreground")
            else:
                ff_args = "%s %s %s %s" % (
                    ff_bin_name,
                    "-foreground",
                    "-profile",
                    profile_dir,
                )

        try:
            restart_sh_name = "restart_firefox.sh"
            restart_sh_dirname = self.get_native_dir()

            restart_sh_path = "%s/%s" % (
                restart_sh_dirname,
                restart_sh_name,
            )

            restart_sh_content = """#!{unix_shell}

debug={debug}

export PATH="{path}"

while readlink "{profile_dir}/lock"; do
  sleep 1
done

sleep 1

echo "[+] Executing pre-restart hook(s) ..."

for hook \
  in {native_dir}/{hooks_dir}/{pre_restart_hook_prefix}*.sh; do
  if [ ! -e "$hook" ]; then
    continue
  fi

  echo "    - $hook"
  chmod ugo+x "$hook"
  {unix_shell} $hook

  if [ "$debug" != "true" ]; then
    rm -vf "$hook"
  else
    hookFilename="$(basename $hook)"
    hookDirname="$(dirname $hook)"
    mv -vf "$hook" "$hookDirname/debug-$hookFilename"
  fi
done

echo "[+] Restarting Firefox ..."

{ff_args} &

if [ "$debug" != "true" ]; then
  rm -vf "$0"
else
    shFilename="$(basename "$0")"
    shDirname="$(dirname "$0")"
    mv -vf "$0" "$shDirname/debug-$shFilename"
fi

""".format(
                unix_shell=DEFAULT_UNIX_SHELL,
                path=os.environ["PATH"],
                hooks_dir=HOOKS_DIRNAME,
                pre_restart_hook_prefix=PRE_RESTART_HOOK_PREFIX,
                profile_dir=profile_dir,
                native_dir=self.get_native_dir(),
                ff_args=ff_args,
                debug="true" if DEBUG else "false",
            )

            open(restart_sh_path, "w+").write(restart_sh_content)

            if DEBUG:
                restart_sh_stdout = open(
                    restart_sh_path + "-stdout", "w+"
                )
                restart_sh_stderr = open(
                    restart_sh_path + "-stderr", "w+"
                )
            else:
                restart_sh_stdout = open("/dev/null", "a+")
                restart_sh_stderr = open("/dev/null", "a+")

            subprocess.Popen(
                [DEFAULT_UNIX_SHELL, restart_sh_path],
                close_fds=True,
                stdout=restart_sh_stdout,
                stderr=restart_sh_stderr,
            )

            reply = {
                "code": 0,
                "content": "Restarting in a few seconds...",
            }

        except subprocess.CalledProcessError:
            reply = {
                "code": -1,
                "cmd": "error",
                "error": "Error creating restart task.",
            }

        return reply

    def is_valid_firefox_profile(self, profile_dir):
        """ Check if the specified firefox profile directory is
            valid.
        """
        is_valid = False
        validity_indicator = "times.json"

        if (
            self.is_windows()
            and pathlib.WindowsPath(profile_dir).is_dir()
        ):
            test_path = "%s\\%s" % (profile_dir, validity_indicator)
            if pathlib.WindowsPath(test_path).is_file():
                is_valid = True
        else:
            test_path = "%s/%s" % (profile_dir, validity_indicator)
            if pathlib.Path(test_path).is_file():
                is_valid = True

        return is_valid

    def get_native_dir(self):
        """ Returns the directory where 'native_main.py' is located.
        """
        return os.path.dirname(os.path.realpath(__file__))

    def is_windows(self):
        """ Detect if underlying OS is Windows. """
        if os.name == "nt":
            return True
        else:
            return False

    def cleanup_items(self, items):
        """ Remove empty or whitespaced items from a list of given
            items, and also strip() each item in items.
        """
        new_items = []
        for item in items:
            item = item.strip()
            if len(item) > 0:
                new_items.append(item)

        return new_items

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
            js_lines = self.cleanup_items(open(js_path).readlines())

            # Remove previous entry for the same 'pref_key'
            for line in js_lines:
                if pref_key in line:
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
            js_lines = self.cleanup_items(open(js_path).readlines())

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


def add_firefox_prefs(message):
    """ Handle 'add_firefox_prefs' message. """
    reply = {}
    prefs_to_add = None
    profile_dir = None
    userjs_path = None

    util = Utility()

    try:
        profile_dir = message["profiledir"].strip()
        prefs_to_add = message["prefs"].strip()
    except KeyError:
        reply = {
            "code": -1,
            "cmd": "error",
            "error": "Error parsing 'add_firefox_prefs' message.",
        }
        return reply

    if (
        (not profile_dir)
        or (profile_dir == "auto")
        or (not util.is_valid_firefox_profile(profile_dir))
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
            prefs_to_add = json.loads(prefs_to_add)

            new_prefs_to_add = {}
            for key in util.cleanup_items(prefs_to_add):
                new_prefs_to_add[key] = prefs_to_add[key]

            prefs_to_add = new_prefs_to_add

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

        # Add empty 'user.js' if doesn't exist
        if not os.path.isfile(userjs_path):
            open(userjs_path, "w+").write("")

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
    """Handle 'remove_firefox_prefs' message."""
    reply = {}
    prefs_to_remove = None
    profile_dir = None
    userjs_path = None

    util = Utility()

    try:
        profile_dir = message["profiledir"].strip()
        prefs_to_remove = message["prefs"].strip()
    except KeyError:
        reply = {
            "code": -1,
            "cmd": "error",
            "error": "Error parsing 'remove_firefox_prefs' message.",
        }
        return reply

    if (
        (not profile_dir)
        or (profile_dir == "auto")
        or (not util.is_valid_firefox_profile(profile_dir))
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
        prefs_to_remove = util.cleanup_items(prefs_to_remove)

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

        curr_def_name = "remove_firefox_prefs"

        if util.is_windows():
            hook_ps1_name = "%s.ps1" % (PRE_RESTART_HOOK_PREFIX)

            hook_ps1_dirname = "%s\\%s" % (
                util.get_native_dir(),
                HOOKS_DIRNAME,
            )

            pathlib.Path(hook_ps1_dirname).mkdir(
                parents=True, exist_ok=True
            )

            hook_ps1_path = "%s\\%s" % (
                hook_ps1_dirname,
                hook_ps1_name,
            )

            hook_ps1_content = """
Write-Host "******************************"
Write-Host "-----REMOVE-FIREFOX-PREFS-----"
Write-Host "******************************"

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

            for pref in prefs_to_remove:
                hook_ps1_content = (
                    hook_ps1_content
                    + """
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

""".format(
                        pref=pref
                    )
                )

            hook_ps1_content = (
                hook_ps1_content
                + """
if ($debug -eq $True) {
  Read-Host -Prompt "Press ENTER to continue ..."
}
"""
            )

            open(hook_ps1_path, "a+").write(hook_ps1_content)

        else:
            # Prepare "pre-restart-hook" script for Unix operating
            # systems here.

            hook_sh_name = "%s.sh" % (PRE_RESTART_HOOK_PREFIX)

            hook_sh_dirname = "%s/%s" % (
                util.get_native_dir(),
                HOOKS_DIRNAME,
            )
            pathlib.Path(hook_sh_dirname).mkdir(
                parents=True, exist_ok=True
            )

            hook_sh_path = "%s/%s" % (hook_sh_dirname, hook_sh_name)

            hook_sh_content = """#!{unix_shell}
echo "******************************"
echo "-----REMOVE-FIREFOX-PREFS-----"
echo "******************************"

debug="{debug}"
profileDir="{profile_dir}"
prefsjsPath="{prefsjs_path}"
prefsjsPathNew="{prefsjs_path_new}"
""".format(
                unix_shell=DEFAULT_UNIX_SHELL,
                debug="true" if DEBUG else "false",
                profile_dir=profile_dir,
                prefsjs_path=profile_dir + "/prefs.js",
                prefsjs_path_new=profile_dir + "/prefs.js-new",
            )

            for pref in prefs_to_remove:
                hook_sh_content = (
                    hook_sh_content
                    + """
echo "[+] Removing user_pref() = {pref}"

rm -vf "$prefsjsPathNew"

grep \
  --invert-match \
  "{pref}" "$prefsjsPath" \
    > "$prefsjsPathNew"

rm -vf "$prefsjsPath"

mv -vf "$prefsjsPathNew" "$prefsjsPath"

""".format(
                        pref=pref
                    )
                )

            hook_sh_content = (
                hook_sh_content
                + """
if [ "$debug" = "true" ]; then
  /usr/bin/env \
    python3 \
      -c "print('Press ENTER to continue ...'); input()"
fi
"""
            )

            open(hook_sh_path, "a+").write(hook_sh_content)

        # The 'reply' dictionary item below is common for both
        # Windows and Unix.

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


def restart_firefox(message):
    """ Handle 'restart_firefox' message. """
    reply = {}
    profile_dir = None
    browser_cmd = None

    util = Utility()

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
        and not util.is_valid_firefox_profile(profile_dir)
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

    elif browser_cmd and not util.is_command_on_path(browser_cmd):
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
        if util.is_windows():
            reply = util.windows_restart_firefox(
                profile_dir, browser_cmd
            )
        else:
            reply = util.unix_restart_firefox(
                profile_dir, browser_cmd
            )

    return reply


def handleMessage(message):
    """ Generate reply from incoming message. """
    cmd = message["cmd"]
    reply = {"cmd": cmd}
    util = Utility()

    if DEBUG:
        msg = "%s %s\n" % (
            time.strftime("%H:%M:%S %p", time.localtime()),
            str(message),
        )
        util.write_log(msg)

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

    # FIXME: "write" below currently overwrites the previous content
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

    elif cmd == "restart_firefox":
        reply = restart_firefox(message)

    elif cmd == "remove_firefox_prefs":
        reply = remove_firefox_prefs(message)

    elif cmd == "add_firefox_prefs":
        reply = add_firefox_prefs(message)

    elif cmd == "get_firefox_pid":
        util = Utility()

        if util.is_windows():
            time.sleep(10)
            reply["content"] = str(os.getppid())
        else:
            reply["content"] = str(os.getppid())

        reply["code"] = 0
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
