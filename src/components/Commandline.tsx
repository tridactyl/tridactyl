import * as React from "react"

/** The tridactyl commandline.
 *
 *  Supplies the input element but lets the parent component handle all logic.
 *  Conditional styling can be implemented in theh render function.
 *  use `this.child.setFocus()` from the parent component to focus the input element.
 */

export interface ICmdlineProps {
    cmdlineString: string
    cmdMode: string
    isVisible: boolean
    handleInput(event: any): void
    handleKeyDown(event: any): void
}

export default class Commandline extends React.Component<ICmdlineProps, any> {
    public inputRef: HTMLInputElement

    constructor(props: ICmdlineProps) {
        super(props)
    }

    public setFocus() {
        this.inputRef.focus()
    }

    public render() {
        const inputString = this.props.cmdlineString
        const isVisible = this.props.isVisible
        let symbolName
        if (this.props.cmdMode === "search") {
            symbolName = "tridactyl-input-slash"
        } else {
            symbolName = "tridactyl-input-colon"
        }

        if (isVisible) {
            return (
                <div id="tridactyl-input-container">
                    <span id={symbolName} />
                    <input
                        ref={node => {
                            if (node) {
                                this.inputRef = node
                            }
                        }}
                        id="tridactyl-input-element"
                        onInput={this.props.handleInput}
                        onKeyDown={this.props.handleKeyDown}
                        value={inputString}
                    />
                </div>
            )
        }
        return null
    }
}
