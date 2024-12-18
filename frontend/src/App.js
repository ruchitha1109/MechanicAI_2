







import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/sidebar/sidebar";
import Main from "./components/main/main";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import { account } from "./appwrite";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [resetChat, setResetChat] = useState(false);
  const [selectedChatConversation, setSelectedChatConversation] = useState([]); // Add state for chat conversation

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await account.get();
        if (user) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Not logged in or session expired", error);
      }
    };

    // const checkSession = async () => {
    //   try {
    //     // Attempt to get the current user session
    //     const session = await account.getSession('current');
    //     const now = new Date().getTime();
    //     const expiryTime = new Date(session.expire).getTime();

    //     // Check if the session is still valid
    //     if (now < expiryTime) {
    //       setIsAuthenticated(true); // Session is valid
    //     } else {
    //       // Session has expired
    //       await account.deleteSession('current'); // Optionally delete expired session
    //       setIsAuthenticated(false);
    //     }
    //   } catch (error) {
    //     console.error("Not logged in or session expired", error);
    //     setIsAuthenticated(false);
    //   }
    // };


    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      setIsAuthenticated(false);
      alert("Logged out successfully!");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    }
  };

  const handleNewChat = () => {
    setResetChat((prev) => !prev);
    setSelectedChatConversation([]); // Clear selected chat conversation
  };

  const handleChatSelection = (conversation) => {
    setSelectedChatConversation(conversation); // Store selected chat conversation
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={() => setIsAuthenticated(true)} />}
        />
        <Route
          path="/signup"
          element={<Signup onSignup={() => setIsAuthenticated(true)} />}
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Sidebar onNewChat={handleNewChat} onChatSelect={handleChatSelection} />
            <Main
              resetChat={resetChat}
              onLogout={handleLogout}
              previousConversation={selectedChatConversation} // Pass conversation to Main
            />
          </>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;









