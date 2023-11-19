/**
 * Helper types for :hint
 */

import Logger from "@src/lib/logging"
import * as DOM from "@src/lib/dom"
import * as hinting from "@src/content/hinting"

/**
 * Open mode: how to act on the selected hintable element
 */
export enum OpenMode {
    Default = "",
    Tab = "-t",
    BackgroundTab = "-b",
    Window = "-w",
    WindowPrivate = "-wp",
    Highlight = "-h",
    Images = "-i",
    ImagesTab = "-I",
    Kill = "-k",
    KillTridactyl = "-K",
    Scroll = "-z",
    SaveResource = "-s",
    SaveImage = "-S",
    SaveAsResource = "-a",
    SaveAsImage = "-A",
    ScrollFocus = "-;",
    TTSRead = "-r",
    YankAlt = "-P",
    YankAnchor = "-#",
    YankLink = "-y",
    YankText = "-p",
}

/**
 * Hinting parameters interface
 */
export interface HintOptions {
    rapid: boolean
    textFilter: null | string | RegExp
    openMode: OpenMode
    includeInvisible: boolean
    immediate: boolean
    jshints: boolean
    callback: null | string
    excmd: null | string
    pipeAttribute: null | string
    selectors: string[]
    selectorsExclude: string[]
    warnings: string[]
}

/**
 * Hinting parameters class for parsing
 */
export class HintConfig implements HintOptions {
    public rapid = false
    public textFilter = null
    public openMode = OpenMode.Default
    public includeInvisible = false
    public immediate = false
    public jshints = true
    public callback = null
    public excmd = null
    public pipeAttribute = null
    public selectors = []
    public selectorsExclude = []
    public includeDefaultHintables = true
    public warnings = []

