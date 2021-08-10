/** Functions to deal with text to speech in Tridactyl
 */

import * as Config from "../lib/config"

/** Find the voice object for a voice name
 *
 * @return voice from the TTS API, or undefined
 */
function getVoiceFromName(name: string | "default"): SpeechSynthesisVoice {
    const voices = window.speechSynthesis.getVoices()

    return voices.find(voice => voice.name === name)
}

/**
 * Read the text using the borwser's HTML5 TTS API
 *
 * @param text      the text to read out
 */
export function readText(text: string): void {
    if (window.speechSynthesis.getVoices().length === 0) {
        // should try to warn user? This apparently can happen on some machines
        // TODO: Implement when there's an error feedback mechanism
        throw new Error("No voice found: cannot use Text-To-Speech API")
    }

    const utterance = new SpeechSynthesisUtterance(text)

    const pitch = Config.get("ttspitch")
    const voice = Config.get("ttsvoice")
    const volume = Config.get("ttsvolume")
    const rate = Config.get("ttsrate")

    if (pitch >= 0 && pitch < 2) utterance.pitch = pitch

    if (volume >= 0 && volume <= 1) utterance.volume = volume

    if (rate >= 0.1 && rate <= 10) utterance.rate = rate

    const voiceObj = getVoiceFromName(voice)
    if (voiceObj) {
        utterance.voice = voiceObj
    }

    window.speechSynthesis.speak(utterance)
}

/**
 * Supported TTS control actions
 */
export type Action = "stop" | "play" | "pause" | "playpause"

/**
 * Control any reading in progress
 *
 * Note: pause() doesn't seem to work, so play, pause and playpause arent going
 * to be very useful right now
 */
export function doAction(action: Action): void {
    const synth = window.speechSynthesis

    switch (action) {
        case "play":
            synth.resume()
            break
        case "pause":
            synth.pause()
            break
        case "playpause":
            synth.paused ? synth.resume() : synth.pause()
            break
        case "stop":
            synth.cancel()
            break
    }
}

/**
 * Get a list of the installed TTS voice names, by which users
 * can refer to the vocies for use in config
 *
 * @return list of voice names
 */
export function listVoices(): string[] {
    const voices = window.speechSynthesis.getVoices()

    return voices.map(voice => voice.name)
}
