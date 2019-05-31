import * as m from "mithril"
import {ContentAttrs} from "@src/content"

const TriStatus: m.Component<ContentAttrs> = {
    view: (vnode) => {
        const {model, actions} = vnode.attrs as ContentAttrs
        return m("div", {id: "status-bar-holder"}, [
            m("span", {id: "tridactyl-status-left"}),
            m("span", {id: "tridactyl-status-middle"}),
            m("span", {id: "tridactyl-status-right"}),
        ]);
    }
};

export default TriStatus
