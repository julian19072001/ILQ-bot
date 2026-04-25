const { getDb } = require("../db/mysql");
const { parseDiscordTimestamp, parseDiscordDate } = require("../utils/time");
const { sendPaginatedEmbed } = require("../utils/pagination");
const { EmbedBuilder } = require("discord.js");

async function setAbsence(interaction) {
  const db = await getDb();

  const username = interaction.options.getString("username");
  const untilInput = interaction.options.getString("until");
  const until = parseDiscordTimestamp(untilInput);

  if (!username || !until) {
    return interaction.reply({
      content: "Missing username or invalid timestamp.",
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
      SET absent_until = ?, absent_from = ?
      WHERE username = ?
      `,
      [until, new Date(), username]
    );
  }

  return interaction.reply({
    content: `Absence set for **${username}** until ${parseDiscordDate(untilInput)}`,
  });
}

function toDateOnly(input) {
  const d = new Date(input);
  return d.toISOString().slice(0, 10);
}

function pad(str, length) {
  return str.length >= length
    ? str.slice(0, length)
    : str + " ".repeat(length - str.length);
}

function getDaysRemaining(until) {
  const now = new Date();
  const diff = new Date(until) - now;

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? `${days}d` : "0d";
}

async function getAbsenceList(interaction) {
  const db = await getDb();
  const now = new Date();

  const [rows] = await db.execute(
    `
    SELECT username, absent_until
    FROM setting_additional_info
    WHERE absent_until IS NOT NULL
      AND absent_until > ?
    ORDER BY absent_until ASC
    `,
    [now]
  );

  if (!rows.length) {
    return interaction.reply({
      content: "No active absences."
    });
  }

  // find longest username for alignment
  const maxNameLength = Math.max(...rows.map(r => r.username.length), 10);

  const lines = rows.map(r => {
    const name = pad(r.username, maxNameLength);
    const date = toDateOnly(r.absent_until);
    const remaining = getDaysRemaining(r.absent_until);

    return `${name}  ${date} (${remaining})`;
  });

  const description = "```\n" + lines.join("\n") + "\n```";

  const embed = new EmbedBuilder()
    .setTitle("Active Absences")
    .setDescription(description)
    .setColor(0xAA2222);

  return interaction.reply({
    embeds: [embed]
  });
}

module.exports = { setAbsence, getAbsenceList };