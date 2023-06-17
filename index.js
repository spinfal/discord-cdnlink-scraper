// Import necessary modules
const Discord = require("discord.js-selfbot-v13");
const fs = require("fs");
const config = require("./config.json");
const plog = require("log-beautify");

const client = new Discord.Client({
  shards: "auto",
  checkUpdate: false,
  syncStatus: true,
  rejectOnRateLimit: ["/channels"],
});
const PREFIX = config.prefix;

plog.info("Logging in...");
client.once("ready", () => {
  console.clear();
  plog.success(`Logged in as ${ client.user.username } (${ client.user.discriminator == "0" ? client.user.id : `#${ client.user.discriminator }` })`);
});

// This function fetches messages in batches of 100 until it has fetched the number of messages specified by "limit",
// or until there are no more messages to fetch.
async function fetchMessages(channel, limit = 200) {
  let sum_messages = []; // Array to hold all fetched messages
  let last_id; // ID of the last fetched message

  // Keep fetching messages until the desired number is reached or no more messages are available
  while (true) {
    const options = {limit: 100}; // Options to pass to the fetch method
    if (last_id) {
      options.before = last_id; // If there is a "last_id", fetch messages that were sent before it
    }

    const messages = await channel.messages.fetch(options); // Fetch the messages
    sum_messages.push(...Array.from(messages.values())); // Add the fetched messages to the "sum_messages" array
    last_id = messages.last().id; // Update the "last_id"

    // Stop fetching if less than 100 messages were returned (meaning there are no more messages in the channel)
    // or if the desired number of messages has been reached
    if (messages.size != 100 || sum_messages.length >= limit) {
      break;
    }
  }

  return sum_messages;
}

// The "message" event triggers whenever a new message is sent in a server the bot has access to.
client.on("messageCreate", async message => {
  // This if statement checks if the message starts with the defined PREFIX, and if it doesn"t come from another bot.
  // If either of these conditions is not met, the function returns and stops processing the message.
  if (!message.content.startsWith(PREFIX) || message.author.id !== client.user.id || message.author.bot) return;

  // The "args" constant holds an array of all the "arguments" in the command,
  // which are the words in the message that come after the PREFIX.
  // The "command" constant is the first argument, and is converted to lower case for consistency.
  const args = message.content.slice(PREFIX.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  const videosOnly = config.videosOnly ?? false;

  // The "messageLimit" constant is the number of messages to fetch.
  // If an argument was provided (i.e., args[0] exists), it will be used as the message limit.
  // If not, the default and max allowed limit placed by Discord of 100 will be used.
  const messageLimit = config.messageLimit ?? 100;

  if (messageLimit > 300) plog.warn("Constantly fetching large amounts of messages may cause you and/or the bot to hit Discord's rate limit.");

  // Check if the command is the one specified in the configuration.
  if (command === config.command) {
    let links = [];

    // Fetch a certain number of messages from the channel.
    plog.info(`\nFetching ${ messageLimit } messages...`);
    fetchMessages(message.channel, messageLimit)
      .then(messages => {

        // The messages are processed in reverse order (from newest to oldest) and for each message...
        messages.reverse().forEach(msg => {

          // A regular expression is used to find links from cdn.discordapp.com or media.discordapp.net in the content.
          const regex = /(https?:\/\/(cdn|media)\.discordapp\.(com|net)\/\S+)/g;
          const found = msg.content.match(regex);

          // If one or more links are found, they are added to the "links" array.
          if (found) {
            links = links.concat(found);
            plog.info(`Found a link: ${ found } (total: ${ links.length })`);
          }

          // Check message attachments for links
          msg.attachments.each(attachment => {
            links.push(attachment.url);
            plog.info(`Found an attachment: ${ attachment.url } (total: ${ links.length })`);
          });
        });

        // Check if the found link includes keywords from the config exclude list
        plog.debug("Checking links for excluded keywords...");
        if (links) {
          if (videosOnly ?? false) {
            links = links.filter(link => {
              const fileExtension = link.split(".").pop().toLowerCase();
              const isVideoFormat = config.videoFormats.includes(fileExtension);
              if (!isVideoFormat) {
                plog.error(`Removing link: ${ link } (not a video file)`);
              }
              return isVideoFormat;
            });
          }

          links = links.filter(link => {
            for (const keyword of config.excludeKeywords) {
              if (link.includes(keyword)) {
                plog.error(`Removing link: ${ link } (keyword: ${ keyword })`);
                return false;
              }
            }
            return true;
          });
        }

        // After all messages have been checked, the links are saved to a text file.
        const fileName = `${config.outputFolder}/discord_cdn_links.txt`;
        plog.debug(`Checking for dupelicate links in ${ fileName }...`);

        let uniqueLinks;
        if (links.length > 0) {
          let existingLinks = [];

          // Check if file already exists
          if (fs.existsSync(fileName)) {
            // Read the existing file
            const fileContent = fs.readFileSync(fileName, 'utf8');
            // Split the file content into an array of lines (each line is a link)
            existingLinks = fileContent.split('\n');
          }

          // Only keep new links that are not already in the existing links
          uniqueLinks = links.filter(link => !existingLinks.includes(link));

          // Append the new unique links to the existing file (or create a new file if it doesn't exist)
          if (uniqueLinks.length > 0) {
            fs.appendFileSync(fileName, uniqueLinks.join('\n') + '\n');
            plog.debug(`Added ${ uniqueLinks.length } new links to ${ fileName }`);
          } else {
            plog.debug(`No new links to add to ${ fileName }`);
          }
        }

        // Check if the txt file exists
        if (fs.existsSync(fileName)) {
          plog.success(`Scrape completed and links saved to ${ fileName }\nTotal links found: ${ links.length }\nNew links found: ${ uniqueLinks.length }\n`);
        } else {
          plog.warn(`Scrape completed but no links were found.`);
        }
      })
      .catch((error) => {
        // console.error(error);
        plog.error(error); // If an error occurs during the fetch operation, it is logged to the console.
      });
  }
});

client.login(config.token);
