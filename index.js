// Import necessary modules
const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const plog = require('log-beautify');

const client = new Discord.Client();
const PREFIX = config.prefix;

client.once('ready', () => {
  console.clear();
  plog.info('Logging in...');
  plog.success(`Logged in as ${ client.user.tag }`);
});

// This function fetches messages in batches of 100 until it has fetched the number of messages specified by 'limit',
// or until there are no more messages to fetch.
async function fetchMessages(channel, limit = 200) {
  let sum_messages = []; // Array to hold all fetched messages
  let last_id; // ID of the last fetched message

  // Keep fetching messages until the desired number is reached or no more messages are available
  while (true) {
    const options = {limit: 100}; // Options to pass to the fetch method
    if (last_id) {
      options.before = last_id; // If there is a 'last_id', fetch messages that were sent before it
    }

    const messages = await channel.messages.fetch(options); // Fetch the messages
    sum_messages.push(...messages.array()); // Add the fetched messages to the 'sum_messages' array
    last_id = messages.last().id; // Update the 'last_id'

    // Stop fetching if less than 100 messages were returned (meaning there are no more messages in the channel)
    // or if the desired number of messages has been reached
    if (messages.size != 100 || sum_messages.length >= limit) {
      break;
    }
  }

  return sum_messages;
}

// The 'message' event triggers whenever a new message is sent in a server the bot has access to.
client.on('message', async message => {
  // This if statement checks if the message starts with the defined PREFIX, and if it doesn't come from another bot.
  // If either of these conditions is not met, the function returns and stops processing the message.
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  // The 'args' constant holds an array of all the 'arguments' in the command,
  // which are the words in the message that come after the PREFIX.
  // The 'command' constant is the first argument, and is converted to lower case for consistency.
  const args = message.content.slice(PREFIX.length).trim().split(' ');
  const command = args.shift().toLowerCase();

  const videosOnly = isNaN(args[0]) ? args.shift()?.toLowerCase() === 'true' : false;

  // The 'messageLimit' constant is the number of messages to fetch.
  // If an argument was provided (i.e., args[0] exists), it will be used as the message limit.
  // If not, the default and max allowed limit placed by Discord of 100 will be used.
  const messageLimit = args.length > 0 ? parseInt(args.shift()) : 100;
  let messageLimitWarning;

  if (messageLimit > 300) {
    plog.warn("Constantly fetching large amounts of messages may cause you and/or the bot to hit Discord's rate limit.");
    messageLimitWarning = await message.channel.send("Fetching large amounts of messages may cause you and/or the bot to hit Discord's rate limit. (this message will self destruct)");
  }

  if (command === "help") {
    message.channel.send("The only command available is `.scrape [videos only true/false] [amount of messages to scrape]`. Both are optional, and are not needed.");
  }

  // Check if the command is the one specified in the configuration.
  if (command === config.command) {
    // Make the bot show that it is typing.
    message.channel.startTyping();

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
        plog.debug("Checking links for excluded keywords...")
        if (links) {
          if (videosOnly ?? false) {
            links = links.filter(link => {
              const fileExtension = link.split('.').pop().toLowerCase();
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
        const fileName = `${ config.outputFolder }/discord_cdn_links-${ new Date().toISOString().slice(0, 10) }_${ Date.now() * message.channel.id.substring(15, 18) }.txt`;
        plog.debug(`Saving links to /${ fileName }...`);
        if (links.length > 0) fs.writeFileSync(fileName, links.join('\n'));

        // A message is sent in the channel to indicate that the scrape has been completed.
        const attachment = new Discord.MessageAttachment(fileName);

        // Check if the txt file exists
        if (fs.existsSync(fileName)) {
          plog.success(`Scrape completed and links saved to ${ fileName }\nTotal links found: ${ links.length }\n`);
          message.channel.send(`Scrape completed and links saved to \`/${ fileName }\`. Total links found: ${ links.length }`, attachment);
        } else {
          plog.warn(`Scrape completed but no links were found.`);
          message.channel.send(`Scrape completed but no links were found.`);
        }

        // Make the bot stop showing that it is typing.
        message.channel.stopTyping();
        setTimeout(async () => {
          messageLimitWarning ? await messageLimitWarning.delete() : null;
        }, 5000);
      })
      .catch((error) => {
        // console.error(error);
        plog.error(error); // If an error occurs during the fetch operation, it is logged to the console.
        message.channel.send(`An error occurred while fetching messages:\n\`${ error }\``);
        message.channel.stopTyping();
      });
  }
});

client.login(config.token);
