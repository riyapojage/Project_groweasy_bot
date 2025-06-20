import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  // State management for chat functionality
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m here to help you find your perfect property. Let me ask you a few quick questions to better understand your needs.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationComplete, setIsConversationComplete] = useState(false);
  const [classification, setClassification] = useState(null);

  // Refs for smooth scrolling and input management
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Smooth scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send message to backend
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Validate message length before sending
      if (userMessage.content.length > 1000) {
        throw new Error('Message is too long. Please keep it under 1000 characters.');
      }

      let response;
      try {
        const apiUrl = process.env.NODE_ENV === 'production' 
          ? '/.netlify/functions/chat' 
          : 'http://localhost:3000/chat';
        
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: userMessage.content }),
        });
      } catch (networkError) {
        console.error('Network error:', networkError);
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error('Received invalid response from server. Please try again.');
      }

      // Handle different HTTP status codes
      if (!response.ok) {
        let errorMessage = 'Something went wrong. Please try again.';
        
        if (response.status === 400) {
          errorMessage = data.error || 'Invalid message format. Please try again.';
        } else if (response.status === 429) {
          errorMessage = 'Service is busy. Please wait a moment and try again.';
        } else if (response.status === 500) {
          errorMessage = data.error || 'Server error. Please try again later.';
        } else if (response.status >= 500) {
          errorMessage = 'Service is temporarily unavailable. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      if (data.success) {
        // Add bot response with animation delay
        setTimeout(() => {
          const botMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => [...prev, botMessage]);
          
          // Check if conversation is complete
          if (data.isComplete && data.classification) {
            setIsConversationComplete(true);
            setClassification(data.classification);
          }
          
          setIsLoading(false);
        }, 800); // Slight delay for natural conversation feel
      } else {
        // Handle specific error codes from the API
        let userFriendlyError = data.error || 'Failed to send message';
        
        if (data.code === 'CLAUDE_ERROR') {
          userFriendlyError = 'AI service is temporarily unavailable. Please try again.';
        } else if (data.code === 'RATE_LIMIT') {
          userFriendlyError = 'Service is busy. Please wait a moment and try again.';
        } else if (data.code === 'AUTH_ERROR') {
          userFriendlyError = 'Service authentication failed. Please contact support.';
        } else if (data.code === 'MESSAGE_TOO_LONG') {
          userFriendlyError = 'Message is too long. Please keep it shorter.';
        } else if (data.code === 'EMPTY_MESSAGE') {
          userFriendlyError = 'Please enter a message.';
        }
        
        throw new Error(userFriendlyError);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Create user-friendly error message
      let errorContent = error.message;
      if (!errorContent || errorContent.includes('fetch')) {
        errorContent = 'Unable to send message. Please check your connection and try again.';
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ ${errorContent}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Reset conversation with enhanced error handling
  const resetConversation = async () => {
    try {
      console.log('🔄 Resetting conversation...');
      
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/.netlify/functions/reset' 
        : 'http://localhost:3000/reset';
      
      const response = await fetch(apiUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Reset failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reset conversation');
      }

      console.log('✅ Conversation reset successfully');
      
      setMessages([
        {
          id: 1,
          role: 'assistant',
          content: 'Hello! I\'m here to help you find your perfect property. Let me ask you a few quick questions to better understand your needs.',
          timestamp: new Date().toISOString()
        }
      ]);
      setIsConversationComplete(false);
      setClassification(null);
      setInputMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error resetting conversation:', error);
      
      // Show error message to user
      const errorMessage = {
        id: Date.now(),
        role: 'assistant',
        content: '⚠️ Unable to reset conversation. Please refresh the page to start over.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="header-title">GrowEasy Real Estate</h1>
            <p className="header-subtitle">AI Property Assistant</p>
          </div>
          <button 
            onClick={resetConversation}
            className="reset-button"
            title="Start New Conversation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="m1 10 6-6a9 9 0 0 1 13 1"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`message-wrapper ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className={`message-bubble ${message.role}`}>
                <div className="message-content">
                  {message.content}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="message-wrapper bot-message">
              <div className="message-bubble assistant loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          {/* Classification result */}
          {isConversationComplete && classification && (
            <div className="classification-result">
              <div className="classification-header">
                <h3>Lead Classification</h3>
              </div>
              <div className="classification-content">
                <div className={`status-badge ${classification.status}`}>
                  {classification.status.toUpperCase()}
                </div>
                {classification.metadata && (
                  <div className="metadata">
                    {Object.entries(classification.metadata).map(([key, value]) => 
                      value && (
                        <div key={key} className="metadata-item">
                          <span className="metadata-key">{key}:</span>
                          <span className="metadata-value">{value}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Smooth scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container */}
      <div className="input-container">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="message-input"
            disabled={isLoading || isConversationComplete}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || isConversationComplete}
            className="send-button"
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
