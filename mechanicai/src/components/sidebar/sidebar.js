







import React, { useEffect, useState, useRef } from "react";
import "./sidebar.css";
import { assets } from "../../assets/assets";
import axios from "axios";
import { account } from "../../appwrite"; // Import the account object from Appwrite.js

const Sidebar = ({ onNewChat, onChatSelect }) => {
  const [extended, setExtended] = useState(false);
  const [chats, setChats] = useState([]); // Chat sessions
  const [selectedChat, setSelectedChat] = useState(null); // Selected chat details
  const [conversation, setConversation] = useState(null); // Chat conversation
  const [loading, setLoading] = useState(false); // Loading state
  const [userId, setUserId] = useState(null); // User ID
  const [offset, setOffset] = useState(0); // Offset for chat pagination
  const [hasMore, setHasMore] = useState(true); // Flag to check if more chats are available

  const listRef = useRef(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const user = await account.get(); // Fetch the logged-in user from Appwrite
        setUserId(user?.$id || null); // Save the userId
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUserId();
  }, []);

  // Fetch chat sessions with pagination
  const fetchChats = async (loadMore = false) => {
    if (!userId || !hasMore || loading) return;

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5000/api/chats", { userId, offset });
      const { chatList, offset: newOffset } = response.data;

      if (loadMore) {
        setChats((prevChats) => [...prevChats, ...chatList]); // Append new chats
      } else {
        setChats(chatList); // Set initial chats
      }

      setOffset(newOffset); // Update offset for the next call
      setHasMore(chatList.length === 10); // If less than 10 items, no more chats
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchChats();
    }
  }, [userId]);

  
  // const fetchChatDetails = async (chatId) => {
  //   try {
  //     setLoading(true);
  //     const response = await axios.post("http://localhost:5000/api/history", {
  //       userId,
  //       sessionId: chatId,
  //     });
  //     if (response.data && response.data.conversation) {
  //       onChatSelect(response.data.conversation); // Pass conversation to App
  //       setSelectedChat(chatId); // Mark as selected
  //     } else {
  //       console.error("Invalid response structure:", response.data);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching chat details:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  

  const fetchChatDetails = async (chatId) => {
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5000/api/history", {
        userId,
        sessionId: chatId,
      });
      if (response.data && response.data.conversation) {
        onChatSelect(response.data.conversation); // Pass conversation to App
        setSelectedChat(chatId); // Mark as selected
      } else {
        console.error("Invalid response structure:", response.data);
      }
    } catch (error) {
      console.error("Error fetching chat details:", error);
    } finally {
      setLoading(false);
    }
  };
  

  // Handle scroll event to load more chats
  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10 && hasMore) {
      fetchChats(true); // Load more chats
    }
  };

  return (
    <div className="sidebar">
      <div className="top">
        <img
          onClick={() => setExtended((prev) => !prev)}
          className="menu"
          src={assets.menu_icon}
          alt="menu"
        />
        <div className="new-chat" onClick={onNewChat}>
          <img src={assets.plus_icon} alt="new chat" />
          {extended ? <p>New Chat</p> : null}
        </div>
      </div>

      {extended ? (
        <div className="recent">
          <p className="recent-title">Recent</p>
          <div
            className="recent-list"
            ref={listRef}
            onScroll={handleScroll}
          >
            {chats.map((chat) => (
              <div
                key={chat.sessionId}
                className={`recent-entry ${
                  selectedChat === chat.sessionId ? "selected" : ""
                }`}
                onClick={() => fetchChatDetails(chat.sessionId)}
              >
                <img src={assets.message_icon} alt="chat icon" />
                <p>{chat.title || "Untitled Chat"}</p>
              </div>
            ))}
            {loading && <p>Loading more chats...</p>}
            {!hasMore && <p>No more chats available</p>}
          </div>
        </div>
      ) : null}

      {selectedChat && conversation && (
        <div className="conversation">
          <h2>Conversation</h2>
          {conversation.map((msg, index) => (
            <div key={index} className="message">
              <strong>{msg.sender}:</strong>
              <p>{msg.message}</p>
              <small>{new Date(msg.timestamp).toLocaleString()}</small>
            </div>
          ))}
          <button onClick={() => setSelectedChat(null)}>Back to chats</button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;


