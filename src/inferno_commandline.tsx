import { render, Component } from "inferno"
import * as Messaging from "./messaging"
import { browserBg, activeTabId } from "./lib/webext"

class UIComponent extends Component {
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

class Completions extends Component {
    render() {
        return <div id="tridactyl-completions" />
    }
}

class Modeline extends Component<any, any> {
    private constructor(props) {
        super(props)
        this.state = {
            mode: "",
            tabId: -1,
        }
    }

    public async componentDidMount() {
        this.setState({
            tabId: await activeTabId(),
        })
    }

    render() {
        return (
            <div id="tridactyl-modeline">
                <span id="tridactyl-modeline-mode">{this.state.mode}</span>
                <span id="tridactyl-modeline-tabid">{this.state.tabId}</span>
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
            <input
                id="commandline"
                value={this.state.inputString}
                onKeyDown={this.handleKeyDown.bind(this)}
                onInput={this.handleInput.bind(this)}
            />
        )
    }
}

render(<UIComponent />, document.getElementById("tridactyl-ui-container"))
