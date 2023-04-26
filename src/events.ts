import * as utils from './utils';
import * as discord from 'discord.js';
import * as data from "./data";
import * as moment from 'moment-timezone';
import { self } from ".";

export async function announceReminders(): Promise<void> {
    const reminders = data.getReminders();
    const nowUtc = moment().utc().valueOf();
    const bot = self();

    for (const key in reminders) {
        const reminder = reminders[key];

        if (reminder.timestamp > nowUtc) continue;

        const channel = await utils.getIfExists(bot.channels, reminder.channelId) as discord.TextChannel;

        if (!channel) {
            // this can't be announced anymore
            delete reminders[key];
            continue;
        }

        await utils.send(channel, `${utils.mentionUser(reminder.authorId)} says: ${reminder.text}`);
        await data.setLastReminderMessage(reminder.text);
        reminder.isPeriodic ? renewReminder(reminder) : delete reminders[key];
    }

    data.saveReminders(reminders);
}

function renewReminder(reminder: data.Reminder): void {
    const date = moment();

    for (const unit in reminder.timeValues) {
        const value = reminder.timeValues[unit];
        switch (unit) {
            case "year": case "y": date.add(value, "year"); break;
            case "month": case "mo": date.add(value, "month"); break;
            case "day": case "d": date.add(value, "day"); break;
            case "hour": case "h": date.add(value, "hour"); break;
            case "minute": case "m": date.add(value, "minute"); break;
        }
    }

    date.subtract(5, "second");
    reminder.timestamp = date.utc().valueOf();
}
