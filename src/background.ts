/** Background script entry point. */

import * as Controller from "./controller"
import * as keydown_background from "./keydown_background"
import * as CommandLine from "./commandline_background"

// Send keys to controller
keydown_background.onKeydown.addListener(Controller.acceptKey)
// To eventually be replaced by:
// browser.keyboard.onKeydown.addListener

// Send commandline to controller
CommandLine.onLine.addListener(Controller.acceptExCmd)
