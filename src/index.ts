import * as dotenv from 'dotenv'; dotenv.config();
import * as discord from 'discord.js';
import * as handler from './handler';
import * as data from './data';
import * as utils from './utils';

const bot = new discord.Client({
    partials: ["MESSAGE", "CHANNEL"],
    ws: { intents: ["GUILDS", "GUILD_MESSAGES"] }
});
const botId = process.env.BOT_ID;
const prefix = process.env.COMMAND;

let isReady = false;
bot.login(process.env.BOT_TOKEN);

bot.on("ready", async () => {
    bot.user.setPresence({ activity: { name: "Reminder Bot - $help" }, status: "dnd" });
    await data.init();
    handler.handleEvents();
    isReady = true;
    utils.log("Bot is online.");
})

bot.on("message", (message) => {
    if (!isReady || message.author.id === botId) return;

    if (message.content.startsWith(prefix)) {
        handler.handleCommand(message);
    }
});

export function self(): discord.Client {
    return bot;
}