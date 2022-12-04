import * as discord from 'discord.js';;
import * as moment from 'moment-timezone';

/**
 * Sends a discord message to the channel determined by `context`. Catches and logs the event if it fails.
 */
export function send(
    context: discord.Message | discord.TextChannel | discord.DMChannel, 
    content: string
): Promise<discord.Message> {
    const channel = context instanceof discord.Message ? context.channel : context;

    return channel.send(content).catch((reason: string) => {
        let location = channel instanceof discord.DMChannel ?
            `${channel.recipient}'s DMs` : `#${channel.name}`;
        log(`[!] Error sending message to ${location}. ${reason}`);
        return context;
    }) as Promise<discord.Message>;
}

/**
 * Sends a discord embed to the same channel as `context`. Catches and logs the event if it fails.
 */
export function sendEmbed(
    context: discord.Message, 
    content: discord.MessageEmbed
): Promise<discord.Message> {
    return context.channel.send({ embed: content }).catch((reason: string) => {
        let location = context.channel instanceof discord.DMChannel ?
            `${context.author.username}'s DMs` : `#${context.channel.name}`;
        log(`[!] Error sending message to ${location}. ${reason}`);
        return context;
    }
    ) as Promise<discord.Message>;
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

/**
 * Prints a message to the console.
 */
export function log(text: string): void {
    console.log(`[${moment().format("DD-MM-YYYY HH:mm:ss")}] ${text}`);
}

/**
 * Pads a number for a date.
 */
export function pad(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
}

/**
 * Returns `user#1234 (nickname)` with appropriate fallbacks in case such information is missing.
 */
export function serverMemberName(member: discord.GuildMember): string {
    if (!member) return "someone unknown";
    if (!member.nickname) return `${member.user.username}#${member.user.discriminator}`;
    return `${member.nickname} (${member.user.username}#${member.user.discriminator})`;
}
