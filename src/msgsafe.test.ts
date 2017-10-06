import * as msgsafe from './msgsafe'

const allsafe = {
    a: 1,
    b: true,
    c: "three",
    // d: null,
    e: undefined,
}

function helper(testname, obj, safeobj) {
    test(testname, ()=>expect(msgsafe.generic(obj)).toMatchObject(safeobj))
}

helper('allsafe', allsafe, allsafe)
helper('remove function', {f: ()=>{}, b: 1}, {b: 1})
helper(
    'remove all bad', 
    { 
        a: Symbol(),
        b: ()=>{},
        c: {}
    },
    {}
)
