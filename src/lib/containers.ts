import * as Logging from '../logging'
const logger = new Logging.Logger("excmd")
//TODO: refactor the whole "firefox-container" + containerId thing into something more sensible.



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
    let c = containerFromString(name, color, icon);
    let exists = await containerExists(c)
    if (!exists) {
        browser.contextualIdentities
            .create(c)
            .then(newContainer =>
                logger.debug(`Created container: ${newContainer.cookieStoreId}`),
            )
    } else {
        logger.warning('This container exists already')
        logger.debug(c)
    }
}

/** Removes specified container.
 *  @param containerId  Expects a single digit string.
 */
export async function containerRemove(containerId: string) {
    browser.contextualIdentities
        .remove("firefox-container" + containerId)
        .then(removedContainer =>
            logger.debug(`Removed container: ${removedContainer.cookieStoreId}`),
        )
}

/** Updates the specified container
 *  @param containerId  Expects a single digit string.
 *  @param containerUpdate  An object containing all parameters to update.
 */
export async function containerUpdate(containerId: string, c: {} ) {
    currcontainer = await browser.contextualIdentities.get(containerId)

    if (!containerExists(c)) {
    browser.contextualIdentities.update(containerId, 
    } else {
        logger.debug("Cannot update container, target container already exists.");
    }
}

/** Gets a container object from a supplied container id string.
 *  @param containerId  expects a single digit string.
 */
export async function containerGetFromId(containerId: string): Promise<{}> {
    let container = await browser.contextualIdentities.get(
        "firefox-container-" + containerId,
    )
    return container
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
        let res = await browser.contextualIdentities.query({ name: container.name })
        if (res.length > 0) {
            for (let c of res) {
                if (c.color === container.color && c.icon === container.icon)
                    exists = true
            }
        } 
    }
    catch (e) {
        exists = true // Makes sure we don't accidentally break the constraint on query error.
        logger.debug(e)
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

/** Returns all containers in an array */
export async function containerGetAll(): Promise<any[]> {
    return await browser.contextualIdentities.query({});
}
