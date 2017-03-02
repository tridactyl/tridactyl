TODO: get litcoffee highlighting off @cmcaine

    commands = {
        "setTab": tridactyl.func.setTab
    }

    exStrParser = (str) ->
        strArray = str.split(" ")
        command = strArray[0]
        func = commands[command]
        args = strArray.slice(1)
        args = ((if Number(a) then Number(a) else a) for a in args) # more concise way of doing this?
        return {func, args}


Example: call `var x = exStrParser("setTab 1"); funcParser(x.func,x.args)` in the Firefox addon console
