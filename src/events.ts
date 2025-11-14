import * as utils from './utils';
import * as discord from 'discord.js';
import * as data from "./data";
import * as moment from 'moment-timezone';
import { self } from ".";
import { getBatteryStatus } from './battery';

export async function announceReminders(): Promise<void> {
    const reminders = data.getReminders();
    const preferredChannel = data.getPreferredChannel();
    const nowUtc = moment().tz(data.getTimezone()).utc().valueOf();
    const bot = self();

    for (const key in reminders) {
        const reminder = reminders[key];

        if (reminder.timestamp > nowUtc) continue;

        let channel = await utils.getIfExists(bot.channels, preferredChannel ?? reminder.channelId) as discord.TextChannel;

        if (!channel && preferredChannel) {
            // fallback, try to mirror
            channel = await utils.getIfExists(bot.channels, reminder.channelId) as discord.TextChannel;
        }

        if (!channel) {
            // this can't be announced anymore
            delete reminders[key];
            continue;
        }

        await utils.send(channel, `\`${reminder.id}\` ${utils.mentionUser(reminder.authorId)} says: ${reminder.text}`);
        await data.setLatestReminderMessage(reminder.id, reminder.text);
        (reminder.isPeriodic && (reminder.times == null || reminder.times > 1)) ? renewReminder(reminder) : delete reminders[key];
    }

    data.saveReminders(reminders);
}

function renewReminder(reminder: data.Reminder): void {
    const date = moment().tz(data.getTimezone());

    for (const unit in reminder.timeValues) {
        const value = reminder.timeValues[unit];
        switch (unit) {
            case "year": case "y": date.add(value, "year"); break;
            case "month": case "mo": date.add(value, "month"); break;
            case "week": case "w": date.add(value, "week"); break;
            case "day": case "d": date.add(value, "day"); break;
            case "hour": case "h": date.add(value, "hour"); break;
            case "minute": case "m": date.add(value, "minute"); break;
        }
    }

    date.subtract(5, "second");
    reminder.timestamp = moment(date).utc().valueOf();

    if (reminder.times != null) {
        reminder.times--;
    }
}

const batteryLowThreshold = 15;

export async function checkBattery(): Promise<void> {
    let status: { percentage: number, isCharging: boolean };

    try {
        status = await getBatteryStatus();
    } catch (e) {
        utils.log("failed to check battery: " + e);
        return;
    }

    if (status.isCharging || status.percentage >= batteryLowThreshold) {
        return;
    }

    const bot = self();
    const channel = await utils.getIfExists(bot.channels, "344132988398993408") as discord.TextChannel;

    if (!channel) {
        utils.log("failed to check battery, discord channel does not exist");
        return;
    }

    await utils.send(channel, `${utils.mentionUser(process.env.OWNER_ID)} battery is low (**${status.percentage}%**)! Should charge phone.`);
}
