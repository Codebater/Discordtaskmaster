require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { deployCommands } = require('./deploy-commands');
const taskManager = require('./taskManager');
const reminderService = require('./reminderService');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

client.commands = new Collection();

// Load command handlers
const commands = require('./commands');
for (const [name, command] of Object.entries(commands)) {
  client.commands.set(name, command);
}

client.once('ready', async () => {
  console.log(`✅ TaskBot is online as ${client.user.tag}`);
  await deployCommands(client);
  reminderService.start(client);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }
  } catch (err) {
    console.error(err);
    const reply = { content: '❌ An error occurred.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

async function handleButton(interaction) {
  const [action, ...params] = interaction.customId.split(':');
  const handlers = require('./buttonHandlers');
  if (handlers[action]) {
    await handlers[action](interaction, params);
  }
}

async function handleModal(interaction) {
  const [action, ...params] = interaction.customId.split(':');
  const handlers = require('./modalHandlers');
  if (handlers[action]) {
    await handlers[action](interaction, params);
  }
}

async function handleSelect(interaction) {
  const [action, ...params] = interaction.customId.split(':');
  const handlers = require('./selectHandlers');
  if (handlers[action]) {
    await handlers[action](interaction, params);
  }
}

client.login(process.env.DISCORD_TOKEN);
