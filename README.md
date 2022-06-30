# Optionatoor

Arbitraging options AMMs for greater good.

## Build

```
yarn build
```

## Run

Update `.env` with the desired configuration, then run:
```
yarn start
```

## Discord

1. Follow [this guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot) to setup the bot as a Discord application.
2. Follow [this guide](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links) to invite the bot in the Discord server you want it to operate in.

    i. Scopes: `bot`, `application.commands`

    ii. Text permissions: `Send Messages`, `Send Messages in Threads`, `Embed Links`

3. Provide the id of the channel/thread that you want the bot to publish arbitrage opportunities in the bot configuration (`DISCORD_CHANNEL_ID`). If the channel/thread is private the bot needs to be granted access.

Example link (you will need your own `client_id`):

    https://discord.com/oauth2/authorize?client_id=<client_id>&permissions=274877925376&scope=bot%20applications.commands
