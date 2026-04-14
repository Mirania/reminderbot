import * as utils from './utils';
import * as discord from 'discord.js';
import * as data from "./data";
import * as events from "./events";
import * as moment from 'moment-timezone';
import { self } from '.';

export function check(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!", self());
        return;
    }

    events.announceReminders();
    utils.send(message, "'checkreminders' done.", self());
}

export function load(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!", self());
        return;
    }

    data.loadImmediate();
    utils.send(message, "'load' done.", self());
}

export function save(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!", self());
        return;
    }

    data.saveImmediate();
    utils.send(message, "'save' done.", self());
}

export function channel(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!", self());
        return;
    }

    data.setPreferredChannel(args[0]);
    utils.send(message, `Set pings channel to ${args[0] ?? 'mirror where each reminder is set'}.`, self());
}

export function backup(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!", self());
        return;
    }

    const allData = {
        reminders: data.getReminders(),
        config: {
            tz: data.getTimezone(),
            latestId: data.getLatestId(),
            channel: data.getPreferredChannel()
        }
    };

    const file = new discord.MessageAttachment(Buffer.from(JSON.stringify(allData, null, 4)), `backup ${moment().format("YYYY_MM_DD HH_mm")}.json`);
    utils.sendFile(message, file, self());
}

export function invite(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!", self());
        return;
    }

    const link = `https://discordapp.com/oauth2/authorize?client_id=${process.env.BOT_ID}` +
                 `&scope=bot&permissions=${process.env.BOT_PERMS}`;

    utils.send(message, `Here you go!\n\n${link}`, self());
}

export function split(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!", self());
        return;
    }

    const bot = self();
    const usage = `${utils.usage("split", "startdate enddate number")}\n` +
        "Start and end dates must be in DD/MM/YYYY format, e.g. `01/01/2025` or `1/2/2026` or `6/9/26`.\n" +
        "Value can be anything, e.g. `10.15`.\n" +
        "Years will default to the current year if not inputted.";

    if (args.length !== 3) {
        utils.send(message, `To use 'split', you can type:\n${usage}`, bot);
        return;
    }

    const dateRegex = /\d{1,2}\/\d{1,2}(\/\d{2,4})?/;
    let start = moment.tz(args[0], "DD/MM/YYYY", data.getTimezone());
    let end = moment.tz(args[1], "DD/MM/YYYY", data.getTimezone());
    let balance = Number(args[2]);

    if (!dateRegex.test(args[0]) || !dateRegex.test(args[1]) || !start.isValid() || !end.isValid() || start.isSameOrAfter(end) || isNaN(balance)) {
        utils.send(message, `The arguments don't make sense... to use 'split', you can type:\n${usage}`, bot);
        return;
    }

    const totalDaysDiff = end.diff(start, "days") + 1;
    const logs: string[] = [`From \`${start.format("MMMM Do YYYY")}\` to \`${end.format("MMMM Do YYYY")}\` there are \`${totalDaysDiff}\` full days. Splitting the balance:`];

    while (start.year() < end.year() || (start.year() === end.year() && start.month() <= end.month())) {
        let monthEnd = moment(start).add(1, "month").set("date", 1).add(-1, "day");
        if (monthEnd > end) monthEnd = end;

        const daysDiff = monthEnd.diff(start, "days") + 1;
        logs.push("* " + start.format("MMMM") + " --> " + (daysDiff / totalDaysDiff * balance).toFixed(2));

        start = start.add(1, "month").set("date", 1);
    }

    utils.send(message, logs.join("\n"), self());
}

