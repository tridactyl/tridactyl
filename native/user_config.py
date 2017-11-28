"""
User configuration file interface
"""

import os
import nm_utils


def _getenv(variable, default):
    """
    Get an environment variable value, or use the default provided
    """
    return os.environ.get(variable) or default


class ConfigManager(object):

    def _find_user_config_file(self):
        """ Find a user config file, if it exists

        Return the file path, or None if not found
        """

        config_dir = _getenv("XDG_CONFIG_HOME",
                             os.path.expandvars('$HOME/.config'))

        candidate_files = [
            os.path.join(config_dir, "tridactyl", "tridactylrc")
        ]

        nm_utils.eprint(candidate_files)

        config_path = None

        # find the first path in the list that exists
        for path in candidate_files:

            nm_utils.eprint("Checking file {}".format(path))

            if os.path.isfile(path):
                config_path = path
                break

        return config_path

    def get_user_config(self):
        # look it up freshly each time - the user could have
        # moved or killed it
        cfg_file = self._find_user_config_file()

        # no file, return
        if not cfg_file:
            return None

        # for now, this is a simple file read, but if the files can
        # include other files, that will need more work
        return open(cfg_file, 'r').read()
