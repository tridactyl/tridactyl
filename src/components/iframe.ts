import * as m from "mithril"

const proxy = function(vnode: any) {
    const doc = vnode.dom.contentDocument || vnode.dom.contentWindow.document;

    if (doc.readyState === "complete") {
        m.render( vnode.dom.contentDocument.documentElement, vnode.children )
    } else {
        setTimeout(function() {proxy(vnode); }, 0);
    }
}

export const Iframe = {
    oncreate: proxy,
    onupdate: proxy,
    view: ({attrs}) =>
        m("iframe", attrs)
}

export default Iframe
