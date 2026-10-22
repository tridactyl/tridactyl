const { RuleTester } = require("eslint")
const rule = require("../../custom-eslint-rules/guarded-keyboard-listeners")

const tester = new RuleTester({
    parser: require.resolve("@typescript-eslint/parser"),
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    env: { browser: true },
})
const imported = 'import { guarded } from "@src/lib/keyseq"; '
const namespace = 'import * as keys from "@src/lib/keyseq"; '
const invalid = (code, messageId = "guarded") => ({
    code,
    errors: [{ messageId }],
})

tester.run("guarded-keyboard-listeners", rule, {
    valid: [
        'window.addEventListener("click", handler)',
        'addEventListener("load", handler)',
        'element.removeEventListener("input", handler)',
        'const type = "focus"; window.addEventListener(type, handler)',
        "function addEventListener(type, handler) {}",
        "element.onclick = handler",
        "element.onkeydown = null",
        "element.onkeyup = undefined",
        'element.setAttribute("title", text)',
        imported +
            'window.addEventListener("keydown", guarded(event => run(event.key)))',
        imported + 'window.removeEventListener("keyup", guarded(handler))',
        imported + "window.onkeypress = guarded(handler)",
        imported + "window.addEventListener(type, guarded(handler))",
        imported +
            'const name = "keydown"; window["addEventListener"](name, guarded(handler))',
        namespace +
            'frame.contentWindow.addEventListener("keydown", keys.guarded(handler))',
        'import { guarded as trusted } from "@src/lib/keyseq"; addEventListener("keyup", trusted(handler))',
        '(async () => { const keys = await import("@src/lib/keyseq"); window.addEventListener("keydown", keys.guarded(handler)) })()',
        imported + 'window.addEventListener("keyup", null)',
    ],
    invalid: [
        ...["keydown", "keyup", "keypress"].flatMap(type => [
            invalid(
                `window.addEventListener("${type}", event => run(event.key))`,
            ),
            invalid(`element.removeEventListener("${type}", handler)`),
            invalid(`addEventListener("${type}", handler)`),
            invalid(`element.on${type} = event => run(event.key)`),
        ]),
        invalid(
            'import { handler } from "./handlers"; window.addEventListener("keydown", handler)',
        ),
        invalid(
            'window.addEventListener("keydown", { handleEvent(event) { run(event.key) } })',
        ),
        invalid(
            'const type = "key" + "down"; window.addEventListener(type, handler)',
        ),
        invalid("window.addEventListener(type, handler)"),
        invalid("window.addEventListener(`key${suffix}`, handler)"),
        invalid(
            'const name = "addEventListener"; window[name]("keydown", handler)',
        ),
        invalid('window["on" + "keydown"] = handler'),
        invalid('element.setAttribute("onkeydown", "run()")', "attribute"),
        invalid('element.setAttribute("ONKEYUP", "run()")', "attribute"),
        invalid(
            'const guarded = callback => callback; window.addEventListener("keydown", guarded(handler))',
        ),
        invalid(
            'import { guarded } from "./fake"; window.addEventListener("keydown", guarded(handler))',
        ),
        invalid(
            imported +
                'function setup(guarded) { window.addEventListener("keydown", guarded(handler)) }',
        ),
        invalid(
            namespace +
                'function setup(keys) { window.addEventListener("keydown", keys.guarded(handler)) }',
        ),
        invalid(
            imported +
                'const wrapped = guarded(handler); window.addEventListener("keydown", wrapped)',
        ),
        invalid(
            imported +
                'let wrap = guarded; wrap = callback => callback; window.addEventListener("keydown", wrap(handler))',
        ),
        invalid(
            'const add = window.addEventListener.bind(window); add("keydown", handler)',
            "direct",
        ),
        invalid(
            'const { addEventListener: add } = window; add("keydown", handler)',
            "direct",
        ),
        invalid(
            'const add = addEventListener; add("keydown", handler)',
            "direct",
        ),
        invalid(
            'window.addEventListener.call(window, "keydown", handler)',
            "direct",
        ),
        invalid(
            'Reflect.apply(window.addEventListener, window, ["keydown", handler])',
            "direct",
        ),
    ],
})