    public static parse(args: string[]): HintConfig {
        // Argument parser state
        enum State {
            Initial,
            ExpectF,
            ExpectFR,
            ExpectCallback,
            ExpectExcmd,
            ExpectSelector,
            ExpectPipeSelector,
            ExpectPipeAttribute,
            ExpectSelectorCallback,
            ExpectSelectorExclude,
        }

        const result = new HintConfig()
        const multiLetterFlags = ["fr", "wp", "br", "pipe"]
        let cOrPipeFlagPresent = false
        let CFlagPresent = false

        // Parser state
        let state = State.Initial

        outer: for (let argI = 0; argI < args.length; ++argI) {
            const arg = args[argI]

            switch (state) {
                case State.Initial:
                    if (arg.length >= 2 && arg[0] === "-" && arg[1] !== "-") {
                        // Parse short arguments, i.e. - followed by (mostly) single-letter arguments,
                        // and some two-letter arguments.

                        for (let i = 1; i < arg.length; ++i) {
                            let flag = arg[i]

                            // Fix two-letter flags using lookahead
                            if (i < arg.length - 1) {
                                const multiLetterFlag = multiLetterFlags.find(
                                    tlf =>
                                        arg.substring(i, i + tlf.length) ===
                                        tlf,
                                )

                                if (multiLetterFlag !== undefined) {
                                    flag = multiLetterFlag
                                    i += multiLetterFlag.length - 1
                                }
                            }

                            // Process flag
                            let newOpenMode: undefined | OpenMode
                            let newState: undefined | State

                            // eslint-disable-next-line sonarjs/max-switch-cases, sonarjs/no-nested-switch
                            switch (flag) {
                                case "br":
                                    // Equivalent to -qb, but deprecated
                                    result.rapid = true
                                    newOpenMode = OpenMode.BackgroundTab
                                    break
                                case "q":
                                    result.rapid = true
                                    break
                                case "f":
                                    newState = State.ExpectF
                                    break
                                case "fr":
                                    newState = State.ExpectFR
                                    break
                                case "V":
                                    result.includeInvisible = true
                                    break
                                case "J":
                                    result.jshints = false
                                    break
                                case "!":
                                    result.immediate = true
                                    break
                                case "F":
                                    newState = State.ExpectCallback
                                    break
                                case "W":
                                    newState = State.ExpectExcmd
                                    break
                                case "c":
                                    cOrPipeFlagPresent = true
                                    result.includeDefaultHintables = false
                                    newState = State.ExpectSelector
                                    break
                                case "C":
                                    CFlagPresent = true
                                    result.includeDefaultHintables = true
                                    newState = State.ExpectSelector
                                    break
                                case "x":
                                    newState = State.ExpectSelectorExclude
                                    break
                                case "pipe":
                                    cOrPipeFlagPresent = true
                                    result.includeDefaultHintables = false
                                    newState = State.ExpectPipeSelector
                                    break
                                case "t":
                                    newOpenMode = OpenMode.Tab
                                    break
                                case "b":
                                    newOpenMode = OpenMode.BackgroundTab
                                    break
                                case "w":
                                    newOpenMode = OpenMode.Window
                                    break
                                case "wp":
                                    newOpenMode = OpenMode.WindowPrivate
                                    break
                                case "h":
                                    newOpenMode = OpenMode.Highlight
                                    break
                                case "i":
                                    newOpenMode = OpenMode.Images
                                    break
                                case "I":
                                    newOpenMode = OpenMode.ImagesTab
                                    break
                                case "k":
                                    newOpenMode = OpenMode.Kill
                                    break
                                case "K":
                                    newOpenMode = OpenMode.KillTridactyl
                                    break
                                case "z":
                                    newOpenMode = OpenMode.Scroll
                                    break
                                case "s":
                                    newOpenMode = OpenMode.SaveResource
                                    break
                                case "S":
                                    newOpenMode = OpenMode.SaveImage
                                    break
                                case "a":
                                    newOpenMode = OpenMode.SaveAsResource
                                    break
                                case "A":
                                    newOpenMode = OpenMode.SaveAsImage
                                    break
                                case ";":
                                    newOpenMode = OpenMode.ScrollFocus
                                    break
                                case "r":
                                    newOpenMode = OpenMode.TTSRead
                                    break
                                case "P":
                                    newOpenMode = OpenMode.YankAlt
                                    break
                                case "#":
                                    newOpenMode = OpenMode.YankAnchor
                                    break
                                case "y":
                                    newOpenMode = OpenMode.YankLink
                                    break
                                case "p":
                                    newOpenMode = OpenMode.YankText
                                    break
                                default:
                                    result.warnings.push(
                                        `unknown flag -${flag}`,
                                    )
                                    break
                            }

                            // Check openMode changes
                            if (newOpenMode !== undefined) {
                                if (result.openMode !== OpenMode.Default) {
                                    // Notify that multiple open modes doesn't make sense
                                    result.warnings.push(
                                        "multiple open mode flags specified, overriding the previous ones",
                                    )
                                }

                                result.openMode = newOpenMode
                            }

                            if (cOrPipeFlagPresent && CFlagPresent) {
                                result.warnings.push(
                                    "mutually exclusive -c (or -pipe) and -C flags are both specified, last wins, " +
                                    "default hints will " +
                                    (result.includeDefaultHintables ? "be" : "not be") + " included",
                                )
                            }

                            // Check state changes
                            if (newState !== undefined) {
                                // Some state transitions are dubious, specifically all the ones that go from (argument
                                // expecting value) to (other argument expecting value), except for -cF
                                if (
                                    (state === State.ExpectSelector &&
                                        newState === State.ExpectCallback) ||
                                    (state === State.ExpectCallback &&
                                        newState === State.ExpectSelector)
                                ) {
                                    newState = State.ExpectSelectorCallback
                                }

                                if (
                                    state !== State.Initial &&
                                    newState !== State.ExpectSelectorCallback
                                ) {
                                    result.warnings.push(
                                        `multiple flags taking a value were specified, only the last one (-${flag}) will be processed`,
                                    )
                                }

                                state = newState
                            }
                        }
                    } else {
                        // Not something that looks like an argument, add it to positionals for later processing
                        result.includeDefaultHintables = false
                        result.selectors.push(arg)
                    }
                    break
                case State.ExpectF:
                case State.ExpectFR:
                    // Collect arguments using escapes
                    let filter = arg
                    while (filter.endsWith("\\")) {
                        filter = filter.substring(0, filter.length - 1)

                        if (argI + 1 < args.length) {
                            filter += " " + args[++argI]
                        } else {
                            break
                        }
                    }

                    if (state == State.ExpectF) {
                        // -f
                        result.textFilter = filter
                    } else {
                        // -fr
                        result.textFilter = new RegExp(filter)
                    }

                    state = State.Initial

                    break
                case State.ExpectExcmd:
                    // Collect all the remaining arguments into a excmd callback
                    result.excmd = args.slice(argI).join(" ")
                    // Reset state to initial, parsing was successful
                    state = State.Initial
                    break outer
                case State.ExpectCallback:
                    // Collect all the remaining arguments into a Javascript callback
                    result.callback = args.slice(argI).join(" ")
                    // Reset state to initial, parsing was successful
                    state = State.Initial
                    break outer
                case State.ExpectSelector:
                    // -c, expect a single selector
                    result.selectors.push(arg)
                    state = State.Initial
                    break
                case State.ExpectSelectorExclude:
                    // -x, expect a single exclude selector
                    result.selectorsExclude.push(arg)
                    state = State.Initial
                    break
                case State.ExpectPipeSelector:
                    // -pipe, first expect a selector
                    result.selectors.push(arg)
                    // Then, expect the attribute
                    state = State.ExpectPipeAttribute
                    break
                case State.ExpectPipeAttribute:
                    // -pipe, second argument
                    result.pipeAttribute = arg
                    // Keep parsing options when we're done
                    state = State.Initial
                    break
                case State.ExpectSelectorCallback:
                    // -cF, expect selector, then callback
                    result.selectors.push(arg)
                    state = State.ExpectCallback
                    break
            }
        }

        if (state !== State.Initial) {
            // If we didn't return to the initial state, we were expecting an option value
            result.warnings.push("error parsing options: expected a value")
        }

        return result
    }

