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

const ex_strs = {
    t:   "tabopen",
    j:   "scrolldown",
    k:   "scrollup",
    gt:  "nextab",
    gT:  "prevtab",
    gr:  "reader",
    ":": "colon",
    s:   "o google",
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
    return ex_strs[keystr]
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
    let posskeystrs = Object.keys(ex_strs)
    let atstart = RegExp("^" + keystr)
    return posskeystrs.filter((key)=>atstart.exec(key))
}

function normal_mode_parser(keys): NormalResponse {
    let ex_str = get_ex_str(keys)
    if (ex_str){
        // if keys maps to an ex_str, send it
        return {ex_str}
    } else if (get_poss_ex_str(keys)) {
        // if match possible, keep collecting keys
        return {}
    } else {
        // otherwise delete keys (eg if ESC is pressed, provided no-body binds it)
        return {keys: []}
    }
}

function ex_str_parser(ex_str){
    let [func,...args] = ex_str.split(" ")
    return [func, args]
}

function *ParserController () {
    while (true) {
        let ex_str = ""
        let keys = []
        while (true) {

            console.log("waitin4push")
            // keys.push(yield)
            console.log(yield)
            let response = normal_mode_parser(keys)
            console.log(response)

            if (response.ex_str){
                ex_str = response.ex_str
                break
            } else if (response.keys){
                keys = response.keys
            }
        }
        
        let [func, args] = ex_str_parser(ex_str)

        // func(...args)
        console.log(func, args)
    }

}

let generator = ParserController()
generator.next()
