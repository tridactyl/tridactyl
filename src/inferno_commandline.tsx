import { render, Component } from "inferno"
import * as Messaging from "./messaging"
import { browserBg, activeTabId } from "./lib/webext"

class UIComponent extends Component<any, any> {
    private constructor(props) {
        super(props)
    }

    render() {
        return (
            <div id="tridactyl-ui">
                <Completions />
                <Modeline />
                <Commandline />
            </div>
        )
    }
}

class Completions extends Component<any, any> {
    render() {
        return <div id="tridactyl-completions" />
    }
}

/** The Modeline.
 *
 *  NOTE: the initial value of `this.state.mode` is hardcoded because
 *  `browser.storage.local.get()` is async and won't gel with the constructor.
 *  Neat ideas to fix this are welcome.
 */
class Modeline extends Component<any, any> {
    private constructor(props) {
        super(props)
        this.state = {
            mode: "NORMAL",
            tabId: -1,
        }
        //        this.handleMode = this.handleMode.bind(this)
    }

    private handleMode = (changes, areaname) => {
        if (areaname === "local" && "state" in changes) {
            console.log(changes)
            this.setState({
                mode: changes.state.newValue.mode.toUpperCase,
            })
        }
    }

    public async componentDidMount() {
        this.setState({
            tabId: await activeTabId(),
        })

        browser.storage.onChanged.addListener(this.handleMode)
    }

    public async componentWillUnmount() {
        browser.storage.onChanged.removeListener(this.handleMode)
    }

    render() {
        return (
            <div id="tridactyl-modeline">
                <span id="tridactyl-modeline-left">
                    <span id="tridactyl-modeline-mode">{this.state.mode}</span>
                </span>
                <span id="tridactyl-modeline-middle" />
                <span id="tridactyl-modeline-right">
                    <span id="tridactyl-modeline-tabid">
                        {this.state.tabId}
                    </span>
                </span>
            </div>
        )
    }
}

class Commandline extends Component<any, any> {
    private constructor() {
        super()
        this.state = {
            inputString: "",
        }
    }

    public handleKeyDown(e) {
        switch (e.key) {
            case "Enter":
                //TODO: Message tridactyl with the data.
                //TODO: If completion source is selected, use that instead of inputString.
                console.log(
                    "Enter pressed: inputString value: " +
                        this.state.inputString,
                )
                this.setState({
                    inputString: "",
                })
                e.preventDefault()
                break

            case "ArrowUp":
                //TODO: History up
                console.log("Up arrow pressed")
                e.preventDefault()
                break
            case "ArrowDown":
                //TODO: History down
                console.log("Down arrow pressed")
                e.preventDefault()
                break
            case "Tab":
                //TODO: Cycle completion sources
                console.log("Tab key pressed")
                e.preventDefault()
                break
        }
    }

    public handleInput(e) {
        this.setState({
            inputString: e.target.value,
        })
        console.log(this.state.inputString)
    }

    render() {
        return (
            <div id="commandline-container">
                <span id="tridactyl-colon" />
                <input
                    id="commandline"
                    value={this.state.inputString}
                    onKeyDown={this.handleKeyDown.bind(this)}
                    onInput={this.handleInput.bind(this)}
                />
            </div>
        )
    }
}

render(<UIComponent />, document.getElementById("tridactyl-ui-container"))
