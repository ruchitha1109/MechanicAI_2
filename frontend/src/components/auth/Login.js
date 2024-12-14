




import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { account } from './appwrite';
import './auth.css';

// const Login = ({ onLogin }) => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await account.createEmailPasswordSession(email, password);
//       onLogin(true);
//       navigate('/'); // Redirect to the main page
//     } catch (error) {
//       console.error('Login failed:', error);
//       alert(error.message);
//     }
//   };


const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    // Cleanup timeout if component unmounts or if the user logs out
    return () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, []);

  let sessionTimeout; // Initialize timeout variable

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await account.createEmailPasswordSession(email, password);
      onLogin(true);

      // Set a timeout to log out after 1 minute (60,000 milliseconds)
      sessionTimeout = setTimeout(async () => {
        await account.deleteSession('current');
        onLogin(false);
        alert('Session expired. Please log in again.');
        navigate('/login'); // Redirect to the login page
      }, 60000); // 1 minute in milliseconds

      navigate('/'); // Redirect to the main page
    } catch (error) {
      console.error('Login failed:', error);
      alert(error.message);
    }
  };
  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account?{' '}
        <button onClick={() => navigate('/signup')}>Sign Up</button>
      </p>
    </div>
  );
};

export default Login;








