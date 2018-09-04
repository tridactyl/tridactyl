/**
 * Helper functions for logging
 */

import * as Config from "./config"

export enum LEVEL {
    NEVER = 0, // don't use this in calls to log()
    ERROR = 1,
    WARNING = 2,
    INFO = 3,
    DEBUG = 4,
}

export class Logger {
    /**
     * Config-aware Logger class.
     *
     * @param logModule     the logging module name: this is ued to look up the
     *                      configured/default level in the user config
     */
    constructor(private logModule) {}

    /**
     * Config-aware logging function.
     *
     * @param level         the level of the logging - if <= configured, the message
     *                      will be shown
     *
     * @return              logging function: this is returned as a function to
     *                      retain the call site
     */
    private log(level: LEVEL) {
        let configedLevel =
            Config.get("logging", this.logModule) || LEVEL.WARNING

        if (level <= configedLevel) {
            // hand over to console.log, error or debug as needed
            switch (level) {
                case LEVEL.ERROR:
                    // TODO: replicate this for other levels, don't steal focus
                    // work out how to import messaging/webext without breaking everything
                    return async (...message) => {
                        console.error(...message)
                        const getContext = () => {
                            if (!("tabs" in browser)) {
                                return "content"
                            } else if (
                                browser.runtime.getURL(
                                    "_generated_background_page.html",
                                ) == window.location.href
                            )
                                return "background"
                        }
                        if (getContext() == "content")
                            return browser.runtime.sendMessage({
                                type: "commandline_background",
                                command: "recvExStr",
                                args: ["fillcmdline # " + message.join(" ")],
                            })
                        else
                            return browser.tabs.sendMessage(
                                (await browser.tabs.query({
                                    active: true,
                                    currentWindow: true,
                                }))[0].id,
                                {
                                    type: "commandline_frame",
                                    command: "fillcmdline",
                                    args: ["# " + message.join(" ")],
                                },
                            )
                    }
                case LEVEL.WARNING:
                    return console.warn
                case LEVEL.INFO:
                    return console.log
                case LEVEL.DEBUG:
                    return console.debug
            }
        }

        // do nothing with the message
        return function(...args) {}
    }

    // These are all getters so that logger.debug = console.debug and
    // logger.debug('blah') translates into console.debug('blah') with the
    // filename and line correct.
    public get debug() {
        return this.log(LEVEL.DEBUG)
    }
    public get info() {
        return this.log(LEVEL.INFO)
    }
    public get warning() {
        return this.log(LEVEL.WARNING)
    }
    public get error() {
        return this.log(LEVEL.ERROR)
    }
}

export default Logger
