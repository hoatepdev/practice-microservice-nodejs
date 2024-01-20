const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const amqplib = require("amqplib");
const {
  APP_SECRET,
  MESSAGE_BROKER_URL,
  EXCHANGE_NAME,
  QUEUE_NAME,
  CUMTOMER_BINDING_KEY,
} = require("../config");

//Utility functions
module.exports.GenerateSalt = async () => {
  return await bcryptjs.genSalt();
};

module.exports.GeneratePassword = async (password, salt) => {
  return await bcryptjs.hash(password, salt);
};

module.exports.ValidatePassword = async (
  enteredPassword,
  savedPassword,
  salt
) => {
  return (await this.GeneratePassword(enteredPassword, salt)) === savedPassword;
};

module.exports.GenerateSignature = async (payload) => {
  try {
    return await jwt.sign(payload, APP_SECRET, { expiresIn: "30d" });
  } catch (error) {
    return error;
  }
};

module.exports.ValidateSignature = async (req) => {
  try {
    const signature = req.get("Authorization");
    const payload = await jwt.verify(signature.split(" ")[1], APP_SECRET);
    req.user = payload;
    return true;
  } catch (error) {
    return false;
  }
};

module.exports.FormateData = (data) => {
  if (data) {
    return { data };
  } else {
    throw new Error("Data Not found!");
  }
};

/* Message Broker */

// create channel
module.exports.CreateChannel = async () => {
  try {
    const connection = await amqplib.connect(MESSAGE_BROKER_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "direct", false);

    return channel;
  } catch (error) {
    throw error;
  }
};

// publish messages

module.exports.PublishMessage = async (channel, binding_key, message) => {
  try {
    await channel.publish(EXCHANGE_NAME, binding_key, Buffer.from(message));
    console.log("Message sent" + message);
  } catch (error) {
    throw error;
  }
};

// subcribe messages

module.exports.SubscribeMessage = async (channel, service) => {
  const appQueue = await channel.assertQueue(QUEUE_NAME);

  channel.bindQueue(appQueue.queue, EXCHANGE_NAME, CUMTOMER_BINDING_KEY);

  channel.consume(appQueue.queue, (data) => {
    console.log("received data", data.content.toString());
    service.SubscribeEvents(data.content.toString())
    channel.ack(data);
  });
};
