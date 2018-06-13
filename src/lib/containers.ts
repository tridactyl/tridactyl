import * as Logging from "../logging"
const logger = new Logging.Logger("containers")

// As per Mozilla specification: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/contextualIdentities/ContextualIdentity
const ContainerColor = [
    "blue",
    "turquoise",
    "green",
    "yellow",
    "orange",
    "red",
    "pink",
    "purple",
]

// As per Mozilla specification: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/contextualIdentities/ContextualIdentity
const ContainerIcon = [
    "fingerprint",
    "briefcase",
    "dollar",
    "cart",
    "circle",
    "gift",
    "vacation",
    "food",
    "fruit",
    "pet",
    "tree",
    "chill",
]

/** Creates a container from the specified parameters.Does not allow multiple containers with the same name.
 *  @param name  The container name.
 *  @param color  The container color, must be one of: "blue", "turquoise", "green", "yellow", "orange", "red", "pink" or "purple". If nothing is supplied, it selects one at random.
 *  @param icon  The container icon, must be one of: "fingerprint", "briefcase", "dollar", "cart", "circle", "gift", "vacation", "food", "fruit", "pet", "tree", "chill"
 */
export async function create(
    name: string,
    color = "random",
    icon = "fingerprint",
): Promise<string> {
    if (color === "random") color = chooseRandomColor()
    let container = fromString(name, color, icon)
    logger.debug(container)

    if (await exists(name)) {
        logger.debug(`[Container.create] container already exists ${container}`)
        throw new Error(
            `[Container.create] container already exists, aborting.`,
        )
    } else {
        try {
            let res = await browser.contextualIdentities.create(container)
            logger.info(
                "[Container.create] created container:",
                res["cookieStoreId"],
            )
            return res["cookieStoreId"]
        } catch (e) {
            throw e
        }
    }
}

/** Removes specified container. No fuzzy matching is intentional here. If there are multiple containers with the same name (allowed by other container plugins), it chooses the one with the lowest cookieStoreId
 *  @param name The container name
 */
export async function remove(name: string) {
    logger.debug(name)
    try {
        let id = await getId(name)
        let res = await browser.contextualIdentities.remove(id)
        logger.debug("[Container.remove] removed container:", res.cookieStoreId)
    } catch (e) {
        throw e
    }
}

/** Updates the specified container.
 *  TODO: pass an object to this when tridactyl gets proper flag parsing
 *  NOTE: while browser.contextualIdentities.create does check for valid color/icon combos, browser.contextualIdentities.update does not.
 *  @param containerId Expects a cookieStringId e.g. "firefox-container-n".
 *  @param name optional the new name of the container
 *  @param color optional the new color of the container
 *  @param icon optional the new icon of the container
 */
export async function update(
    containerId: string,
    updateObj: {
        name: string
        color: browser.contextualIdentities.IdentityColor
        icon: browser.contextualIdentities.IdentityIcon
    },
) {
    if (
        isValidColor(updateObj["color"]) &&
        isValidIcon(updateObj["icon"])
    ) {
        try {
            browser.contextualIdentities.update(containerId, updateObj)
        } catch (e) {
            throw e
        }
    } else {
        logger.debug(updateObj)
        throw new Error("[Container.update] invalid container icon or color")
    }
}

/** Gets a container object from a supplied container id string.
 *  @param containerId Expects a cookieStringId e.g. "firefox-container-n"
 */
export async function getFromId(containerId: string): Promise<{}> {
    try {
        return await browser.contextualIdentities.get(containerId)
    } catch (e) {
        logger.debug(
            `[Container.getFromId] could not find a container with id: ${containerId}`,
        )
        throw new Error(
            "[Container.getFromId] could not find a container with that id",
        )
    }
}

/** Queries Firefox's contextual identities API for a container with a specific name.
 *  @param string cname
 *  @returns boolean Returns true when cname matches an existing container or on query error.
 */
export async function exists(cname: string): Promise<boolean> {
    let exists = false
    try {
        let res = await browser.contextualIdentities.query({ name: cname })
        if (res.length > 0) {
            exists = true
        }
    } catch (e) {
        exists = true // Make sure we don't accidentally break the constraint on query error.
        logger.error(
            "[Container.exists] Error querying contextualIdentities:",
            e,
        )
    }
    return exists
}

/** Takes string parameters and returns them as a pseudo container object
 *  for use in other functions in the library.
 *  @param name
 *  @param color
 *  @param icon
 */
export function fromString(name: string, color: string, icon: string) {
    try {
        return {
            name: name,
            color: color as browser.contextualIdentities.IdentityColor,
            icon: icon as browser.contextualIdentities.IdentityIcon,
        }
    } catch (e) {
        throw e
    }
}

/**
 *  @returns An array representation of all containers.
 */
export async function getAll(): Promise<any[]> {
    return await browser.contextualIdentities.query({})
}

/**
 * @param name The container name
 * @returns The cookieStoreId of the first match of the query.
 */
export async function getId(name: string): Promise<string> {
    try {
        return (await browser.contextualIdentities.query({ name: name }))[0][
            "cookieStoreId"
        ]
    } catch (e) {
        throw new Error(
            "[Container.getId] could not find a container with that name.",
        )
    }
}

/** Tries some simple ways to match containers to your input.
 *  @param partialName The (partial) name of the container.
 */
export async function fuzzyMatch(partialName: string): Promise<string> {
    let exactMatch = await browser.contextualIdentities.query({
        name: partialName,
    })
    if (exactMatch.length === 1) {
        return exactMatch[0]["cookieStoreId"]
    } else if (exactMatch.length > 1) {
        throw new Error(
            "[Container.fuzzyMatch] more than one container with this name exists.",
        )
    } else {
        let fuzzyMatches = []
        let containers = await getAll()
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
                "[Container.fuzzyMatch] ambiguous match, provide more characters",
            )
        } else {
            throw new Error(
                "[Container.fuzzyMatch] no container matched that string",
            )
        }
    }
}

/** Helper function for create, returns a random valid IdentityColor for use if no color is applied at creation.*/
function chooseRandomColor(): string {
    let max = Math.floor(ContainerColor.length)
    let n = Math.floor(Math.random() * max)
    return ContainerColor[n]
}

function isValidColor(color: string): boolean {
    for (let c of ContainerColor) {
        if (c === color) return true
    }
    return false
}

function isValidIcon(icon: string): boolean {
    for (let i of ContainerIcon) {
        if (i === icon) return true
    }
    return false
}
