# A Discord bot that can scrape attachment links from a channel
Do I really need to explain???\
The code is probably a bit messy, but it works so :)

## Prerequisites
- [Node.js](https://nodejs.org/en/)
- [pnpm](https://pnpm.io/installation)
- [git](https://git-scm.com/downloads)

## How to use
1. Clone the repo
```bash
git clone https://github.com/spinfal/discord-cdnlink-scraper.git
```
2. Install dependencies
```bash
pnpm install
```
3. Create a Discord bot here: https://discord.com/developers/applications
  a. Enable the option shown in the image below
  ![Option to Enable: Message Content Intent](https://cdn.spin.rip/r/firefox_3037402965.png)

  b. Copy the token and invite the bot to your server using this link (add your bot's client ID): https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=274878008320&scope=bot
4. Duplicate [config.json.example](config.json.example) and rename it to `config.json` and fill in the values
5. Run the bot
```bash
pnpm start
```
6. Run the command
```
.scrape
```

## Want to see features added?
Open an issue or pull request and I'll take a look and see if I can add it.

## License
[MIT](LICENSE)\
Made by [spinfal](https://out.spin.rip/home)
