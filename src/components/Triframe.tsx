import * as React from "react"
import Frame from "react-frame-component"

/** The tridactyl iframe.
 *
 *  Documentation coming soon to a repo near you!
 *
 */

export class Triframe extends React.Component<any, any> {
    public constructor(props) {
        super(props)
    }

    public render() {
        return (
            <Frame
                head={
                    <link
                        type="text/css"
                        rel="stylesheet"
                        href=".static/css/commandline.css"
                    />
                }
            />
        )
    }
}

export default Triframe
