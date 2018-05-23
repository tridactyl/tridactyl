import * as Logging from "../logging"
const logger = new Logging.Logger("excmd")

/** Creates a container from the specified parameters. Unlike the official Mozilla addon, does not
 *  allow multiple  containers with the same (name, color, icon) constraint.
 *  @param containerName  The container name.
 *  @param containerColor  The container color, limited to browser.contextualIdentities.IdentityColor.
 *  @param containerIcon  The container icon, limited to browser.contextualIdentities.IdentityIcon.
 */
export async function containerCreate(
    name: string,
    color: string,
    icon: string,
) {
    let c = containerFromString(name, color, icon)
    let exists = await containerExists(c)
    if (!exists) {
        browser.contextualIdentities
            .create(c)
            .then(newContainer =>
                logger.info("Created container:", newContainer.cookieStoreId),
            )
    } else {
        logger.error("containerCreate: Container already exists, aborting.")
        logger.debug(c)
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
    if (!containerExists(container)) {
        browser.contextualIdentities.update(containerId, container)
    } else {
        logger.error("containerUpdate: No values changed, aborting.")
    }
}

/** Gets a container object from a supplied container id string.
 *  @param containerId Expects a cookieStringId e.g. "firefox-container-n"
 */
export async function containerGetFromId(containerId: string): Promise<{}> {
    return await browser.contextualIdentities.get(containerId)
}

/** Queries Firefox's contextual identities API for a container with a specific
 *  name. The color and icon are then compared. This is done to impose a unique
 *  constraint on those parameters.
 *  The function returns true if all the parameters have not been
 *  supplied to ensure that checks for uniqueness can't be circumvented.
 *  @params container
 *  @returns boolean Returns true when all container fields match or if the query fails.
 */
export async function containerExists(container: {
    name: string
    color: browser.contextualIdentities.IdentityColor
    icon: browser.contextualIdentities.IdentityIcon
}): Promise<boolean> {
    let exists = false
    try {
        let res = await browser.contextualIdentities.query({
            name: container.name,
        })
        if (res.length > 0) {
            for (let c of res) {
                if (c.color === container.color && c.icon === container.icon)
                    exists = true
            }
        }
    } catch (e) {
        exists = true // Make sure we don't accidentally break the constraint on query error.
        logger.error("Error querying contextualIdentities:", e)
    }
    return exists
}

/** Takes string parameters and returns them as a pseudo container object
 *  for use in otherfunctions in the library.
 *  @params name
 *  @params color
 *  @params icon
 */
export function containerFromString(name: string, color: string, icon: string) {
    return {
        name: name,
        color: color as browser.contextualIdentities.IdentityColor,
        icon: icon as browser.contextualIdentities.IdentityIcon,
    }
}

/** Returns an array representation of all containers.
 *  Something something completions?
 */
export async function containerGetAll(): Promise<any[]> {
    return await browser.contextualIdentities.query({})
}
