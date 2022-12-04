import * as utils from './utils';
import * as discord from 'discord.js';
import * as data from "./data";
import * as events from "./events";

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

export function invite(message: discord.Message): void {
    if (!utils.isOwner(message)) {
        utils.send(message, "You must be a bot owner to use this command!");
        return;
    }

    const link = `https://discordapp.com/oauth2/authorize?client_id=${process.env.BOT_ID}` +
                 `&scope=bot&permissions=${process.env.BOT_PERMS}`;

    utils.send(message, `Here you go!\n\n${link}`);
}
