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

    // Add user message immediately for responsive UX
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();

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
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
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

  // Reset conversation
  const resetConversation = async () => {
    try {
      await fetch('http://localhost:3000/reset', { method: 'POST' });
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
