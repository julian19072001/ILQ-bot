require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const { getActivity } = require("./commands/activity");
const { getXp } = require("./commands/xp");
const { getWars } = require("./commands/wars");
const { getRaids } = require("./commands/raids");
const { setAbsence, getAbsenceList } = require("./commands/absence");
const { setWhitelist, removeWhitelist, getWhitelistList } = require("./commands/whitelist");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"]
});

const PUBLIC_COMMANDS = [
  "1",
  "2",
  "3"
];

async function hasAccess(interaction) {
  const userId = interaction.user.id;
  const commandName = interaction.commandName;

  // Public commands always allowed
  if (PUBLIC_COMMANDS.includes(commandName)) {
    return true;
  }

  // Owner bypass
  if (userId === process.env.OWNER_USER_ID) {
    return true;
  }

  // Otherwise check guild + role
  try {
    const guild = await interaction.client.guilds.fetch(process.env.PERMISSION_GUILD_ID);
    const member = await guild.members.fetch(userId);

    return member.roles.cache.has(process.env.PERMISSION_ROLE_ID);
  } catch {
    return false;
  }
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const allowed = await hasAccess(interaction);

  if (!allowed) {
    return interaction.reply({
      content: "You don't have permission to use this command.",
      flags: 64
    });
  }

  if (interaction.commandName === "activity") return getActivity(interaction);
  if (interaction.commandName === "xp") return getXp(interaction);
  if (interaction.commandName === "wars") return getWars(interaction);
  if (interaction.commandName === "raids") return getRaids(interaction);
  if (interaction.commandName === "absence") {
    const sub = interaction.options.getSubcommand();

    if (sub === "set") return setAbsence(interaction);
    if (sub === "list") return getAbsenceList(interaction);
  }
  if (interaction.commandName === "whitelist") {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") return setWhitelist(interaction);
    if (sub === "remove") return removeWhitelist(interaction);
    if (sub === "list") return getWhitelistList(interaction);
  }
});

// COMMANDS
const commands = [
  new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Get a list of playtime of each guild member")
    .addStringOption(o =>
      o.setName("start")
        .setDescription("Start time <t:...>")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("end")
        .setDescription("End time <t:...>")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Get a list of the xp guild members have contributed")
    .addStringOption(o =>
      o.setName("start")
        .setDescription("Start time <t:...>")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("end")
        .setDescription("End time <t:...>")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("wars")
    .setDescription("Get a list of members that entered guild wars")
    .addStringOption(o =>
      o.setName("start")
        .setDescription("Start time <t:...>")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("end")
        .setDescription("End time <t:...>")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("raids")
    .setDescription("Get a list of all raids completed by guild members")

    .addStringOption(o =>
      o.setName("start")
        .setDescription("Start time <t:...>")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("end")
        .setDescription("End time <t:...>")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("raid")
        .setDescription("Optional raid type")
        .setRequired(false)
    ),

    new SlashCommandBuilder()
    .setName("absence")
    .setDescription("Manage absence system")
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set absence")
        .addStringOption(o =>
          o.setName("username")
            .setDescription("Minecraft name of player that will be given absense")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("until")
            .setDescription("Date when absense expires <t:...>")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("get absence list")
    ),

    new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Manage whitelist system")
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("add person to whitelist")
        .addStringOption(o =>
          o.setName("username")
            .setDescription("Minecraft name of player that will be given a whitelist")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("remove person from whitelist")
        .addStringOption(o =>
          o.setName("username")
            .setDescription("Minecraft name of player that will be given a whitelist")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("get whitelist list")
    )
];

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log("Commands registered");
})();

client.login(process.env.BOT_TOKEN);