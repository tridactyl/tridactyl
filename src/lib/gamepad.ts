
export class GamepadEvent {
    public altKey = false
    public ctrlKey = false
    public isTrusted = true
    public metaKey = false
    public shiftKey = false
    public gamepad = true

    constructor(public key) {}
}

const listeners = new Map([["button", []]]);
export function addButtonListener(listener) {
    const buttonListeners = listeners.get("button");
    buttonListeners.push(listener);
};

const debouncingMs = 100;
const lastPressed = new Map();
export function pollGamepads() {
    const buttonListeners = listeners.get("button");
    for (const gamepad of gamepads) {
        if (!gamepad.connected) {
            continue;
        }

        let pressedButtons = lastPressed.get(gamepad);
        if (pressedButtons === undefined) {
            pressedButtons = [];
            lastPressed.set(gamepad, pressedButtons);
        }

        for (let i = 0; i < gamepad.buttons.length; ++i) {
            const button = gamepad.buttons[i];
            const last = pressedButtons[i] || 0;
            const now = performance.now()
            if (button.pressed && ((now - last) > debouncingMs)) {
                pressedButtons[i] = now;
                buttonListeners.forEach(listener => listener(new GamepadEvent(`${i}`)));
            }
        }
    }
    if (gamepads.some(pad => pad.connected)) {
        window.requestAnimationFrame(pollGamepads);
    }
};

const gamepads = []
export function register(gamepad) {
    gamepads.push(gamepad);
    pollGamepads();
}
