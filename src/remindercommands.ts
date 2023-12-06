import * as discord from 'discord.js';
import * as utils from './utils';
import * as data from './data';
import * as moment from 'moment-timezone';
import { self } from '.';

export function help(message: discord.Message): void {
    const prefix = process.env.COMMAND;

    const embed = new discord.MessageEmbed()
        .setAuthor(`~~ You used the ${prefix}help command! ~~`, self().user.avatarURL())
        .setColor("#FF0000")
        .setFooter("For more info, ask the bot owner!")
        .setTitle("Here's what I can do:")
        .addField(`${prefix}r / ${prefix}reminder`, "Set a reminder.")
        .addField(`${prefix}pr / ${prefix}periodicreminder`, "Set a periodic reminder.")
        .addField(`${prefix}d / ${prefix}delay`, "Snooze a reminder; repeat it at some point in the future.")
        .addField(`${prefix}l / ${prefix}list`, "List all active reminders.")
        .addField(`${prefix}c / ${prefix}clear`, "Remove a periodic reminder.");

    utils.sendEmbed(message, embed);
}

export const h = help;

export function reminder(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        return;
    }

    const usage = `${utils.usage("reminder", "in/at date message")}\n` +
        "For relative time (in), 'date' should be something like 1d10h20m.\n" +
        "For absolute time (at), 'date' should be something like 30/01/2030 00:45. This uses the bot owner timezone.";

    if (args.length < 3) {
        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    if (args[0] === "in") {
        buildRelativeTimeReminder(message, args, false, false);
    } else if (args[0] === "at") {
        buildAbsoluteTimeReminder(message, args);
    } else {
        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }  
}

export const r = reminder;

export function periodicreminder(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        return;
    }

    if (args.length < 3) {
        const usage = `${utils.usage("periodicreminder", "name date message")}\n` +
            "The 'name' should be one word; it can later be used to delete this reminder.\n" +
            "The 'date' should be something like 1d10h20m.";

        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    buildRelativeTimeReminder(message, args, true, false);
}

export const pr = periodicreminder;

export function delay(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        return;
    }

    const usage = `${utils.usage("delay", "date")}\n` +
        "The 'date' should be something like 1d10h20m.";

    if (args.length < 1) {
        utils.send(message, `To delay a reminder, you can type:\n${usage}`);
        return;
    }

    const toDelay = data.getLastReminderMessage();

    if (!toDelay) {
        utils.send(message, "There is no reminder to delay.");
        return;
    }

    buildRelativeTimeReminder(message, [null, args[0], toDelay], false, true);
}

export const d = delay;

export function list(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        return;
    }

    const reminders = data.getReminders();
    const periodic: data.Reminder[] = [];
    const nonperiodic: data.Reminder[] = [];

    for (const key in reminders) {
        reminders[key].isPeriodic ? periodic.push(reminders[key]) : nonperiodic.push(reminders[key]);
    }

    if (periodic.length === 0 && nonperiodic.length === 0) {
        utils.send(message, "There are no reminders.");
        return;
    }

    const now = moment().tz(utils.userTz());

    let msgText = "";
    if (nonperiodic.length > 0) {
        nonperiodic.sort((r1, r2) => r1.timestamp - r2.timestamp);
        msgText += "**Non-periodic reminders:**\n";
        nonperiodic.forEach(np => {
            const next = moment.tz(np.timestamp, utils.userTz());
            const relativeTime = utils.getRelativeTimeString(now, next);
            msgText += `➜ '${np.text}' at ${next.format("dddd, MMMM Do YYYY, HH:mm")} \`(in ${relativeTime})\`\n`;
        });
    }
    if (periodic.length > 0 && nonperiodic.length > 0) {
        msgText += "\n";
    }
    if (periodic.length > 0) {
        msgText += "**Periodic reminders:**\n";
        periodic.sort((r1, r2) => r1.timestamp - r2.timestamp);
        periodic.forEach(p => {
            const next = moment.tz(p.timestamp, utils.userTz());
            const relativeTime = utils.getRelativeTimeString(now, next);
            msgText += `➜ \`${p.name}\`: '${p.text}' every ${p.rawTime} \`(next up in ${relativeTime})\`\n`;
        });
    }

    utils.send(message, msgText.length > 1990 ? msgText.slice(0, 1990) + " (...)" : msgText);
}

export const l = list;

export function clear(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        return;
    }

    if (args.length < 1) {
        const usage = `${utils.usage("clear", "name")}\n` +
            "The 'name' should be one word; it should be the name of some periodic reminder.\n" +
            `Use ${process.env.COMMAND}list to check all names.`;

        utils.send(message, `To clear a reminder, you can type:\n${usage}`);
        return;
    }

    const reminders = data.getReminders();

    let targetKey: string;
    for (const key in reminders) {
        if (reminders[key].isPeriodic && reminders[key].name && reminders[key].name.toLowerCase() === args[0].toLowerCase()) {
            targetKey = key;
        }
    }

    if (!targetKey) {
        utils.send(message, `Did not find a reminder with that namer. Use ${process.env.COMMAND}list to check all names.`);
        return;
    }

    delete reminders[targetKey];
    data.deleteReminder(targetKey);
    utils.send(message, `Deleted the reminder named '${args[0]}'.`);
}

export const c = clear;

