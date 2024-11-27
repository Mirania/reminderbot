import * as discord from 'discord.js';
import * as utils from './utils';
import * as data from './data';
import * as moment from 'moment-timezone';
import { self } from '.';
import { getBatteryStatus } from './battery';
import { parseAbsoluteTime, parseRelativeTime } from './parsers';

export function help(message: discord.Message): void {
    const prefix = process.env.COMMAND;

    const embed = new discord.MessageEmbed()
        .setAuthor(`~~ You used the ${prefix}help command! ~~`, self().user.avatarURL())
        .setColor("#FF0000")
        .setFooter("For more info, ask the bot owner!")
        .setTitle("Here's what I can do:")
        .addField(`${prefix}r / ${prefix}reminder`, "Set a reminder.")
        .addField(`${prefix}pr / ${prefix}periodicreminder`, "Set a periodic reminder.")
        .addField(`${prefix}a / ${prefix}add / ${prefix}append`, "Append some text to an already existing reminder.")
        .addField(`${prefix}d / ${prefix}delay`, "Snooze a reminder; repeat it at some point in the future.")
        .addField(`${prefix}l / ${prefix}list`, "List all active reminders.")
        .addField(`${prefix}c / ${prefix}clear`, "Remove a periodic reminder.")
        .addField(`${prefix}t / ${prefix}timezone`, "Set the current timezone.")
        .addField(`${prefix}b / ${prefix}battery`, "Check phone battery status.")
        .addField(`${prefix}k / ${prefix}kill`, "Kill the current bot instance and restart it.");

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
        "- Day/month/year can be also be written as sun, sunday, mon, monday, today... this means the next sunday/monday/etc.\n" +
        "- Finally, `in` and `at` can be omitted - I'll try to guess which one you mean.";

    if (args.length < 2) {
        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    if (args[0] === "in") {
        buildRelativeTimeReminder(message, args, false, false);
    } else if (args[0] === "at") {
        buildAbsoluteTimeReminder(message, args);
    } else if (args[0]) {
        if (/^[A-Za-z]+$/.test(args[0]) || args[0].includes("/")) {
            buildAbsoluteTimeReminder(message, ["at", ...args]);
        } else {
            buildRelativeTimeReminder(message, ["in", ...args], false, false);
        }
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

    if (args.length < 2) {
        const usage = `${utils.usage("periodicreminder", "date message")}\n` +
            "The 'date' should be something like 1d10h20m.";

        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    buildRelativeTimeReminder(message, [null, ...args], true, false);
}

export const pr = periodicreminder;

export function delay(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        return;
    }

    const usage = `${utils.usage("delay", "date")}\n` +
        "The 'date' should be something like 1d10h20m or 01/01/2025 01:00.";

    if (args.length < 1) {
        utils.send(message, `To delay a reminder, you can type:\n${usage}`);
        return;
    }

    const toDelay = data.getLastReminderMessage();

    if (!toDelay) {
        utils.send(message, "There is no reminder to delay.");
        return;
    }

    if (/^[A-Za-z]+$/.test(args[0]) || args[0].includes("/")) {
        buildAbsoluteTimeReminder(message, ["at", ...args, toDelay]);
    } else {
        buildRelativeTimeReminder(message, ["in", ...args, toDelay], false, false);
    }
}

export const d = delay;

export function append(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        return;
    }

    if (args.length < 2) {
        const usage = `${utils.usage("append", "id text to append")}\n` +
            "The 'id' should be a number; it should be the id of some reminder.\n" +
            `Use ${process.env.COMMAND}list to check all ids.`;

        utils.send(message, `To append to a reminder, you can type:\n${usage}`);
        return;
    }

    const reminders = data.getReminders();

    let targetKey: string;
    for (const key in reminders) {
        if (reminders[key].id != null && reminders[key].id === Number(args[0])) {
            targetKey = key;
        }
    }

    if (!targetKey) {
        utils.send(message, `Did not find a reminder with that id. Use ${process.env.COMMAND}list to check all ids.`);
        return;
    }

    const updatedReminder = reminders[targetKey];
    const now = moment().tz(data.getTimezone());
    const next = moment.tz(updatedReminder.timestamp, data.getTimezone());
    const relativeTime = utils.getRelativeTimeString(now, next);

    updatedReminder.text += `\n┕ ${args.slice(1).join(" ")}`;
    data.updateReminder(targetKey, { text: updatedReminder.text });
    utils.send(message, `Updated the reminder '${updatedReminder.text.replace(/\n/g, " ")}' which will happen on ${next.format("dddd, MMMM Do YYYY, HH:mm")} \`(in ${relativeTime})\`!`);
}

export const a = append;
export const add = append;

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

    const now = moment().tz(data.getTimezone());

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
            const next = moment.tz(np.timestamp, data.getTimezone());
            const relativeTime = utils.getRelativeTimeString(now, next);
            const category = categories.find(cat => !cat.ends || cat.ends.isAfter(next));
            if (category && !category.npAnnounced) {
                category.npAnnounced = true;
                npMsgText += `============== ${category.name} ==============\n`;
            }
            npMsgText += `➜ \`${np.id}\`: '${np.text.replace(/\n/g, " ")}' at ${next.format("dddd, MMMM Do YYYY, HH:mm")} \`(in ${relativeTime})\`\n`;
        });
    }

    let pMsgText = "";
    if (periodic.length > 0) {
        pMsgText += "**Periodic reminders:**\n";
        periodic.sort((r1, r2) => r1.timestamp - r2.timestamp);
        periodic.forEach(p => {
            const next = moment.tz(p.timestamp, data.getTimezone());
            const relativeTime = utils.getRelativeTimeString(now, next);
            const category = categories.find(cat => !cat.ends || cat.ends.isAfter(next));
            if (category && !category.pAnnounced) {
                category.pAnnounced = true;
                pMsgText += `============== ${category.name} ==============\n`;
            }
            pMsgText += `➜ \`${p.id}\`: '${p.text.replace(/\n/g, " ")}' every ${p.rawTime} \`(next up in ${relativeTime})\`\n`;
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
        const usage = `${utils.usage("clear", "id")}\n` +
            "The 'id' should be a number; it should be the id of some reminder.\n" +
            `Use ${process.env.COMMAND}list to check all ids.`;

        utils.send(message, `To clear a reminder, you can type:\n${usage}`);
        return;
    }

    const reminders = data.getReminders();

    let targetKey: string;
    for (const key in reminders) {
        if (reminders[key].id != null && reminders[key].id === Number(args[0])) {
            targetKey = key;
        }
    }

    if (!targetKey) {
        utils.send(message, `Did not find a reminder with that id. Use ${process.env.COMMAND}list to check all ids.`);
        return;
    }

    const deletedReminder = reminders[targetKey];
    const now = moment().tz(data.getTimezone());
    const next = moment.tz(deletedReminder.timestamp, data.getTimezone());
    const relativeTime = utils.getRelativeTimeString(now, next);

    delete reminders[targetKey];
    data.deleteReminder(targetKey);
    utils.send(message, `Deleted the reminder '${deletedReminder.text.replace(/\n/g, " ")}' which would've happened on ${next.format("dddd, MMMM Do YYYY, HH:mm")} \`(in ${relativeTime})\`!`);
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

export async function kill(message: discord.Message): Promise<void> {
    try {
        await utils.send(message, "Restarting...");
        process.exit(1000);
    } catch (e) {
        utils.send(message, `\`\`\`${e}\`\`\``);
    }
}

export const k = kill;

export async function timezone(message: discord.Message, args: string[]): Promise<void> {
    if (!utils.isOwner(message)) {
        return;
    }

    const usage = `${utils.usage("timezone", "the timezone name")}\n` +
        "The name can contain multiple words and doesn't need to perfectly match a Moment timezone.\n" +
        "If there is no direct match, I'll try to infer a timezone with a similar name.";

    if (args.length < 1) {
        const current = `The current timezone is \`${data.getTimezone()}\`.\n` +
            `The time there is ${moment.tz(data.getTimezone()).format("dddd, MMMM Do YYYY, HH:mm")}.`

        utils.send(message, `${current}\n\nTo set a timezone, you can type:\n${usage}`);
        return;
    }

    const query = args.join("_").toLowerCase();
    const match = utils.allTimezones().find(tz => tz.toLowerCase().includes(query));

    if (!match) {
        utils.send(message, "Could not find or partial match a timezone with that name.");
        return;
    }

    await data.setTimezone(match);
    utils.send(message, `Set your timezone to \`${data.getTimezone()}\`.\nThe time there is ${moment.tz(data.getTimezone()).format("dddd, MMMM Do YYYY, HH:mm")}.`);
}

export const t = timezone;

async function buildRelativeTimeReminder(message: discord.Message, args: string[], isPeriodic: boolean, echoReminder: boolean): Promise<void> {
    if (!message.guild) {
        utils.send(message, "Please use this command in a server instead.");
        return;
    }

    const usage = `${utils.usage("reminder", "in 1d10h20m It is time!")}\n` +
        "This would make me ping you saying \"It is time!\" in 1 day, 10 hours and 20 minutes from now.\n" +
        "You can use the units `year/y`, `month/mo`, `week/w`, `day/d`, `hour/h`, and `minute/m`.\n" +
        "You can also omit the `in`. If your input is correct I'll still know what to do.";

    if (args.length < 3) {
        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    const now = moment().tz(data.getTimezone()), nowUtc = moment(now).utc().valueOf();
    const parsedDate = parseRelativeTime(now, args[1], data.getTimezone());

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

    const id = await data.generateId();

    const reminder: data.Reminder = {
        isPeriodic,
        text,
        timestamp: dateUtc,
        authorId: message.author.id,
        channelId: message.channel.id,
        id
    };

    if (isPeriodic) {
        reminder.rawTime = args[1];
        reminder.timeValues = parsedDate.timeValues;
    }

    await data.setReminder(reminder);

    if (isPeriodic) {
        utils.send(message, `Your reminder with id \`${id}\` will repeat every ${reminder.rawTime}!`);
    } else if (echoReminder) {
        utils.send(message, `Your reminder with id \`${id}\` '${reminder.text.replace(/\n/g, " ")}' has been set for ${parsedDate.date.format("dddd, MMMM Do YYYY, HH:mm")}!`);
    } else {
        utils.send(message, `Your reminder with id \`${id}\` has been set for ${parsedDate.date.format("dddd, MMMM Do YYYY, HH:mm")}!`);
    }
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
        "Instead of 31/01/2030 you could also use sun, sunday, mon, monday... this means the next sunday/monday/etc.\n" +
        "You can also omit the `at`. If your input is correct I'll still know what to do.";

    if (args.length < 3) {
        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    const now = moment().tz(data.getTimezone()), nowUtc = moment(now).utc().valueOf();
    const parsedDate = parseAbsoluteTime(args[1], args[2], now, data.getTimezone());

    if (!parsedDate.valid) {
        utils.send(message, `This time seems to be invalid. Try something like:\n${usage}`);
        return;
    }

    const dateUtc = moment(parsedDate.date).utc().valueOf();
    const text = args.slice(parsedDate.isTimeInputted ? 3 : 2).join(" ");

    if (text.length > 1000) {
        utils.send(message, `That message is way too long!`);
        return;
    }

    if (dateUtc - nowUtc < 60 * 1000) {
        utils.send(message, `1 minute into the future is the earliest you can set a reminder to!`);
        return;
    }

    const id = await data.generateId();

    const reminder: data.Reminder = {
        isPeriodic: false,
        text,
        timestamp: dateUtc,
        authorId: message.author.id,
        channelId: message.channel.id,
        id
    };

    await data.setReminder(reminder);

    const relativeTime = utils.getRelativeTimeString(now, parsedDate.date);
    utils.send(message, `Your reminder with id \`${id}\` has been set for ${parsedDate.date.format("dddd, MMMM Do YYYY, HH:mm")}! \`(in ${relativeTime})\``);
}
