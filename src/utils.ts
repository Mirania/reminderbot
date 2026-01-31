import * as discord from 'discord.js';
import * as moment from 'moment-timezone';
import { getTimezone } from './data';

/**
 * Sends a discord message to the channel determined by `context`.
 */
export function send(
    context: discord.Message | discord.TextChannel | discord.DMChannel, 
    content: string, 
    bot: discord.Client
): Promise<discord.Message> {
    if (bot.ws.status !== 0) {
        const errorMessage = `Failed to send message due to websocket status ${bot.ws.status}.`;
        log(`[!] ${errorMessage}`);
        return Promise.reject(errorMessage);
    }

    const channel = context instanceof discord.Message ? context.channel : context;

    return channel.send(content).catch((reason: string) => {
        let location = channel instanceof discord.DMChannel ?
            `${channel.recipient}'s DMs` : `#${channel.name}`;
        const errorMessage = `[!] Error sending message to ${location}. ${reason}`;
        log(errorMessage);
        return Promise.reject(errorMessage);
    });
}

/**
 * Sends a discord embed to the same channel as `context`.
 */
export function sendEmbed(
    context: discord.Message, 
    content: discord.MessageEmbed,
    bot: discord.Client
): Promise<discord.Message> {
    if (bot.ws.status !== 0) {
        const errorMessage = `Failed to send message due to websocket status ${bot.ws.status}.`;
        log(`[!] ${errorMessage}`);
        return Promise.reject(errorMessage);
    }

    return context.channel.send({ embed: content }).catch((reason: string) => {
        let location = context.channel instanceof discord.DMChannel ?
            `${context.author.username}'s DMs` : `#${context.channel.name}`;
        const errorMessage = `[!] Error sending message to ${location}. ${reason}`;
        log(errorMessage);
        return Promise.reject(errorMessage);
    });
}

/**
 * Sends a file to the same channel as `context`.
 */
export function sendFile(
    context: discord.Message,
    file: discord.MessageAttachment,
    bot: discord.Client
): Promise<discord.Message> {
    if (bot.ws.status !== 0) {
        const errorMessage = `Failed to send message due to websocket status ${bot.ws.status}.`;
        log(`[!] ${errorMessage}`);
        return Promise.reject(errorMessage);
    }

    return context.channel.send({ files: [file] }).catch((reason: string) => {
        let location = context.channel instanceof discord.DMChannel ?
            `${context.author.username}'s DMs` : `#${context.channel.name}`;
        const errorMessage = `[!] Error sending message to ${location}. ${reason}`;
        log(errorMessage);
        return Promise.reject(errorMessage);
    });
}

/**
 * Finds a guild by id, returning `undefined` if none could be found.
 */
export async function getIfExists(manager: discord.GuildManager, id: string): Promise<discord.Guild>;
/**
 * Finds a guild member by id, returning `undefined` if none could be found.
 */
export async function getIfExists(manager: discord.GuildMemberManager, id: string): Promise<discord.GuildMember>;
/**
 * Finds a channel by id, returning `undefined` if none could be found.
 */
export async function getIfExists(manager: discord.ChannelManager, id: string): Promise<discord.Channel>;
/**
 * New discord API is awful.
 */
export async function getIfExists(manager: any, id: string): Promise<any> {
    try {
        return await manager.fetch(id);
    } catch (e) { } // ignore and return undefined
}

/**
 * Returns formatted text about command usage.
 */
export function usage(commandName: string, argSyntax?: string): string {
    return `\`\`\`bash\n${process.env.COMMAND}${commandName} ${argSyntax ? argSyntax : ""}\`\`\``;
}

/**
 * Check if message was posted in a guild and by an admin.
 */
export function isAdmin(message: discord.Message): boolean {
    return message.guild && message.member.hasPermission("ADMINISTRATOR");
}

/**
 * Check if message was posted by the bot owner.
 */
export function isOwner(message: discord.Message): boolean {
    return process.env.OWNER_ID === message.author.id;
}

