import * as utils from './utils';
import * as discord from 'discord.js';
import * as data from "./data";
import * as events from "./events";
import * as moment from 'moment-timezone';

export function checkreminders(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!");
        return;
    }

    events.announceReminders();
    utils.send(message, "'checkreminders' done.");
}

export function load(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!");
        return;
    }

    data.loadImmediate();
    utils.send(message, "'load' done.");
}

export function save(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!");
        return;
    }

    data.saveImmediate();
    utils.send(message, "'save' done.");
}

export function channel(message: discord.Message, args: string[]): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!");
        return;
    }

    data.setPreferredChannel(args[0]);
    utils.send(message, `Set pings channel to ${args[0] ?? 'mirror where each reminder is set'}.`);
}

export function backup(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!");
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
    utils.sendFile(message, file);
}

export function invite(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!");
        return;
    }

    const link = `https://discordapp.com/oauth2/authorize?client_id=${process.env.BOT_ID}` +
                 `&scope=bot&permissions=${process.env.BOT_PERMS}`;

    utils.send(message, `Here you go!\n\n${link}`);
}
