// Sketch of what messaging would look like
//
// All need to be async.
//
// Going with meta first scheme with flags in meta.

class ExCmds {
    @content
    scrollline([x],{},meta) {
        // whatever
        excmd([3, x],null,meta)
        parser(`excmd 3 ${x}`, meta)
    }

    @content
    scrollline([x],{flags: {down}, meta}) {
        // whatever
        excmd([3, x],{meta})
        parser(`excmd 3 ${x}`, meta)
    }

    /**
     * @param blah is x
     */
    @content
    scrollline({msg}, [x, y], {down, up}) {
        this.excmd({msg: meta.msg}, 3, x)
        parser(`excmd 3 ${x}`, meta)
    }

    scrolline({msg, flags: {up, down}}, x, y) {
    }

    @content
    async open({msg, flags}, ...urlarr: string[]) {
        let url = urlarr.join(" ")
        if (url === "about:blank") {
            browserBg.tabs.update(msg.tabId, {url})
        } else if (about_whitelist) {
            natmsg.open(url)
        } else if (url) {
            window.location.href = forceURI(url)
        }
    }
}

class native {
    @content
    path([x, y], meta) {
        this.print([1, 2], meta)
    }

    @background
    print([a, b], meta) {
    }

    path(meta, x, ...y) {
    }

    path({msg, flags: {force}}, x, ...y) {
        foo({msg}, y[0], x)
    }
}
