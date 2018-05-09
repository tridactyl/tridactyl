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
export async function containerUpdate({}) {}
export async function containerGet({}) {}
export async function containerQuery({}) {}