    public printWarnings(logger: Logger) {
        for (const warning of this.warnings) {
            logger.warning(warning)
        }
    }

    defaultHintables() {
        // Use the default selectors to find hintable elements
        switch (this.openMode) {
            case OpenMode.YankText:
            case OpenMode.Highlight:
            case OpenMode.Scroll:
                // For text-based opens, look for elements with text by default
                return hinting.toHintablesArray(
                    DOM.elementsWithText(this.includeInvisible),
                )

            case OpenMode.YankAlt:
                return hinting.toHintablesArray(
                    DOM.getElemsBySelector("[title],[alt]", [
                        DOM.isVisibleFilter(this.includeInvisible),
                    ]),
                )

            case OpenMode.YankAnchor:
                return hinting.toHintablesArray(
                    DOM.anchors(this.includeInvisible),
                )

            case OpenMode.Images:
            case OpenMode.ImagesTab:
            case OpenMode.SaveImage:
            case OpenMode.SaveAsImage:
                return hinting.toHintablesArray(
                    hinting.hintableImages(this.includeInvisible),
                )

            case OpenMode.Kill:
            case OpenMode.KillTridactyl:
                return hinting.toHintablesArray(
                    hinting.killables(this.includeInvisible),
                )

            case OpenMode.SaveResource:
            case OpenMode.SaveAsResource:
                return hinting.toHintablesArray(
                    hinting.saveableElements(this.includeInvisible),
                )

            default:
                return hinting.hintables(
                    DOM.HINTTAGS_selectors,
                    this.jshints,
                    this.includeInvisible,
                )
        }
    }

    public hintables() {
        let hintables = this.includeDefaultHintables ? this.defaultHintables() : []
        if (this.selectors.length > 0) {
            hintables = hintables.concat(hinting.hintables(
                this.selectors.join(" "),
                this.jshints,
                this.includeInvisible,
            ))
        }
        const textFilter = this.textFilter
        const exclude = this.selectorsExclude.join(" ")
        for (const elements of hintables) {
            // Do we have text filters to refine this?
            if (textFilter !== null) {
                elements.elements = elements.elements.filter(
                    hinting.hintByTextFilter(this.textFilter),
                )
            }
            if (exclude) {
                elements.elements = elements.elements.filter(
                    element => !element.matches(exclude)
                )
            }
        }

        return hintables
    }

    public get isYank() {
        return (
            this.openMode === OpenMode.YankAnchor ||
            this.openMode === OpenMode.YankAlt ||
            this.openMode === OpenMode.YankLink ||
            this.openMode === OpenMode.YankText
        )
    }
}
