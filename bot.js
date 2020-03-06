const Discord = require("discord.js");
const {
  addTextChannel,
  addVoiceChannel,
  deleteTextChannel,
  deleteVoiceChannel,
  deleteTextChannelBatch,
  getGuildData
} = require("./firestoreUtil");
require("dotenv").config();

const client = new Discord.Client();
const cache = {};
const acquiredGuildIds = [];

const acquireGuildData = async guildId => {
  if (!acquiredGuildIds.includes(guildId)) {
    console.log("Get guild data from firestore.");
    cache[guildId] = await getGuildData(guildId);
    acquiredGuildIds.push(guildId);
  }
};

client.on("ready", () => console.log("start server."));

client.on("channelDelete", async channel => {
  const guildId = channel.guild.id;
  await acquireGuildData(guildId);

  const channelId = channel.id;
  let message;
  if (channel.type === "voice" && cache[guildId][channelId] !== undefined) {
    if (await deleteVoiceChannel(guildId, channelId)) {
      delete cache[guildId][channelId];
      message = `#${channel.name} is deleted`;
    } else {
      message = `Error occured for deleting #${channel.name}.`;
    }
  } else if (channel.type === "text") {
    const voiceChannelIds = Object.entries(cache[guildId])
      .filter(kvp => kvp[1].textChannels.includes(channelId))
      .map(kvp => kvp[0]);
    if (voiceChannelIds.length < 1) return;

    if (await deleteTextChannelBatch(guildId, channelId, voiceChannelIds)) {
      voiceChannelIds.forEach(
        vid =>
          (cache[guildId][vid].textChannels = cache[guildId][
            vid
          ].textChannels.filter(tid => tid !== channelId))
      );

      message = `All #${channel.name} are deleted`;
    } else {
      message = `Error occured for deleting #${channel.name}.`;
    }
  }
  console.log(message);
});

client.on("voiceStateUpdate", async (_, member) => {
  if (member.mute || member.voiceChannel === undefined) return;

  const guildId = member.guild.id;
  const voiceChannelId = member.voiceChannel.id;
  await acquireGuildData(guildId);
  const voiceChannelCache = cache[guildId][voiceChannelId];

  if (voiceChannelCache !== undefined) {
    const channels = client.channels;
    const voiceChannel = channels.get(voiceChannelId);
    voiceChannelCache.textChannels.forEach(chId => {
      channels.get(chId).send(`${member} is speaking in ${voiceChannel}.`);
    });
  }
});

const getVoiceChannel = (chName, guildId) => {
  return client.channels.find(
    ch => ch.type === "voice" && ch.name == chName && ch.guild.id === guildId
  );
};

const addChannel = async (textChannel, voiceChannelName) => {
  if (voiceChannelName === undefined) {
    return "Please specify a channel name.";
  }

  const guildId = textChannel.guild.id;
  const voiceChannel = getVoiceChannel(voiceChannelName, guildId);
  if (voiceChannel === null) {
    return `#${voiceChannelName} is not exists.`;
  }

  const voiceChannelId = voiceChannel.id;
  await acquireGuildData(guildId);
  const voiceChannelCache = cache[guildId][voiceChannelId];
  const sucessMessage = `#${voiceChannelName} is added!`;
  const errorMessage = "[Add channel]Error has occurred.";
  const textChannelId = textChannel.id;
  if (voiceChannelCache === undefined) {
    if (await addVoiceChannel(guildId, voiceChannelId, textChannelId)) {
      cache[guildId][voiceChannelId] = { textChannels: [textChannelId] };
      return sucessMessage;
    } else {
      return errorMessage;
    }
  }

  const textChannels = voiceChannelCache.textChannels;
  if (textChannels.includes(textChannelId)) {
    return `#${voiceChannelName} is already added.`;
  }

  if (await addTextChannel(guildId, voiceChannelId, textChannelId)) {
    textChannels.push(textChannel.id);
    return sucessMessage;
  } else {
    return errorMessage;
  }
};

const deleteChannel = async (textChannel, voiceChannelName) => {
  if (voiceChannelName === undefined) {
    return "Please specify a channel name.";
  }

  const guildId = textChannel.guild.id;
  const voiceChannel = getVoiceChannel(voiceChannelName, guildId);
  if (voiceChannel === null) {
    return `${voiceChannelName} is not exists.`;
  }

  const voiceChannelId = voiceChannel.id;
  const noChannelMessase = `#${voiceChannelName} is not added here.`;
  await acquireGuildData(guildId);
  const voiceChannelCache =
    cache[guildId] !== undefined ? cache[guildId][voiceChannelId] : undefined;
  if (voiceChannelCache === undefined) return noChannelMessase;

  const textChannels = voiceChannelCache.textChannels;
  if (!textChannels.includes(textChannel.id)) {
    return noChannelMessase;
  }

  if (await deleteTextChannel(guildId, voiceChannelId, textChannel.id)) {
    voiceChannelCache.textChannels = textChannels.filter(
      id => id !== textChannel.id
    );
    return `#${voiceChannelName} is deleted!`;
  } else {
    return "[Delete Channel]Error has occurred.";
  }
};

const getVoiceChannelList = async (guildId, textChannelId) => {
  await acquireGuildData(guildId);

  const channels = client.channels;
  const list = Object.entries(cache[guildId])
    .filter(kvp => kvp[1].textChannels.includes(textChannelId))
    .map(kvp => channels.get(kvp[0]))
    .join("\n");

  return list === "" ? "Not yet added." : list;
};

const COMMAND_PREFIX = "!sl";
const HELP_MESSAGE = `add: ${COMMAND_PREFIX} -a <VOICE CHANNEL NAME>\ndelete: ${COMMAND_PREFIX} -d <VOICE CHANNEL NAME>\nshowList: ${COMMAND_PREFIX} -l`;

client.on("message", async message => {
  if (message.channel.type !== "text") return;

  const content = message.content;
  if (!content.startsWith(COMMAND_PREFIX)) return;

  const channel = message.channel;
  const sendMessage = m => channel.send(m).catch(console.err);
  const splitStrs = content.split(" ");
  if (splitStrs.length < 2 || splitStrs.length > 3) {
    sendMessage(HELP_MESSAGE);
    return;
  }

  switch (splitStrs[1]) {
    case "-a": {
      sendMessage(await addChannel(channel, splitStrs[2]));
      break;
    }
    case "-d": {
      sendMessage(await deleteChannel(channel, splitStrs[2]));
      break;
    }
    case "-l": {
      sendMessage(await getVoiceChannelList(channel.guild.id, channel.id));
      break;
    }
    default:
      sendMessage(HELP_MESSAGE);
  }
});

client.login(process.env.TOKEN);
