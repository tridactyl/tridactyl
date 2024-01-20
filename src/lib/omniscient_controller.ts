export const omniscient_controller = {
    set: ({ target, value }) => {
        let result
        try {
            const the_last_one = target[target.length - 1]
            const everything_except_the_last_one = target.slice(
                0,
                target.length - 1,
            )
            const second_to_last = everything_except_the_last_one.reduce(
                (acc, prop) => acc[prop],
                window,
            )
            result = second_to_last[the_last_one] = value
        } catch (e) {
            console.error(e)
        }
        return result
    },
    get: ({ target, _ }) => {
        let result
        try {
            result = target.reduce((acc, prop) => acc[prop], window)
        } catch (e) {
            console.error(e)
        }
        return result
    },
    apply: ({ target, value }) => {
        let result
        try {
            result = target.reduce((acc, prop) => acc[prop], window)(...value)
        } catch (e) {
            console.error(e)
        }
        return result
    },
}
