// import * as config from "@src/lib/config"

function updatePage(){
    const dodgyhtml = atob(window.location.hash.substr(1))
    document.body.innerHTML = dodgyhtml
}

window.addEventListener("load", updatePage)
window.addEventListener("hashchange", updatePage)
