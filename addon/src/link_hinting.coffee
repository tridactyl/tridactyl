# Inspired by QuantumVim: https://github.com/shinglyu/QuantumVim

BACKGROUND_COLOUR = "yellow"

highlight_links = () ->
    links = document.querySelectorAll('a') # Just handles links, not buttons/inputs etc.
    code = 0
    for link in links
        link_highlight(link, code)
        code +=1

    console.log(LINK_CODES)
    return code

LINK_CODES = {}

link_highlight = (elem, code) ->
    elem._background = elem.style.backgroundColor
    elem._position = elem.style.position
    # Why are these being saved?
    elem.style.backgroundColor = BACKGROUND_COLOUR
    elem.style.position="relative"
    codehint = generate_codehint(code)
    elem.appendChild(codehint)
    LINK_CODES[String(code)] = {
        element: elem
        codehint
    }

generate_codehint = (code) ->
    codehint = document.createElement('span')
    codehint.textContent = "" + code
    codehint.style.border = "solid 1 px black"
    codehint.style.backgroundColor="white"
    codehint.style.font="12px/14px bold sans-serif"
    codehint.style.color="darkred"
    codehint.style.position="absolute"
    codehint.style.top="0"
    codehint.style.left="0"
    codehint.style.padding="0.1em"
    codehint

linkMessageHandler = (message) ->
    switch(message.command)
        when "hint" then highlight_links()

browser.runtime.onMessage.addListener(linkMessageHandler)
