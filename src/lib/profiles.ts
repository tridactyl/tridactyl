/**
 * Firefox profile management utilities
 */

import * as Native from "@src/lib/native"

/**
 * Represents a Firefox profile with its metadata
 */
export interface ProfileInfo {
    /** The display name of the profile */
    name: string
    /** Full filesystem path to the profile directory */
    path: string
    /** Whether this is the default profile */
    isDefault: boolean
    /** Whether this profile is currently being used by a Firefox instance */
    inUse: boolean
}

/**
 * Get the Firefox profiles directory for the current platform
 * @returns Promise resolving to the profiles directory path with trailing slash
 */
export async function getProfilesDir(): Promise<string> {
    return Native.getFirefoxDir()
}

/**
 * Get the Firefox executable command for the current platform
 * @returns Promise resolving to the Firefox executable path
 */
export async function getFirefoxCmd(): Promise<string> {
    const cmdline = await Native.ff_cmdline()
    // Take just the executable path, not the full command with arguments
    return cmdline[0]
}

interface ParsedSection {
    type: "profile" | "install" | "other"
    name: string
    data: Record<string, string>
}

/**
 * Parse a single line from profiles.ini into key-value pair
 */
function parseIniLine(line: string): [string, string] | null {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return null

    const [key, value] = trimmed.split("=", 2)
    return key && value !== undefined ? [key, value] : null
}

/**
 * Process a profile section and create ProfileInfo if valid
 */
function processProfileSection(
    data: Record<string, string>,
    profilesDir: string,
    defaultProfile: string | null,
): ProfileInfo | null {
    const name = data.Name
    const path = data.Path
    const isRelative = data.IsRelative === "1"

    if (!name || !path) return null

    const fullPath = isRelative ? profilesDir + path : path

    return {
        name,
        path: fullPath,
        isDefault: path === defaultProfile,
        inUse: false, // Will be checked later
    }
}

/**
 * Parse profiles.ini file content into sections
 */
function parseIniSections(content: string): ParsedSection[] {
    const lines = content.split("\n")
    const sections: ParsedSection[] = []
    let currentSection: ParsedSection | null = null

    for (const line of lines) {
        const trimmed = line.trim()

        // Handle section headers
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            const sectionName = trimmed.slice(1, -1)
            const sectionType = sectionName.startsWith("Profile")
                ? "profile"
                : sectionName.startsWith("Install")
                  ? "install"
                  : "other"

            currentSection = {
                type: sectionType,
                name: sectionName,
                data: {},
            }
            sections.push(currentSection)
            continue
        }

        // Handle key-value pairs
        if (currentSection) {
            const parsed = parseIniLine(line)
            if (parsed) {
                const [key, value] = parsed
                currentSection.data[key] = value
            }
        }
    }

    return sections
}

/**
 * Parse profiles.ini file content
 */
function parseProfilesIni(
    content: string,
    profilesDir: string,
): { profiles: ProfileInfo[]; defaultProfile: string | null } {
    const sections = parseIniSections(content)

    // Find default profile from Install sections
    const defaultProfile =
        sections
            .filter(section => section.type === "install")
            .map(section => section.data.Default)
            .find(Boolean) ?? null

    // Process profile sections
    const profiles = sections
        .filter(section => section.type === "profile")
        .map(section =>
            processProfileSection(section.data, profilesDir, defaultProfile),
        )
        .filter((profile): profile is ProfileInfo => profile !== null)

    return { profiles, defaultProfile }
}

/**
 * Check if a profile is currently in use
 */
async function isProfileInUse(profilePath: string): Promise<boolean> {
    const lockResult = await Native.run(`test -f "${profilePath}/lock"`)
    const parentLockResult = await Native.run(
        `test -f "${profilePath}/.parentlock"`,
    )

    return lockResult.code === 0 || parentLockResult.code === 0
}

/**
 * Check profile usage status for multiple profiles efficiently
 */
async function checkProfilesUsage(profiles: ProfileInfo[]): Promise<void> {
    const usageChecks = profiles.map(async profile => {
        try {
            profile.inUse = await isProfileInUse(profile.path)
        } catch {
            // If we can't check lock status, assume not in use
            profile.inUse = false
        }
    })

    await Promise.all(usageChecks)
}

/**
 * List all available Firefox profiles
 */
export async function listProfiles(): Promise<ProfileInfo[]> {
    try {
        const profilesDir = await getProfilesDir()
        const profilesIni = profilesDir + "profiles.ini"

        const response = await Native.read(profilesIni)
        if (response.code !== 0) {
            console.error(
                `Failed to read profiles.ini at ${profilesIni}. Code: ${response.code}, Error: ${response.error}`,
            )
            return []
        }

        const { profiles } = parseProfilesIni(response.content, profilesDir)
        await checkProfilesUsage(profiles)

        return profiles
    } catch (error) {
        console.error("Failed to list profiles:", error)
        return []
    }
}

