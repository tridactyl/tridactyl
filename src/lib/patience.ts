// Borrowed from
// https://tech.mybuilder.com/handling-retries-and-back-off-attempts-with-javascript-promises/
export const sleep = (duration: number) =>
    new Promise(res => setTimeout(res, duration))

export const backoff = (
    fn: (...args: any[]) => Promise<any>,
    retries = 5,
    delay = 50,
) =>
    fn().catch(err => {
        retries > 1
            ? sleep(delay).then(() => backoff(fn, retries - 1, delay * 2))
            : Promise.reject(err)
    })
