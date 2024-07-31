const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch-commonjs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log('Bot is online!');
});

// For Greeting new members
client.on('guildMemberAdd', member => {
  const channel = member.guild.channels.cache.find(ch => ch.name === 'general');
  if (!channel) return;
  const defaultRole = member.guild.roles.cache.find(role => role.name === 'Member');
  member.roles.add(defaultRole).catch(console.error);
  channel.send(`Welcome to the server, ${member}! Please check the rules and enjoy your stay.`);
});

// For Providing server information
client.on('messageCreate', message => {
  if (message.content === '!serverinfo') {
    const { guild } = message;
    const serverInfo = `
      Server Name: ${guild.name}
      Total Members: ${guild.memberCount}
      Created On: ${guild.createdAt.toDateString()}
    `;
    message.channel.send(serverInfo);
  } else if (message.content === '!roles') {
    const roles = message.guild.roles.cache.map(role => role.name).join(', ');
    message.channel.send(`Roles: ${roles}`);
  } else if (message.content.startsWith('!userinfo')) {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild.members.resolve(user);
    const userInfo = `
      Username: ${user.username}
      ID: ${user.id}
      Joined Server: ${member.joinedAt.toDateString()}
      Roles: ${member.roles.cache.map(role => role.name).join(', ')}
    `;
    message.channel.send(userInfo);
  }
});

// For Kicking a User
client.on('messageCreate', message => {
  if (message.content.startsWith('!kick')) {
    if (!message.member.permissions.has('KICK_MEMBERS')) {
      return message.reply('You do not have permissions to use this command');
    }
    const user = message.mentions.users.first();
    if (user) {
      const member = message.guild.members.resolve(user);
      if (member) {
        member.kick('Optional reason').then(() => {
          message.reply(`Successfully kicked ${user.tag}`);
        }).catch(err => {
          message.reply('I was unable to kick the member');
          console.error(err);
        });
      } else {
        message.reply('That user isn\'t in this server!');
      }
    } else {
      message.reply('You didn\'t mention the user to kick!');
    }
  } else if (message.content.startsWith('!ban')) {
    if (!message.member.permissions.has('BAN_MEMBERS')) return message.reply('You do not have permissions to use this command');
    const user = message.mentions.users.first();
    if (user) {
      const member = message.guild.members.resolve(user);
      if (member) {
        member.ban({ reason: 'They were bad!' }).then(() => {
          message.reply(`Successfully banned ${user.tag}`);
        }).catch(err => {
          message.reply('I was unable to ban the member');
          console.error(err);
        });
      } else {
        message.reply('That user isn\'t in this server!');
      }
    } else {
      message.reply('You didn\'t mention the user to ban!');
    }
  } else if (message.content.startsWith('!mute')) {
    if (!message.member.permissions.has('MUTE_MEMBERS')) return message.reply('You do not have permissions to use this command');
    const user = message.mentions.users.first();
    if (user) {
      const member = message.guild.members.resolve(user);
      if (member) {
        const muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        member.roles.add(muteRole).then(() => {
          message.reply(`Successfully muted ${user.tag}`);
        }).catch(err => {
          message.reply('I was unable to mute the member');
          console.error(err);
        });
      } else {
        message.reply('That user isn\'t in this server!');
      }
    } else {
      message.reply('You didn\'t mention the user to mute!');
    }
  } else if (message.content.startsWith('!unmute')) {
    if (!message.member.permissions.has('MUTE_MEMBERS')) return message.reply('You do not have permissions to use this command');
    const user = message.mentions.users.first();
    if (user) {
      const member = message.guild.members.resolve(user);
      if (member) {
        const muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        member.roles.remove(muteRole).then(() => {
          message.reply(`Successfully unmuted ${user.tag}`);
        }).catch(err => {
          message.reply('I was unable to unmute the member');
          console.error(err);
        });
      } else {
        message.reply('That user isn\'t in this server!');
      }
    } else {
      message.reply('You didn\'t mention the user to unmute!');
    }
  }
});

// For Clearing message history
client.on('messageCreate', message => {
  if (message.content.startsWith('!clear')) {
    const args = message.content.split(' ').slice(1);
    const amount = parseInt(args[0]);
    if (isNaN(amount)) {
      return message.reply('The amount parameter isn\'t a number!');
    }
    if (amount > 100) {
      return message.reply('You can\'t delete more than 100 messages at once!');
    }
    if (amount < 1) {
      return message.reply('You have to delete at least 1 message!');
    }

    message.channel.bulkDelete(amount, true).catch(err => {
      message.reply('There was an error trying to delete messages in this channel!');
      console.error(err);
    });
  }
});

// For Pulling Jokes
client.on('messageCreate', async message => {
  if (message.content === '!joke') {
    const response = await fetch('https://icanhazdadjoke.com/', {
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    message.channel.send(data.joke);
  }
});

// For Pulling Memes
client.on('messageCreate', async message => {
  if (message.content === '!meme') {
    try {
      const response = await fetch('https://api.imgflip.com/get_memes');
      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch memes from Imgflip');
      }

      // Get a random meme from the API data
      const memes = data.data.memes;
      const randomMeme = memes[Math.floor(Math.random() * memes.length)];

      // Send the meme URL to the Discord channel
      message.channel.send(randomMeme.url);
    } catch (error) {
      console.error('Error fetching meme:', error);
      message.channel.send('Sorry, I couldn\'t fetch a meme right now.');
    }
  }
});

// For Creating A Poll
client.on('messageCreate', message => {
  if (message.content.startsWith('!poll')) {
    const args = message.content.split('"');
    const question = args[1];
    if (!question) return message.reply('Please provide a question.');
    message.channel.send(`📊 **Poll:** ${question}`).then(async pollMessage => {
      await pollMessage.react('👍');
      await pollMessage.react('👎');
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
