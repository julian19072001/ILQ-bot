function parseDiscordTimestamp(input) {
  const match = input.match(/<t:(\d+):[a-zA-Z]?>/);
  return match ? new Date(Number(match[1]) * 1000) : null;
}

function parseDiscordDate(input) {
  input = String(input);
  return input.slice(0, -3) + ":D>";
}


module.exports = { parseDiscordTimestamp, parseDiscordDate };