const Discord = require("discord.js");
const {
  addTextChannel,
  addVoiceChannel,
  deleteTextChannel,
  getGuildData
} = require("./firestoreUtil");
require("dotenv").config();

const client = new Discord.Client();
let cache = {};

client.on("ready", () => console.log("start server."));

client.addListener("voiceStateUpdate", async (_, member) => {
  if (!member.mute) {
    const guildId = member.guild.id;
    const voiceChannelId = member.voiceChannel.id;
    if (cache[guildId] === undefined) {
      cache[guildId] = await getGuildData(guildId);
    }

    const voiceChannelCache = cache[member.guild.id][voiceChannelId];

    if (voiceChannelCache !== undefined) {
      const channels = client.channels;
      const voiceChannel = channels.get(voiceChannelId);
      voiceChannelCache.textChannels.forEach(chId => {
        channels.get(chId).send(`${member} is speaking in ${voiceChannel}`);
      });
    }
  }
});

const getVoiceChannel = (chName, guildId) => {
  return client.channels.find(
    ch => ch.type === "voice" && ch.name == chName && ch.guild.id === guildId
  );
};

const addChannel = async (textChannel, voiceChannelName) => {
  const guildId = textChannel.guild.id;
  const voiceChannel = getVoiceChannel(voiceChannelName, guildId);
  if (voiceChannel === null) {
    return `#${voiceChannelName} is not exists.`;
  }
  const voiceChannelId = voiceChannel.id;
  if (cache[guildId] === undefined) {
    cache[guildId] = {};
  }
  const voiceChannelCache = cache[guildId][voiceChannelId];
  const errorMessage = "[Add channel]Error has occurred.";
  const textChannelId = textChannel.id;

  if (voiceChannelCache !== undefined) {
    const textChannels = voiceChannelCache.textChannels;
    if (textChannels.includes(textChannelId)) {
      return `#${voiceChannelName} is already added.`;
    }
    if (await addTextChannel(guildId, voiceChannelId, textChannelId)) {
      textChannels.push(textChannel.id);
    } else {
      return errorMessage;
    }
  } else {
    if (await addVoiceChannel(guildId, voiceChannelId, textChannelId)) {
      cache[guildId][voiceChannelId] = { textChannels: [textChannelId] };
      return `#${voiceChannelName} is added!`;
    } else {
      return errorMessage;
    }
  }
};

const deleteChannel = async (textChannel, voiceCnannelName) => {
  const voiceChannel = getVoiceChannel(voiceCnannelName);
  if (voiceChannel === null) {
    return `${voiceCnannelName} is not exists.`;
  }
  const voiceChannelId = voiceChannel.id;
  const guildId = textChannel.guild.id;
  const noChannelMessase = `${voiceCnannelName} was not added ${textChannel.name}.`;
  const voiceChannelCache =
    cache[guildId] !== undefined ? cache[guildId][voiceChannelId] : undefined;

  if (voiceChannelCache === undefined) {
    return noChannelMessase;
  } else {
    const textChannels = voiceChannelCache.textChannels;
    if (!textChannels.includes(textChannel.id)) {
      return noChannelMessase;
    }
    if (await deleteTextChannel(guildId, voiceChannelId, textChannel.id)) {
      voiceChannelCache.textChannels = textChannels.filter(
        id => id !== textChannel.id
      );
      return `#${voiceCnannelName} is deleted!`;
    } else {
      return "[Delete Channel]Error has occurred.";
    }
  }
};

const getVoiceChannelList = async (guildId, textChannelId) => {
  if (cache[guildId] === undefined) {
    cache[guildId] = await getGuildData(guildId);
  }
  const channels = client.channels;

  const list = Object.entries(cache[guildId])
    .filter(kvp => kvp[1].textChannels.includes(textChannelId))
    .map(kvp => channels.get(kvp[0]))
    .join("\n");

  return list === "" ? "Not yet added." : list;
};

client.on("message", async message => {
  if (message.channel.type !== "text") return;

  const content = message.content;
  const command = "!sl";
  if (content.startsWith(command)) {
    const channel = message.channel;
    const sendMessage = m => channel.send(m).catch(console.err);
    const helpMessage = `add: ${command} -a <VOICE CHANNEL NAME>\ndelete: ${command} -d <VOICE CHANNEL NAME>\nshowList: ${command} -l`;
    const splitStrs = content.split(" ");
    if (splitStrs.length < 2 || splitStrs.length > 3) {
      sendMessage(helpMessage);
      return;
    }

    switch (splitStrs[1]) {
      case "-a": {
        console.log(`add:${splitStrs[1]}`);
        sendMessage(await addChannel(channel, splitStrs[2]));
        break;
      }
      case "-d": {
        console.log(`delete:${splitStrs[1]}`);
        sendMessage(await deleteChannel(channel, splitStrs[2]));
        break;
      }
      case "-l": {
        sendMessage(await getVoiceChannelList(channel.guild.id, channel.id));
        break;
      }
      default:
        sendMessage(helpMessage);
    }
  }
});

client.login(process.env.TOKEN);
