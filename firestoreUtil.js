const firebase = require("firebase");
require("dotenv").config();

var firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const GUILDS = "guilds";
const VOICE_CHANNNELS = "voidceChannels";

exports.getGuildData = async guildId => {
  const snapshot = await db
    .collection(GUILDS)
    .doc(guildId)
    .collection(VOICE_CHANNNELS)
    .get()
    .catch(console.error);

  if (snapshot === undefined) return null;

  let guildObject = {};
  snapshot.docs.map(doc => {
    guildObject[doc.id] = doc.data();
  });
  return guildObject;
};

exports.addVoiceChannel = async (guildId, voiceChannnelId, textChannelId) => {
  let result = true;
  await db
    .collection(GUILDS)
    .doc(guildId)
    .collection(VOICE_CHANNNELS)
    .doc(voiceChannnelId)
    .set({
      textChannels: [textChannelId]
    })
    .catch(e => {
      console.error(e);
      result = false;
    });

  return result;
};

exports.addTextChannel = async (guildId, voiceChannnelId, textChannelId) => {
  let result = true;
  await db
    .collection(GUILDS)
    .doc(guildId)
    .collection(VOICE_CHANNNELS)
    .doc(voiceChannnelId)
    .update({
      textChannels: firebase.firestore.FieldValue.arrayUnion(textChannelId)
    })
    .catch(e => {
      console.error(e);
      result = false;
    });

  return result;
};

exports.deleteTextChannel = async (guildId, voiceChannnelId, textChannelId) => {
  let result = true;
  await db
    .collection(GUILDS)
    .doc(guildId)
    .collection(VOICE_CHANNNELS)
    .doc(voiceChannnelId)
    .update({
      textChannels: firebase.firestore.FieldValue.arrayRemove(textChannelId)
    })
    .catch(e => {
      console.error(e);
      result = false;
    });

  return result;
};
