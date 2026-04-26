function parseDiscordTimestamp(input) {
  const match = input.match(/<t:(\d+):[a-zA-Z]?>/);
  return match ? new Date(Number(match[1]) * 1000) : null;
}

function parseDiscordDate(input) {
  input = String(input);
  return input.slice(0, -3) + ":D>";
}

const toDiscordTimestamp = (date) => `<t:${Math.floor(date.getTime() / 1000)}:f>`;


module.exports = { parseDiscordTimestamp, parseDiscordDate, toDiscordTimestamp };