async function sendPaginatedEmbed(interaction, results, formatLine, title) {
  const pageSize = 20;
  const pages = [];

  for (let i = 0; i < results.length; i += pageSize) {
    pages.push(results.slice(i, i + pageSize));
  }

  if (pages.length === 0) {
    return interaction.reply({
      content: "No one contributed the selected information during the selected time period.",
      ephemeral: true
    });
  }

  let page = 0;

  const createEmbed = (pageIndex) => ({
    title: `${title} (${pageIndex + 1}/${pages.length})`,
    description:
      `From: ${interaction.options.getString("start")}\n` +
      `Until: ${interaction.options.getString("end")}\n\n` +
      "```text\n" +
      pages[pageIndex].map(formatLine).join("\n") +
      "\n```",
    color: 5814783
  });

  const getComponents = () => ([
    {
      type: 1, 
      components: [
        {
          type: 2,
          label: "⬅️ Prev",
          style: 1,
          custom_id: "prev",
          disabled: page === 0
        },
        {
          type: 2,
          label: "Next ➡️",
          style: 1,
          custom_id: "next",
          disabled: page === pages.length - 1
        }
      ]
    }
  ]);

  const message = await interaction.reply({
    embeds: [createEmbed(page)],
    components: pages.length > 1 ? getComponents() : [],
    fetchReply: true
  });

  if (pages.length === 1) return;

  const collector = message.createMessageComponentCollector({
    time: 600000
  });

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: "These buttons aren't for you.", ephemeral: true });
    }

    if (i.customId === "prev") {
      page--;
    } else if (i.customId === "next") {
      page++;
    }

    await i.update({
      embeds: [createEmbed(page)],
      components: getComponents()
    });
  });

  collector.on("end", async () => {
    await message.edit({
      components: [
        {
          type: 1,
          components: [
            { type: 2, label: "⬅️ Prev", style: 1, custom_id: "prev", disabled: true },
            { type: 2, label: "Next ➡️", style: 1, custom_id: "next", disabled: true }
          ]
        }
      ]
    }).catch(() => {});
  });
}

module.exports = { sendPaginatedEmbed };