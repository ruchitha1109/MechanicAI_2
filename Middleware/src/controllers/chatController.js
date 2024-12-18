
const { v4: uuidv4 } = require("uuid");
const { getChatModel } = require("../components/chatSession");
const axios = require("axios");
const { response } = require("express");
const llm_url = process.env.LLM;

const chatController = {
  // Creates a new session
  // Adds a new document in database with the sessionId
  // Sends the user's prompt to the LLM Server
  // Adds the LLM's response to the conversation of the session
  // request body = { userId,  message }
  // returns = { success, sessionId, response }
  createSession: async (req, res) => {
    try {
      const { userId, message } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const sessionId = uuidv4();
      const ChatModel = getChatModel(userId);
      const title = "New Chat";

      const newSession = new ChatModel({
        userId,
        sessionId,
        title,
        conversation: [],
      });

      await newSession.save();

      // Update conversation with user's message
      const dbRes = await updateConvo(userId, sessionId, "user", message);

      // If saving fails
      if (!dbRes) {
        console.error("Error in Database Updation");
        return {
          success: false,
          response: "Oops! Something went wrong. Please try again",
          error: "Failed to save the message",
        };
      }

      // Generate LLM response (wait for the response)
      const data = await generate(userId, sessionId, message, true);

      if (!data.success) {
        res.status(501).json(data);
      }

      res.status(201).json({
        success: true,
        sessionId,
        response: data.response, // LLM response
        replacementParts: data.replacement_parts,
        carModel: data.car_model,
        message: "New chat session created",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  },
  // Adds the user's prompt to the already existing session in the database
  // Sends the user's prompt to the LLM Server
  // Adds the LLM's response to the conversation of the session
  // request body = { userId, sessionId, message }
  // returns = { success, response }
  addMessage: async (req, res) => {
    try {
      const { userId, sessionId, message } = req.body;

      if (!userId || !sessionId || !message) {
        return res.status(400).json({ error: "Invalid message format" });
      }

      // Update conversation with user's message
      const dbRes = await updateConvo(userId, sessionId, "user", message);

      if (!dbRes) {
        console.error("Error in Database Updation");
        return {
          success: false,
          response: "Oops! Something went wrong. Please try again",
          error: "Failed to save the message",
        };
      }
      // Generate LLM response (wait for the response)
      const data = await generate(userId, sessionId, message, false);

      if (!data.success) {
        res.status(501).json(data);
      }

      res.status(200).json({
        success: true,
        response: data.response, // LLM response
        replacementParts: data.replacementParts,
        carModel: data.carModel,
        message: "Messages added successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to add message" });
    }
  },
  // Get a chat session's conversation
  // request body = { userId, sessionId }
  // returns = { success, conversation : [...<messages>] }
  getHistory: async (req, res) => {
    try {
      const { userId, sessionId } = req.body;
      if (!userId || !sessionId) {
        return res.status(400).json({
          error: "userId and sessionId are required",
        });
      }
      const ChatModel = getChatModel(userId);
      const data = await ChatModel.findOne({ sessionId });
      if (!data) {
        return res.stats(404).json({ error: "Chat not found" });
      }
      res.status(200).json({ 
        success: true,
        conversation: data.conversation,
      });
    } catch (error) {
      console.log("Error in getHistory:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch conversation",
      });
    }
  },
  // Get the user's chat sessions
  // request body structure  = { userId, offset }
  // returns = { chatList : [...{ sessionId , title }]}
  getChats: async (req, res) => {
    try {
      const { userId, offset = 0 } = req.body;

      // Check if userId exists
      if (!userId) {
        console.error("userId is missing in the request.");
        return res.status(400).json({ error: "userId is required" });
      }

      const ChatModel = getChatModel(userId);

      // Convert offset and limit to integers and validate
      const offsetInt = parseInt(offset, 10);

      if (isNaN(offsetInt) || offsetInt < 0) {
        return res.status(400).json({ error: "Invalid offset value" });
      }

      // Retrieve chats with offset and limit
      const chats = await ChatModel.find({}, { _id: 0, title: 1, sessionId: 1 })
        .sort({ updatedAt: -1 })
        .skip(offsetInt)
        .limit(10);

      res.status(200).json({
        chatList: chats,
        offset: offsetInt + chats.length, // Return the new offset
      });
    } catch (error) {
      console.error("Error in getChats:", error);
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  },

  // Let's the frontend change the title of the chat
  // request body structure = { userId, sessionId, title }
  // returns = { success, title, error}
  renameTitle: async (req, res) => {
    const { userId, sessionId, title } = req.body;
    const ChatModel = getChatModel(userId);
    try {
      await ChatModel.updateOne(
        { sessionId },
        {
          $set: {
            title: title,
          },
        }
      );
      res.status(200).json({
        success: true,
        title,
      });
    } catch (error) {
      console.log("Failed to update title");
      res.status(500).json({
        success: false,
        error: "Failed to update the title",
      });
    }
  },

  // Allows deletion of chats from database
  // request body = { userId, sessionId }
  // returns = { success , error }
  deleteChat: async (req, res) => {
    const { userId, sessionId } = req.body;
    const ChatModel = getChatModel(userId);

    try {
      const result = await ChatModel.deleteOne({
        sessionId: sessionId,
      });
      if (result.deletedCount == 0) {
        return res.status(404).json({ error: "Chat not found" });
      }
      res.status(204).json({
        success: true
      });
    } catch (error) {
      console.log("Error in deleteChat:", error);
      res.status(500).json({ error: "Failed to delete the chat" });
    }
  },
};

// Helper functions
async function updateConvo(userId, sessionId, sender, message) {
  const ChatModel = getChatModel(userId);
  try {
    await ChatModel.updateOne(
      { sessionId },
      {
        $push: {
          conversation: {
            sender,
            message,
            timestamp: new Date(),
          },
        },
      }
    );
    return true;
  } catch (error) {
    console.log("MongoDB error");
    return false;
  }
}

async function generate(userId, sessionId, message, newSession) {
  try {
    const response = await axios.post(llm_url, {
      prompt: message,
      new: newSession,
      userId,
      sessionId,
    });

    const data = response.data;

    if (newSession) {
      const ChatModel = getChatModel(userId);
      await ChatModel.updateOne(
        { sessionId },
        {
          title: data.title,
        }
      );
    }

    const dbRes = await updateConvo(userId, sessionId, "bot", data.response);
    if (!dbRes) {
      console.error("Error in Database Updation");
      return {
        success: false,
        response: "Oops! Something went wrong. Please try again",
        error: "Failed to save the message",
      };
    }
    return {
      success: true,
      response: data.response,
      replacementParts: data.replacement_parts,
      carModel: data.car_model,
    };
  } catch (error) {
    console.error("Error in LLM server");

    const dbRes = await updateConvo(
      userId,
      sessionId,
      "bot",
      "Oops! Something went wrong. Please try again"
    );

    if (!dbRes) {
      console.error("Error in Database Updation");
      return {
        success: false,
        response: "Oops! Something went wrong. Please try again",
        error: "Failed to save the message",
      };
    }
    return {
      success: false,
      response: "Oops! Something went wrong. Please try again",
      error: "Failed to generate response",
    };
  }
}

module.exports = chatController;