/**
 * Returns a chat mention of a user.
 */
export function mentionUser(userId: string): string {
    return `<@${userId}>`;
}

/**
 * Returns a chat mention of a channel.
 */
export function mentionChannel(channelId: string): string {
    return `<#${channelId}>`;
}

/**
 * Returns an amount of minutes in ms.
 */
export function minutes(amount: number): number {
    return amount * 60 * 1000;
}

/**
 * Returns an amount of seconds in ms.
 */
export function seconds(amount: number): number {
    return amount * 1000;
}

const timezones = moment.tz.names();

/**
 * Gets all valid timezones.
 */
export function allTimezones(): string[] {
    return timezones;
}

/**
 * Prints a message to the console.
 */
export function log(text: string): void {
    console.log(`[${moment().tz(getTimezone()).format("DD-MM-YYYY HH:mm:ss")}] ${text}`);
}

/**
 * Pads a number for a date.
 */
export function pad(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
}

/**
 * Clamps a number.
 */
export function clamp(min: number, value: number, max: number): number {
    return value < min ? min : value > max ? max : value; 
}

/**
 * Returns `user#1234 (nickname)` with appropriate fallbacks in case such information is missing.
 */
export function serverMemberName(member: discord.GuildMember): string {
    if (!member) return "someone unknown";
    if (!member.nickname) return `${member.user.username}#${member.user.discriminator}`;
    return `${member.nickname} (${member.user.username}#${member.user.discriminator})`;
}

export function getRelativeTimeString(past: moment.Moment, future: moment.Moment) {
    const a = moment(past).tz(getTimezone()), b = moment(future).tz(getTimezone());

    const monthDiff = b.diff(a, "months");
    if (monthDiff > 0) {
        a.add(monthDiff, "months");
    }
    const dayDiff = b.diff(a, "days");
    if (dayDiff > 0) {
        a.add(dayDiff, "days");
    }
    const hourDiff = b.diff(a, "hours");
    if (hourDiff > 0) {
        a.add(hourDiff, "hours");
    }
    const minuteDiff = b.diff(a, "minutes");
    if (minuteDiff > 0) {
        a.add(minuteDiff, "minutes");
    }

    // could make this a lot prettier/smarter but it's easier to debug this way
    if (monthDiff > 0) {
        if (dayDiff > 0) return `${prepareTimeUnit('month', monthDiff)} and ${prepareTimeUnit('day', dayDiff)}`;
        return prepareTimeUnit('month', monthDiff);
    }
    if (dayDiff > 0) {
        if (dayDiff > 2 || (hourDiff === 0 && minuteDiff === 0)) return prepareTimeUnit('day', dayDiff);
        if (hourDiff > 0 && minuteDiff === 0) return `${prepareTimeUnit('day', dayDiff)} and ${prepareTimeUnit('hour', hourDiff)}`;
        if (hourDiff === 0 && minuteDiff > 0) return `${prepareTimeUnit('day', dayDiff)} and ${prepareTimeUnit('minute', minuteDiff)}`;
        return `${prepareTimeUnit('day', dayDiff)}, ${prepareTimeUnit('hour', hourDiff)} and ${prepareTimeUnit('minute', minuteDiff)}`;
    }
    if (hourDiff > 0) {
        if (minuteDiff > 0) return `${prepareTimeUnit('hour', hourDiff)} and ${prepareTimeUnit('minute', minuteDiff)}`;
        return prepareTimeUnit('hour', hourDiff);
    }
    if (minuteDiff > 0) {
        return prepareTimeUnit('minute', minuteDiff);
    }
    return "less than a minute";
}

function prepareTimeUnit(word: string, amount: number) {
    return `${amount} ${amount > 1 ? `${word}s` : word}`;
}

export function chunk(input: string, length: number) {
    let chunks: string[] = [], i = 0, n = input.length;

    while (i < n) {
        chunks.push(input.slice(i, i += length));
    }

    return chunks;
}
