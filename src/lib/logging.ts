/**
 * Helper functions for logging
 */

import * as Config from "@src/lib/config"

const LevelToNum = new Map<Config.LoggingLevel, number>()
LevelToNum.set("never", 0)
LevelToNum.set("error", 1)
LevelToNum.set("warning", 2)
LevelToNum.set("info", 3)
LevelToNum.set("debug", 4)

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
    private log(level: Config.LoggingLevel) {
        let configedLevel = Config.get("logging", this.logModule)

        if (LevelToNum.get(level) <= LevelToNum.get(configedLevel)) {
            // hand over to console.log, error or debug as needed
            switch (level) {
                case "error":
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
                                ) === window.location.href
                            )
                                return "background"
                        }
                        if (getContext() === "content")
                            return browser.runtime.sendMessage({
                                type: "controller_background",
                                command: "acceptExCmd",
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
                case "warning":
                    return console.warn
                case "info":
                    return console.log
                case "debug":
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
        return this.log("debug")
    }
    public get info() {
        return this.log("info")
    }
    public get warning() {
        return this.log("warning")
    }
    public get error() {
        return this.log("error")
    }
}

export default Logger
