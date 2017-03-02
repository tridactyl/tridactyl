Takes functions from parser controller and calls them. Eventually, this will get more complicated to allow command chaining.


    funcParser = (command,args) ->
        command(args...) # ... is unpacks the list

Example: call `var x = exStrParser("setTab 1"); funcParser(x.func,x.args)` in the Firefox addon console