function parseRelativeTime(start: moment.Moment, relativeTime: string): {valid: boolean, date?: moment.Moment, timeValues?: {[unit: string]: number}} {
    const tokens = relativeTime.match(/[0-9]+|[A-Za-z]+/g) ?? [,];
    const timeValues: { [unit: string]: number } = {};

    for (let i = 0; i < tokens.length; i += 2) {
        let value: number;

        if (i + 1 >= tokens.length || timeValues[tokens[i + 1]] != undefined || isNaN(value = Number(tokens[i])) || value <= 0) {
            return {valid: false};
        }

        timeValues[tokens[i + 1]] = value;
    }

    const date = moment(start).tz(utils.userTz());

    for (const unit in timeValues) {
        const value = timeValues[unit];
        switch (unit) {
            case "year": case "y": date.add(value, "year"); break;
            case "month": case "mo": date.add(value, "month"); break;
            case "week": case "w": date.add(value, "week"); break;
            case "day": case "d": date.add(value, "day"); break;
            case "hour": case "h": date.add(value, "hour"); break;
            case "minute": case "m": date.add(value, "minute"); break;
            default: return {valid: false};
        }
    }

    return {valid: true, date, timeValues};
}

async function buildRelativeTimeReminder(message: discord.Message, args: string[], isPeriodic: boolean, echoReminder: boolean): Promise<void> {
    if (!message.guild) {
        utils.send(message, "Please use this command in a server instead.");
        return;
    }

    const usage = `${utils.usage("reminder", "in 1d10h20m It is time!")}\n` +
        "This would make me ping you saying \"It is time!\" in 1 day, 10 hours and 20 minutes from now.\n" +
        "You can use the units `year/y`, `month/mo`, `week/w`, `day/d`, `hour/h`, and `minute/m`.";

    if (args.length < 3) {
        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    const now = moment().tz(utils.userTz()), nowUtc = moment(now).utc().valueOf();
    const parsedDate = parseRelativeTime(now, args[1]);

    if (!parsedDate.valid) {
        utils.send(message, `This time seems to be invalid. Try something like:\n${usage}`);
        return;
    }

    const dateUtc = moment(parsedDate.date).utc().valueOf();
    const text = args.slice(2).join(" ");

    if (text.length > 1000) {
        utils.send(message, `That message is way too long!`);
        return;
    }

    if (dateUtc - nowUtc < 60 * 1000) {
        utils.send(message, `1 minute into the future is the earliest you can set a reminder to!`);
        return;
    }

    if (dateUtc - nowUtc > 365 * 24 * 60 * 60 * 1000) {
        utils.send(message, `1 year into the future is the latest you can set a reminder to!`);
        return;
    }

    const reminder: data.Reminder = {
        isPeriodic,
        text,
        timestamp: dateUtc,
        authorId: message.author.id,
        channelId: message.channel.id
    };

    if (isPeriodic) {
        reminder.name = args[0];
        reminder.rawTime = args[1];
        reminder.timeValues = parsedDate.timeValues;
    }

    await data.setReminder(reminder);

    if (isPeriodic) {
        utils.send(message, `Your reminder named '${reminder.name}' will repeat every ${reminder.rawTime}!`);
    } else if (echoReminder) {
        utils.send(message, `Your reminder '${reminder.text}' has been set for ${parsedDate.date.format("dddd, MMMM Do YYYY, HH:mm")}!`);
    } else {
        utils.send(message, `Your reminder has been set for ${parsedDate.date.format("dddd, MMMM Do YYYY, HH:mm")}!`);
    }
}

function parseAbsoluteTime(absoluteTime: string): {valid: boolean, date?: moment.Moment} {
    if (!/[\d]{2}\/[\d]{2}\/[\d]{4} [\d]{2}:[\d]{2}/g.test(absoluteTime)) {
        return {valid: false};
    }

    const date = moment.tz(absoluteTime, "DD/MM/YYYY HH:mm", utils.userTz());

    return {valid: true, date};
}

async function buildAbsoluteTimeReminder(message: discord.Message, args: string[]): Promise<void> {
    if (!message.guild) {
        utils.send(message, "Please use this command in a server instead.");
        return;
    }

    const usage = `${utils.usage("reminder", "at 31/01/2030 00:45 It is time!")}\n` +
        "This would make me ping you saying \"It is time!\" at exactly that date.\n" +
        "This uses the bot owner's timezone.";

    if (args.length < 4) {
        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    const now = moment().tz(utils.userTz()), nowUtc = moment(now).utc().valueOf();
    const parsedDate = parseAbsoluteTime(`${args[1]} ${args[2]}`);

    if (!parsedDate.valid) {
        utils.send(message, `This time seems to be invalid. Try something like:\n${usage}`);
        return;
    }

    const dateUtc = moment(parsedDate.date).utc().valueOf();
    const text = args.slice(3).join(" ");

    if (text.length > 1000) {
        utils.send(message, `That message is way too long!`);
        return;
    }

    if (dateUtc - nowUtc < 60 * 1000) {
        utils.send(message, `1 minute into the future is the earliest you can set a reminder to!`);
        return;
    }

    if (dateUtc - nowUtc > 365 * 24 * 60 * 60 * 1000) {
        utils.send(message, `1 year into the future is the latest you can set a reminder to!`);
        return;
    }

    const reminder: data.Reminder = {
        isPeriodic: false,
        text,
        timestamp: dateUtc,
        authorId: message.author.id,
        channelId: message.channel.id
    };

    await data.setReminder(reminder);

    const relativeTime = utils.getRelativeTimeString(now, parsedDate.date);
    utils.send(message, `Your reminder has been set for ${parsedDate.date.format("dddd, MMMM Do YYYY, HH:mm")}! \`(in ${relativeTime})\``);
}