/**
 * Find a profile by name and return its path
 * @param profileName The name of the profile to find
 * @returns Promise resolving to the profile path, or null if not found
 */
export async function findProfilePath(
    profileName: string,
): Promise<string | null> {
    const profiles = await listProfiles()
    const profile = profiles.find(p => p.name === profileName)
    return profile?.path ?? null
}

/**
 * Launch Firefox with the specified profile
 * @param profileName The name of the profile to launch
 * @throws Error if the profile is not found or Firefox fails to launch
 */
export async function launchProfile(profileName: string): Promise<void> {
    const profilePath = await findProfilePath(profileName)
    if (!profilePath) {
        throw new Error(`Profile "${profileName}" not found`)
    }

    const firefox = await getFirefoxCmd()
    const result = await Native.run(
        `"${firefox}" -profile "${profilePath}" -no-remote`,
    )

    if (result.code !== 0) {
        throw new Error(`Failed to launch Firefox: ${result.error}`)
    }
}

/**
 * Generate a unique profile directory name
 * @param profileName The display name of the profile
 * @returns A filesystem-safe directory name
 */
function generateProfileDir(profileName: string): string {
    const profileId = Math.random().toString(36).substring(2, 10)
    const sanitizedName = profileName.replace(/[^a-zA-Z0-9_-]/g, "_")
    return `${profileId}.${sanitizedName}`
}

/**
 * Create a new Firefox profile
 * @param profileName The display name for the new profile
 * @throws Error if the profile creation fails
 */
export async function createProfile(profileName: string): Promise<void> {
    const firefox = await getFirefoxCmd()
    const profilesDir = await getProfilesDir()
    const profileDir = generateProfileDir(profileName)
    const fullPath = profilesDir + profileDir

    const result = await Native.run(
        `"${firefox}" -CreateProfile "${profileName} ${fullPath}"`,
    )

    if (result.code !== 0) {
        throw new Error(`Failed to create profile: ${result.error}`)
    }
}

/**
 * Find the range of lines for a profile section with the given name
 */
function findProfileSectionRange(
    lines: string[],
    targetName: string,
): { start: number; end: number; nameLineIndex: number } | null {
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()

        if (trimmed.startsWith("[Profile")) {
            // Find the end of this section
            let sectionEnd = lines.length
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].trim().startsWith("[")) {
                    sectionEnd = j
                    break
                }
            }

            // Check if this section contains our target profile name
            for (let j = i + 1; j < sectionEnd; j++) {
                const line = lines[j].trim()
                if (
                    line.startsWith("Name=") &&
                    line.split("=")[1] === targetName
                ) {
                    return {
                        start: i,
                        end: sectionEnd,
                        nameLineIndex: j,
                    }
                }
            }
        }
    }
    return null
}

/**
 * Update profile name in profiles.ini content
 */
function updateProfileNameInIni(
    content: string,
    oldName: string,
    newName: string,
): string {
    const lines = content.split("\n")
    const profileRange = findProfileSectionRange(lines, oldName)

    if (!profileRange) {
        throw new Error(`Profile "${oldName}" not found in profiles.ini`)
    }

    lines[profileRange.nameLineIndex] = `Name=${newName}`
    return lines.join("\n")
}

/**
 * Validate that a profile rename operation is allowed
 * @param profiles List of existing profiles
 * @param oldName Current profile name
 * @param newName Desired new profile name
 * @throws Error if the operation is not valid
 */
function validateProfileRename(
    profiles: ProfileInfo[],
    oldName: string,
    newName: string,
): void {
    const oldProfile = profiles.find(p => p.name === oldName)
    if (!oldProfile) {
        throw new Error(`Profile "${oldName}" not found`)
    }

    const newProfile = profiles.find(p => p.name === newName)
    if (newProfile) {
        throw new Error(`Profile "${newName}" already exists`)
    }
}

/**
 * Rename a Firefox profile
 * @param oldName Current name of the profile
 * @param newName New name for the profile
 * @throws Error if the profile doesn't exist, new name conflicts, or file operations fail
 */
export async function renameProfile(
    oldName: string,
    newName: string,
): Promise<void> {
    const profiles = await listProfiles()
    validateProfileRename(profiles, oldName, newName)

    const profilesDir = await getProfilesDir()
    const profilesIni = profilesDir + "profiles.ini"

    const response = await Native.read(profilesIni)
    if (response.code !== 0) {
        throw new Error(`Failed to read profiles.ini: ${response.error}`)
    }

    const newContent = updateProfileNameInIni(
        response.content,
        oldName,
        newName,
    )
    await Native.write(profilesIni, newContent)
}
