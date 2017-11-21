import state from './state'
import {SEARCH_NAMES} from './data'

console.log(SEARCH_NAMES)

function setup_ds() {
    let ds = document.getElementById('default_search')
    for(let k of SEARCH_NAMES.keys()) {
        let opt = document.createElement('option')
        opt.appendChild(document.createTextNode(SEARCH_NAMES.get(k)))
        opt.id = k
        if(k === state.search) {
            opt.selected = true;
        }
        ds.appendChild(opt)
    }

    ds.addEventListener("change", function(e) {
        let sel = <HTMLSelectElement>(e.target)
        state.search = sel.options[sel.selectedIndex].id
    })
}

setup_ds()