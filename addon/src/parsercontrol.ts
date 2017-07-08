// Get this into REPL with
// var fs = require('fs')
// eval(fs.readFileSync('file.js').toString())
// ParserController = ->
//     # Loop forever.
//     loop
//         # Receive keys until the mode parser tells us to handle an ex_str.
//         loop
//             keys = []
//             ex_str = ""

//             # Pause execution until someone calls parserController.next(<somevalue>)
//             keys.push(yield)

//             # Mode parsers can return an object with either a `keys` or an `ex_str` property.
            
//             # If `.keys` exists it is a mapping of keys to continue to append to and resend (the mapping was not terminal, send me these keys again). `.keys` may differ from the passed value.
//             # If `.ex_str`, the mapping was terminal: drop all the keys you have now and break to handle the ex_str.
//             response = normal_mode_parser(keys)

//             if response.keys != undefined
//                 keys = response.keys
//             else
//                 ex_str = response.ex_str
//                 break

//         # Parse the ex_str into a function and command to run.
//         [func, args] = ex_str_parser(ex_str)

//         # Execute the ex_str.
//         func(args...)
        
// # Create the generator object
// parserController = ParserController()

// # Run the parserController until the first yield.
// parserController.next()

// # parserController.next needs isn't bound to parserController, so needs to be made indirect:
// feeder = (ev) ->
//     parserController.next(ev)

// Feed the parserController events.
//document.addEventListener("keyDown", feeder)
//
interface NormalResponse {
    keys?: string[]
    ex_str?: string
}

const key_strs_to_ex_strs = {
    t:              "tabopen",
    j:              "scrolldown",
    k:              "scrollup",
    gt:             "nextab",
    gT:             "prevtab",
    gr:             "reader",
    ":":            "exmode",
    s:              "open google",
    xx:             "something",
}

const ex_str_to_func = {
    tabopen:        console.log,
    scrolldown:     console.log,
    scrollup:       console.log,
    nextab:         console.log,
    prevtab:        console.log,
    reader:         console.log,
    exmode:         console.log,
    open:           console.log,
    something:      console.log,
}

// Extracts the first number with capturing parentheses
const FIRST_NUM_REGEX = /^([0-9]+)/


function keyarr_from_keys(keys: string[]){
    let keystr = keys.join("")
    let regans = FIRST_NUM_REGEX.exec(keystr)
    let count = regans ? regans[0] : null
    keystr = keystr.replace(FIRST_NUM_REGEX,"")
    return [count, keystr]
}

function get_ex_str_from_key_str(keystr): string {
    return key_strs_to_ex_strs[keystr]
    //return "olie is the best"
}

function get_ex_str(keys): string {
    let [count, keystr] = keyarr_from_keys(keys)
    let ex_str = get_ex_str_from_key_str(keystr)
    if (ex_str){
        ex_str = count ? ex_str + " " + count : ex_str
    }
    return ex_str
}

function get_poss_ex_str(keys): string[] {
    let [count, keystr] = keyarr_from_keys(keys)
    let posskeystrs = Object.keys(key_strs_to_ex_strs)
    return posskeystrs.filter((key)=>key.startsWith(keystr))
}

function normal_mode_parser(keys): NormalResponse {
    // If there aren't any possible matches, throw away keys until there are
    while ((get_poss_ex_str(keys).length == 0) && (keys.length)) {
        keys = keys.slice(1)
    }

    // If keys map to an ex_str, send it
    let ex_str = get_ex_str(keys)
    if (ex_str){
        return {ex_str}
    } 
    // Otherwise, return the keys that might be used in a future command
    return {keys}
}

function ex_str_parser(ex_str){
    let [func,...args] = ex_str.split(" ")
    // Todo: work out how to map these to functions that can be executed
    return [ex_str_to_func[func], args]
}

function *ParserController () {
    while (true) {
        let ex_str = ""
        let keys = []
        while (true) {

            keys.push(yield)
            let response = normal_mode_parser(keys)
            console.log(keys, response)

            if (response.ex_str){
                ex_str = response.ex_str
                break
            } else {
                keys = response.keys
            }
        }
        
        let [func, args] = ex_str_parser(ex_str)

        func(...args)
        // console.log("Executing: ", args)
    }

}

var generator = ParserController() // var rather than let stops weirdness in repl.
generator.next()

// test using "keysinput".split("").map((x)=>generator.next(x))
