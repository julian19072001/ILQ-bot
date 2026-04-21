async function sendPaginatedEmbed(interaction, results, formatLine, title) {
  const pageSize = 20;
  const pages = [];

  for (let i = 0; i < results.length; i += pageSize) {
    pages.push(results.slice(i, i + pageSize));
  }

  if (pages.length === 0) {
    return interaction.reply("No one contributed the selected information during the selected time period.");
  }

  let page = 0;

  const createEmbed = (pageIndex) => ({
    title: `${title} (${pageIndex + 1}/${pages.length})`,
    description:
      "```text\n" +
      pages[pageIndex].map(formatLine).join("\n") +
      "\n```",
    color: 5814783
  });

  const message = await interaction.reply({
    embeds: [createEmbed(page)],
    fetchReply: true
  });

  if (pages.length === 1) return;

  await message.react("⬅️");
  await message.react("➡️");

  const filter = (reaction, user) =>
    ["⬅️", "➡️"].includes(reaction.emoji.name) && !user.bot;

  const collector = message.createReactionCollector({ filter, time: 600000 });

  collector.on("collect", (reaction, user) => {
    reaction.users.remove(user).catch(() => {});

    if (reaction.emoji.name === "⬅️") {
      page = page > 0 ? page - 1 : pages.length - 1;
    } else {
      page = page < pages.length - 1 ? page + 1 : 0;
    }

    message.edit({ embeds: [createEmbed(page)] });
  });
}

module.exports = { sendPaginatedEmbed };