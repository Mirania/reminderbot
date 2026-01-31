import * as dotenv from 'dotenv'; dotenv.config({ path: 'env.txt' });
import * as data from '../data';
import * as moment from 'moment-timezone';

main();

async function main() {
    await data.init();

    const reminders = data.getReminders();
    for (const key in reminders) {
        const reminder = reminders[key];

        if (!reminder.debug) {
            const absoluteTimeString = moment.tz(reminder.timestamp, data.getTimezone()).format("dddd, MMMM Do YYYY, HH:mm");
            const debug = `${absoluteTimeString} ~~~~ ${data.getTimezone()}`;
            await data.updateReminder(key, { debug });
        }
    }

    console.log("Finished!");
    process.exit(0);
}
