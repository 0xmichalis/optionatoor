import { Client, Intents, TextChannel, ThreadChannel } from 'discord.js';

import { sleep } from '../utils/utils';

class DiscordService {
    private channel: TextChannel | ThreadChannel | undefined;
    private client: Client;

    constructor() {
        this.client = new Client({ intents: [Intents.FLAGS.GUILDS] });

        // Handle shutdown gracefully
        const terminate = () => {
            this.client.destroy();
            console.log('Discord client shutdown.');
            process.exit(0);
        };
        process.on('SIGINT', terminate);
        process.on('SIGTERM', terminate);
    }

    async init(token: string, channelID: string): Promise<void> {
        console.log(`Discord token found. Logging into Discord channel ${channelID}...`);
        await this.client.login(token);
        while (!this.client.isReady()) {
            console.log('Waiting for Discord client to initialize...');
            await sleep(5);
        }

        const channel = await this.client.channels.fetch(channelID);
        if (!channel) throw new Error(`Failed to connect to Discord channel ${channelID}`);

        if (channel.isThread()) {
            console.log(`Channel ${channelID} is a thread.`);
            this.channel = channel as ThreadChannel;
        } else if (channel.isText()) {
            console.log(`Channel ${channelID} is text-based.`);
            this.channel = channel as TextChannel;
        } else {
            throw new Error(`Channel ${channelID} is not text-based or a thread!`);
        }
    }

    async send(message: string): Promise<void> {
        if (this.channel) await this.channel.send(message);
    }
}

export default DiscordService;
