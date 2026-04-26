const { getDb, getAllUserTables } = require("../db/mysql");
const { parseDiscordTimestamp } = require("../utils/time");
const { sendPaginatedEmbed } = require("../utils/pagination");

function formatPlaytime(hoursFloat) {
  if (typeof hoursFloat !== "number" || isNaN(hoursFloat)) return "0h 0m";

  const totalMinutes = Math.round(hoursFloat * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return `${h}h ${m}m`;
}

function formatLine(u) {
  const name = u.name.slice(0, 25).padEnd(25, " ");
  let value = null;

  if(name === "Playtime".slice(0, 25).padEnd(25, " ")){
    value = formatPlaytime(u.value).padStart(12, " ");
  }
  else {
    value = String(u.value).padStart(12, " ")
  }

  return `${name} | ${value}`;
}

async function getUUIDFromUsername(db, username) {
  const [rows] = await db.execute(
    `
    SELECT uuid
    FROM setting_additional_info
    WHERE username = ?
    LIMIT 1
    `,
    [username]
  );

  if (!rows || rows.length === 0) return null;

  return rows[0].uuid.replace(/-/g, "_");
}

async function getPlayerStats(interaction) {
  const db = await getDb();
  const tables = await getAllUserTables(db);

  const usernameInput = interaction.options.getString("username");
  if (!usernameInput) {
    return interaction.reply("Please provide a username.");
  }

  const uuid = await getUUIDFromUsername(db, usernameInput);

  if (!uuid) {
    return interaction.reply(`No user found with username: \`${usernameInput}\`.`);
  }

  const startInput = interaction.options.getString("start");
  const endInput = interaction.options.getString("end");

  const now = new Date();

  const start = startInput
    ? parseDiscordTimestamp(startInput)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const end = endInput
    ? parseDiscordTimestamp(endInput)
    : now;

  if (!start || !end) {
    throw new Error("Invalid start or end timestamp");
  }

  const columns = [
    "contributed",
    "wars",
    "playtime",
    "guild_raids_total",
    "canyon_colossus",
    "orphion",
    "grootslangs",
    "anomaly",
    "wartorn"
  ];

  let totals = Object.fromEntries(columns.map(c => [c, 0]));

  const table = `user_${uuid}`;

    const [rows] = await db.execute(
        `
        SELECT username,
        ${columns.map(c => `MIN(${c}) AS start_${c}`).join(",")},
        ${columns.map(c => `MAX(${c}) AS end_${c}`).join(",")}
        FROM \`${table}\`
        WHERE (
        time_inserted BETWEEN ? AND ?
        OR time_inserted = (
            SELECT MAX(time_inserted)
            FROM \`${table}\` t2
            WHERE t2.time_inserted < ?
        )
        )
        `,
        [start, end, start]
    );

    for (const row of rows || []) {
        username = row.username;

        for (const col of columns) {
        const startVal = row[`start_${col}`] || 0;
        const endVal = row[`end_${col}`] || 0;
        totals[col] += Math.max(0, endVal - startVal);
        }
    }

  const results = [
    { name: "Playtime", value: totals.playtime },
    { name: "Contributed xp", value: totals.contributed },
    { name: "Wars entered", value: totals.wars },
    { name: "Nest of The Grootslangs", value: totals.grootslangs },
    { name: "Orphion's Nexus of Light", value: totals.orphion },
    { name: "The Canyon Colossus", value: totals.canyon_colossus },
    { name: "The Nameless Anomaly", value: totals.anomaly },
    { name: "The Wartorn Palace", value: totals.wartorn },
    { name: "Total guild raids", value: totals.guild_raids_total }
  ].filter(r => r.value > 0);

  if (results.length === 0) {
    return interaction.reply("No data found for this username in the selected period.");
  }

  return sendPaginatedEmbed(
    interaction,
    results,
    formatLine,
    `Guild stats for ${username}`
  );
}

module.exports = { getPlayerStats };