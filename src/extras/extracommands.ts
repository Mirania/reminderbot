import * as discord from 'discord.js';
import * as utils from '../utils';
import * as exutils from './extrautils';
import { self } from '..';

export function extras(message: discord.Message): void {
    const prefix = process.env.COMMAND;

    const embed = new discord.MessageEmbed()
        .setAuthor(`~~ You used the ${prefix}extras command! ~~`, self().user.avatarURL())
        .setColor("#FF0000")
        .setFooter("For more info, ask the bot owner!")
        .setTitle("Here's what secret stuff I can do:")
        .addField(`${prefix}s / ${prefix}sb`, "Create a speech bubble version of your attachments.");

    utils.sendEmbed(message, embed);
}

export const e = extras;
export const ex = extras;

async function speechBubble(message: discord.Message, args: string[]): Promise<void> {
    if (!utils.isOwner(message)) {
        return;
    }

    if (message.attachments.size < 1 || args.length > 2) {
        const usage = `${utils.usage("s", "gif left")}\n` +
            "The output format can be 'gif' or 'png'. The speech bubble tail can be 'left' or 'right'.\n" +
            "Also, these arguments are optional and can be provided in any order.\n" +
            "Remember to provide at least 1 image attachment with your command.";

        utils.send(message, `To set a reminder, you can type:\n${usage}`);
        return;
    }

    const format = (args[0]?.toLowerCase() === "gif" || args[1]?.toLowerCase() === "gif") ? "gif" : "png";
    const tail = (args[0]?.toLowerCase() === "left" || args[1]?.toLowerCase() === "left") ? "left" : "right";

    try {
        const promises: Promise<discord.MessageAttachment>[] = [];
        message.attachments.each(a => promises.push(exutils.drawSpeechBubble(a, format, tail)));
        await message.reply({ files: await Promise.all(promises) });
    } catch (e) {
        utils.send(message, `**An error happened:**\n${e}`);
    }
}

export const s = speechBubble;
export const sb = speechBubble;
