const { getDb, getAllUserTables } = require("../db/mysql");
const { parseDiscordTimestamp } = require("../utils/time");
const { sendPaginatedEmbed } = require("../utils/pagination");

function formatLine(u) {
  const name = u.username.slice(0, 18).padEnd(18, " ");

  const value = String(u.value).padStart(10, " ");

  return `${name} | ${value}`;
}

async function getWars(interaction) {
  const db = await getDb();
  const tables = await getAllUserTables(db);

  const start = parseDiscordTimestamp(interaction.options.getString("start"));
  const end = parseDiscordTimestamp(interaction.options.getString("end"));

  let results = [];

  for (const table of tables) {
    const [rows] = await db.execute(
      `
      SELECT username,
             MIN(wars) AS startValue,
             MAX(wars) AS endValue
      FROM \`${table}\`
      WHERE time_inserted BETWEEN ? AND ?
         OR time_inserted = (
           SELECT MAX(time_inserted)
           FROM \`${table}\` t2
           WHERE t2.username = \`${table}\`.username
           AND t2.time_inserted < ?
         )
      GROUP BY username
      `,
      [start, end, start]
    );

    for (const r of rows || []) {
      const value = Math.max(0, (r.endValue || 0) - (r.startValue || 0));
      if (value > 0) results.push({ username: r.username, value });
    }
  }

  results.sort((a, b) => b.value - a.value);

  return sendPaginatedEmbed(interaction, results, formatLine, "Wars entered");
}

module.exports = { getWars };