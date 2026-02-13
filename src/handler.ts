import * as discord from 'discord.js';
import * as utils from './utils';
import * as reminders from './remindercommands';
import * as meta from './metacommands';
import * as events from './events';
import * as data from './data';
import { setInterval } from 'timers';
import * as moment from 'moment-timezone';

type CommandFunction = (message: discord.Message, args?: string[]) => void | Promise<void>;

const commandList: { [name: string]: CommandFunction } = { ...reminders, ...meta};
const reminderEventIntervalMs = utils.seconds(45);
const checkBatteryIntervalMs = utils.minutes(60);

let _nextReminderCheck: moment.Moment;

export function handleCommand(message: discord.Message): void {
    const content = message.content.split(" ").filter(item => item!==""); 
    const name = content[0].slice(1, content[0].length);
    const args = content.splice(1, content.length);

    if (commandList[name]) commandList[name](message, args);
}

export function handleEvents(): void {
    announceReminders();
    setInterval(() => announceReminders(), reminderEventIntervalMs);
    setInterval(() => checkBattery(), checkBatteryIntervalMs);
}

function announceReminders(): void {
    utils.log("periodic 'announceReminders'");
    events.announceReminders();
    _nextReminderCheck = moment().tz(data.getTimezone()).add(reminderEventIntervalMs, "ms");
}

function checkBattery(): void {
    utils.log("periodic battery check");
    events.checkBattery();
}

export function nextReminderCheck(): moment.Moment {
    return _nextReminderCheck;
}
