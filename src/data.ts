import * as db from './firebase-module';
import * as rot from './rotcrypt';

export type Reminder = {
    isPeriodic: boolean, // periodic? if yes, should renew once announced
    text: string, // reminder message
    timestamp: number, // unix time (ms) of target date
    authorId: string, // user to be pinged
    channelId: string, // destination channel
    id: number,
    times?: number; // limits the renewal of periodic reminders
    rawTime?: string, // used for periodic reminders
    timeValues?: { [unit: string]: number }, // used to renew a periodic reminder
    debug: string // debug string for easier reading when looking at the database
};

export type IdAndMessagePair = { id: number, message: string };

export type Secrets = {
    readonly COMMAND_PREFIX: string;
    readonly BOT_ID: string;
    readonly BOT_TOKEN: string;
    readonly BOT_PERMS: string;
    readonly OWNER_IDS: string[];
    readonly OWNER_TIMEZONE: string;
    readonly REMINDER_ROLE: string;
};

let reminders: { [key: string]: Reminder } = {};
let latestReminders: IdAndMessagePair[] = [];
let secrets: Secrets;

let latestId: number = -1;
const maxId: number = 5000;
const maxLatestRemindersLength = 20;

let timezone: string;
let preferredChannel: string;

export async function init(): Promise<void> {
    db.connect(process.env.FIREBASE_CREDENTIALS, process.env.FIREBASE_URL);
    await loadImmediate();
}

/**
 * Refreshes and loads everything.
 */
export async function loadImmediate(): Promise<void> {
    const rawSecrets: any = await db.get("env/reminderbot");
    secrets = {
        COMMAND_PREFIX: rawSecrets.COMMAND_PREFIX,
        BOT_ID: rot.decrypt(rawSecrets.BOT_ID, rawSecrets.ROT),
        BOT_TOKEN: rot.decrypt(rawSecrets.BOT_TOKEN, rawSecrets.ROT),
        BOT_PERMS: rawSecrets.BOT_PERMS,
        OWNER_IDS: rot.decrypt(rawSecrets.OWNER_IDS, rawSecrets.ROT).split(","),
        OWNER_TIMEZONE: rawSecrets.OWNER_TIMEZONE,
        REMINDER_ROLE: rawSecrets.REMINDER_ROLE
    };

    reminders = await db.get("reminders/") ?? {};
    latestReminders = await db.get("reminderconfig/latest") ?? [];
    latestId = await db.get("reminderconfig/latestId");
    timezone = await db.get("reminderconfig/timezone") ?? secrets.OWNER_TIMEZONE;
    preferredChannel = await db.get("reminderconfig/channel");
}

/**
 * Saves everything.
 */
export async function saveImmediate(): Promise<void> {
    await db.post("reminders/", reminders);
}

export async function updateReminder(key: string, reminderFields: Partial<Reminder>): Promise<void> {
    return await db.update(`reminders/${key}`, reminderFields);
}

export async function saveReminder(reminder: Reminder): Promise<string> {
    return await db.push("reminders/", reminder);
}

export async function saveReminders(reminders: { [key: string]: Reminder }): Promise<void> {
    await db.post("reminders/", reminders);
}

/**
 * Deletes the reminder in the cache and database.
 */
export async function deleteReminder(key: string | null | undefined): Promise<void> {
    if (!key) return;
    await db.remove(`reminders/${key}`);
    delete reminders[key];
}

export function getReminders(): { [key: string]: Reminder } {
    return reminders;
}

/**
 * Adds the reminder to the cache and database.
 */
export async function setReminder(reminder: Reminder): Promise<void> {
    reminders[await saveReminder(reminder)] = reminder;
}

export async function setReminderMessageAsAnnounced(reminder: IdAndMessagePair): Promise<void> {
    latestReminders.push(reminder);
    while (latestReminders.length > maxLatestRemindersLength) {
        latestReminders.shift();
    }
    await db.post("reminderconfig/latest", latestReminders);
}

export function getReminderKeyById(id: number | null): string | undefined {
    if (id == null) return undefined;

    for (const key in reminders) {
        if (reminders[key].id === id) {
            return key;
        }
    }
    
    return undefined;
}

export function getAnnouncedReminderMessage(id: number | null): IdAndMessagePair | undefined {
    return id != null ? latestReminders.find(r => r.id === id) : latestReminders[latestReminders.length - 1];
}

export function getUnannouncedReminderMessage(id: number | null): IdAndMessagePair | undefined {
    if (id == null) return undefined;
    const reminder = Object.values(reminders).find(r => r.id === id);
    return reminder != null ? {id, message: reminder.text} : undefined;
}

export function getSecrets(): Secrets {
    return secrets;
}

export async function setTimezone(tz: string): Promise<void> {
    timezone = tz;
    await db.post("reminderconfig/timezone", tz);
}

export function getTimezone(): string {
    return timezone;
}

export async function setPreferredChannel(channel: string | null | undefined): Promise<void> {
    preferredChannel = channel;
    await db.post("reminderconfig/channel", channel ?? null);
}

export function getPreferredChannel(): string | null {
    return preferredChannel;
}

export async function generateId(): Promise<number> {
    const newId = (++latestId) % (maxId + 1);
    await db.post("reminderconfig/latestId", newId);
    return newId;
}

export function getLatestId(): number {
    return latestId;
}

export function maxReminderLength(): number {
    return 1750;
}
