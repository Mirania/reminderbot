import * as dotenv from 'dotenv'; dotenv.config({ path: 'env.txt' });
import * as discord from 'discord.js';
import * as handler from './handler';
import * as data from './data';
import * as utils from './utils';
import * as moment from 'moment-timezone';

if (process.argv[2] !== "fromSh") {
    console.log("Make sure to run this bot using 'bash runner.sh' instead.");
    process.exit(123);
}

const bot = new discord.Client({
    partials: ["MESSAGE", "CHANNEL"],
    ws: { intents: ["GUILDS", "GUILD_MESSAGES"] }
});
const botId = process.env.BOT_ID;
const prefix = process.env.COMMAND;

let isReady = false;
let _loginTimestamp: moment.Moment;
bot.login(process.env.BOT_TOKEN);

bot.on("ready", async () => {
    bot.user.setPresence({ activity: { name: `Reminder Bot - ${prefix}help` }, status: "dnd" });
    await data.init();
    handler.handleEvents();
    isReady = true;
    _loginTimestamp = moment().tz(data.getTimezone());
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

export function loginTimestamp(): moment.Moment {
    return _loginTimestamp;
}
