const { getDb } = require("../db/mysql");
const { parseDiscordTimestamp, parseDiscordDate } = require("../utils/time");
const { sendPaginatedEmbed } = require("../utils/pagination");
const { EmbedBuilder } = require("discord.js");

async function setWhitelist(interaction) {
  const db = await getDb();

  const username = interaction.options.getString("username");

  if (!username) {
    return interaction.reply({
      content: "Missing username",
      flags: 64
    });
  }

  const [[existing]] = await db.execute(
    `
    SELECT username
    FROM setting_additional_info
    WHERE username = ?
    LIMIT 1
    `,
    [username]
  );

  if (!existing) {
    return interaction.reply({
        content: `**${username}** could not be found in the database!`,
        flags: 64
    });
  } else {
    await db.execute(
      `
      UPDATE setting_additional_info
      SET immune = true
      WHERE username = ?
      `,
      [username]
    );
  }

  return interaction.reply({
    content: `Added **${username}** to the whitelist`,
  });
}

async function removeWhitelist(interaction) {
  const db = await getDb();

  const username = interaction.options.getString("username");

  if (!username) {
    return interaction.reply({
      content: "Missing username",
      flags: 64
    });
  }

  const [[existing]] = await db.execute(
    `
    SELECT username
    FROM setting_additional_info
    WHERE username = ?
    LIMIT 1
    `,
    [username]
  );

  if (!existing) {
    return interaction.reply({
        content: `**${username}** could not be found in the database!`,
        flags: 64
    });
  } else {
    await db.execute(
      `
      UPDATE setting_additional_info
      SET immune = false
      WHERE username = ?
      `,
      [username]
    );
  }

  return interaction.reply({
    content: `Removed **${username}** to the whitelist`,
  });
}

function pad(str, length) {
  return str.length >= length
    ? str.slice(0, length)
    : str + " ".repeat(length - str.length);
}

async function getWhitelistList(interaction) {
  const db = await getDb();

  const [rows] = await db.execute(
    `
    SELECT username
    FROM setting_additional_info
    WHERE immune is TRUE
    `
  );

  if (!rows.length) {
    return interaction.reply({
      content: "No active whitelist."
    });
  }

  const maxNameLength = Math.max(...rows.map(r => r.username.length), 10);

  const lines = rows.map(r => {
    const name = pad(r.username, maxNameLength);
    return `${name}`;
  });

  const description = "```\n" + lines.join("\n") + "\n```";

  const embed = new EmbedBuilder()
    .setTitle("Current people on the whitelist")
    .setDescription(description)
    .setColor(0x22AA22);

  return interaction.reply({
    embeds: [embed]
  });
}

module.exports = { setWhitelist, removeWhitelist, getWhitelistList };