import * as Logging from "../logging"
const logger = new Logging.Logger("excmd")

/** Creates a container from the specified parameters. Unlike the official Mozilla addon, does not
 *  allow multiple  containers with the same (name, color, icon) constraint.
 *  @param name  The container name.
 *  @param color  The container color, must be one of: "blue", "turquoise", "green", "yellow", "orange", "red", "pink" or "purple"
 *  @param icon  The container icon, must be one of: "fingerprint", "briefcase", "dollar", "cart", "circle", "gift", "vacation", "food", "fruit", "pet", "tree", "chill"
 */
export async function containerCreate(
    name: string,
    color = "blue",
    icon = "fingerprint",
) {
    let container = containerFromString(name, color, icon)
    if (await containerExists(name)) {
        logger.error("[containerCreate] Container already exists, aborting.")
        logger.debug(container)
    } else {
        browser.contextualIdentities
            .create(container)
            .then(newContainer =>
                logger.info("Created container:", newContainer.cookieStoreId),
            )
    }
}

/** Removes specified container.
 *  @param containerId Expects a cookieStringId e.g. "firefox-container-n".
 */
export async function containerRemove(containerId: string) {
    browser.contextualIdentities
        .remove(containerId)
        .then(removedContainer =>
            logger.info("Removed container:", removedContainer.cookieStoreId),
        )
}

/** Updates the specified container
 *  @param containerId Expects a cookieStringId e.g. "firefox-container-n".
 *  @param c An object containing all parameters to update.
 *  TODO: pass an object to this when tridactyl gets proper flag parsing
 */
export async function containerUpdate(
    containerId: string,
    name: string,
    color: string,
    icon: string,
) {
    let currcontainer = await containerGetFromId(containerId)
    let container = containerFromString(name, color, icon)
    if (await containerExists(name)) {
        logger.error("[containerUpdate] No values changed, aborting.")
    } else {
        browser.contextualIdentities.update(containerId, container)
    }
}

/** Gets a container object from a supplied container id string.
 *  @param containerId Expects a cookieStringId e.g. "firefox-container-n"
 */
export async function containerGetFromId(containerId: string): Promise<{}> {
    return await browser.contextualIdentities.get(containerId)
}

/** Queries Firefox's contextual identities API for a container with a specific name.
 *  @param string cname
 *  @returns boolean Returns true when cname matches an existing container or on query error.
 */
export async function containerExists(cname: string): Promise<boolean> {
    let exists = false
    try {
        let res = await browser.contextualIdentities.query({ name: cname })
        if (res.length > 0) {
            exists = true
        }
    } catch (e) {
        exists = true // Make sure we don't accidentally break the constraint on query error.
        logger.error(
            "[containerExists] Error querying contextualIdentities:",
            e,
        )
    }
    return exists
}

/** Takes string parameters and returns them as a pseudo container object
 *  for use in otherfunctions in the library.
 *  @param name
 *  @param color
 *  @param icon
 */
export function containerFromString(name: string, color: string, icon: string) {
    return {
        name: name,
        color: color as browser.contextualIdentities.IdentityColor,
        icon: icon as browser.contextualIdentities.IdentityIcon,
    }
}

/**
 *  @returns An array representation of all containers.
 */
export async function containerGetAll(): Promise<any[]> {
    return await browser.contextualIdentities.query({})
}

/**
 * @param name The container name
 * @returns The cookieStoreId of the first match of the query.
 */
export async function containerGetId(name: string): Promise<string> {
    return (await browser.contextualIdentities.query({ name: name }))[0][
        "cookieStoreId"
    ]
}

/**
 *
 */
export async function containerFuzzyMatch(
    partialName: string,
): Promise<string> {
    let exactMatch = await browser.contextualIdentities.query({
        name: partialName,
    })
    if (exactMatch.length === 1) {
        return exactMatch[0]["cookieStoreId"]
    } else if (exactMatch.length > 1) {
        throw new Error(
            "[containerFuzzyMatch] more than one container with this name exists.",
        )
    } else {
        let fuzzyMatches = []
        let containers = await containerGetAll()
        for (let c of containers) {
            if (c["name"].indexOf(partialName) === 0) {
                // Only match start of name.
                fuzzyMatches.push(c)
            }
        }
        if (fuzzyMatches.length === 1) {
            return fuzzyMatches[0]["cookieStoreId"]
        } else if (fuzzyMatches.length > 1) {
            throw new Error(
                "[containerFuzzyMatch] ambiguous match, provide more characters",
            )
        } else {
            throw new Error(
                "[containerFuzzyMatch] no container matched that string",
            )
        }
    }
}
