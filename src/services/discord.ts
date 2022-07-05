import { Client, Intents, TextChannel, ThreadChannel } from 'discord.js';

import { sleep } from '../utils/utils';

class DiscordService {
    private discordChannel: TextChannel | ThreadChannel | undefined;
    private discordClient: Client;

    constructor() {
        this.discordClient = new Client({ intents: [Intents.FLAGS.GUILDS] });

        // Handle shutdown gracefully
        const terminate = () => {
            this.discordClient.destroy();
            console.log('Discord client shutdown.');
            process.exit(0);
        };
        process.on('SIGINT', terminate);
        process.on('SIGTERM', terminate);
    }

    async init(token: string, channelID: string): Promise<void> {
        console.log(`Discord token found. Logging into Discord channel ${channelID}...`);
        await this.discordClient.login(token);
        while (!this.discordClient.isReady()) {
            console.log('Waiting for Discord client to initialize...');
            await sleep(5);
        }

        const channel = await this.discordClient.channels.fetch(channelID);
        if (!channel) throw new Error(`Failed to connect to Discord channel ${channelID}`);

        if (channel.isThread()) {
            console.log(`Channel ${channelID} is a thread.`);
            this.discordChannel = channel as ThreadChannel;
        } else if (channel.isText()) {
            console.log(`Channel ${channelID} is text-based.`);
            this.discordChannel = channel as TextChannel;
        } else {
            throw new Error(`Channel ${channelID} is not text-based or a thread!`);
        }
    }

    async send(message: string): Promise<void> {
        if (this.discordChannel) await this.discordChannel.send(message);
    }
}

export default DiscordService;
