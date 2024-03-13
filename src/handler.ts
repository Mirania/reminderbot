import * as discord from 'discord.js';
import * as utils from './utils';
import * as reminders from './remindercommands';
import * as meta from './metacommands';
import * as events from './events';
import { setInterval } from 'timers';

type CommandFunction = (message: discord.Message, args?: string[]) => void | Promise<void>;

const commandList: { [name: string]: CommandFunction } = { ...reminders, ...meta};
const reminderEventInterval = utils.seconds(45);
const checkBatteryInterval = utils.minutes(60);

export function handleCommand(message: discord.Message): void {
    const content = message.content.split(" ").filter(item => item!==""); 
    const name = content[0].slice(1, content[0].length);
    const args = content.splice(1, content.length);

    if (commandList[name]) commandList[name](message, args);
}

export function handleEvents(): void {
    setInterval(() => {
        utils.log("periodic 'announceReminders'");
        events.announceReminders();
    }, reminderEventInterval);
    setInterval(() => {
        utils.log("periodic battery check");
        events.checkBattery();
    }, checkBatteryInterval);
}