import * as utils from './utils';
import * as discord from 'discord.js';
import * as data from "./data";
import * as events from "./events";
import moment = require("moment-timezone");
import { self } from '.';
import { parseRelativeTime, relativeTimeRegex } from './parsers';

export function check(message: discord.Message): void {
    events.announceReminders();
    utils.send(message, "'checkreminders' done.", self());
}

export function load(message: discord.Message): void {
    data.loadImmediate();
    utils.send(message, "'load' done.", self());
}

export function save(message: discord.Message): void {
    data.saveImmediate();
    utils.send(message, "'save' done.", self());
}

export function channel(message: discord.Message, args: string[]): void {
    data.setPreferredChannel(args[0]);
    utils.send(message, `Set pings channel to ${args[0] ?? 'mirror where each reminder is set'}.`, self());
}

export function backup(message: discord.Message): void {
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
    const link = `https://discordapp.com/oauth2/authorize?client_id=${data.getSecrets().BOT_ID}` +
                 `&scope=bot&permissions=${data.getSecrets().BOT_PERMS}`;

    utils.send(message, `Here you go!\n\n${link}`, self());
}

export function logs(message: discord.Message): void {
    let logs = data.getLogHistory().join("\n");
    logs = logs.length > 1950 ? "..." + logs.slice(-1950) : logs;
    utils.send(message, `\`\`\`\n${logs}\`\`\``, self());
}

export function split(message: discord.Message, args: string[]): void {
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

export function convert(message: discord.Message, args: string[]): void {
    const bot = self();
    const usage = `${utils.usage("convert", "money-or-time")}\n` +
        `${utils.usage("convert", "money-or-time at rate")}\n` +
        "Money can be any number, e.g. `10.15`.\n" +
        "Time can be any relative time, e.g. `10h30m`.\n" +
        "The rate is optional, e.g. `10h30m at 25/h`, and a default value will be used if not provided.";

    if (args.length !== 1 && args.length !== 3) {
        utils.send(message, `To use 'convert', you can type:\n${usage}`, bot);
        return;
    }

    const rateRegex = /(\d+)\/h/;
    const rate = (args.length >= 3 && rateRegex.test(args[2])) ? Number(args[2].slice(0, -2)) : Number(data.getSecrets().HOUR_RATE);
    const now = moment().tz(data.getTimezone());

    if (args.length >= 3 && (!rateRegex.test(args[2]) || isNaN(rate) || !isFinite(rate) || rate < 0)) {
        utils.send(message, `The arguments don't make sense... to use 'convert', you can type:\n${usage}`, bot);
        return;
    }

    // time supplied, convert to money
    if (relativeTimeRegex.test(args[0])) {
        utils.log(`Based on '${args[0]}', assuming this is a conversion of time --> money.`);
        const parsed = parseRelativeTime(now, args[0], data.getTimezone());
        
        if (!parsed.valid) {
            utils.send(message, `The arguments don't make sense... to use 'convert', you can type:\n${usage}`, bot);
            return;
        }

        const diffMs = parsed.date.utc().valueOf() - now.utc().valueOf();
        const money = diffMs * rate / utils.hours(1);

        utils.send(message, `\`${args[0]}\` at \`${rate}/h\` is equivalent to **${prettyPrintMoney(money)}**!`, bot);
    }
    // money supplied, convert to time
    else {
        utils.log(`Based on '${args[0]}', assuming this is a conversion of money --> time.`);
        const parsed = Number(args[0]);

        if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
            utils.send(message, `The arguments don't make sense... to use 'convert', you can type:\n${usage}`, bot);
            return;
        }

        const diffMs = utils.hours(1) * parsed / rate;
        const time = utils.getRelativeTimeString(now, moment(now).add(diffMs, "milliseconds"));

        utils.send(message, `\`${prettyPrintMoney(parsed)}\` at \`${rate}/h\` is equivalent to **${time}**!`, bot);
    }
}

export const conv = convert;

// either 0 or 2 decimal places
function prettyPrintMoney(amount: number): string {
    amount = Math.round(amount * 100) / 100;
    if (Math.round(amount) === amount) {
        return `${amount}€`;
    }
    return `${amount.toFixed(2)}€`;
}

export function droprate(message: discord.Message, args: string[]): void {
    const bot = self();
    const usage = `${utils.usage("droprate", "rate attempts wincount")}\n` +
        "Rate can be a probability 0-1, a percentage or a fraction, e.g. `0.105`, `75%` or `1/25`.\n" +
        "Attempts is the amount of rolls, e.g. `123`.\n" +
        "Win count is the minimum number of wins, meaning you'll succeed at least this amount of times, e.g. `5`. Default is 1.";

    if (args.length < 2) {
        utils.send(message, `To use 'droprate', you can type:\n${usage}`, bot);
        return;
    }

    const fracRegex = /(\d+)\/(\d+)/;
    let rate = NaN;
    let attempts = Number(args[1]);
    let winCount = args.length > 2 ? Number(args[2]) : 1;

    if (fracRegex.test(args[0])) {
        utils.log(`Based on '${args[0]}', assuming the rate is a fraction.`);
        const match = args[0].match(fracRegex);
        rate = Number(match[1]) / Number(match[2]);
    } else if (args[0].endsWith("%")) {
        utils.log(`Based on '${args[0]}', assuming the rate is a percentage.`);
        rate = Number(args[0].slice(0, -1)) / 100;
    } else {
        utils.log(`Based on '${args[0]}', assuming the rate is a raw probability.`);
        rate = Number(args[0]);
    }

    if (isNaN(rate) || !isFinite(rate) || isNaN(winCount) || !isFinite(winCount) || winCount < 1 || isNaN(attempts) || !isFinite(attempts) || attempts < 1) {
        utils.send(message, `The arguments don't make sense... to use 'droprate', you can type:\n${usage}`, bot);
        return;
    }

    rate = utils.clamp(0, rate, 1);
    attempts = Math.round(attempts);
    winCount = Math.round(winCount);

    // P of 1+ wins = 1 - P0
    // P of 2+ wins = 1 - P0 - P1
    // and so on
    let probability = 1;
    for (let i = 0; i < winCount; i++) {
        // subtract the P of getting this exact amount (i) of wins
        probability -= combination(attempts, i) * Math.pow(rate, i) * Math.pow(1 - rate, attempts - i);
    }
    probability = utils.clamp(0, probability, 1);

    utils.send(message, `Given a droprate of \`${prettyPrintRawProbability(rate)}\` and \`${attempts}\` attempts, the chance of getting \`${winCount}+\` wins is **${prettyPrintRawProbability(probability)}**!`, bot);
}

export const drop = droprate;

// Helper function to calculate combinations (n choose k) safely
function combination(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let c = 1;
    for (let i = 1; i <= k; i++) {
        c = c * (n - (i - 1)) / i;
    }
    return c;
}

// up to 3 decimal places
function prettyPrintRawProbability(p: number): string {
    p *= 100;
    return `${Math.round(p * 1000) / 1000}%`;
}
