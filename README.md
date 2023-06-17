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
3. Duplicate [config.json.example](config.json.example) and rename it to `config.json` and fill in the values
4. Run the bot
```bash
pnpm start
```
5. Run the command
```
.scrape
```
Options for the command can be changed in [config.json.example](config.json.example)

## Want to see features added?
Open an issue or pull request and I'll take a look and see if I can add it.

## License
[GPL-3.0](LICENSE)\
Made by [spinfal](https://out.spin.rip/home)
