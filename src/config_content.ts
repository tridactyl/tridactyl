console.log('Loading content config')

import { DEFAULTS } from './config_defaults'
import * as Messaging from './messaging'

let cachedConfig = Object.create(null)

export function getFromCache(path: string[]): any {
    return cachedConfig.get(path)
}

export function getAllFromCache(): object {
    return cachedConfig
}

export async function getAsync(path: string[]): Promise<any> {
    return Messaging.message('config_background', 'getAsync', [path])
}

export function set(path: string[], newVal: any): void {
    Messaging.message('config_background', 'set', [path, newVal])
}

export function unset(path: string[]): void {
    Messaging.message('config_background', 'unset', [path])
}

function setCache(newCfg: object): void {
    cachedConfig = newCfg
}

Messaging.addListener('config_content', Messaging.attributeCaller({ setCache }))
