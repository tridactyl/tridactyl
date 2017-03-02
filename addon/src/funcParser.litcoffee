Takes functions from parser controller and calls them. We use `Function.prototype.apply` to unpack the array of arguments, and Number() to convert numbers into numbers.


    funcParser = (command,args) ->
        args = ((if Number(a) then Number(a) else a) for a in args) # more concise way of doing this?
        command.apply(this,args) # Bonkers way of calling a function that does arg unpacking for us

Example: call `var x = exStrParser("setTab 1"); funcParser(x.func,x.args)` in the Firefox addon console
