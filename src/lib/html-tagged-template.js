(function(window) {
    "use strict"

    // test for es6 support of needed functionality
    try {
        // spread operator and template strings support
        (function testSpreadOpAndTemplate() {
            const tag = function tag() {
                return
            }
            // We don't need this value - we're just checking if its attempted creation causes any errors
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            tag`test`
        })()

        // template tag and Array.from support
        if (
            !(
                "content" in document.createElement("template") &&
                "from" in Array
            )
        ) {
            throw new Error()
        }
    } catch (e) {
        // missing support;
        console.log(
            "Your browser does not support the needed functionality to use the html tagged template",
        )
        return
    }

    if (typeof window.html === "undefined") {
        // --------------------------------------------------
        // constants
        // --------------------------------------------------

        const SUBSTITUTION_INDEX = "substitutionindex:" // tag names are always all lowercase
        const SUBSTITUTION_REGEX = new RegExp(
            SUBSTITUTION_INDEX + "([0-9]+):",
            "g",
        )

        // rejection string is used to replace xss attacks that cannot be escaped either
        // because the escaped string is still executable
        // (e.g. setTimeout(/* escaped string */)) or because it produces invalid results
        // (e.g. <h${xss}> where xss='><script>alert(1337)</script')
        // @see https://developers.google.com/closure/templates/docs/security#in_tags_and_attrs
        const REJECTION_STRING = "zXssPreventedz"

        // which characters should be encoded in which contexts
        const ENCODINGS = {
            attribute: {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
            },
            uri: {
                "&": "&amp;",
            },
        }

        // which attributes are DOM Level 0 events
        // taken from https://en.wikipedia.org/wiki/DOM_events#DOM_Level_0
        const DOM_EVENTS = [
            "onclick",
            "ondblclick",
            "onmousedown",
            "onmouseup",
            "onmouseover",
            "onmousemove",
            "onmouseout",
            "ondragstart",
            "ondrag",
            "ondragenter",
            "ondragleave",
            "ondragover",
            "ondrop",
            "ondragend",
            "onkeydown",
            "onkeypress",
            "onkeyup",
            "onload",
            "onunload",
            "onabort",
            "onerror",
            "onresize",
            "onscroll",
            "onselect",
            "onchange",
            "onsubmit",
            "onreset",
            "onfocus",
            "onblur",
            "onpointerdown",
            "onpointerup",
            "onpointercancel",
            "onpointermove",
            "onpointerover",
            "onpointerout",
            "onpointerenter",
            "onpointerleave",
            "ongotpointercapture",
            "onlostpointercapture",
            "oncut",
            "oncopy",
            "onpaste",
            "onbeforecut",
            "onbeforecopy",
            "onbeforepaste",
            "onafterupdate",
            "onbeforeupdate",
            "oncellchange",
            "ondataavailable",
            "ondatasetchanged",
            "ondatasetcomplete",
            "onerrorupdate",
            "onrowenter",
            "onrowexit",
            "onrowsdelete",
            "onrowinserted",
            "oncontextmenu",
            "ondrag",
            "ondragstart",
            "ondragenter",
            "ondragover",
            "ondragleave",
            "ondragend",
            "ondrop",
            "onselectstart",
            "help",
            "onbeforeunload",
            "onstop",
            "beforeeditfocus",
            "onstart",
            "onfinish",
            "onbounce",
            "onbeforeprint",
            "onafterprint",
            "onpropertychange",
            "onfilterchange",
            "onreadystatechange",
            "onlosecapture",
            "DOMMouseScroll",
            "ondragdrop",
            "ondragenter",
            "ondragexit",
            "ondraggesture",
            "ondragover",
            "onclose",
            "oncommand",
            "oninput",
            "DOMMenuItemActive",
            "DOMMenuItemInactive",
            "oncontextmenu",
            "onoverflow",
            "onoverflowchanged",
            "onunderflow",
            "onpopuphidden",
            "onpopuphiding",
            "onpopupshowing",
            "onpopupshown",
            "onbroadcast",
            "oncommandupdate",
        ]

        // which attributes take URIs
        // taken from https://www.w3.org/TR/html4/index/attributes.html
        const URI_ATTRIBUTES = [
            "action",
            "background",
            "cite",
            "classid",
            "codebase",
            "data",
            "href",
            "longdesc",
            "profile",
            "src",
            "usemap",
        ]

        const ENCODINGS_REGEX = {
            attribute: new RegExp(
                "[" + Object.keys(ENCODINGS.attribute).join("") + "]",
                "g",
            ),
            uri: new RegExp(
                "[" + Object.keys(ENCODINGS.uri).join("") + "]",
                "g",
            ),
        }

        // find all attributes after the first whitespace (which would follow the tag
        // name. Only used when the DOM has been clobbered to still parse attributes
        const ATTRIBUTE_PARSER_REGEX = /\s([^">=\s]+)(?:="[^"]+")?/g

        // test if a javascript substitution is wrapped with quotes
        const WRAPPED_WITH_QUOTES_REGEX = /^('|")[\s\S]*\1$/

        // allow custom attribute names that start or end with url or ui to do uri escaping
        // @see https://developers.google.com/closure/templates/docs/security#in_urls
        const CUSTOM_URI_ATTRIBUTES_REGEX = /\bur[il]|ur[il]s?$/i

        // --------------------------------------------------
        // private functions
        // --------------------------------------------------

        /**
         * Escape HTML entities in an attribute.
         * @private
         *
         * @param {string} str - String to escape.
         *
         * @returns {string}
         */
        function encodeAttributeHTMLEntities(str) {
            return str.replace(ENCODINGS_REGEX.attribute, function(match) {
                return ENCODINGS.attribute[match]
            })
        }

        /**
         * Escape entities in a URI.
         * @private
         *
         * @param {string} str - URI to escape.
         *
         * @returns {string}
         */
        function encodeURIEntities(str) {
            return str.replace(ENCODINGS_REGEX.uri, function(match) {
                return ENCODINGS.uri[match]
            })
        }

        // --------------------------------------------------
        // html tagged template function
        // --------------------------------------------------

        /**
         * Safely convert a DOM string into DOM nodes using by using E4H and contextual
         * auto-escaping techniques to prevent xss attacks.
         *
         * @param {string[]} strings - Safe string literals.
         * @param {*} values - Unsafe substitution expressions.
         *
         * @returns {HTMLElement|DocumentFragment}
         */
        window.html = function(strings, ...values) {
            // break early if called with empty content
            if (!strings[0] && values.length === 0) {
                return
            }

            /**
             * Replace a string with substitution placeholders with its substitution values.
             * @private
             *
             * @param {string} match - Matched substitution placeholder.
             * @param {string} index - Substitution placeholder index.
             */
            function replaceSubstitution(match, index) {
                return values[parseInt(index, 10)]
            }

            // insert placeholders into the generated string so we can run it through the
            // HTML parser without any malicious content.
            // (this particular placeholder will even work when used to create a DOM element)
            let str = strings[0]
            for (let i = 0; i < values.length; i++) {
                str += SUBSTITUTION_INDEX + i + ":" + strings[i + 1]
            }

            // template tags allow any HTML (even <tr> elements out of context)
            // @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
            const template = document.createElement("template")
            template.innerHTML = str

            // find all substitution values and safely encode them using DOM APIs and
            // contextual auto-escaping
            const walker = document.createNodeIterator(
                template.content,
                NodeFilter.SHOW_ALL,
            )
            let node
            while ((node = walker.nextNode())) {
                let tag = null
                const attributesToRemove = []

                // --------------------------------------------------
                // node name substitution
                // --------------------------------------------------

                let nodeName = node.nodeName.toLowerCase()
                if (nodeName.indexOf(SUBSTITUTION_INDEX) !== -1) {
                    nodeName = nodeName.replace(
                        SUBSTITUTION_REGEX,
                        replaceSubstitution,
                    )

                    // createElement() should not need to be escaped to prevent XSS?

                    // this will throw an error if the tag name is invalid (e.g. xss tried
                    // to escape out of the tag using '><script>alert(1337)</script><')
                    // instead of replacing the tag name we'll just let the error be thrown
                    tag = document.createElement(nodeName)

                    // mark that this node needs to be cleaned up later with the newly
                    // created node
                    node._replacedWith = tag

                    // use insertBefore() instead of replaceChild() so that the node Iterator
                    // doesn't think the new tag should be the next node
                    node.parentNode.insertBefore(tag, node)

                // special case for script tags:
                // using innerHTML with a string that contains a script tag causes the script
                // tag to not be executed when added to the DOM. We'll need to create a script
                // tag and append its contents which will make it execute correctly.
                // @see http://stackoverflow.com/questions/1197575/can-scripts-be-inserted-with-innerhtml
                } else if (node.nodeName === "SCRIPT") {
                    const script = document.createElement("script")
                    tag = script

                    node._replacedWith = script
                    node.parentNode.insertBefore(script, node)
                }

                // --------------------------------------------------
                // attribute substitution
                // --------------------------------------------------

                let attributes
                if (node.attributes) {
                    // if the attributes property is not of type NamedNodeMap then the DOM
                    // has been clobbered. E.g. <form><input name="attributes"></form>.
                    // We'll manually build up an array of objects that mimic the Attr
                    // object so the loop will still work as expected.
                    if (!(node.attributes instanceof NamedNodeMap)) {
                        // first clone the node so we can isolate it from any children
                        const temp = node.cloneNode()

                        // parse the node string for all attributes
                        const attributeMatches = temp.outerHTML.match(
                            ATTRIBUTE_PARSER_REGEX,
                        )

                        // get all attribute names and their value
                        attributes = []
                        for (const attribute of attributeMatches.length) {
                            const attributeName = attribute
                                .trim()
                                .split("=")[0]
                            const attributeValue = node.getAttribute(
                                attributeName,
                            )

                            attributes.push({
                                name: attributeName,
                                value: attributeValue,
                            })
                        }
                    } else {
                        // Windows 10 Firefox 44 will shift the attributes NamedNodeMap and
                        // push the attribute to the end when using setAttribute(). We'll have
                        // to clone the NamedNodeMap so the order isn't changed for setAttribute()
                        attributes = Array.from(node.attributes)
                    }

                    for (const attribute of attributes) {
                        let name = attribute.name
                        let value = attribute.value
                        let hasSubstitution = false

                        // name has substitution
                        if (name.indexOf(SUBSTITUTION_INDEX) !== -1) {
                            name = name.replace(
                                SUBSTITUTION_REGEX,
                                replaceSubstitution,
                            )

                            // ensure substitution was with a non-empty string
                            if (name && typeof name === "string") {
                                hasSubstitution = true
                            }

                            // remove old attribute
                            attributesToRemove.push(attribute.name)
                        }

                        // value has substitution - only check if name exists (only happens
                        // when name is a substitution with an empty value)
                        if (name && value.indexOf(SUBSTITUTION_INDEX) !== -1) {
                            hasSubstitution = true

                            // if an uri attribute has been rejected
                            let isRejected = false

                            value = value.replace(SUBSTITUTION_REGEX, function(
                                match,
                                index,
                                offset,
                            ) {
                                if (isRejected) {
                                    return ""
                                }

                                let substitutionValue =
                                    values[parseInt(index, 10)]

                                // contextual auto-escaping:
                                // if attribute is a DOM Level 0 event then we need to ensure it
                                // is quoted
                                if (
                                    DOM_EVENTS.indexOf(name) !== -1 &&
                                    typeof substitutionValue === "string" &&
                                    !WRAPPED_WITH_QUOTES_REGEX.test(
                                        substitutionValue,
                                    )
                                ) {
                                    substitutionValue =
                                        '"' + substitutionValue + '"'

                                // contextual auto-escaping:
                                // if the attribute is a uri attribute then we need to uri encode it and
                                // remove bad protocols
                                } else if (
                                    URI_ATTRIBUTES.indexOf(name) !== -1 ||
                                    CUSTOM_URI_ATTRIBUTES_REGEX.test(name)
                                ) {
                                    // percent encode if the value is inside of a query parameter
                                    const queryParamIndex = value.indexOf("=")
                                    if (
                                        queryParamIndex !== -1 &&
                                        offset > queryParamIndex
                                    ) {
                                        substitutionValue = encodeURIComponent(
                                            substitutionValue,
                                        )

                                    // entity encode if value is part of the URL
                                    } else {
                                        substitutionValue = encodeURI(
                                            encodeURIEntities(
                                                substitutionValue,
                                            ),
                                        )

                                        // only allow the : when used after http or https otherwise reject
                                        // the entire url (will not allow any 'javascript:' or filter
                                        // evasion techniques)
                                        if (
                                            offset === 0 &&
                                            substitutionValue.indexOf(":") !==
                                                -1
                                        ) {
                                            const authorized_protocols = [
                                                "http://",
                                                "https://",
                                                "moz-extension://",
                                                "about://",
                                                "data:image/png;base64",
                                                "data:image/gif;base64",
                                                "data:image/jpg;base64",
                                                "data:image/jpeg;base64",
                                                "data:image/x-icon;base64",
                                            ]
                                            // If substitutionValue doesn't start with any of the authorized protocols
                                            if (
                                                !authorized_protocols.find(p =>
                                                    substitutionValue.startsWith(
                                                        p,
                                                    ),
                                                )
                                            ) {
                                                isRejected = true
                                            }
                                        }
                                    }

                                // contextual auto-escaping:
                                // HTML encode attribute value if it is not a URL or URI to prevent
                                // DOM Level 0 event handlers from executing xss code
                                } else if (
                                    typeof substitutionValue === "string"
                                ) {
                                    substitutionValue = encodeAttributeHTMLEntities(
                                        substitutionValue,
                                    )
                                }

                                return substitutionValue
                            })

                            if (isRejected) {
                                value = "#" + REJECTION_STRING
                            }
                        }

                        // add the attribute to the new tag or replace it on the current node
                        // setAttribute() does not need to be escaped to prevent XSS since it does
                        // all of that for us
                        // @see https://www.mediawiki.org/wiki/DOM-based_XSS
                        if (tag || hasSubstitution) {
                            const el = tag || node

                            // optional attribute
                            if (name.substr(-1) === "?") {
                                el.removeAttribute(name)

                                if (value === "true") {
                                    name = name.slice(0, -1)
                                    el.setAttribute(name, "")
                                }
                            } else {
                                el.setAttribute(name, value)
                            }
                        }
                    }
                }

                // remove placeholder attributes outside of the attribute loop since it
                // will modify the attributes NamedNodeMap indices.
                // @see https://github.com/straker/html-tagged-template/issues/13
                attributesToRemove.forEach(function(attribute) {
                    node.removeAttribute(attribute)
                })

                // append the current node to a replaced parent
                let parentNode
                if (node.parentNode && node.parentNode._replacedWith) {
                    parentNode = node.parentNode
                    node.parentNode._replacedWith.appendChild(node)
                }

                // remove the old node from the DOM
                if (
                    (node._replacedWith && node.childNodes.length === 0) ||
                    (parentNode && parentNode.childNodes.length === 0)
                ) {
                    (parentNode || node).remove()
                }

                // --------------------------------------------------
                // text content substitution
                // --------------------------------------------------

                if (
                    node.nodeType === 3 &&
                    node.nodeValue.indexOf(SUBSTITUTION_INDEX) !== -1
                ) {
                    const nodeValue = node.nodeValue.replace(
                        SUBSTITUTION_REGEX,
                        replaceSubstitution,
                    )

                    // createTextNode() should not need to be escaped to prevent XSS?
                    const text = document.createTextNode(nodeValue)

                    // since the parent node has already gone through the iterator, we can use
                    // replaceChild() here
                    node.parentNode.replaceChild(text, node)
                }
            }

            // return the documentFragment for multiple nodes
            if (template.content.childNodes.length > 1) {
                return template.content
            }

            return template.content.firstChild
        }
    }
})(window)
