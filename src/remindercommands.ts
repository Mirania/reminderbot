import * as discord from 'discord.js';
import * as utils from './utils';
import * as data from './data';
import * as moment from 'moment-timezone';
import { self } from '.';
import { getBatteryStatus } from './battery';

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
        .addField(`${prefix}c / ${prefix}clear`, "Remove a periodic reminder.")
        .addField(`${prefix}b / ${prefix}battery`, "Check phone battery status.");

    utils.sendEmbed(message, embed);
}

export const h = help;

export function reminder(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        return;
    }

    const usage = `${utils.usage("reminder", "in/at date message")}\n` +
        "For relative time (in), 'date' should be something like 1d10h20m.\n\n" +
        "For absolute time (at), 'date' should be something like 30/01/2030 00:45. This uses the bot owner timezone.\n" +
        "- Time can be omitted - default will be 06:00.\n" +
        "- Year can also be omitted - default will be the current year.\n" +
        "- Day/month/year can be also be written as sun, sunday, mon, monday... this means the next sunday/monday/etc.";

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

export async function list(message: discord.Message): Promise<void> {
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

    const categories: { name: string, ends?: moment.Moment, npAnnounced?: boolean, pAnnounced?: boolean }[] = [
        { name: "Today", ends: moment(now).add(1, "day").set("hour", 0).set("minute", 0) },
        { name: "Tomorrow", ends: moment(now).add(2, "day").set("hour", 0).set("minute", 0) },
        { name: "Later" }
    ];

    let npMsgText = "";
    if (nonperiodic.length > 0) {
        nonperiodic.sort((r1, r2) => r1.timestamp - r2.timestamp);
        npMsgText += "**Non-periodic reminders:**\n";
        nonperiodic.forEach(np => {
            const next = moment.tz(np.timestamp, utils.userTz());
            const relativeTime = utils.getRelativeTimeString(now, next);
            const category = categories.find(cat => !cat.ends || cat.ends.isAfter(next));
            if (category && !category.npAnnounced) {
                category.npAnnounced = true;
                npMsgText += `============== ${category.name} ==============\n`;
            }
            npMsgText += `➜ '${np.text}' at ${next.format("dddd, MMMM Do YYYY, HH:mm")} \`(in ${relativeTime})\`\n`;
        });
    }

    let pMsgText = "";
    if (periodic.length > 0) {
        pMsgText += "**Periodic reminders:**\n";
        periodic.sort((r1, r2) => r1.timestamp - r2.timestamp);
        periodic.forEach(p => {
            const next = moment.tz(p.timestamp, utils.userTz());
            const relativeTime = utils.getRelativeTimeString(now, next);
            const category = categories.find(cat => !cat.ends || cat.ends.isAfter(next));
            if (category && !category.pAnnounced) {
                category.pAnnounced = true;
                pMsgText += `============== ${category.name} ==============\n`;
            }
            pMsgText += `➜ \`${p.name}\`: '${p.text}' every ${p.rawTime} \`(next up in ${relativeTime})\`\n`;
        });
    }

    if (npMsgText.length > 0) {
        await utils.send(message, npMsgText.length > 1990 ? npMsgText.slice(0, 1990) + " (...)" : npMsgText);
    }
    if (pMsgText.length > 0) {
        pMsgText = "­\n" + pMsgText;
        await utils.send(message, pMsgText.length > 1990 ? pMsgText.slice(0, 1990) + " (...)" : pMsgText);
    }
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

export async function battery(message: discord.Message): Promise<void> {
    try {
        const status = await getBatteryStatus();
        utils.send(message, `The battery is currently at **${status.percentage}%** and is${status.isCharging ? " " : " **not** "}charging.`);
    } catch (e) {
        utils.send(message, `\`\`\`${e}\`\`\``);
    }
}

export const b = battery;

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

function convertAbsoluteTimeRawInput(dateArg: string, timeArg: string, now: moment.Moment): { converted: string, isTimeInputted: boolean } {
    let convertedDate = "invalid", convertedTime = "invalid", isTimeInputted = true;

    if (/^[A-Za-z]+$/.test(dateArg)) {
        let targetWeekday: number;
        switch (dateArg.toLowerCase()) {
            case "sun": case "sunday": targetWeekday = 0; break;
            case "mon": case "monday": targetWeekday = 1; break;
            case "tue": case "tuesday": targetWeekday = 2; break;
            case "wed": case "wednesday": targetWeekday = 3; break;
            case "thu": case "thursday": targetWeekday = 4; break;
            case "fri": case "friday": targetWeekday = 5; break;
            case "sat": case "saturday": targetWeekday = 6; break;
            default: targetWeekday = -1;
        }
        if (targetWeekday === -1) {
            convertedDate = "invalid";
        } else {
            const currentWeekday = now.weekday();
            convertedDate = moment(now).add(targetWeekday > currentWeekday ? targetWeekday - currentWeekday : targetWeekday + 7 - currentWeekday, "d").format("DD/MM/YYYY");
        }
    } else if (/^[\d]{2}\/[\d]{2}$/.test(dateArg)) {
        convertedDate = `${dateArg}/${now.year()}`;
    } else if (/^[\d]{2}\/[\d]{2}\/[\d]{4}$/.test(dateArg)) {
        convertedDate = dateArg;
    }

    if (/^[\d]{2}:[\d]{2}$/g.test(timeArg)) {
        convertedTime = timeArg;
    } else {
        convertedTime = "06:00";
        isTimeInputted = false;
    }

    return { converted: `${convertedDate} ${convertedTime}`, isTimeInputted };
}

async function buildAbsoluteTimeReminder(message: discord.Message, args: string[]): Promise<void> {
    if (!message.guild) {
        utils.send(message, "Please use this command in a server instead.");
        return;
    }

    const usage = `${utils.usage("reminder", "at 31/01/2030 00:45 It is time!")}\n` +
        "This would make me ping you saying \"It is time!\" at exactly that date.\n" +
        "This uses the bot owner's timezone.\n\n" +
        "Alternatively you could omit the 00:45 - the default time will be 06:00.\n" +
        "You could also omit the 2030 - the default year will be the current one.\n" +
        "Instead of 31/01/2030 you could also use sun, sunday, mon, monday... this means the next sunday/monday/etc.";

    if (args.length < 3) {
        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    const now = moment().tz(utils.userTz()), nowUtc = moment(now).utc().valueOf();
    const { converted, isTimeInputted } = convertAbsoluteTimeRawInput(args[1], args[2], now); 
    const parsedDate = parseAbsoluteTime(converted);

    if (!parsedDate.valid) {
        utils.send(message, `This time seems to be invalid. Try something like:\n${usage}`);
        return;
    }

    const dateUtc = moment(parsedDate.date).utc().valueOf();
    const text = args.slice(isTimeInputted ? 3 : 2).join(" ");

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
