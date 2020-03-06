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
  const snapshot = await getVoiceChannelsCollectionRef(guildId)
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
  return executeDbAction(
    getVoiceChannelsCollectionRef(guildId)
      .doc(voiceChannnelId)
      .set({
        textChannels: [textChannelId]
      })
  );
};

exports.addTextChannel = async (guildId, voiceChannnelId, textChannelId) => {
  return executeDbAction(
    getVoiceChannelsCollectionRef(guildId)
      .doc(voiceChannnelId)
      .update({
        textChannels: firebase.firestore.FieldValue.arrayUnion(textChannelId)
      })
  );
};

exports.deleteTextChannel = async (guildId, voiceChannnelId, textChannelId) => {
  return executeDbAction(
    getVoiceChannelsCollectionRef(guildId)
      .doc(voiceChannnelId)
      .update({
        textChannels: firebase.firestore.FieldValue.arrayRemove(textChannelId)
      })
  );
};

exports.deleteVoiceChannel = async (guildId, voiceChannnelId) => {
  return executeDbAction(
    getVoiceChannelsCollectionRef(guildId)
      .doc(voiceChannnelId)
      .delete()
  );
};

exports.deleteTextChannelBatch = async (
  guildId,
  textChannelId,
  voiceChannnelIds
) => {
  const guildRef = db.collection(GUILDS).doc(guildId);
  const batch = db.batch();
  voiceChannnelIds.forEach(vId => {
    batch.update(guildRef.collection(VOICE_CHANNNELS).doc(vId), {
      textChannels: firebase.firestore.FieldValue.arrayRemove(textChannelId)
    });
  });

  return executeDbAction(batch.commit());
};

async function executeDbAction(dbPromise) {
  let result = true;
  await dbPromise.catch(e => {
    result = false;
    console.error(e);
  });
  return result;
}

function getVoiceChannelsCollectionRef(guildId) {
  return db
    .collection(GUILDS)
    .doc(guildId)
    .collection(VOICE_CHANNNELS);
}
