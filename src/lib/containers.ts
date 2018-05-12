/** Creates a container from the specified parameters.
 *  @param containerName - The container name.
 *  @param containerColor - The container color, limited to browser.contextualIdentities.IdentityColor.
 *  @param containerIcon - The container icon, limited to browser.contextualIdentities.IdentityIcon.
 */
export async function containerCreate(
    containerName: string,
    containerColor: string,
    containerIcon: string,
) {
    browser.contextualIdentities
        .create({
            name: containerName,
            color: containerColor as browser.contextualIdentities.IdentityColor,
            icon: containerIcon as browser.contextualIdentities.IdentityIcon,
        })
        .then(newContainer =>
            console.log(`Created container: ${newContainer.cookieStoreId}`),
        )
}

/** Removes specified container.
 *  @param containerId - expects a single digit string.
 */
export async function containerRemove(containerId: string) {
    browser.contextualIdentities
        .remove("firefox-container" + containerId)
        .then(removedContainer =>
            console.log(`Removed container: ${removedContainer.cookieStoreId}`),
        )
}

/** Updates the specified container
 *  @param containerId - expects a single digit string.
 *  @param containerUpdate - an object containing all parameters to update.
 */
export async function containerUpdate(containerId: string, {}) {}

/** Gets a container object from a supplied container id string.
 *  @param containerId - expects a single digit string.
 */
export async function containerGetFromId(containerId: string): Promise<{}> {
    let container = await browser.contextualIdentities.get(
        "firefox-container-" + containerId,
    )
    return container
}

/** Queries Firefox's contextual identities API for a container with a specific
 *  name, icon and color. This is done to impose a unique constraint on those
 *  parameters. function returns true if all the parameters have not been
 *  supplied to ensure that checks for uniqueness can't be circumvented.
 *  @params container
 */
export async function containerExists(container: {
    name: string
    color: browser.contextualIdentities.IdentityColor
    icon: browser.contextualIdentities.IdentityIcon
}): Promise<boolean> {
    let exists = true
    let res = await browser.contextualIdentities.query({ name: container.name })
    if (res.length > 0) {
        for (let c of res) {
            console.log(c)
            if (c.color !== container.color && c.icon !== container.icon)
                exists = false
        }
    } else {
        exists = false
    }
    return exists
}
