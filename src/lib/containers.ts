import { browserBg } from "@src/lib/webext"
import Fuse from "fuse.js"
import * as Logging from "@src/lib/logging"
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

export const DefaultContainer = Object.freeze(
    fromString("default", "invisible", "noicond", "firefox-default"),
)

/** Creates a container from the specified parameters.Does not allow multiple containers with the same name.
    @param name  The container name.
    @param color  The container color, must be one of: "blue", "turquoise", "green", "yellow", "orange", "red", "pink" or "purple". If nothing is supplied, it selects one at random.
    @param icon  The container icon, must be one of: "fingerprint", "briefcase", "dollar", "cart", "circle", "gift", "vacation", "food", "fruit", "pet", "tree", "chill"
 */
export async function create(
    name: string,
    color = "random",
    icon = "fingerprint",
): Promise<string> {
    if (color === "random") color = chooseRandomColor()
    const container = fromString(name, color, icon)
    // browser.contextualIdentities.create does not accept a cookieStoreId property.
    delete container.cookieStoreId
    logger.debug(container)

    if (await exists(name)) {
        logger.debug(`[Container.create] container already exists ${container}`)
        throw new Error(
            `[Container.create] container already exists, aborting.`,
        )
    } else {
        const res = await browser.contextualIdentities.create(container)
        return res.cookieStoreId
    }
}

/** Removes specified container. No fuzzy matching is intentional here. If there are multiple containers with the same name (allowed by other container plugins), it chooses the one with the lowest cookieStoreId
    @param name The container name
 */
export async function remove(name: string) {
    logger.debug(name)
    const id = await getId(name)
    const res = await browser.contextualIdentities.remove(id)
    logger.debug("[Container.remove] removed container:", res.cookieStoreId)
}

/** Updates the specified container.
    TODO: pass an object to this when tridactyl gets proper flag parsing
    NOTE: while browser.contextualIdentities.create does check for valid color/icon combos, browser.contextualIdentities.update does not.
    @param containerId Expects a cookieStringId e.g. "firefox-container-n".
    @param name the new name of the container
    @param color the new color of the container
    @param icon the new icon of the container
 */
export function update(
    containerId: string,
    updateObj: {
        name: string
        color: string
        icon: string
    },
) {
    const { name, color, icon } = updateObj
    if (!isValidColor(color)) {
        logger.debug(updateObj)
        throw new Error("[Container.update] invalid container color: " + color)
    }
    if (!isValidIcon(icon)) {
        logger.debug(updateObj)
        throw new Error("[Container.update] invalid container icon: " + icon)
    }
    browser.contextualIdentities.update(containerId, { name, color, icon })
}

/** Gets a container object from a supplied container id string. If no container corresponds to containerId, returns a default empty container.
    @param containerId Expects a cookieStringId e.g. "firefox-container-n"
 */
export async function getFromId(
    containerId: string,
): Promise<browser.contextualIdentities.ContextualIdentity> {
    try {
        return await browserBg.contextualIdentities.get(containerId)
    } catch (e) {
        return DefaultContainer
    }
}

/** Fetches all containers from Firefox's contextual identities API and checks if one exists with the specified name.
    Note: This operation is entirely case-insensitive.
    @param string cname
    @returns boolean Returns true when cname matches an existing container or on query error.
 */
export async function exists(cname: string): Promise<boolean> {
    let exists = false
    try {
        const containers = await getAll()
        const res = containers.filter(
            c => c.name.toLowerCase() === cname.toLowerCase(),
        )
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
    for use in other functions in the library.
    @param name
    @param color
    @param icon
 */
export function fromString(name: string, color: string, icon: string, id = "") {
    return {
        name,
        color,
        icon,
        cookieStoreId: id,
    } as browser.contextualIdentities.ContextualIdentity // rules are made to be broken
}

/**
 *  @returns An array representation of all containers.
 */
export async function getAll(): Promise<any[]> {
    return browser.contextualIdentities.query({})
}

/** Fetches the cookieStoreId of a given container

 Note: all checks are case insensitive.

 @param name The container name
 @returns The cookieStoreId of the first match of the query.
 */
export async function getId(name: string): Promise<string> {
    const containers = await getAll()
    const res = containers.filter(
        c => c.name.toLowerCase() === name.toLowerCase(),
    )
    if (res.length !== 1) {
        throw new Error(`Container '${name}' does not exist.`)
    } else {
        return res[0].cookieStoreId
    }
}

/** Tries some simple ways to match containers to your input.
    Fuzzy matching is entirely case-insensitive.
    @param partialName The (partial) name of the container.
 */
export async function fuzzyMatch(partialName: string): Promise<string> {
    const fuseOptions = {
        id: "cookieStoreId",
        shouldSort: true,
        threshold: 0.5,
        location: 0,
        distance: 100,
        mimMatchCharLength: 3,
        keys: ["name"],
    }

    const containers = await getAll()
    const fuse = new Fuse(containers, fuseOptions)
    const res = fuse.search(partialName)

    if (res.length >= 1) return res[0].item.cookieStoreId
    else {
        throw new Error(
            "[Container.fuzzyMatch] no container matched that string",
        )
    }
}

/** Helper function for create, returns a random valid IdentityColor for use if no color is applied at creation.*/
function chooseRandomColor(): string {
    const max = Math.floor(ContainerColor.length)
    const n = Math.floor(Math.random() * max)
    return ContainerColor[n]
}

function isValidColor(color: string): boolean {
    return ContainerColor.indexOf(color) > -1
}

function isValidIcon(icon: string): boolean {
    return ContainerIcon.indexOf(icon) > -1
}
